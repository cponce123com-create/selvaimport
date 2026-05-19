/**
 * db-init.ts
 * Crea las tablas nuevas si no existen al iniciar el servidor.
 * Esto garantiza que la base de datos esté siempre sincronizada
 * sin necesidad de ejecutar drizzle-kit push manualmente.
 *
 * NOTA: ALTER TABLE de categories se maneja separadamente al final
 * para asegurar que las tablas base ya existen al momento de ejecutarlo.
 */
import { db } from "./db";
import { sql } from "drizzle-orm";

const CREATE_TABLES_SQL = [
  // ── Marcas ──
  sql`CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  )`,

  // ── Tablas del home (Filas estilo Amazon) ──
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

  // ── Índices para home ──
  sql`CREATE INDEX IF NOT EXISTS idx_home_row_items_row_id ON home_row_items(home_row_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_home_row_items_product_id ON home_row_items(product_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_home_rectangle_items_rect_id ON home_rectangle_items(home_rectangle_id)`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_home_rectangles_position ON home_rectangles(position)`,

  // ── Tabla Maestro de Productos ──
  sql`CREATE TABLE IF NOT EXISTS product_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    barcode TEXT,
    sku TEXT,
    brand TEXT,
    model TEXT,
    unit TEXT,
    last_purchase_price DECIMAL(10,2),
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
  )`,

  // ── Índices para product_templates ──
  sql`CREATE INDEX IF NOT EXISTS idx_product_templates_name ON product_templates(name)`,
  sql`CREATE INDEX IF NOT EXISTS idx_product_templates_normalized ON product_templates(normalized_name)`,
  sql`CREATE INDEX IF NOT EXISTS idx_product_templates_barcode ON product_templates(barcode)`,
  sql`CREATE INDEX IF NOT EXISTS idx_product_templates_category ON product_templates(category_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_product_templates_supplier ON product_templates(supplier_id)`,

  // ── Historial de Precios ──
  sql`CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    purchase_price DECIMAL(10,2),
    changed_at TIMESTAMP DEFAULT NOW(),
    changed_by TEXT DEFAULT 'admin'
  )`,

  sql`CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_price_history_changed ON price_history(changed_at DESC)`,

  // ── Índices para pedidos, carrito y productos ──
  sql`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`,
  sql`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_products_is_visible ON products(is_visible)`,
];

const ALTER_TABLES_SQL = [
  // Se ejecuta DESPUES de asegurar que las tablas base existen
  sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT true`,
  sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS entry_date TIMESTAMP DEFAULT NOW()`,
  sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER`,
  sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id)`,
  sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS model TEXT`,
  sql`ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS model TEXT`,
];

export async function initDatabase(): Promise<void> {
  try {
    for (const statement of CREATE_TABLES_SQL) {
      await db.execute(statement);
    }

    // ALTER TABLE se ejecuta en un bloque separado para que no falle
    // si la tabla categories aun no existe
    for (const statement of ALTER_TABLES_SQL) {
      try {
        await db.execute(statement);
      } catch (altErr: any) {
        console.warn("[db-init] ALTER TABLE opcional fallo (puede ignorarse):", altErr.message);
      }
    }

    console.log("[db-init] Tablas y columnas verificadas/creadas correctamente.");
  } catch (err: any) {
    console.error("[db-init] Error al inicializar tablas:", err.message);
    // No lanzamos el error para no bloquear el arranque del servidor
    // Las tablas ya existen en produccion, este bloque es solo para nuevos entornos
  }
}
