/**
 * Migration script: Add suppliers table + purchase_price and supplier_id columns to products.
 *
 * Usage: node script/add-suppliers.mjs
 */

import pg from "pg";

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();

  try {
    console.log("Connected to database. Running migration...");

    // Create suppliers table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT,
        phone TEXT,
        email TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ suppliers table ready');

    // Add purchase_price column if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'purchase_price'
        ) THEN
          ALTER TABLE products ADD COLUMN purchase_price DECIMAL(10, 2);
        END IF;
      END
      $$;
    `);
    console.log('✓ purchase_price column ready');

    // Add supplier_id column if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'supplier_id'
        ) THEN
          ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id);
        END IF;
      END
      $$;
    `);
    console.log('✓ supplier_id column ready');

    // Create index on supplier_id if not exists
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
    `);
    console.log('✓ index on supplier_id created');

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
