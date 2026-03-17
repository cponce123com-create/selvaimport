import { Link } from "wouter";
import { toWebP } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ProductThumb {
  id: number;
  name: string;
  imageUrl: string | null;
  images: string[] | null;
  inventory: number;
}

interface HomeProductRowProps {
  title: string;
  products: ProductThumb[];
}

function ProductThumbCard({ product }: { product: ProductThumb }) {
  const img = product.images?.[0] || product.imageUrl;
  const outOfStock = product.inventory === 0;

  return (
    <Link href={`/product/${product.id}`}>
      <div className="flex-shrink-0 w-[140px] sm:w-[160px] group cursor-pointer">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
          {img ? (
            <img
              src={toWebP(img, 300)}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-2xl font-bold">
              {product.name.charAt(0)}
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                SIN STOCK
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function HomeProductRow({ title, products }: HomeProductRowProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {products.map((product) => (
          <ProductThumbCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
