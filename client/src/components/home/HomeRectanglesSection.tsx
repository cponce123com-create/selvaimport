import { Link } from "wouter";
import { toWebP } from "@/lib/utils";

interface ProductThumb {
  id: number;
  name: string;
  imageUrl: string | null;
  images: string[] | null;
  inventory: number;
}

interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

interface HomeRectangleData {
  id: number;
  position: number;
  title: string;
  rectType: string;
  productId: number | null;
  categoryId: number | null;
  isActive: boolean;
  product?: ProductThumb | null;
  category?: CategoryRef | null;
  items?: { product: ProductThumb }[];
}

function RectProductSingle({ product, title }: { product: ProductThumb; title: string }) {
  const img = product.images?.[0] || product.imageUrl;
  const outOfStock = product.inventory === 0;

  return (
    <Link href={`/product/${product.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden h-full cursor-pointer group flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-bold text-sm text-foreground line-clamp-2">{title}</h3>
        </div>
        <div className="relative flex-1 overflow-hidden">
          {img ? (
            <img
              src={toWebP(img, 400)}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-3xl font-bold">
              {product.name.charAt(0)}
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                SIN STOCK
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function RectProductGrid({ items, title, categoryId }: { items: { product: ProductThumb }[]; title: string; categoryId?: number | null }) {
  const href = categoryId ? `/?cat=${categoryId}#catalogo` : "#catalogo";

  return (
    <a href={href}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden h-full cursor-pointer group flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-bold text-sm text-foreground line-clamp-2">{title}</h3>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-1 p-2">
          {items.slice(0, 4).map(({ product }) => {
            const img = product.images?.[0] || product.imageUrl;
            return (
              <div key={product.id} className="relative aspect-square overflow-hidden rounded-lg bg-gray-50">
                {img ? (
                  <img
                    src={toWebP(img, 200)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-lg font-bold">
                    {product.name.charAt(0)}
                  </div>
                )}
                {product.inventory === 0 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      SIN STOCK
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {/* Rellenar celdas vacías */}
          {Array.from({ length: Math.max(0, 4 - items.slice(0, 4).length) }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    </a>
  );
}

export function HomeRectanglesSection({ rectangles }: { rectangles: HomeRectangleData[] }) {
  const activeRects = rectangles.filter(r => r.isActive).sort((a, b) => a.position - b.position);
  if (activeRects.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" style={{ minHeight: "280px" }}>
        {activeRects.map((rect) => {
          // Rectángulo con múltiples productos (grid de 4)
          if (rect.items && rect.items.length > 0) {
            return (
              <RectProductGrid
                key={rect.id}
                items={rect.items}
                title={rect.title}
                categoryId={rect.categoryId}
              />
            );
          }

          // Rectángulo con producto único
          if (rect.product) {
            return (
              <RectProductSingle
                key={rect.id}
                product={rect.product}
                title={rect.title}
              />
            );
          }

          // Rectángulo vacío (placeholder)
          return (
            <div
              key={rect.id}
              className="bg-white rounded-2xl border border-dashed border-gray-200 h-full flex items-center justify-center text-gray-300 text-sm"
            >
              Sin configurar
            </div>
          );
        })}
      </div>
    </section>
  );
}
