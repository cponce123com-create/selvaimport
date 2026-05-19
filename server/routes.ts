import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { OAuth2Client } from "google-auth-library";
import { api } from "@shared/routes";
import { InsertProduct, Supplier, InsertSupplier, priceHistory } from "@shared/schema";
import { z } from "zod";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { desc } from "drizzle-orm";
import { authLimiter, guestOrderLimiter, generalApiLimiter } from "./rateLimiter";
import { sendTelegramMessage, buildOrderMessage, buildStatusMessage, sendTelegramToPhone } from "./telegram";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "No autorizado" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || req.user!.role !== "admin") {
    return res.status(401).json({ message: "No autorizado: Solo administradores" });
  }
  next();
}

function buildProductSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateUniqueSlug(name: string, excludeProductId?: number): Promise<string> {
  const baseSlug = buildProductSlug(name);

  if (!excludeProductId) {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const testSlug = counter === 1 ? baseSlug : `${baseSlug}-${counter}`;
      const existing = await storage.getProductBySlug(testSlug);
      if (!existing) {
        slug = testSlug;
        break;
      }
      counter++;
    }

    return slug;
  }

  const existingProducts = (await storage.getProducts()).products;
  const existingSlugs = new Set(
    existingProducts.filter((p) => p.id !== excludeProductId).map((p) => p.slug)
  );

  let slug = baseSlug;
  let counter = 2;

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

function extractCouponCodeFromShippingAddress(shippingAddress: string): string | null {
  if (!shippingAddress || !shippingAddress.includes("Cupón:")) return null;
  const match = shippingAddress.match(/Cupón:\s*([A-Z0-9_-]+)/i);
  return match?.[1]?.toUpperCase() || null;
}

async function validateCouponOrThrow(code: string) {
  const coupon = await storage.getCouponByCode(code);

  if (!coupon) {
    throw new Error("Cupón no encontrado");
  }

  if (!coupon.isActive) {
    throw new Error("Cupón no está activo");
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    throw new Error("Cupón ha expirado");
  }

  if (coupon.maxUses && (coupon.currentUses ?? 0) >= coupon.maxUses) {
    throw new Error("Cupón ha alcanzado el límite de usos");
  }

  return coupon;
}

