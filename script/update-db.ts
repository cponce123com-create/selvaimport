import { pool, db } from "../server/db";
import { categories } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const client = await pool.connect();
  try {
    console.log("Añadiendo columna show_on_home a la tabla categories...");
    await client.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT true;
    `);
    console.log("Columna añadida correctamente.");

    // Insertar o actualizar la categoría Selva Natural
    const [existing] = await db.select().from(categories).where(eq(categories.slug, "selva-natural"));
    
    if (existing) {
      console.log("La categoría Selva Natural ya existe. Actualizando...");
      await db.update(categories)
        .set({ showOnHome: false })
        .where(eq(categories.id, existing.id));
    } else {
      console.log("Insertando la categoría Selva Natural...");
      await db.insert(categories).values({
        name: "Selva Natural",
        slug: "selva-natural",
        description: "Productos orgánicos y naturales directamente de la selva.",
        showOnHome: false
      });
    }

    // También asegurar que tacora esté oculta del home si no lo está
    const [tacora] = await db.select().from(categories).where(eq(categories.slug, "tacora"));
    if (tacora) {
      console.log("Asegurando que Tacora esté oculta del home...");
      await db.update(categories)
        .set({ showOnHome: false })
        .where(eq(categories.id, tacora.id));
    }

    console.log("Base de datos actualizada correctamente.");
  } catch (error) {
    console.error("Error actualizando la base de datos:", error);
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
