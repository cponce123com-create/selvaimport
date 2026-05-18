import pg from "pg";
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no está configurada en el entorno");
  console.error("   Ejecuta: export DATABASE_URL='tu_url_de_neon'");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  try {
    console.log("🔌 Conectando a Neon...");
    const client = await pool.connect();
    console.log("✅ Conectado
");

    const { rows: countProducts } = await client.query("SELECT COUNT(*) as total FROM products");
    console.log(`📦 Productos en BD: ${countProducts[0].total}`);

    const { rows: countBanners } = await client.query("SELECT COUNT(*) as total FROM banner_slides");
    console.log(`🖼️  Banners en BD: ${countBanners[0].total}`);

    const { rows: countCats } = await client.query("SELECT COUNT(*) as total FROM categories");
    console.log(`📁 Categorías en BD: ${countCats[0].total}`);

    if (Number(countProducts[0].total) > 0) {
      const { rows: products } = await client.query("SELECT name, price, slug FROM products ORDER BY id DESC LIMIT 5");
      console.log("
📋 Últimos 5 productos:");
      products.forEach(p => console.log(`   - ${p.name} (S/ ${p.price})`));
    }

    if (Number(countBanners[0].total) > 0) {
      const { rows: banners } = await client.query("SELECT title FROM banner_slides ORDER BY id LIMIT 5");
      console.log("
🖼️  Banners:");
      banners.forEach(b => console.log(`   - ${b.title || "(sin título)"}`));
    }

    client.release();
    await pool.end();
    console.log("
✅ Verificación completada");
  } catch (err) {
    console.error("
❌ Error:", err.message);
    process.exit(1);
  }
}

main();
