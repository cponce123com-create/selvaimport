import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "No autorizado" });
  }
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    return res.status(401).json({ message: "No autorizado: Solo administradores" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.post("/api/upload", requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se envio ningun archivo" });
      }
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Formato no permitido. Use JPG, PNG, WebP o GIF." });
      }
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "selva-import", resource_type: "image", transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }] },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file!.buffer);
      });
      res.json({ url: result.secure_url, publicId: result.public_id });
    } catch (e: any) {
      console.error("Error subiendo imagen:", e);
      res.status(500).json({ message: "Error al subir la imagen" });
    }
  });

  app.delete("/api/upload", requireAdmin, async (req, res) => {
    try {
      const { publicId } = req.body;
      if (!publicId) return res.status(400).json({ message: "publicId requerido" });
      await cloudinary.uploader.destroy(publicId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Error al eliminar la imagen" });
    }
  });

  app.get(api.categories.list.path, async (req, res) => {
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
    const prods = await storage.getProducts(categoryId, search);
    res.json(prods);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });
    res.json(product);
  });

  app.post(api.products.create.path, requireAdmin, async (req, res) => {
    try {
      const data = api.products.create.input.parse(req.body);

      const baseSlug = data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const existingProducts = await storage.getProducts();
      const existingSlugs = new Set(existingProducts.map(p => p.slug));
      let slug = baseSlug;
      let counter = 2;
      while (existingSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      (data as any).slug = slug;

      const p = await storage.createProduct(data as any);
      res.status(201).json(p);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put(api.products.update.path, requireAdmin, async (req, res) => {
    try {
      const data = api.products.update.input.parse(req.body);
      const productId = Number(req.params.id);

      if (data.name) {
        const baseSlug = data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        const existingProducts = await storage.getProducts();
        const existingSlugs = new Set(existingProducts.filter(p => p.id !== productId).map(p => p.slug));
        let slug = baseSlug;
        let counter = 2;
        while (existingSlugs.has(slug)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        (data as any).slug = slug;
      }

      const p = await storage.updateProduct(productId, data as any);
      res.json(p);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete(api.products.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.status(204).end();
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
    const ordersList = req.user!.role === "admin" 
      ? await storage.getOrders() 
      : await storage.getOrders(req.user!.id);
    res.json(ordersList);
  });

  app.get(api.orders.get.path, requireAuth, async (req, res) => {
    const order = await storage.getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    if (req.user!.role !== "admin" && order.userId !== req.user!.id) {
      return res.status(401).json({ message: "No autorizado" });
    }
    res.json(order);
  });

  app.post(api.orders.create.path, requireAuth, async (req, res) => {
    try {
      const data = api.orders.create.input.parse(req.body);
      
      const cart = await storage.getCart(req.user!.id);
      if (cart.items.length === 0) {
        return res.status(400).json({ message: "El carrito esta vacio" });
      }

      let total = 0;
      const items = cart.items.map(i => {
        const effectivePrice = (i.product.isOffer && i.product.offerPrice && Number(i.product.offerPrice) > 0 && Number(i.product.offerPrice) < Number(i.product.price)) ? i.product.offerPrice : i.product.price;
        const price = Number(effectivePrice) * i.quantity;
        total += price;
        return {
          productId: i.productId,
          quantity: i.quantity,
          price: effectivePrice
        };
      });

      const orderInfo = {
        shippingAddress: data.shippingAddress,
        totalAmount: total.toString(),
        status: "pagado"
      };

      const order = await storage.createOrder(req.user!.id, orderInfo as any, items);
      await storage.clearCart(req.user!.id);
      
      res.status(201).json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch(api.orders.updateStatus.path, requireAdmin, async (req, res) => {
    try {
      const data = api.orders.updateStatus.input.parse(req.body);
      const order = await storage.updateOrderStatus(Number(req.params.id), data.status);
      res.json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post(api.orders.createGuest.path, async (req, res) => {
    try {
      const data = api.orders.createGuest.input.parse(req.body);
      const { randomBytes } = await import("crypto");
      const guestAccessToken = randomBytes(32).toString("hex");

      const allProducts = await storage.getProducts();
      let total = 0;
      const orderItems = data.items.map(item => {
        const product = allProducts.find(p => p.id === item.productId);
        if (!product) throw new Error(`Producto no encontrado: ${item.productId}`);
        const effectivePrice = (product.isOffer && product.offerPrice && Number(product.offerPrice) > 0 && Number(product.offerPrice) < Number(product.price)) ? product.offerPrice : product.price;
        const price = Number(effectivePrice);
        total += price * item.quantity;
        return { productId: item.productId, quantity: item.quantity, price: effectivePrice };
      });

      const order = await storage.createGuestOrder({
        shippingAddress: data.shippingAddress,
        totalAmount: total.toString(),
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestAccessToken,
      }, orderItems);

      res.status(201).json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get(api.admin.customers.path, requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      const allOrders = await storage.getOrders();

      const customers = allUsers.filter(u => u.role !== "admin").map(u => {
        const userOrders = allOrders.filter(o => o.userId === u.id);
        const totalSpent = userOrders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
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

      const guestOrders = allOrders.filter(o => !o.userId);
      const guestMap = new Map<string, { name: string; phone: string; orders: typeof guestOrders }>();
      guestOrders.forEach(o => {
        const key = (o.guestPhone || o.guestName || "desconocido").toLowerCase();
        if (!guestMap.has(key)) guestMap.set(key, { name: o.guestName || "Invitado", phone: o.guestPhone || "", orders: [] });
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
    if (!page) return res.status(404).json({ message: "Pagina no encontrada" });
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
      const page = await storage.upsertSitePage(req.params.slug, updates);
      res.json(page);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/orders/guest/:id", async (req, res) => {
    const token = req.query.token as string;
    if (!token) return res.status(401).json({ message: "Token de acceso requerido" });
    const order = await storage.getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    if (order.userId) return res.status(401).json({ message: "No autorizado" });
    if (order.guestAccessToken !== token) return res.status(403).json({ message: "Token invalido" });
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
    imageUrl: z.string().nullable().optional(),
    productId1: z.number().nullable().optional(),
    productId2: z.number().nullable().optional(),
    buttonText: z.string().nullable().optional(),
    buttonLink: z.string().nullable().optional().refine((val) => {
      if (!val) return true;
      const trimmed = val.trim().toLowerCase();
      if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:")) return false;
      return true;
    }, { message: "URL no permitida" }),
    buttonCategoryId: z.number().nullable().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  });

  app.post("/api/admin/banner-slides", requireAdmin, async (req, res) => {
    try {
      const parsed = bannerSlideValidator.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.flatten() });
      const allSlides = await storage.getBannerSlides(false);
      const maxOrder = allSlides.reduce((max, s) => Math.max(max, s.sortOrder), -1);
      const slide = await storage.createBannerSlide({ ...parsed.data, sortOrder: maxOrder + 1, isActive: parsed.data.isActive ?? true });
      res.status(201).json(slide);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/banner-slides/:id", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getBannerSlide(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: "Slide no encontrado" });
      const parsed = bannerSlideValidator.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.flatten() });
      const slide = await storage.updateBannerSlide(Number(req.params.id), parsed.data);
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
      await storage.deleteBannerSlide(Number(req.params.id));
      res.status(204).send();
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
}

async function seedUsers() {
  const { db } = await import("./db");
  const { users } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@selvaimport.com";
  const adminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? undefined : "admin123");

  const existingAdmin = await storage.getUserByEmail(adminEmail);
  if (existingAdmin) {
    if (existingAdmin.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, existingAdmin.id));
      console.log(`[seed] Promoted ${adminEmail} to admin`);
    }
    if (adminPassword) {
      const adminPass = await hashPassword(adminPassword);
      await db.update(users).set({ password: adminPass }).where(eq(users.id, existingAdmin.id));
    }
  } else if (adminPassword) {
    const adminPass = await hashPassword(adminPassword);
    const admin = await storage.createUser({
      email: adminEmail,
      name: "Admin Selva Import",
      password: adminPass,
    } as any);
    await db.update(users).set({ role: "admin" }).where(eq(users.id, admin.id));
  } else {
    console.warn("[seed] ADMIN_PASSWORD not set and admin account does not exist - skipping admin creation");
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
  ];

  for (const cat of cats) {
    if (!existingSlugs.has(cat.slug)) {
      await storage.createCategory(cat);
    }
  }

  if (existingCats.length > 0) return;

  const allCats = await storage.getCategories();
  const catBySlug = (slug: string) => allCats.find((c: any) => c.slug === slug);
  const createdCats = [catBySlug("tecnologia"), catBySlug("moda-accesorios"), catBySlug("hogar-cocina")];

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
    { slug: "terminos", title: "Terminos y Condiciones", content: "Aqui puedes escribir los terminos y condiciones de SELVA IMPORT. Edita esta pagina desde el panel de administracion." },
    { slug: "privacidad", title: "Politica de Privacidad", content: "Aqui puedes escribir la politica de privacidad de SELVA IMPORT. Edita esta pagina desde el panel de administracion." },
    { slug: "envios", title: "Envios y Devoluciones", content: "Aqui puedes escribir la politica de envios y devoluciones de SELVA IMPORT. Edita esta pagina desde el panel de administracion." },
    { slug: "quienes-somos", title: "Quienes Somos", content: "Somos SELVA IMPORT, tu tienda de confianza con los mejores productos importados. Edita esta pagina desde el panel de administracion." },
  ];

  for (const page of defaultPages) {
    const existing = await storage.getSitePage(page.slug);
    if (!existing) {
      await storage.upsertSitePage(page.slug, page);
    }
  }
}
