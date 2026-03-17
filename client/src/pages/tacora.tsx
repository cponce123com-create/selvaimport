import { AppLayout } from "@/components/layout/AppLayout";
import { ProductCard } from "@/components/product/ProductCard";
import { AdSlot } from "@/components/ads/AdSlot";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useMemo } from "react";
import { Tag, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Configuración de AdSense
// Cuando tengas tu cuenta aprobada, reemplaza estos valores:
//   AD_CLIENT → "ca-pub-XXXXXXXXXXXXXXXX"
//   AD_SLOT_PRODUCT → slot para anuncio tamaño producto (ej: "1234567890")
//   AD_SLOT_ROW     → slot para banner de fila completa  (ej: "0987654321")
// Mientras no estén configurados se muestran placeholders visuales.
// ─────────────────────────────────────────────────────────────────────────────
const AD_CLIENT = "";          // ← pega aquí tu ca-pub-XXXXXXXXXXXXXXXX
const AD_SLOT_PRODUCT = "";    // ← slot para espacio tamaño producto
const AD_SLOT_ROW = "";        // ← slot para banner de fila completa

// Cada cuántos productos insertar un anuncio tipo "producto" (1 celda)
const AD_PRODUCT_EVERY = 8;

// Cada cuántas filas insertar un banner de fila completa
// (4 cols × N filas = posición del banner)
const AD_ROW_EVERY_ROWS = 3;   // cada 3 filas = cada 12 productos
const COLS = 4;                // columnas del grid en desktop

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
type GridItem =
  | { type: "product"; product: (typeof import("@shared/schema"))["products"]["$inferSelect"] }
  | { type: "ad-product"; id: string }
  | { type: "ad-row"; id: string };

/** Construye el array mixto de productos + anuncios */
function buildGridItems(products: any[]): GridItem[] {
  const items: GridItem[] = [];
  let adProductCount = 0;
  let adRowCount = 0;
  let colsInCurrentRow = 0; // cuántas celdas llevamos en la fila actual

  for (let i = 0; i < products.length; i++) {
    // ── Banner de fila completa cada AD_ROW_EVERY_ROWS filas ─────────────────
    // Se inserta cuando empezamos una nueva fila y se cumple el intervalo
    if (colsInCurrentRow === 0 && i > 0) {
      const rowIndex = Math.floor(i / COLS);
      if (rowIndex > 0 && rowIndex % AD_ROW_EVERY_ROWS === 0) {
        items.push({ type: "ad-row", id: `ad-row-${adRowCount++}` });
        // El banner ocupa col-span-full, no consume columnas del grid
      }
    }

    // ── Anuncio tamaño producto cada AD_PRODUCT_EVERY productos ──────────────
    if (i > 0 && i % AD_PRODUCT_EVERY === 0) {
      items.push({ type: "ad-product", id: `ad-product-${adProductCount++}` });
      colsInCurrentRow = (colsInCurrentRow + 1) % COLS;
    }

    items.push({ type: "product", product: products[i] });
    colsInCurrentRow = (colsInCurrentRow + 1) % COLS;
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────────
export default function TacoraPage() {
  const { data: categories } = useCategories();

  const tacoraCategory = useMemo(
    () => categories?.find((c) => c.slug === "tacora"),
    [categories]
  );

  const { data: products, isLoading } = useProducts({
    categoryId: tacoraCategory?.id,
  });

  const gridItems = useMemo(
    () => (products ? buildGridItems(products) : []),
    [products]
  );

  return (
    <AppLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="bg-muted/30 border-b">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
                <Tag className="w-4 h-4" />
                SECCIÓN ESPECIAL
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                TACORA
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Nuestra sección exclusiva de productos de segunda mano y
                oportunidades únicas. Calidad garantizada al mejor precio del
                mercado.
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="bg-primary text-primary-foreground p-8 rounded-3xl shadow-2xl rotate-3 flex flex-col items-center gap-4 max-w-[280px]">
                <ShoppingBag className="w-12 h-12" />
                <div className="text-center">
                  <p className="font-bold text-xl">Oportunidades Únicas</p>
                  <p className="text-sm opacity-90">
                    Stock limitado, ¡aprovecha ahora!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Grid de productos + anuncios ─────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 min-h-[60vh]">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {gridItems.map((item) => {
              if (item.type === "product") {
                return (
                  <ProductCard key={item.product.id} product={item.product} />
                );
              }

              if (item.type === "ad-product") {
                return (
                  <AdSlot
                    key={item.id}
                    variant="product"
                    adClient={AD_CLIENT || undefined}
                    adSlot={AD_SLOT_PRODUCT || undefined}
                  />
                );
              }

              if (item.type === "ad-row") {
                return (
                  <AdSlot
                    key={item.id}
                    variant="row"
                    adClient={AD_CLIENT || undefined}
                    adSlot={AD_SLOT_ROW || undefined}
                    className="my-2"
                  />
                );
              }

              return null;
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              Próximamente más productos
            </h3>
            <p className="text-muted-foreground mb-8 max-w-xs">
              Estamos preparando nuevas ofertas de segunda mano para ti. Vuelve
              pronto.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
            >
              Explorar tienda principal <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
