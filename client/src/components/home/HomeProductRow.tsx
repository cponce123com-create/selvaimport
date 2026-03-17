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
    <Link href={`/product/${product.id}`}>
      <div className="flex-shrink-0 w-[130px] sm:w-[150px] md:w-[160px] group cursor-pointer">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm group-hover:shadow-md group-hover:border-gray-200 transition-all duration-200">
          {img ? (
            <img
              src={toWebP(img, 320)}
              alt={product.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${outOfStock ? "opacity-60" : ""}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-2xl font-bold">
              {product.name.charAt(0)}
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 flex items-end justify-center pb-2">
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                SIN STOCK
              </span>
            </div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-center text-gray-700 line-clamp-2 leading-tight px-0.5">
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
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 sm:mx-6 lg:mx-8 my-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-base sm:text-lg font-bold text-gray-900">{title}</h2>
        {viewMoreHref && (
          <Link href={viewMoreHref}>
            <span className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-0.5">
              Ver más <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        )}
      </div>

      {/* Scroll container with arrows */}
      <div className="relative group/row px-5 pb-5">
        {/* Left arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md border border-gray-200 rounded-full p-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 hidden sm:flex"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700" />
        </button>

        {/* Products scroll */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((product) => (
            <ProductThumbCard key={product.id} product={product} />
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md border border-gray-200 rounded-full p-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 hidden sm:flex"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-4 h-4 text-gray-700" />
        </button>
      </div>
    </section>
  );
}
