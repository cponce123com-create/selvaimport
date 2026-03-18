import { AppLayout } from "@/components/layout/AppLayout";
import { ProductCard } from "@/components/product/ProductCard";
import { AdSlot } from "@/components/ads/AdSlot";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useMemo } from "react";
import { Leaf, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const AD_CLIENT = "";
const AD_SLOT_PRODUCT = "";
const AD_SLOT_ROW = "";
const AD_PRODUCT_EVERY = 8;
const AD_ROW_EVERY_ROWS = 3;
const COLS = 4;

type GridItem =
  | { type: "product"; product: any }
  | { type: "ad-product"; id: string }
  | { type: "ad-row"; id: string };

function buildGridItems(products: any[]): GridItem[] {
  const items: GridItem[] = [];
  let adProductCount = 0;
  let adRowCount = 0;
  let colsInCurrentRow = 0;

  for (let i = 0; i < products.length; i++) {
    if (colsInCurrentRow === 0 && i > 0) {
      const rowIndex = Math.floor(i / COLS);
      if (rowIndex > 0 && rowIndex % AD_ROW_EVERY_ROWS === 0) {
        items.push({ type: "ad-row", id: `ad-row-${adRowCount++}` });
      }
    }

    if (i > 0 && i % AD_PRODUCT_EVERY === 0) {
      items.push({ type: "ad-product", id: `ad-product-${adProductCount++}` });
      colsInCurrentRow = (colsInCurrentRow + 1) % COLS;
    }

    items.push({ type: "product", product: products[i] });
    colsInCurrentRow = (colsInCurrentRow + 1) % COLS;
  }

  return items;
}

export default function SelvaNaturalPage() {
  const { data: categories } = useCategories();

  const selvaCategory = useMemo(
    () => categories?.find((c) => c.slug === "selva-natural"),
    [categories]
  );

  const { data: products, isLoading } = useProducts({
    categoryId: selvaCategory?.id,
  });

  const gridItems = useMemo(
    () => (products ? buildGridItems(products) : []),
    [products]
  );

  return (
    <AppLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="bg-green-50/50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold mb-4">
                <Leaf className="w-4 h-4" />
                PRODUCTOS NATURALES
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-green-800">
                Selva Natural
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Descubre nuestra selección exclusiva de productos orgánicos, 
                artesanales y naturales traídos directamente desde el corazón de la selva. 
                Pureza y salud en cada producto.
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="bg-green-600 text-white p-8 rounded-3xl shadow-2xl -rotate-3 flex flex-col items-center gap-4 max-w-[280px]">
                <Leaf className="w-12 h-12" />
                <div className="text-center">
                  <p className="font-bold text-xl">100% Orgánico</p>
                  <p className="text-sm opacity-90">
                    Sostenible y de origen ético.
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
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <Leaf className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              Próximamente más productos naturales
            </h3>
            <p className="text-muted-foreground mb-8 max-w-xs">
              Estamos seleccionando lo mejor de la naturaleza para ti. Vuelve
              pronto.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 text-green-600 font-bold hover:underline"
            >
              Explorar tienda principal <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
