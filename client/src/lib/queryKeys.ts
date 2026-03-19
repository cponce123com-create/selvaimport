/**
 * Fuente de verdad para todas las queryKeys de React Query.
 * Usar estas constantes evita typos y garantiza invalidación correcta del caché.
 */

export const QUERY_KEYS = {
  // Productos
  products: ['products'] as const,
  product: (slug: string) => ['products', slug] as const,
  productById: (id: number) => ['products', 'id', id] as const,

  // Categorías
  categories: ['categories'] as const,

  // Carrito
  cart: ['cart'] as const,

  // Órdenes
  orders: ['orders'] as const,
  order: (id: number) => ['orders', id] as const,
  guestOrder: (id: number) => ['orders', 'guest', id] as const,

  // Autenticación
  user: ['user'] as const,

  // Admin
  adminOrders: ['admin', 'orders'] as const,
  adminProducts: ['admin', 'products'] as const,
  adminCategories: ['admin', 'categories'] as const,
  adminCustomers: ['admin', 'customers'] as const,
  adminBannerSlides: ['admin', 'banner-slides'] as const,

  // Banner público
  bannerSlides: ['banner-slides'] as const,

  // Páginas CMS
  pages: ['pages'] as const,
  page: (slug: string) => ['pages', slug] as const,
} as const;
