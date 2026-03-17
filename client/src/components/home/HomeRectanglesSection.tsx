import { Link } from "wouter";
import { toWebP } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ProductThumb {
  id: number;
  name: string;
  imageUrl: string | null;
  images: string[] | null;
  inventory: number;
  price?: string;
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

// ─── Rectángulo con 1 producto grande ─────────────────────────────────────────
function RectSingleProduct({ rect }: { rect: HomeRectangleData }) {
  const product = rect.product;
  if (!product) return <RectEmpty />;
  const img = product.images?.[0] || product.imageUrl;
  const outOfStock = product.inventory === 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">{rect.title}</h3>
      </div>
      <Link href={`/product/${product.id}`} className="flex-1 block overflow-hidden relative">
        <div className="relative w-full h-full min-h-[160px]">
          {img ? (
            <img
              src={toWebP(img, 400)}
              alt={product.name}
              className={`w-full h-full object-cover hover:scale-105 transition-transform duration-300 ${outOfStock ? "opacity-60" : ""}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-3xl font-bold min-h-[160px]">
              {product.name.charAt(0)}
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                SIN STOCK
              </span>
            </div>
          )}
        </div>
      </Link>
      <div className="px-4 py-2">
        <Link href={`/product/${product.id}`}>
          <span className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-0.5">
            Ver producto <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </div>
    </div>
  );
}

// ─── Rectángulo con grid de hasta 4 productos ─────────────────────────────────
function RectMultiProduct({ rect }: { rect: HomeRectangleData }) {
  const items = rect.items || [];
  const categoryHref = rect.categoryId ? `/?cat=${rect.categoryId}` : "#catalogo";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">{rect.title}</h3>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-1.5 px-3 pb-2">
        {items.slice(0, 4).map(({ product }) => {
          const img = product.images?.[0] || product.imageUrl;
          const outOfStock = product.inventory === 0;
          return (
            <Link key={product.id} href={`/product/${product.id}`}>
              <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-50 group">
                {img ? (
                  <img
                    src={toWebP(img, 200)}
                    alt={product.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 ${outOfStock ? "opacity-60" : ""}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-base font-bold">
                    {product.name.charAt(0)}
                  </div>
                )}
                {outOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      SIN STOCK
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
        {/* Rellenar celdas vacías */}
        {Array.from({ length: Math.max(0, 4 - Math.min(items.length, 4)) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-lg bg-gray-50" />
        ))}
      </div>
      <div className="px-4 pb-3">
        <a href={categoryHref}>
          <span className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-0.5">
            Ver más <ChevronRight className="w-3 h-3" />
          </span>
        </a>
      </div>
    </div>
  );
}

// ─── Rectángulo por categoría ─────────────────────────────────────────────────
function RectCategory({ rect }: { rect: HomeRectangleData }) {
  const category = rect.category;
  const items = rect.items || [];
  const href = category ? `/?cat=${category.id}` : "#catalogo";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">{rect.title}</h3>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-1.5 px-3 pb-2">
        {items.slice(0, 4).map(({ product }) => {
          const img = product.images?.[0] || product.imageUrl;
          return (
            <Link key={product.id} href={`/product/${product.id}`}>
              <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-50 group">
                {img ? (
                  <img
                    src={toWebP(img, 200)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-base font-bold">
                    {product.name.charAt(0)}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
        {Array.from({ length: Math.max(0, 4 - Math.min(items.length, 4)) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-lg bg-gray-50" />
        ))}
      </div>
      <div className="px-4 pb-3">
        <a href={href}>
          <span className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-0.5">
            Ver {category?.name || "más"} <ChevronRight className="w-3 h-3" />
          </span>
        </a>
      </div>
    </div>
  );
}

// ─── Rectángulo vacío ─────────────────────────────────────────────────────────
function RectEmpty() {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 h-full flex items-center justify-center text-gray-300 text-xs min-h-[200px]">
      Sin configurar
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function HomeRectanglesSection({ rectangles }: { rectangles: HomeRectangleData[] }) {
  const activeRects = rectangles
    .filter((r) => r.isActive)
    .sort((a, b) => a.position - b.position);

  if (activeRects.length === 0) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" style={{ minHeight: "240px" }}>
        {activeRects.map((rect) => {
          // Grid de múltiples productos
          if (rect.rectType === "multi" && rect.items && rect.items.length > 0) {
            return <RectMultiProduct key={rect.id} rect={rect} />;
          }
          // Por categoría
          if (rect.rectType === "category") {
            return <RectCategory key={rect.id} rect={rect} />;
          }
          // Producto único
          if (rect.rectType === "product" && rect.product) {
            return <RectSingleProduct key={rect.id} rect={rect} />;
          }
          // Fallback: si tiene items, mostrar como multi
          if (rect.items && rect.items.length > 0) {
            return <RectMultiProduct key={rect.id} rect={rect} />;
          }
          return <RectEmpty key={rect.id} />;
        })}
      </div>
    </section>
  );
}
