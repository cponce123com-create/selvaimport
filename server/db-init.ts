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

  // Índices
  sql`CREATE INDEX IF NOT EXISTS idx_home_row_items_row_id ON home_row_items(home_row_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_home_row_items_product_id ON home_row_items(product_id)`,
  sql`CREATE INDEX IF NOT EXISTS idx_home_rectangle_items_rect_id ON home_rectangle_items(home_rectangle_id)`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_home_rectangles_position ON home_rectangles(position)`
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
