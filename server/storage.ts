import { getCached, setCache, invalidateCache } from "./cache";
import { db } from "./db";
import { eq, and, isNull, isNotNull, desc, ilike, or, sql } from "drizzle-orm";
import {
  users, categories, products, carts, cartItems, orders, orderItems, sitePages, bannerSlides, coupons,
  homeRows, homeRowItems, homeRectangles, homeRectangleItems,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Product, type InsertProduct, type ProductWithCategory,
  type Cart, type CartItem, type InsertCartItem, type CartItemWithProduct,
  type Order, type InsertOrder, type OrderItem, type OrderWithItems,
  type SitePage, type InsertSitePage,
  type BannerSlide, type InsertBannerSlide, type BannerSlideWithProducts,
  type Coupon, type InsertCoupon,
  type HomeRow, type InsertHomeRow, type HomeRowItem,
  type HomeRectangle, type InsertHomeRectangle, type HomeRectangleItem
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

type OrderItemInput = {
  productId: number;
  quantity: number;
  price: string;
};

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  getProducts(categoryId?: number, search?: string, onlyShowOnHome?: boolean, page?: number, limit?: number): Promise<{ products: ProductWithCategory[]; total: number; page: number; totalPages: number }>;
  getProduct(id: number): Promise<ProductWithCategory | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  checkLowStock(threshold?: number): Promise<{ id: number; name: string; inventory: number }[]>;

  getCart(userId: number): Promise<{ cart: Cart; items: CartItemWithProduct[] }>;
  addCartItem(userId: number, item: InsertCartItem): Promise<CartItemWithProduct>;
  updateCartItem(itemId: number, quantity: number): Promise<CartItemWithProduct>;
  removeCartItem(itemId: number): Promise<void>;
  clearCart(userId: number): Promise<void>;

  getOrders(userId?: number): Promise<OrderWithItems[]>;
  getOrder(id: number): Promise<OrderWithItems | undefined>;

  createOrder(
    userId: number,
    orderInfo: InsertOrder & { totalAmount: string; status: string },
    items: OrderItemInput[]
  ): Promise<OrderWithItems>;

  createGuestOrder(
    orderInfo: {
      shippingAddress: string;
      totalAmount: string;
      guestName: string;
      guestPhone: string;
      guestAccessToken?: string;
    },
    items: OrderItemInput[]
  ): Promise<OrderWithItems>;

  createOrderWithStock(
    userId: number,
    orderInfo: InsertOrder & { totalAmount: string; status: string },
    items: OrderItemInput[]
  ): Promise<OrderWithItems>;

  createGuestOrderWithStock(
    orderInfo: {
      shippingAddress: string;
      totalAmount: string;
      guestName: string;
      guestPhone: string;
      guestAccessToken?: string;
    },
    items: OrderItemInput[]
  ): Promise<OrderWithItems>;

  updateOrderStatus(id: number, status: string): Promise<Order>;

  getSitePage(slug: string): Promise<SitePage | undefined>;
  getSitePages(): Promise<SitePage[]>;
  upsertSitePage(slug: string, data: Partial<InsertSitePage>): Promise<SitePage>;

  getBannerSlides(activeOnly?: boolean): Promise<BannerSlideWithProducts[]>;
  getBannerSlide(id: number): Promise<BannerSlide | undefined>;
  createBannerSlide(slide: InsertBannerSlide): Promise<BannerSlide>;
  updateBannerSlide(id: number, data: Partial<InsertBannerSlide>): Promise<BannerSlide>;
  deleteBannerSlide(id: number): Promise<void>;

  getCoupons(): Promise<Coupon[]>;
  getCoupon(id: number): Promise<Coupon | undefined>;
  getCouponByCode(code: string): Promise<Coupon | undefined>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: number, data: Partial<InsertCoupon>): Promise<Coupon>;
  deleteCoupon(id: number): Promise<void>;
  incrementCouponUses(id: number): Promise<Coupon>;

  // Home Rows
  getHomeRows(activeOnly?: boolean): Promise<(HomeRow & { items: (HomeRowItem & { product: ProductWithCategory })[] })[]>;
  getHomeRow(id: number): Promise<HomeRow | undefined>;
  createHomeRow(data: InsertHomeRow): Promise<HomeRow>;
  updateHomeRow(id: number, data: Partial<InsertHomeRow>): Promise<HomeRow>;
  deleteHomeRow(id: number): Promise<void>;
  setHomeRowItems(homeRowId: number, productIds: number[]): Promise<void>;

  // Home Rectangles
  getHomeRectangles(): Promise<(HomeRectangle & { product?: ProductWithCategory | null; category?: Category | null; items?: (HomeRectangleItem & { product: ProductWithCategory })[] })[]>;
  upsertHomeRectangle(position: number, data: Partial<InsertHomeRectangle>): Promise<HomeRectangle>;
  setHomeRectangleItems(homeRectangleId: number, productIds: number[]): Promise<void>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getCategories(): Promise<Category[]> {
    const cached = getCached<Category[]>('categories');
    if (cached) return cached;
    const result = await db.select().from(categories);
    setCache('categories', result, 120000);
    return result;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [cat] = await db.insert(categories).values(category).returning();
    invalidateCache('categories');
    return cat;
  }

  async getProducts(categoryId?: number, search?: string, onlyShowOnHome?: boolean, page?: number, limit?: number): Promise<{ products: ProductWithCategory[]; total: number; page: number; totalPages: number }> {
    const cacheKey = `products:${categoryId || ''}:${search || ''}:${onlyShowOnHome || ''}:${page || ''}:${limit || ''}`;
    const cached = getCached<{ products: ProductWithCategory[]; total: number; page: number; totalPages: number }>(cacheKey);
    if (cached) return cached;
    const cats = await this.getCategories();
    const conditions = [];

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    } else if (onlyShowOnHome) {
      const hiddenCategoryIds = cats
        .filter(c => c.showOnHome === false)
        .map(c => c.id);

      if (hiddenCategoryIds.length > 0) {
        // Excluir productos de categorías que no se muestran en el home
        // Si categoryId es null (sin categoría), se muestra igual
        conditions.push(
          or(
            isNull(products.categoryId),
            sql`${products.categoryId} NOT IN (${sql.join(hiddenCategoryIds, sql`, `)})`
          )
        );
      }
    }

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`)
        )
      );
    }

    const withPagination = page !== undefined && limit !== undefined;
    const effectivePage = page ?? 1;
    const effectiveLimit = limit ?? 0;

    // Count total matching products
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(count);

    const query = db.select().from(products);
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    if (withPagination) {
      query.limit(effectiveLimit).offset((effectivePage - 1) * effectiveLimit);
    }

    const filteredProducts = await query.orderBy(desc(products.createdAt));

    const result = {
      products: filteredProducts.map((p) => ({
        ...p,
        category: cats.find((c) => c.id === p.categoryId),
      })),
      total,
      page: effectivePage,
      totalPages: withPagination ? Math.max(1, Math.ceil(total / effectiveLimit)) : 1,
    };
    setCache(cacheKey, result, 60000);
    return result;
  }

  async getProduct(id: number): Promise<ProductWithCategory | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) return undefined;

    const [category] = product.categoryId
      ? await db.select().from(categories).where(eq(categories.id, product.categoryId))
      : [undefined];

    return { ...product, category };
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [p] = await db.insert(products).values(product).returning();
    return p;
  }

  async updateProduct(id: number, productUpdate: Partial<InsertProduct>): Promise<Product> {
    const [p] = await db.update(products).set(productUpdate).where(eq(products.id, id)).returning();
    return p;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
    invalidateCache('products');
    invalidateCache('categories');
  }

  async checkLowStock(threshold: number = 5): Promise<{ id: number; name: string; inventory: number }[]> {
    return await db
      .select({ id: products.id, name: products.name, inventory: products.inventory })
      .from(products)
      .where(and(
        sql`${products.inventory} <= ${threshold}`,
        sql`${products.inventory} > 0`,
        eq(products.isVisible, true)
      ));
  }

  private async getOrCreateCart(userId: number): Promise<Cart> {
    let [cart] = await db.select().from(carts).where(eq(carts.userId, userId));
    if (!cart) {
      [cart] = await db.insert(carts).values({ userId }).returning();
    }
    return cart;
  }

  async getCart(userId: number): Promise<{ cart: Cart; items: CartItemWithProduct[] }> {
    const cart = await this.getOrCreateCart(userId);
    const cItems = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
    const productsList = await db.select().from(products);

    const itemsWithProduct = cItems
      .map((item) => ({
        ...item,
        product: productsList.find((p) => p.id === item.productId)!,
      }))
      .filter((i) => i.product);

    return { cart, items: itemsWithProduct };
  }

  private async ensureCartItemStock(productId: number, requestedQty: number): Promise<Product> {
    const [product] = await db.select().from(products).where(eq(products.id, productId));

    if (!product) {
      throw new Error("Producto no encontrado");
    }

    if ((product.inventory ?? 0) < requestedQty) {
      throw new Error(`Stock insuficiente para "${product.name}". Disponible: ${product.inventory}`);
    }

    return product;
  }

  async addCartItem(userId: number, item: InsertCartItem): Promise<CartItemWithProduct> {
    const cart = await this.getOrCreateCart(userId);

    const [existing] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, item.productId)));

    const requestedQty = existing
      ? existing.quantity + (item.quantity ?? 1)
      : (item.quantity ?? 1);

    const product = await this.ensureCartItemStock(item.productId, requestedQty);

    let finalItem: CartItem;
    if (existing) {
      [finalItem] = await db
        .update(cartItems)
        .set({ quantity: requestedQty })
        .where(eq(cartItems.id, existing.id))
        .returning();
    } else {
      [finalItem] = await db
        .insert(cartItems)
        .values({ ...item, cartId: cart.id })
        .returning();
    }

    return { ...finalItem, product };
  }

  async updateCartItem(itemId: number, quantity: number): Promise<CartItemWithProduct> {
    if (quantity <= 0) {
      await this.removeCartItem(itemId);
      throw new Error("Item removed");
    }

    const [currentItem] = await db.select().from(cartItems).where(eq(cartItems.id, itemId));
    if (!currentItem) {
      throw new Error("Item no encontrado");
    }

    const product = await this.ensureCartItemStock(currentItem.productId, quantity);

    const [updated] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, itemId))
      .returning();

    return { ...updated, product };
  }

  async removeCartItem(itemId: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, itemId));
  }

  async clearCart(userId: number): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
  }

  async getOrders(userId?: number): Promise<OrderWithItems[]> {
    const conditions = [];
    if (userId) conditions.push(eq(orders.userId, userId));

    const query = db.select().from(orders).orderBy(desc(orders.createdAt));
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const ordersList = await query;
    if (ordersList.length === 0) return [];

    const orderIds = ordersList.map((o) => o.id);
    const items = await db
      .select()
      .from(orderItems)
      .where(or(...orderIds.map((id) => eq(orderItems.orderId, id))));

    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const allProducts =
      productIds.length > 0
        ? await db.select().from(products).where(or(...productIds.map((id) => eq(products.id, id))))
        : [];

    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const itemsByOrder = new Map<number, (OrderItem & { product: Product })[]>();

    items.forEach((item) => {
      const orderId = item.orderId;
      if (!itemsByOrder.has(orderId)) itemsByOrder.set(orderId, []);
      itemsByOrder.get(orderId)!.push({
        ...item,
        product: productMap.get(item.productId)!,
      });
    });

    return ordersList.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) || [],
    }));
  }

  async getOrder(id: number): Promise<OrderWithItems | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const allProducts = await db.select().from(products);

    return {
      ...order,
      items: items.map((i) => ({
        ...i,
        product: (allProducts as Product[]).find((p) => p.id === i.productId)!,
      })),
    };
  }

  private async validateAndDiscountInventory(
    tx: any,
    items: OrderItemInput[]
  ): Promise<Product[]> {
    const validatedProducts: Product[] = [];

    for (const item of items) {
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, item.productId));

      if (!product) {
        throw new Error(`Producto no encontrado: ${item.productId}`);
      }

      if ((product.inventory ?? 0) < item.quantity) {
        throw new Error(
          `Stock insuficiente para "${product.name}". Disponible: ${product.inventory}, solicitado: ${item.quantity}`
        );
      }

      const updatedRows = await tx
        .update(products)
        .set({
          inventory: sql`${products.inventory} - ${item.quantity}`,
        })
        .where(
          and(
            eq(products.id, item.productId),
            sql`${products.inventory} >= ${item.quantity}`
          )
        )
        .returning();

      if (!updatedRows.length) {
        throw new Error(`No se pudo reservar stock para "${product.name}"`);
      }

      validatedProducts.push(updatedRows[0]);
    }

    return validatedProducts;
  }

  private async buildOrderResponse(
    tx: any,
    order: Order,
    insertedItems: OrderItem[]
  ): Promise<OrderWithItems> {
    const productIds = Array.from(new Set(insertedItems.map((i) => i.productId)));
    const allProducts =
      productIds.length > 0
        ? await tx.select().from(products).where(or(...productIds.map((id) => eq(products.id, id))))
        : [];

    return {
      ...order,
      items: insertedItems.map((i) => ({
        ...i,
        product: (allProducts as Product[]).find((p) => p.id === i.productId)!,
      })),
    };
  }

  async createOrderWithStock(
    userId: number,
    orderInfo: InsertOrder & { totalAmount: string; status: string },
    items: OrderItemInput[]
  ): Promise<OrderWithItems> {
    return await db.transaction(async (tx) => {
      await this.validateAndDiscountInventory(tx, items);

      const [order] = await tx
        .insert(orders)
        .values({ ...orderInfo, userId })
        .returning();

      const orderItemsToInsert = items.map((i) => ({
        orderId: order.id,
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
      }));

      const insertedItems = await tx
        .insert(orderItems)
        .values(orderItemsToInsert)
        .returning();

      return await this.buildOrderResponse(tx, order, insertedItems);
    });
  }

  async createGuestOrderWithStock(
    orderInfo: {
      shippingAddress: string;
      totalAmount: string;
      guestName: string;
      guestPhone: string;
      guestAccessToken?: string;
    },
    items: OrderItemInput[]
  ): Promise<OrderWithItems> {
    const orderResult = await db.transaction(async (tx) => {
      await this.validateAndDiscountInventory(tx, items);

      const [order] = await tx
        .insert(orders)
        .values({
          shippingAddress: orderInfo.shippingAddress,
          totalAmount: orderInfo.totalAmount,
          guestName: orderInfo.guestName,
          guestPhone: orderInfo.guestPhone,
          guestAccessToken: orderInfo.guestAccessToken,
          status: "pagado",
        })
        .returning();

      const orderItemsToInsert = items.map((i) => ({
        orderId: order.id,
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
      }));

      const insertedItems = await tx
        .insert(orderItems)
        .values(orderItemsToInsert)
        .returning();

      return await this.buildOrderResponse(tx, order, insertedItems);
    });
    invalidateCache('products');
    return orderResult;
  }

  // Compatibilidad con tu código actual
  async createOrder(
    userId: number,
    orderInfo: InsertOrder & { totalAmount: string; status: string },
    items: OrderItemInput[]
  ): Promise<OrderWithItems> {
    return this.createOrderWithStock(userId, orderInfo, items);
  }

  // Compatibilidad con tu código actual
  async createGuestOrder(
    orderInfo: {
      shippingAddress: string;
      totalAmount: string;
      guestName: string;
      guestPhone: string;
      guestAccessToken?: string;
    },
    items: OrderItemInput[]
  ): Promise<OrderWithItems> {
    return this.createGuestOrderWithStock(orderInfo, items);
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    // Si se cancela el pedido, devolver el stock a los productos
    if (status === "cancelado" || status === "cancelled") {
      const order = await this.getOrder(id);
      if (order && order.status !== "cancelado" && order.status !== "cancelled") {
        for (const item of order.items) {
          await db
            .update(products)
            .set({ inventory: sql`${products.inventory} + ${item.quantity}` })
            .where(eq(products.id, item.productId));
        }
      }
    }
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return order;
  }

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
  }

  async getSitePage(slug: string): Promise<SitePage | undefined> {
    const [page] = await db.select().from(sitePages).where(eq(sitePages.slug, slug));
    return page;
  }

  async getSitePages(): Promise<SitePage[]> {
    return db.select().from(sitePages);
  }

  async upsertSitePage(slug: string, data: Partial<InsertSitePage>): Promise<SitePage> {
    const existing = await this.getSitePage(slug);
    if (existing) {
      const [updated] = await db
        .update(sitePages)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sitePages.slug, slug))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(sitePages)
        .values({
          slug,
          title: data.title || slug,
          content: data.content || "",
          imageUrl: data.imageUrl,
        })
        .returning();
      return created;
    }
  }

  async getBannerSlides(activeOnly = false): Promise<BannerSlideWithProducts[]> {
    const conditions = [];
    if (activeOnly) conditions.push(eq(bannerSlides.isActive, true));

    const query = db.select().from(bannerSlides).orderBy(bannerSlides.sortOrder);
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const slides = await query;
    if (slides.length === 0) return [];

    const productIds = new Set<number>();
    const categoryIds = new Set<number>();

    slides.forEach((s) => {
      if (s.productId1) productIds.add(s.productId1);
      if (s.productId2) productIds.add(s.productId2);
      if (s.buttonCategoryId) categoryIds.add(s.buttonCategoryId);
    });

    const [allProducts, allCategories] = await Promise.all([
      productIds.size > 0
        ? db.select().from(products).where(or(...Array.from(productIds).map((id) => eq(products.id, id))))
        : Promise.resolve([]),
      categoryIds.size > 0
        ? db.select().from(categories).where(or(...Array.from(categoryIds).map((id) => eq(categories.id, id))))
        : Promise.resolve([]),
    ]);

    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    return slides.map((slide) => ({
      ...slide,
      product1: slide.productId1 ? productMap.get(slide.productId1) || null : null,
      product2: slide.productId2 ? productMap.get(slide.productId2) || null : null,
      buttonCategory: slide.buttonCategoryId ? categoryMap.get(slide.buttonCategoryId) || null : null,
    }));
  }

  async getBannerSlide(id: number): Promise<BannerSlide | undefined> {
    const [slide] = await db.select().from(bannerSlides).where(eq(bannerSlides.id, id));
    return slide;
  }

  async createBannerSlide(slide: InsertBannerSlide): Promise<BannerSlide> {
    const [created] = await db.insert(bannerSlides).values(slide).returning();
    return created;
  }

  async updateBannerSlide(id: number, data: Partial<InsertBannerSlide>): Promise<BannerSlide> {
    const [updated] = await db.update(bannerSlides).set(data).where(eq(bannerSlides.id, id)).returning();
    return updated;
  }

  async deleteBannerSlide(id: number): Promise<void> {
    await db.delete(bannerSlides).where(eq(bannerSlides.id, id));
  }

  async getCoupons(): Promise<Coupon[]> {
    return await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }

  async getCoupon(id: number): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id));
    return coupon;
  }

  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase()));
    return coupon;
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const [created] = await db
      .insert(coupons)
      .values({
        ...coupon,
        code: coupon.code.toUpperCase(),
      })
      .returning();
    return created;
  }

  async updateCoupon(id: number, data: Partial<InsertCoupon>): Promise<Coupon> {
    const [updated] = await db
      .update(coupons)
      .set({
        ...data,
        code: data.code ? data.code.toUpperCase() : undefined,
      })
      .where(eq(coupons.id, id))
      .returning();
    return updated;
  }

  async deleteCoupon(id: number): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  async incrementCouponUses(id: number): Promise<Coupon> {
    const coupon = await this.getCoupon(id);
    if (!coupon) throw new Error("Cupón no encontrado");

    const [updated] = await db
      .update(coupons)
      .set({
        currentUses: (coupon.currentUses || 0) + 1,
      })
      .where(eq(coupons.id, id))
      .returning();

    return updated;
  }

  async getHomeRows(activeOnly = false): Promise<(HomeRow & { items: (HomeRowItem & { product: ProductWithCategory })[] })[]> {
    const rows = activeOnly
      ? await db.select().from(homeRows).where(eq(homeRows.isActive, true)).orderBy(homeRows.sortOrder)
      : await db.select().from(homeRows).orderBy(homeRows.sortOrder);

    if (rows.length === 0) return [];

    const rowIds = rows.map((r) => r.id);
    const items = await db
      .select()
      .from(homeRowItems)
      .where(or(...rowIds.map((id) => eq(homeRowItems.homeRowId, id))))
      .orderBy(homeRowItems.sortOrder);

    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const allProducts = productIds.length > 0
      ? await db.select().from(products).where(or(...productIds.map((id) => eq(products.id, id))))
      : [];

    const allCats = await this.getCategories();
    const productMap = new Map(
      allProducts.map((p) => [p.id, { ...p, category: allCats.find((c) => c.id === p.categoryId) }])
    );

    return rows.map((row) => ({
      ...row,
      items: items
        .filter((i) => i.homeRowId === row.id)
        .map((i) => ({ ...i, product: productMap.get(i.productId)! }))
        .filter((i) => i.product),
    }));
  }

  async getHomeRow(id: number): Promise<HomeRow | undefined> {
    const [row] = await db.select().from(homeRows).where(eq(homeRows.id, id));
    return row;
  }

  async createHomeRow(data: InsertHomeRow): Promise<HomeRow> {
    const [row] = await db.insert(homeRows).values(data).returning();
    return row;
  }

  async updateHomeRow(id: number, data: Partial<InsertHomeRow>): Promise<HomeRow> {
    const [row] = await db.update(homeRows).set(data).where(eq(homeRows.id, id)).returning();
    return row;
  }

  async deleteHomeRow(id: number): Promise<void> {
    await db.delete(homeRowItems).where(eq(homeRowItems.homeRowId, id));
    await db.delete(homeRows).where(eq(homeRows.id, id));
  }

  async setHomeRowItems(homeRowId: number, productIds: number[]): Promise<void> {
    await db.delete(homeRowItems).where(eq(homeRowItems.homeRowId, homeRowId));

    if (productIds.length > 0) {
      await db.insert(homeRowItems).values(
        productIds.map((productId, idx) => ({
          homeRowId,
          productId,
          sortOrder: idx,
        }))
      );
    }
  }

  async getHomeRectangles(): Promise<(HomeRectangle & { product?: ProductWithCategory | null; category?: Category | null; items?: (HomeRectangleItem & { product: ProductWithCategory })[] })[]> {
    const rects = await db.select().from(homeRectangles).orderBy(homeRectangles.position);
    if (rects.length === 0) return [];

    const productIds = new Set<number>();
    const categoryIds = new Set<number>();

    rects.forEach((r) => {
      if (r.productId) productIds.add(r.productId);
      if (r.categoryId) categoryIds.add(r.categoryId);
    });

    const rectIds = rects.map((r) => r.id);
    const allItems = rectIds.length > 0
      ? await db
          .select()
          .from(homeRectangleItems)
          .where(or(...rectIds.map((id) => eq(homeRectangleItems.homeRectangleId, id))))
          .orderBy(homeRectangleItems.sortOrder)
      : [];

    allItems.forEach((i) => productIds.add(i.productId));

    const allCats = await this.getCategories();
    const allProds = productIds.size > 0
      ? await db.select().from(products).where(or(...Array.from(productIds).map((id) => eq(products.id, id))))
      : [];

    const productMap = new Map(
      allProds.map((p) => [p.id, { ...p, category: allCats.find((c) => c.id === p.categoryId) }])
    );
    const categoryMap = new Map(allCats.map((c) => [c.id, c]));

    return rects.map((rect) => ({
      ...rect,
      product: rect.productId ? productMap.get(rect.productId) || null : null,
      category: rect.categoryId ? categoryMap.get(rect.categoryId) || null : null,
      items: allItems
        .filter((i) => i.homeRectangleId === rect.id)
        .map((i) => ({ ...i, product: productMap.get(i.productId)! }))
        .filter((i) => i.product),
    }));
  }

  async upsertHomeRectangle(position: number, data: Partial<InsertHomeRectangle>): Promise<HomeRectangle> {
    const [existing] = await db.select().from(homeRectangles).where(eq(homeRectangles.position, position));

    if (existing) {
      const [updated] = await db
        .update(homeRectangles)
        .set(data)
        .where(eq(homeRectangles.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(homeRectangles)
        .values({ ...data, position } as any)
        .returning();
      return created;
    }
  }

  async setHomeRectangleItems(homeRectangleId: number, productIds: number[]): Promise<void> {
    await db.delete(homeRectangleItems).where(eq(homeRectangleItems.homeRectangleId, homeRectangleId));

    if (productIds.length > 0) {
      await db.insert(homeRectangleItems).values(
        productIds.map((productId, idx) => ({
          homeRectangleId,
          productId,
          sortOrder: idx,
        }))
      );
    }
  }
}

export const storage = new DatabaseStorage();
