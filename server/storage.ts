import { db } from "./db";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import {
  users, categories, products, carts, cartItems, orders, orderItems, sitePages, bannerSlides, coupons,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Product, type InsertProduct, type ProductWithCategory,
  type Cart, type CartItem, type InsertCartItem, type CartItemWithProduct,
  type Order, type InsertOrder, type OrderItem, type OrderWithItems,
  type SitePage, type InsertSitePage,
  type BannerSlide, type InsertBannerSlide, type BannerSlideWithProducts,
  type Coupon, type InsertCoupon
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  getProducts(categoryId?: number, search?: string): Promise<ProductWithCategory[]>;
  getProduct(id: number): Promise<ProductWithCategory | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  getCart(userId: number): Promise<{ cart: Cart; items: CartItemWithProduct[] }>;
  addCartItem(userId: number, item: InsertCartItem): Promise<CartItemWithProduct>;
  updateCartItem(itemId: number, quantity: number): Promise<CartItemWithProduct>;
  removeCartItem(itemId: number): Promise<void>;
  clearCart(userId: number): Promise<void>;

  getOrders(userId?: number): Promise<OrderWithItems[]>;
  getOrder(id: number): Promise<OrderWithItems | undefined>;
  createOrder(userId: number, orderInfo: InsertOrder & { totalAmount: string; status: string }, items: { productId: number; quantity: number; price: string }[]): Promise<OrderWithItems>;
  createGuestOrder(orderInfo: { shippingAddress: string; totalAmount: string; guestName: string; guestPhone: string; guestAccessToken?: string }, items: { productId: number; quantity: number; price: string }[]): Promise<OrderWithItems>;
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
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [cat] = await db.insert(categories).values(category).returning();
    return cat;
  }

  async getProducts(categoryId?: number, search?: string): Promise<ProductWithCategory[]> {
    const cats = await this.getCategories();
    const tacoraCat = cats.find(c => c.slug === "tacora");
    
    let query = db.select().from(products);
    const allProducts = await query;
    let filtered = allProducts;
    
    if (categoryId) {
      filtered = filtered.filter(p => p.categoryId === categoryId);
    } else if (!search) {
      // Si no se especifica categoría ni búsqueda, excluir TACORA (para el home)
      if (tacoraCat) {
        filtered = filtered.filter(p => p.categoryId !== tacoraCat.id);
      }
    }
    
    if (search) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
    }

    return filtered.map(p => ({
      ...p,
      category: cats.find(c => c.id === p.categoryId)
    }));
  }

  async getProduct(id: number): Promise<ProductWithCategory | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) return undefined;
    const [category] = product.categoryId ? await db.select().from(categories).where(eq(categories.id, product.categoryId)) : [undefined];
    return { ...product, category };
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

    const itemsWithProduct = cItems.map(item => ({
      ...item,
      product: productsList.find(p => p.id === item.productId)!
    })).filter(i => i.product);

    return { cart, items: itemsWithProduct };
  }

  async addCartItem(userId: number, item: InsertCartItem): Promise<CartItemWithProduct> {
    const cart = await this.getOrCreateCart(userId);

    const [existing] = await db.select().from(cartItems).where(
      and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, item.productId))
    );

    let finalItem: CartItem;
    if (existing) {
      [finalItem] = await db.update(cartItems)
        .set({ quantity: existing.quantity + item.quantity })
        .where(eq(cartItems.id, existing.id))
        .returning();
    } else {
      [finalItem] = await db.insert(cartItems).values({ ...item, cartId: cart.id }).returning();
    }

    const [product] = await db.select().from(products).where(eq(products.id, finalItem.productId));
    return { ...finalItem, product };
  }

  async updateCartItem(itemId: number, quantity: number): Promise<CartItemWithProduct> {
    if (quantity === 0) {
      await this.removeCartItem(itemId);
      throw new Error("Item removed");
    }
    const [updated] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, itemId)).returning();
    const [product] = await db.select().from(products).where(eq(products.id, updated.productId));
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
    let ordersList;
    if (userId) {
      ordersList = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    } else {
      ordersList = await db.select().from(orders).orderBy(desc(orders.createdAt));
    }

    if (ordersList.length === 0) return [];

    const allItems = await db.select().from(orderItems);
    const allProducts = await db.select().from(products);

    return ordersList.map(o => ({
      ...o,
      items: allItems.filter(i => i.orderId === o.id).map(i => ({
        ...i,
        product: allProducts.find(p => p.id === i.productId)!
      }))
    }));
  }

  async getOrder(id: number): Promise<OrderWithItems | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const allProducts = await db.select().from(products);

    return {
      ...order,
      items: items.map(i => ({
        ...i,
        product: allProducts.find(p => p.id === i.productId)!
      }))
    };
  }

  async createOrder(userId: number, orderInfo: InsertOrder & { totalAmount: string; status: string }, items: { productId: number; quantity: number; price: string }[]): Promise<OrderWithItems> {
    const [order] = await db.insert(orders).values({ ...orderInfo, userId }).returning();

    const orderItemsToInsert = items.map(i => ({
      orderId: order.id,
      productId: i.productId,
      quantity: i.quantity,
      price: i.price,
    }));

    const insertedItems = await db.insert(orderItems).values(orderItemsToInsert).returning();
    const allProducts = await db.select().from(products);

    return {
      ...order,
      items: insertedItems.map(i => ({
        ...i,
        product: allProducts.find(p => p.id === i.productId)!
      }))
    };
  }

  async createGuestOrder(orderInfo: { shippingAddress: string; totalAmount: string; guestName: string; guestPhone: string; guestAccessToken?: string }, items: { productId: number; quantity: number; price: string }[]): Promise<OrderWithItems> {
    const [order] = await db.insert(orders).values({
      shippingAddress: orderInfo.shippingAddress,
      totalAmount: orderInfo.totalAmount,
      guestName: orderInfo.guestName,
      guestPhone: orderInfo.guestPhone,
      guestAccessToken: orderInfo.guestAccessToken,
      status: "pagado",
    }).returning();

    const orderItemsToInsert = items.map(i => ({
      orderId: order.id,
      productId: i.productId,
      quantity: i.quantity,
      price: i.price,
    }));

    const insertedItems = await db.insert(orderItems).values(orderItemsToInsert).returning();
    const allProducts = await db.select().from(products);

    return {
      ...order,
      items: insertedItems.map(i => ({
        ...i,
        product: allProducts.find(p => p.id === i.productId)!
      }))
    };
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return order;
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
      const [updated] = await db.update(sitePages).set({ ...data, updatedAt: new Date() }).where(eq(sitePages.slug, slug)).returning();
      return updated;
    } else {
      const [created] = await db.insert(sitePages).values({ slug, title: data.title || slug, content: data.content || "", imageUrl: data.imageUrl }).returning();
      return created;
    }
  }

  async getBannerSlides(activeOnly = false): Promise<BannerSlideWithProducts[]> {
    const allSlides = await db.select().from(bannerSlides).orderBy(bannerSlides.sortOrder);
    const filtered = activeOnly ? allSlides.filter(s => s.isActive) : allSlides;
    if (filtered.length === 0) return [];
    const allProducts = await db.select().from(products);
    const allCategories = await db.select().from(categories);
    return filtered.map(s => ({
      ...s,
      product1: s.productId1 ? allProducts.find(p => p.id === s.productId1) || null : null,
      product2: s.productId2 ? allProducts.find(p => p.id === s.productId2) || null : null,
      buttonCategory: s.buttonCategoryId ? allCategories.find(c => c.id === s.buttonCategoryId) || null : null,
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
    const [created] = await db.insert(coupons).values({
      ...coupon,
      code: coupon.code.toUpperCase(),
    }).returning();
    return created;
  }

  async updateCoupon(id: number, data: Partial<InsertCoupon>): Promise<Coupon> {
    const [updated] = await db.update(coupons).set({
      ...data,
      code: data.code ? data.code.toUpperCase() : undefined,
    }).where(eq(coupons.id, id)).returning();
    return updated;
  }

  async deleteCoupon(id: number): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  async incrementCouponUses(id: number): Promise<Coupon> {
    const coupon = await this.getCoupon(id);
    if (!coupon) throw new Error("Cupón no encontrado");
    const [updated] = await db.update(coupons).set({
      currentUses: (coupon.currentUses || 0) + 1,
    }).where(eq(coupons.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
