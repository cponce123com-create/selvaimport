import pg from "pg";
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const SQL = `
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

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_home_row_items_row_id ON home_row_items(home_row_id);
CREATE INDEX IF NOT EXISTS idx_home_row_items_product_id ON home_row_items(product_id);
CREATE INDEX IF NOT EXISTS idx_home_rectangle_items_rect_id ON home_rectangle_items(home_rectangle_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_home_rectangles_position ON home_rectangles(position);
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log("Conectando a la base de datos...");
    await client.query("BEGIN");
    await client.query(SQL);
    await client.query("COMMIT");
    console.log("✅ Tablas creadas exitosamente:");
    console.log("   - home_rows");
    console.log("   - home_row_items");
    console.log("   - home_rectangles");
    console.log("   - home_rectangle_items");
    
    // Verificar que las tablas existen
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('home_rows', 'home_row_items', 'home_rectangles', 'home_rectangle_items')
      ORDER BY table_name;
    `);
    console.log("\n✅ Tablas verificadas en la DB:");
    result.rows.forEach(r => console.log("   -", r.table_name));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
