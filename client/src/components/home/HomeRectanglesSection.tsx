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

// ─── Producto único ────────────────────────────────────────────────────────────
function RectSingleProduct({ rect }: { rect: HomeRectangleData }) {
  const product = rect.product;
  if (!product) return <RectEmpty />;
  const img = product.images?.[0] || product.imageUrl;
  const outOfStock = product.inventory === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full">
      <div className="px-3 pt-3 pb-1.5">
        <h3 className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-snug">{rect.title}</h3>
      </div>
      <Link href={`/product/${product.id}`} className="flex-1 block overflow-hidden">
        <div className="relative w-full h-full min-h-[120px] sm:min-h-[140px]">
          {img ? (
            <img
              src={toWebP(img, 400)}
              alt={product.name}
              className={`w-full h-full object-cover hover:scale-105 transition-transform duration-300 ${outOfStock ? "opacity-60" : ""}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-2xl font-bold min-h-[120px]">
              {product.name.charAt(0)}
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                SIN STOCK
              </span>
            </div>
          )}
        </div>
      </Link>
      <div className="px-3 py-2">
        <Link href={`/product/${product.id}`}>
          <span className="text-[11px] text-blue-600 hover:underline font-medium flex items-center gap-0.5">
            Ver producto <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </div>
    </div>
  );
}

// ─── Grid de hasta 4 productos ────────────────────────────────────────────────
function RectMultiProduct({ rect }: { rect: HomeRectangleData }) {
  const items = rect.items || [];
  const categoryHref = rect.categoryId ? `/?cat=${rect.categoryId}` : "#catalogo";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full">
      <div className="px-3 pt-3 pb-1.5">
        <h3 className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-snug">{rect.title}</h3>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-1 px-2.5 pb-1.5">
        {items.slice(0, 4).map(({ product }) => {
          const img = product.images?.[0] || product.imageUrl;
          const outOfStock = product.inventory === 0;
          return (
            <Link key={product.id} href={`/product/${product.id}`}>
              <div className="relative aspect-square overflow-hidden rounded-md bg-gray-50 group">
                {img ? (
                  <img
                    src={toWebP(img, 200)}
                    alt={product.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 ${outOfStock ? "opacity-60" : ""}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm font-bold">
                    {product.name.charAt(0)}
                  </div>
                )}
                {outOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-red-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">
                      SIN STOCK
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
        {Array.from({ length: Math.max(0, 4 - Math.min(items.length, 4)) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-md bg-gray-50" />
        ))}
      </div>
      <div className="px-3 pb-2.5">
        <a href={categoryHref}>
          <span className="text-[11px] text-blue-600 hover:underline font-medium flex items-center gap-0.5">
            Ver más <ChevronRight className="w-3 h-3" />
          </span>
        </a>
      </div>
    </div>
  );
}

// ─── Por categoría ────────────────────────────────────────────────────────────
function RectCategory({ rect }: { rect: HomeRectangleData }) {
  const category = rect.category;
  const items = rect.items || [];
  const href = category ? `/?cat=${category.id}` : "#catalogo";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full">
      <div className="px-3 pt-3 pb-1.5">
        <h3 className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-snug">{rect.title}</h3>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-1 px-2.5 pb-1.5">
        {items.slice(0, 4).map(({ product }) => {
          const img = product.images?.[0] || product.imageUrl;
          return (
            <Link key={product.id} href={`/product/${product.id}`}>
              <div className="relative aspect-square overflow-hidden rounded-md bg-gray-50 group">
                {img ? (
                  <img
                    src={toWebP(img, 200)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm font-bold">
                    {product.name.charAt(0)}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
        {Array.from({ length: Math.max(0, 4 - Math.min(items.length, 4)) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-md bg-gray-50" />
        ))}
      </div>
      <div className="px-3 pb-2.5">
        <a href={href}>
          <span className="text-[11px] text-blue-600 hover:underline font-medium flex items-center gap-0.5">
            Ver {category?.name || "más"} <ChevronRight className="w-3 h-3" />
          </span>
        </a>
      </div>
    </div>
  );
}

// ─── Vacío ────────────────────────────────────────────────────────────────────
function RectEmpty() {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-200 h-full flex items-center justify-center text-gray-300 text-xs min-h-[160px]">
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
    <section className="px-3 sm:px-4 lg:px-6 py-3">
      {/* En móvil: 2 columnas. En desktop: 4 columnas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {activeRects.map((rect) => {
          if (rect.rectType === "multi" && rect.items && rect.items.length > 0) {
            return <RectMultiProduct key={rect.id} rect={rect} />;
          }
          if (rect.rectType === "category") {
            return <RectCategory key={rect.id} rect={rect} />;
          }
          if (rect.rectType === "product" && rect.product) {
            return <RectSingleProduct key={rect.id} rect={rect} />;
          }
          if (rect.items && rect.items.length > 0) {
            return <RectMultiProduct key={rect.id} rect={rect} />;
          }
          return <RectEmpty key={rect.id} />;
        })}
      </div>
    </section>
  );
}