async function applyCouponToTotal(total: number, shippingAddress: string) {
  const couponCode = extractCouponCodeFromShippingAddress(shippingAddress);

  if (!couponCode) {
    return {
      finalTotal: total,
      coupon: null,
      couponCode: null as string | null,
      discount: 0,
    };
  }

  const coupon = await validateCouponOrThrow(couponCode);

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (total * Number(coupon.discountValue)) / 100;
  } else {
    discount = Number(coupon.discountValue);
  }

  const finalTotal = Math.max(0, total - discount);

  return {
    finalTotal,
    coupon,
    couponCode,
    discount,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ── Rate limiting general para toda la API pública ──
  app.use("/api", generalApiLimiter);

  app.get('/api/health', async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`SELECT 1`);
      res.json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  setupAuth(app);

  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  // ── Auth con rate limiting ──
  app.post("/api/auth/google", authLimiter, async (req, res) => {
    try {
      const { credential } = req.body;

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        return res.status(400).json({ message: "Invalid Google token" });
      }

      let user = await storage.getUserByEmail(payload.email);

      if (!user) {
        user = await storage.createUser({
          email: payload.email,
          name: payload.name || payload.email.split("@")[0],
          password: null as unknown as string,
        });
      }

      req.login(user, (err: any) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        res.json(user);
      });
    } catch (error) {
      console.error("Google Auth Error:", error);
      res.status(400).json({ message: "Google authentication failed" });
    }
  });

  app.post("/api/upload", requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se envio ningun archivo" });
      }

      const isVideo = req.file.mimetype.startsWith("video/");
      const isImage = req.file.mimetype.startsWith("image/");

      if (!isImage && !isVideo) {
        return res.status(400).json({
          message: "Formato no permitido. Use imágenes o videos (MP4, WebM).",
        });
      }

      if (isVideo && req.file.size > 20 * 1024 * 1024) {
        return res.status(400).json({
          message: "El video es demasiado grande. Máximo 20MB.",
        });
      }

      const result = await new Promise<any>((resolve, reject) => {
        const uploadOptions: any = {
          folder: "selva-import",
          resource_type: "auto",
        };

        if (isImage) {
          uploadOptions.transformation = [
            { width: 1200, height: 1200, crop: "limit", quality: "auto" },
          ];
        }

        const stream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(req.file!.buffer);
      });

      res.json({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
      });
    } catch (e: any) {
      console.error("Error subiendo archivo:", e);
      res.status(500).json({ message: "Error al subir el archivo" });
    }
  });

  app.delete("/api/upload", requireAdmin, async (req, res) => {
    try {
      const { publicId, resourceType } = req.body;
      if (!publicId) {
        return res.status(400).json({ message: "publicId requerido" });
      }

      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType || "image",
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Error al eliminar el archivo" });
    }
  });

  app.get(api.categories.list.path, async (_req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.post(api.categories.create.path, requireAdmin, async (req, res) => {
    try {
      const data = api.categories.create.input.parse(req.body);
      const cat = await storage.createCategory(data);
      res.status(201).json(cat);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get(api.products.list.path, async (req, res) => {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const search = req.query.search as string | undefined;

    const isAdminQuery = req.query.admin === "true";
    const isAdminSession = req.isAuthenticated() && req.user.role === "admin";
    const isAdmin = isAdminQuery || isAdminSession;

    const onlyShowOnHome = !categoryId && !search && !isAdmin;

    const hasPaginationParams = req.query.page !== undefined || req.query.limit !== undefined;

    // Para admin sin paginación explícita → devolver TODOS los productos
    // Para el resto → paginación por defecto (page=1, limit=20)
    const page = isAdmin && !hasPaginationParams
      ? undefined
      : Math.max(1, Number(req.query.page) || 1);
    const limit = isAdmin && !hasPaginationParams
      ? undefined
      : Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const result = await storage.getProducts(
      categoryId,
      search,
      onlyShowOnHome,
      page,
      limit,
      isAdmin ? true : undefined // includeHidden: admin ve todos los productos
    );
    res.json(result);
  });

  // ── Toggle visibilidad de producto (admin) ──
  app.patch("/api/admin/products/:id/visibility", requireAdmin, async (req, res) => {
    try {
      const productId = Number(req.params.id);
      const { isVisible } = req.body as { isVisible: boolean };
      const updated = await storage.updateProduct(productId, { isVisible });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ── Informe de Compra (admin) ──
  app.get("/api/admin/purchase-report", requireAdmin, async (req, res) => {
    try {
      const { desde, hasta, supplierId, entryDateFrom, entryDateTo } = req.query;
      const result = await storage.getPurchaseReport({
        desde: desde ? new Date(desde as string) : undefined,
        hasta: hasta ? new Date(hasta as string) : undefined,
        supplierId: supplierId ? Number(supplierId) : undefined,
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(product);
  });

  // ── Buscar producto por slug (para URLs amigables) ──
  app.get("/api/products/slug/:slug", async (req, res) => {
    const product = await storage.getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    // Enriquecer con categoría, proveedor y marca
    const [categories, allSuppliers, allBrands] = await Promise.all([
      storage.getCategories(),
      storage.getSuppliers(),
      storage.getBrands(),
    ]);
    const category = product.categoryId
      ? categories.find((c) => c.id === product.categoryId)
      : undefined;
    const supplier = product.supplierId
      ? allSuppliers.find((s) => s.id === product.supplierId)
      : null;
    const brand = product.brandId
      ? allBrands.find((b) => b.id === product.brandId) || null
      : null;
    res.json({ ...product, category, supplier, brand });
  });

  app.post(api.products.create.path, requireAdmin, async (req, res) => {
    try {
      const data = api.products.create.input.parse(req.body);
      const productData: Record<string, any> = { ...data, slug: await generateUniqueSlug(data.name) };
      // entryDate llega como string ISO, convertir a Date para Drizzle
      if (productData.entryDate) {
        productData.entryDate = new Date(productData.entryDate);
      } else {
        delete productData.entryDate;
      }

      const p = await storage.createProduct(productData as InsertProduct);
      // Crear template en el Maestro de Productos
      try {
        await storage.createProductTemplateFromProduct(p.id);
      } catch (tmplErr: any) {
        console.warn("[templates] Error creando template para producto nuevo:", tmplErr.message);
      }
      res.status(201).json(p);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put(api.products.update.path, requireAdmin, async (req, res) => {
    try {
      const data = api.products.update.input.parse(req.body);
      const productId = Number(req.params.id);
      const existing = await storage.getProduct(productId);

      const updateData = { ...data } as Record<string, any>;
      if (data.name) {
        updateData.slug = await generateUniqueSlug(data.name, productId);
      }
      // entryDate llega como string ISO, convertir a Date para Drizzle
      if (updateData.entryDate) {
        updateData.entryDate = new Date(updateData.entryDate);
      } else if (updateData.entryDate === null) {
        updateData.entryDate = null;
      } else {
        delete updateData.entryDate;
      }

      const p = await storage.updateProduct(productId, updateData as Partial<InsertProduct>);

      const updateDataAny = data as Record<string, any>;
      if (
        existing &&
        existing.videoPublicId &&
        updateDataAny.videoPublicId &&
        existing.videoPublicId !== updateDataAny.videoPublicId
      ) {
        await cloudinary.uploader
          .destroy(existing.videoPublicId, { resource_type: "video" })
          .catch(console.error);
      }

      // Registrar en historial de precios si cambió el precio
      try {
        if (existing && (data.price !== undefined || data.purchasePrice !== undefined)) {
          const { db } = await import("./db");
          const { priceHistory } = await import("@shared/schema");
          await db.insert(priceHistory).values({
            productId: productId,
            price: data.price ?? existing.price,
            purchasePrice: data.purchasePrice ?? existing.purchasePrice,
            changedBy: "admin",
          });
        }
      } catch (phErr) {
        console.warn("[price-history] Error registrando cambio:", phErr);
      }

      res.json(p);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete(api.products.delete.path, requireAdmin, async (req, res) => {
    const productId = Number(req.params.id);
    const product = await storage.getProduct(productId);

    if (product && product.videoPublicId) {
      await cloudinary.uploader
        .destroy(product.videoPublicId, { resource_type: "video" })
        .catch(console.error);
    }

    await storage.deleteProduct(productId);
    res.status(204).end();
  });

  // ── Brands (Marcas) ──
  app.get("/api/admin/brands", requireAdmin, async (req, res) => {
    try {
      const result = await storage.getBrands();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/brands", requireAdmin, async (req, res) => {
    try {
      const { name } = req.body as { name: string };
      const brand = await storage.createBrand({ name: name.trim() });
      res.status(201).json(brand);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/brands/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteBrand(Number(req.params.id));
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Public brand search ──
  app.get("/api/brands/search", async (req, res) => {
    try {
      const brands = await storage.getBrands();
      const q = ((req.query.q as string) || "").toLowerCase();
      const filtered = q ? brands.filter((b: any) => b.name.toLowerCase().includes(q)) : brands;
      res.json(filtered.slice(0, 10));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Model search (from existing templates) ──
  app.get("/api/product-models/search", async (req, res) => {
    try {
      const q = ((req.query.q as string) || "").toLowerCase();
      const { db } = await import("./db");
      const { productTemplates } = await import("@shared/schema");
      const { ilike } = await import("drizzle-orm");
      const rows = await db
        .select({ model: productTemplates.model })
        .from(productTemplates)
        .where(ilike(productTemplates.model, `%${q}%`))
        .groupBy(productTemplates.model)
        .limit(10);
      res.json(rows.map(r => r.model).filter(Boolean));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Product Templates ──
  app.get("/api/admin/product-templates", requireAdmin, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const result = await storage.getProductTemplates(search, page, limit);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/product-templates/:id", requireAdmin, async (req, res) => {
    try {
      const template = await storage.getProductTemplate(Number(req.params.id));
      if (!template) return res.status(404).json({ message: "Template no encontrado" });
      res.json(template);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/admin/product-templates/:id", requireAdmin, async (req, res) => {
    try {
      const template = await storage.getProductTemplate(Number(req.params.id));
      if (!template) return res.status(404).json({ message: "Template no encontrado" });
      const updated = await storage.updateProductTemplate(Number(req.params.id), req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/product-templates/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProductTemplate(Number(req.params.id));
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Backfill: crear templates para productos existentes ──
  app.post("/api/admin/product-templates/backfill", requireAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { products: productsTable } = await import("@shared/schema");
      const allProducts = await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable);
      let creados = 0;
      let existentes = 0;
      for (const p of allProducts) {
        try {
          const created = await storage.createProductTemplateFromProduct(p.id);
          if (created) creados++;
          else existentes++;
        } catch {
          existentes++;
        }
      }
      res.json({ message: `Backfill completado. ${creados} templates creados, ${existentes} ya existentes.`, creados, existentes });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Public endpoint for template search (no auth required for autocomplete) ──
  app.get("/api/product-templates/search", async (req, res) => {
    try {
      const search = (req.query.q as string) || "";
      const result = await storage.getProductTemplates(search, 1, 10);
      res.json(result.templates);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Historial de Precios ──
  app.get("/api/admin/products/:id/price-history", requireAdmin, async (req, res) => {
    try {
      const productId = Number(req.params.id);
      const { db } = await import("./db");
      const { priceHistory } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const rows = await db.select().from(priceHistory)
        .where(eq(priceHistory.productId, productId))
        .orderBy(desc(priceHistory.changedAt))
        .limit(20);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get(api.cart.get.path, requireAuth, async (req, res) => {
    const cart = await storage.getCart(req.user!.id);
    res.json(cart);
  });

  app.post(api.cart.addItem.path, requireAuth, async (req, res) => {
    try {
      const data = api.cart.addItem.input.parse(req.body);
      const item = await storage.addCartItem(req.user!.id, data);
      res.json(item);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put(api.cart.updateItem.path, requireAuth, async (req, res) => {
    try {
      const data = api.cart.updateItem.input.parse(req.body);

      if (data.quantity === 0) {
        await storage.removeCartItem(Number(req.params.id));
        return res.json({ success: true });
      }

      const item = await storage.updateCartItem(Number(req.params.id), data.quantity);
      res.json(item);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete(api.cart.clear.path, requireAuth, async (req, res) => {
    await storage.clearCart(req.user!.id);
    res.status(204).end();
  });

  app.get(api.orders.list.path, requireAuth, async (req, res) => {
    const ordersList =
      req.user!.role === "admin"
        ? await storage.getOrders()
        : await storage.getOrders(req.user!.id);

    res.json(ordersList);
  });

  app.get(api.orders.get.path, requireAuth, async (req, res) => {
    const order = await storage.getOrder(Number(req.params.id));

    if (!order) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    if (req.user!.role !== "admin" && order.userId !== req.user!.id) {
      return res.status(401).json({ message: "No autorizado" });
    }

    res.json(order);
  });

  // ── Pedido de usuario registrado ──
  app.post(api.orders.create.path, requireAuth, async (req, res) => {
    try {
      const data = api.orders.create.input.parse(req.body);

      const cart = await storage.getCart(req.user!.id);
      if (cart.items.length === 0) {
        return res.status(400).json({ message: "El carrito esta vacio" });
      }

      let total = 0;

      const items = cart.items.map((i) => {
        const effectivePrice =
          i.product.isOffer &&
          i.product.offerPrice &&
          Number(i.product.offerPrice) > 0 &&
          Number(i.product.offerPrice) < Number(i.product.price)
            ? i.product.offerPrice
            : i.product.price;

        total += Number(effectivePrice) * i.quantity;

        return {
          productId: i.productId,
          quantity: i.quantity,
          price: effectivePrice,
        };
      });

      const { finalTotal, coupon } = await applyCouponToTotal(total, data.shippingAddress);

      const orderInfo = {
        shippingAddress: data.shippingAddress,
        totalAmount: finalTotal.toString(),
        status: "pagado",
      };

      const order = await storage.createOrderWithStock(
        req.user!.id,
        orderInfo,
        items
      );

      await storage.clearCart(req.user!.id);

      if (coupon) {
        await storage.incrementCouponUses(coupon.id);
      }

      // ── Notificación Telegram nuevo pedido ──
      storage.getUser(req.user!.id).then((user) => {
        sendTelegramMessage(
          buildOrderMessage({
            id: order.id,
            guestName: user?.name ?? undefined,
            guestPhone: user?.email ?? undefined,
            shippingAddress: order.shippingAddress as string,
            totalAmount: order.totalAmount as string,
          })
        );
      }).catch(console.error);

      // ── Alerta de stock bajo ──
      storage.checkLowStock(5).then((lowItems) => {
        if (lowItems.length > 0) {
          const lines = lowItems.map(p => `  • ${p.name}: <b>${p.inventory} unidades</b>`).join("\n");
          sendTelegramMessage(`⚠️ <b>STOCK BAJO</b>\n\nLos siguientes productos tienen poco stock:\n${lines}`);
        }
      }).catch(console.error);

      res.status(201).json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch(api.orders.updateStatus.path, requireAdmin, async (req, res) => {
    try {
      const data = api.orders.updateStatus.input.parse(req.body);
      const order = await storage.updateOrderStatus(Number(req.params.id), data.status);

      // ── Notificar al admin del cambio de estado ──
      const statusEmojis: Record<string, string> = {
        pagado: "✅", enviado: "🚚", entregado: "🎉", cancelado: "❌", pendiente: "⏳",
      };
      const emoji = statusEmojis[data.status] ?? "🔄";
      sendTelegramMessage(
        `${emoji} <b>Pedido #${order.id}</b> → <b>${data.status.toUpperCase()}</b>\n💰 S/ ${Number(order.totalAmount).toFixed(2)}`
      ).catch(console.error);

      // ── Notificar al cliente invitado si dejó su teléfono ──
      if (order.guestPhone) {
        const msg = buildStatusMessage({
          id: order.id,
          status: data.status,
          totalAmount: order.totalAmount as string,
          guestName: order.guestName,
          guestPhone: order.guestPhone,
        });
        sendTelegramToPhone(order.guestPhone, msg).catch(console.error);
      }

      res.json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Eliminar pedido — solo si está cancelado
  app.delete("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      const order = await storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({ message: "Pedido no encontrado" });
      }

      if (order.status !== "cancelado" && order.status !== "cancelled") {
        return res.status(400).json({
          message: "Solo se pueden eliminar pedidos cancelados",
        });
      }

      await storage.deleteOrder(orderId);
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Pedido de invitado con rate limiting ──
  app.post(api.orders.createGuest.path, guestOrderLimiter, async (req, res) => {
    try {
      const data = api.orders.createGuest.input.parse(req.body);
      const { randomBytes } = await import("crypto");
      const guestAccessToken = randomBytes(32).toString("hex");

      const allProducts = (await storage.getProducts()).products;

      let total = 0;

      const orderItems = data.items.map((item) => {
        const product = allProducts.find((p) => p.id === item.productId);

        if (!product) {
          throw new Error(`Producto no encontrado: ${item.productId}`);
        }

        const effectivePrice =
          product.isOffer &&
          product.offerPrice &&
          Number(product.offerPrice) > 0 &&
          Number(product.offerPrice) < Number(product.price)
            ? product.offerPrice
            : product.price;

        total += Number(effectivePrice) * item.quantity;

        return {
          productId: item.productId,
          quantity: item.quantity,
          price: effectivePrice,
        };
      });

      const { finalTotal, coupon } = await applyCouponToTotal(total, data.shippingAddress);

      const order = await storage.createGuestOrderWithStock(
        {
          shippingAddress: data.shippingAddress,
          totalAmount: finalTotal.toString(),
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          guestAccessToken,
        },
        orderItems
      );

      if (coupon) {
        await storage.incrementCouponUses(coupon.id);
      }

      // ── Notificación Telegram nuevo pedido ──
      sendTelegramMessage(
        buildOrderMessage({
          id: order.id,
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          shippingAddress: data.shippingAddress,
          totalAmount: finalTotal.toString(),
        })
      ).catch(console.error);

      // ── Alerta de stock bajo ──
      storage.checkLowStock(5).then((lowItems: any[]) => {
        if (lowItems.length > 0) {
          const lines = lowItems.map((p: any) => `  • ${p.name}: <b>${p.inventory} unidades</b>`).join("\n");
          sendTelegramMessage(`⚠️ <b>STOCK BAJO</b>\n\nLos siguientes productos tienen poco stock:\n${lines}`);
        }
      }).catch(console.error);

      res.status(201).json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get(api.admin.customers.path, requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getUsers();
      const allOrders = await storage.getOrders();

      const customers = allUsers
        .filter((u) => u.role !== "admin")
        .map((u) => {
          const userOrders = allOrders.filter((o) => o.userId === u.id);
          const totalSpent = userOrders.reduce(
            (acc, o) => acc + Number(o.totalAmount),
            0
          );

          return {
            id: u.id,
            name: u.name,
            email: u.email,
            type: "registered" as const,
            ordersCount: userOrders.length,
            totalSpent,
            createdAt: u.createdAt,
          };
        });

      const guestOrders = allOrders.filter((o) => !o.userId);
      const guestMap = new Map<
        string,
        { name: string; phone: string; orders: typeof guestOrders }
      >();

      guestOrders.forEach((o) => {
        const key = (o.guestPhone || o.guestName || "desconocido").toLowerCase();
        if (!guestMap.has(key)) {
          guestMap.set(key, {
            name: o.guestName || "Invitado",
            phone: o.guestPhone || "",
            orders: [],
          });
        }
        guestMap.get(key)!.orders.push(o);
      });

      const guests = Array.from(guestMap.entries()).map(([key, data]) => ({
        id: `guest-${key}`,
        name: data.name,
        email: data.phone ? `Tel: ${data.phone}` : "Sin contacto",
        type: "guest" as const,
        ordersCount: data.orders.length,
        totalSpent: data.orders.reduce((acc, o) => acc + Number(o.totalAmount), 0),
        createdAt: data.orders[0]?.createdAt || null,
      }));

      res.json([...customers, ...guests]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/pages", async (_req, res) => {
    const pages = await storage.getSitePages();
    res.json(pages);
  });

  app.get("/api/pages/:slug", async (req, res) => {
    const page = await storage.getSitePage(req.params.slug);
    if (!page) {
      return res.status(404).json({ message: "Pagina no encontrada" });
    }
    res.json(page);
  });

  app.put("/api/admin/pages/:slug", requireAdmin, async (req, res) => {
    try {
      const { title, content, imageUrl } = req.body;

      if (typeof title !== "string" && typeof content !== "string") {
        return res.status(400).json({ message: "Se requiere titulo o contenido" });
      }

      const updates: Record<string, any> = {};
      if (typeof title === "string") updates.title = title;
      if (typeof content === "string") updates.content = content;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;

      const page = await storage.upsertSitePage(req.params.slug as string, updates);
      res.json(page);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/orders/guest/:id", async (req, res) => {
    const token = req.query.token as string;

    if (!token) {
      return res.status(401).json({ message: "Token de acceso requerido" });
    }

    const order = await storage.getOrder(Number(req.params.id));

    if (!order) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    if (order.userId) {
      return res.status(401).json({ message: "No autorizado" });
    }

    if (order.guestAccessToken !== token) {
      return res.status(403).json({ message: "Token invalido" });
    }

    res.json(order);
  });

  app.get("/api/banner-slides", async (_req, res) => {
    const slides = await storage.getBannerSlides(true);
    res.json(slides);
  });

  app.get("/api/admin/banner-slides", requireAdmin, async (_req, res) => {
    const slides = await storage.getBannerSlides(false);
    res.json(slides);
  });

  const bannerSlideValidator = z.object({
    title: z.string().nullable().optional(),
    subtitle: z.string().nullable().optional(),
    mediaType: z.enum(["image", "video"]).optional(),
    imageUrl: z.string().nullable().optional(),
    videoUrl: z.string().nullable().optional(),
    publicId: z.string().nullable().optional(),
    productId1: z.number().nullable().optional(),
    productId2: z.number().nullable().optional(),
    buttonText: z.string().nullable().optional(),
    buttonLink: z
      .string()
      .nullable()
      .optional()
      .refine((val) => {
        if (!val) return true;
        const trimmed = val.trim().toLowerCase();
        if (
          trimmed.startsWith("javascript:") ||
          trimmed.startsWith("data:") ||
          trimmed.startsWith("vbscript:")
        ) {
          return false;
        }
        return true;
      }, { message: "URL no permitida" }),
    buttonCategoryId: z.number().nullable().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  });

  app.post("/api/admin/banner-slides", requireAdmin, async (req, res) => {
    try {
      const parsed = bannerSlideValidator.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Datos invalidos",
          errors: parsed.error.flatten(),
        });
      }

      const allSlides = await storage.getBannerSlides(false);
      const maxOrder = allSlides.reduce((max, s) => Math.max(max, s.sortOrder), -1);

      const slide = await storage.createBannerSlide({
        ...parsed.data,
        sortOrder: maxOrder + 1,
        isActive: parsed.data.isActive ?? true,
      });

      res.status(201).json(slide);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/banner-slides/:id", requireAdmin, async (req, res) => {
    try {
      const slideId = Number(req.params.id);
      const existing = await storage.getBannerSlide(slideId);

      if (!existing) {
        return res.status(404).json({ message: "Slide no encontrado" });
      }

      const parsed = bannerSlideValidator.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Datos invalidos",
          errors: parsed.error.flatten(),
        });
      }

      const slide = await storage.updateBannerSlide(slideId, parsed.data);

      if (
        existing.publicId &&
        parsed.data.publicId &&
        existing.publicId !== parsed.data.publicId
      ) {
        const resourceType = existing.mediaType === "video" ? "video" : "image";
        await cloudinary.uploader
          .destroy(existing.publicId, { resource_type: resourceType })
          .catch(console.error);
      }

      res.json(slide);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/banner-slides/reorder", requireAdmin, async (req, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || !ids.every((id: any) => typeof id === "number")) {
        return res.status(400).json({ message: "Se requiere un array de IDs" });
      }

      for (let i = 0; i < ids.length; i++) {
        await storage.updateBannerSlide(ids[i], { sortOrder: i });
      }

      const slides = await storage.getBannerSlides(false);
      res.json(slides);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/banner-slides/:id", requireAdmin, async (req, res) => {
    try {
      const slideId = Number(req.params.id);
      const slide = await storage.getBannerSlide(slideId);

      if (slide && slide.publicId) {
        const resourceType = slide.mediaType === "video" ? "video" : "image";
        await cloudinary.uploader
          .destroy(slide.publicId, { resource_type: resourceType })
          .catch(console.error);
      }

      await storage.deleteBannerSlide(slideId);
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get(api.admin.coupons.list.path, requireAdmin, async (_req, res) => {
    try {
      const coupons = await storage.getCoupons();
      res.json(coupons);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post(api.admin.coupons.create.path, requireAdmin, async (req, res) => {
    try {
      const data = api.admin.coupons.create.input.parse(req.body);

      const coupon = await storage.createCoupon({
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        isActive: data.isActive,
      });

      res.status(201).json(coupon);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put(api.admin.coupons.update.path, requireAdmin, async (req, res) => {
    try {
      const data = api.admin.coupons.update.input.parse(req.body);

      if (
        data.discountType === "percentage" &&
        data.discountValue &&
        Number(data.discountValue) > 100
      ) {
        return res.status(400).json({
          message: "El porcentaje no puede ser mayor a 100%",
        });
      }

      const coupon = await storage.updateCoupon(Number(req.params.id), {
        code: data.code ? data.code.toUpperCase() : undefined,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses !== undefined ? data.maxUses : undefined,
        expiryDate: data.expiryDate
          ? new Date(data.expiryDate)
          : data.expiryDate === null
            ? null
            : undefined,
        isActive: data.isActive,
      });

      res.json(coupon);
    } catch (e: any) {
      const message = e.name === "ZodError" ? "Datos de cupón inválidos" : e.message;
      res.status(400).json({ message });
    }
  });

  app.delete(api.admin.coupons.delete.path, requireAdmin, async (req, res) => {
    try {
      await storage.deleteCoupon(Number(req.params.id));
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post(api.coupons.validate.path, async (req, res) => {
    try {
      const data = api.coupons.validate.input.parse(req.body);
      const coupon = await validateCouponOrThrow(data.code.toUpperCase());

      res.json({
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/home-rows", async (_req, res) => {
    try {
      const rows = await storage.getHomeRows(true);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/home-rows", requireAdmin, async (_req, res) => {
    try {
      const rows = await storage.getHomeRows(false);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/home-rows", requireAdmin, async (req, res) => {
    try {
      const { title, rowType, categoryId, sortOrder, isActive } = req.body;
      const allRows = await storage.getHomeRows(false);
      const maxOrder = allRows.reduce((max, r) => Math.max(max, r.sortOrder), -1);

      const row = await storage.createHomeRow({
        title: title || "Nueva fila",
        rowType: rowType || "products",
        categoryId: categoryId || null,
        sortOrder: sortOrder ?? maxOrder + 1,
        isActive: isActive ?? true,
      });

      res.status(201).json(row);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/home-rows/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { title, rowType, categoryId, sortOrder, isActive, productIds } = req.body;

      const row = await storage.updateHomeRow(id, {
        ...(title !== undefined && { title }),
        ...(rowType !== undefined && { rowType }),
        ...(categoryId !== undefined && { categoryId }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      });

      if (Array.isArray(productIds)) {
        await storage.setHomeRowItems(id, productIds);
      }

      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/home-rows/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteHomeRow(Number(req.params.id));
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/home-rows/reorder", requireAdmin, async (req, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "ids requerido" });
      }

      for (let i = 0; i < ids.length; i++) {
        await storage.updateHomeRow(ids[i], { sortOrder: i });
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/home-rectangles", async (_req, res) => {
    try {
      const rects = await storage.getHomeRectangles();
      res.json(rects);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/home-rectangles/:position", requireAdmin, async (req, res) => {
    try {
      const position = Number(req.params.position);
      const { title, rectType, productId, categoryId, isActive, productIds } = req.body;

      const rect = await storage.upsertHomeRectangle(position, {
        title: title || "",
        rectType: rectType || "product",
        productId: productId || null,
        categoryId: categoryId || null,
        isActive: isActive ?? true,
      });

      if (Array.isArray(productIds)) {
        await storage.setHomeRectangleItems(rect.id, productIds);
      }

      res.json(rect);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });


  // ── Dashboard metrics endpoint ──
  app.get("/api/admin/metrics/dashboard", requireAdmin, async (_req, res) => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const allOrders = await storage.getOrders();

      // Ventas hoy
      const salesToday = allOrders
        .filter((o) => {
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt);
          return d >= startOfDay && o.status !== "cancelado" && o.status !== "cancelled";
        })
        .reduce((sum, o) => sum + Number(o.totalAmount), 0);

      // Pedidos pendientes (no entregados ni cancelados)
      const pendingOrders = allOrders.filter(
        (o) => o.status !== "entregado" && o.status !== "cancelado" && o.status !== "cancelled"
      ).length;

      // Productos con stock bajo (< 5)
      const lowStockItems = await storage.checkLowStock(5);

      // Ingresos del mes actual
      const monthlyRevenue = allOrders
        .filter((o) => {
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt);
          return d >= startOfMonth && o.status !== "cancelado" && o.status !== "cancelled";
        })
        .reduce((sum, o) => sum + Number(o.totalAmount), 0);

      // Últimos 5 pedidos
      const recentOrders = [...allOrders]
        .sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        })
        .slice(0, 5)
        .map((o) => ({
          id: o.id,
          status: o.status,
          totalAmount: o.totalAmount,
          guestName: o.guestName,
          createdAt: o.createdAt,
        }));

      res.json({
        salesToday,
        pendingOrders,
        lowStockItems: lowStockItems.length,
        lowStockProducts: lowStockItems,
        monthlyRevenue,
        recentOrders,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Sitemap XML — ayuda a Google a descubrir todos los productos ──
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const SITE_URL = process.env.SITE_URL || "https://selvaimport.onrender.com";

      const [productsResult, categories] = await Promise.all([
        storage.getProducts(),
        storage.getCategories(),
      ]);

      const products = Array.isArray(productsResult) ? productsResult : productsResult.products;
      const visibleProducts = products.filter((p: any) => p.isVisible);

      const staticPages = [
        { url: "/", priority: "1.0", changefreq: "daily" },
        { url: "/tacora", priority: "0.8", changefreq: "weekly" },
        { url: "/selva-natural", priority: "0.8", changefreq: "weekly" },
        { url: "/page/terminos", priority: "0.3", changefreq: "monthly" },
        { url: "/page/privacidad", priority: "0.3", changefreq: "monthly" },
        { url: "/page/envios", priority: "0.5", changefreq: "monthly" },
        { url: "/page/quienes-somos", priority: "0.6", changefreq: "monthly" },
      ];

      const productEntries = visibleProducts
        .map((p) => {
          const lastmod = p.createdAt
            ? new Date(p.createdAt).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
          return `
  <url>
    <loc>${SITE_URL}/product/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
        })
        .join("");

      const categoryEntries = categories
        .map((c) => `
  <url>
    <loc>${SITE_URL}/?cat=${c.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`)
        .join("");

      const staticEntries = staticPages
        .map((p) => `
  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`)
        .join("");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${categoryEntries}
${productEntries}
</urlset>`;

      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (e: any) {
      res.status(500).json({ message: "Error generando sitemap" });
    }
  });

  // ── Robots.txt ──
  app.get("/robots.txt", async (_req, res) => {
    const SITE_URL = process.env.SITE_URL || "https://selvaimport.onrender.com";
    const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml`;
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(robotsTxt);
  });

  // ── Suppliers ──
  app.get("/api/suppliers", async (_req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/suppliers", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1, "El nombre es requerido"),
        contact: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      });
      const data = schema.parse(req.body);
      const supplier = await storage.createSupplier(data);
      res.status(201).json(supplier);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/suppliers/:id", requireAdmin, async (req, res) => {
    try {
      const supplierId = Number(req.params.id);
      const existing = await storage.getSupplier(supplierId);
      if (!existing) {
        return res.status(404).json({ message: "Proveedor no encontrado" });
      }
      const schema = z.object({
        name: z.string().min(1).optional(),
        contact: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      });
      const data = schema.parse(req.body);
      const supplier = await storage.updateSupplier(supplierId, data);
      res.json(supplier);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/suppliers/:id", requireAdmin, async (req, res) => {
    try {
      const supplierId = Number(req.params.id);
      const existing = await storage.getSupplier(supplierId);
      if (!existing) {
        return res.status(404).json({ message: "Proveedor no encontrado" });
      }
      await storage.deleteSupplier(supplierId);
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  seedDatabase().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  await seedUsers();
  await seedCatalog();
  await seedPages();
  await seedCoupons();
}

async function seedUsers() {
  const { db } = await import("./db");
  const { users } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@selvaimport.com";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[seed] WARNING: ADMIN_PASSWORD not set in production. Skipping admin account creation."
      );
      return;
    }
    console.warn(
      "[seed] WARNING: ADMIN_PASSWORD not set. Using default password for development only."
    );
  }

  // En producción ya retornamos arriba si no hay ADMIN_PASSWORD
  // En desarrollo usamos "admin123" como fallback local
  const effectivePassword = adminPassword || "admin123";

  const existingAdmin = await storage.getUserByEmail(adminEmail);

  if (existingAdmin) {
    if (existingAdmin.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, existingAdmin.id));
      console.log(`[seed] Promoted ${adminEmail} to admin`);
    }

    const adminPass = await hashPassword(effectivePassword);
    await db.update(users).set({ password: adminPass }).where(eq(users.id, existingAdmin.id));
  } else {
    const adminPass = await hashPassword(effectivePassword);
    const admin = await storage.createUser({
      email: adminEmail,
      name: "Admin Selva Import",
      password: adminPass,
    });

    await db.update(users).set({ role: "admin" }).where(eq(users.id, admin.id));
  }
}

async function seedCatalog() {
  const existingCats = await storage.getCategories();
  const existingSlugs = new Set(existingCats.map((c: any) => c.slug));

  const cats = [
    { name: "Tecnologia", slug: "tecnologia", description: "Gadgets, dispositivos electronicos y accesorios tecnologicos" },
    { name: "Moda y Accesorios", slug: "moda-accesorios", description: "Ropa, calzado y accesorios de moda" },
    { name: "Hogar y Cocina", slug: "hogar-cocina", description: "Articulos para el hogar, cocina y decoracion" },
    { name: "Belleza y Cuidado Personal", slug: "belleza-cuidado", description: "Cosmeticos, skincare y cuidado personal" },
    { name: "Salud y Bienestar", slug: "salud-bienestar", description: "Suplementos, equipos de salud y bienestar" },
    { name: "Juguetes y Ninos", slug: "juguetes-ninos", description: "Juguetes, juegos y articulos infantiles" },
    { name: "Papeleria y Oficina", slug: "papeleria-oficina", description: "Material de escritorio, papeleria y organizacion" },
    { name: "Mascotas", slug: "mascotas", description: "Alimentos, accesorios y cuidado para mascotas" },
    { name: "Deportes y Fitness", slug: "deportes-fitness", description: "Equipamiento deportivo, ropa fitness y accesorios" },
    { name: "Herramientas y Ferreteria", slug: "herramientas-ferreteria", description: "Herramientas manuales, electricas y accesorios" },
    { name: "TACORA", slug: "tacora", description: "Productos de segunda mano y oportunidades unicas" },
  ];

  for (const cat of cats) {
    if (!existingSlugs.has(cat.slug)) {
      await storage.createCategory(cat);
    }
  }

  if (existingCats.length > 0) return;

  const allCats = await storage.getCategories();
  const catBySlug = (slug: string) => allCats.find((c: any) => c.slug === slug)!;
  const createdCats = [
    catBySlug("tecnologia"),
    catBySlug("moda-accesorios"),
    catBySlug("hogar-cocina"),
  ];

  await storage.createProduct({
    categoryId: createdCats[0].id,
    name: "Audifonos Inalambricos Pro",
    slug: "audifonos-inalambricos-pro",
    description: "Audifonos premium con cancelacion de ruido activa, bateria de 30 horas y sonido Hi-Fi.",
    price: "199.99",
    inventory: 50,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
    isVisible: true,
    isOffer: true,
  });

  await storage.createProduct({
    categoryId: createdCats[0].id,
    name: "Teclado Mecanico RGB",
    slug: "teclado-mecanico-rgb",
    description: "Teclado mecanico con switches Cherry MX, retroiluminacion RGB personalizable.",
    price: "129.50",
    inventory: 20,
    imageUrl: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=600",
    isVisible: true,
    isOffer: true,
  });

  await storage.createProduct({
    categoryId: createdCats[1].id,
    name: "Camiseta Clasica Premium",
    slug: "camiseta-clasica-premium",
    description: "Camiseta de algodon 100% organico, corte moderno y acabado premium.",
    price: "24.99",
    inventory: 100,
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
    isVisible: true,
    isOffer: true,
  });

  await storage.createProduct({
    categoryId: createdCats[0].id,
    name: "Smartwatch Deportivo",
    slug: "smartwatch-deportivo",
    description: "Reloj inteligente con GPS, monitor cardiaco, resistencia al agua y 7 dias de bateria.",
    price: "249.99",
    inventory: 30,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
    isVisible: true,
  });

  await storage.createProduct({
    categoryId: createdCats[2].id,
    name: "Lampara LED Inteligente",
    slug: "lampara-led-inteligente",
    description: "Lampara de escritorio con control tactil, temperatura de color ajustable.",
    price: "79.99",
    inventory: 40,
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600",
    isVisible: true,
  });

  await storage.createProduct({
    categoryId: createdCats[1].id,
    name: "Mochila Urban Pro",
    slug: "mochila-urban-pro",
    description: "Mochila impermeable con compartimento para laptop, puerto USB y diseno ergonomico.",
    price: "89.99",
    inventory: 35,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
    isVisible: true,
  });
}

async function seedPages() {
  const defaultPages = [
    {
      slug: "terminos",
      title: "Terminos y Condiciones",
      content: "Aqui puedes escribir los terminos y condiciones de SELVA IMPORT. Edita esta pagina desde el panel de administracion.",
    },
    {
      slug: "privacidad",
      title: "Politica de Privacidad",
      content: "Aqui puedes escribir la politica de privacidad de SELVA IMPORT. Edita esta pagina desde el panel de administracion.",
    },
    {
      slug: "envios",
      title: "Envios y Devoluciones",
      content: "Aqui puedes escribir la politica de envios y devoluciones de SELVA IMPORT. Edita esta pagina desde el panel de administracion.",
    },
    {
      slug: "quienes-somos",
      title: "Quienes Somos",
      content: "Somos SELVA IMPORT, tu tienda de confianza con los mejores productos importados. Edita esta pagina desde el panel de administracion.",
    },
  ];

  for (const page of defaultPages) {
    const existing = await storage.getSitePage(page.slug);
    if (!existing) {
      await storage.upsertSitePage(page.slug, page);
    }
  }
}

async function seedCoupons() {
  const COUPON_CODE = "BIENVENIDO10";

  const existing = await storage.getCouponByCode(COUPON_CODE);
  if (existing) {
    return; // Ya existe
  }

  await storage.createCoupon({
    code: COUPON_CODE,
    discountType: "percentage",
    discountValue: "10",
    maxUses: null,
    expiryDate: null,
    isActive: true,
  });

  console.log(`[seed] Cupón ${COUPON_CODE} creado (10% de descuento)`);
}
