import { Link } from "wouter";
import { toWebP } from "@/lib/utils";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useRef } from "react";

interface ProductThumb {
  id: number;
  name: string;
  imageUrl: string | null;
  images: string[] | null;
  inventory: number;
  price?: string;
}

interface HomeProductRowProps {
  title: string;
  products: ProductThumb[];
  viewMoreHref?: string;
}

function ProductThumbCard({ product }: { product: ProductThumb }) {
  const img = product.images?.[0] || product.imageUrl;
  const outOfStock = product.inventory === 0;

  return (
    <Link href={`/product/${product.slug}`}>
      <div className="flex-shrink-0 w-[100px] sm:w-[120px] md:w-[130px] group cursor-pointer">
        {/* Imagen cuadrada compacta */}
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white border border-gray-100 shadow-sm group-hover:shadow-md group-hover:border-gray-200 transition-all duration-200">
          {img ? (
            <img
              src={toWebP(img, 260)}
              alt={product.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${outOfStock ? "opacity-55" : ""}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xl font-bold">
              {product.name.charAt(0)}
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 flex items-end justify-center pb-1.5">
              <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
                SIN STOCK
              </span>
            </div>
          )}
        </div>
        {/* Nombre compacto */}
        <p className="mt-1 text-[10px] sm:text-xs text-center text-gray-700 line-clamp-2 leading-tight px-0.5">
          {product.name}
        </p>
      </div>
    </Link>
  );
}

export function HomeProductRow({ title, products, viewMoreHref }: HomeProductRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mx-3 sm:mx-4 lg:mx-6 my-3">
      {/* Header compacto */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">{title}</h2>
        {viewMoreHref && (
          <Link href={viewMoreHref}>
            <span className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-0.5 whitespace-nowrap">
              Ver más <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        )}
      </div>

      {/* Scroll con flechas */}
      <div className="relative group/row px-4 pb-3.5">
        {/* Flecha izquierda */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow border border-gray-200 rounded-full p-1 opacity-0 group-hover/row:opacity-100 transition-opacity hidden sm:flex"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-gray-700" />
        </button>

        {/* Productos */}
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((product) => (
            <ProductThumbCard key={product.id} product={product} />
          ))}
        </div>

        {/* Flecha derecha */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow border border-gray-200 rounded-full p-1 opacity-0 group-hover/row:opacity-100 transition-opacity hidden sm:flex"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
        </button>
      </div>
    </section>
  );
}
