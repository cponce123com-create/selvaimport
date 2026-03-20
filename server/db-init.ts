/**
 * db-init.ts
 * Crea las tablas nuevas si no existen al iniciar el servidor.
 * Esto garantiza que la base de datos esté siempre sincronizada
 * sin necesidad de ejecutar drizzle-kit push manualmente.
 */
import { db } from "./db";
import { sql } from "drizzle-orm";

const CREATE_TABLES_SQL = [
  sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT true`,
  
  // Filas estilo Amazon del home
  sql`CREATE TABLE IF NOT EXISTS home_rows (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    row_type TEXT NOT NULL DEFAULT 'products',
    category_id INTEGER REFERENCES categories(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  sql`CREATE TABLE IF NOT EXISTS home_row_items (
    id SERIAL PRIMARY KEY,
    home_row_id INTEGER NOT NULL REFERENCES home_rows(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,

  // Sección de 4 rectángulos del home
  sql`CREATE TABLE IF NOT EXISTS home_rectangles (
    id SERIAL PRIMARY KEY,
    position INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL DEFAULT '',
    rect_type TEXT NOT NULL DEFAULT 'product',
    product_id INTEGER REFERENCES products(id),
    category_id INTEGER REFERENCES categories(id),
    is_active BOOLEAN NOT NULL DEFAULT true
  )`,

  sql`CREATE TABLE IF NOT EXISTS home_rectangle_items (
    id SERIAL PRIMARY KEY,
    home_rectangle_id INTEGER NOT NULL REFERENCES home_rectangles(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,

  // Índices existentes para home
  sql`CREATE INDEX IF NOT EXISTS idx_home_row_items_row_id ON home_row_items(home_row_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_home_row_items_product_id ON home_row_items(product_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_home_rectangle_items_rect_id ON home_rectangle_items(home_rectangle_id)`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_home_rectangles_position ON home_rectangles(position)`,

  // ── Índices nuevos para pedidos, carrito y productos ──
  // Acelera: listar pedidos de un usuario, panel admin de pedidos
  sql`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`,
  // Acelera: ordenar pedidos por fecha (más reciente primero)
  sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`,
  // Acelera: obtener items de un pedido
  sql`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`,
  // Acelera: buscar qué pedidos tienen un producto específico
  sql`CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)`,
  // Acelera: obtener el carrito de un usuario
  sql`CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id)`,
  // Acelera: obtener items de un carrito
  sql`CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id)`,
  // Acelera: filtrar productos por categoría
  sql`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`,
  // Acelera: listar solo productos visibles (el caso más frecuente)
  sql`CREATE INDEX IF NOT EXISTS idx_products_is_visible ON products(is_visible)`,
];

export async function initDatabase(): Promise<void> {
  try {
    for (const statement of CREATE_TABLES_SQL) {
      await db.execute(statement);
    }
    console.log("[db-init] Tablas y columnas verificadas/creadas correctamente.");
  } catch (err: any) {
    console.error("[db-init] Error al inicializar tablas:", err.message);
    // No lanzamos el error para no bloquear el arranque del servidor
    // Las tablas ya existen en producción, este bloque es solo para nuevos entornos
  }
}
