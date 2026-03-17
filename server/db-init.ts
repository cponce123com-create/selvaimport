/**
 * db-init.ts
 * Crea las tablas nuevas si no existen al iniciar el servidor.
 * Esto garantiza que la base de datos esté siempre sincronizada
 * sin necesidad de ejecutar drizzle-kit push manualmente.
 */
import { pool } from "./db";

const CREATE_TABLES_SQL = `
-- Filas estilo Amazon del home
CREATE TABLE IF NOT EXISTS home_rows (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  row_type TEXT NOT NULL DEFAULT 'products',
  category_id INTEGER REFERENCES categories(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS home_row_items (
  id SERIAL PRIMARY KEY,
  home_row_id INTEGER NOT NULL REFERENCES home_rows(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Sección de 4 rectángulos del home
CREATE TABLE IF NOT EXISTS home_rectangles (
  id SERIAL PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT '',
  rect_type TEXT NOT NULL DEFAULT 'product',
  product_id INTEGER REFERENCES products(id),
  category_id INTEGER REFERENCES categories(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS home_rectangle_items (
  id SERIAL PRIMARY KEY,
  home_rectangle_id INTEGER NOT NULL REFERENCES home_rectangles(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_home_row_items_row_id ON home_row_items(home_row_id);
CREATE INDEX IF NOT EXISTS idx_home_row_items_product_id ON home_row_items(product_id);
CREATE INDEX IF NOT EXISTS idx_home_rectangle_items_rect_id ON home_rectangle_items(home_rectangle_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_home_rectangles_position ON home_rectangles(position);
`;

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(CREATE_TABLES_SQL);
    console.log("[db-init] Tablas de home verificadas/creadas correctamente.");
  } catch (err: any) {
    console.error("[db-init] Error al inicializar tablas:", err.message);
    // No lanzamos el error para no bloquear el arranque del servidor
    // Las tablas ya existen en producción, este bloque es solo para nuevos entornos
  } finally {
    client.release();
  }
}
