import pg from "pg";
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no está configurada");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log("🔍 Verificando columna barcode en tabla products...");
    
    const { rows } = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'barcode'
    `);

    if (rows.length === 0) {
      console.log("➕ Agregando columna barcode a la tabla products...");
      await client.query(`
        ALTER TABLE products 
        ADD COLUMN barcode TEXT;
      `);
      console.log("✅ Columna barcode agregada correctamente.");
    } else {
      console.log("✅ La columna barcode ya existe.");
    }

    // Crear índice para búsqueda rápida por código de barras
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    `);
    console.log("✅ Índice idx_products_barcode creado/verificado.");

    console.log("
🎯 Migración completada exitosamente.");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
