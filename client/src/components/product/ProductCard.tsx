import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAddToCart } from "@/hooks/use-cart";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback, useMemo } from "react";
import { toWebP, getDisplayPrice } from "@/lib/utils";

interface ProductCardProps {
  product: any;
  badge?: string;
}

export function ProductCard({ product, badge }: ProductCardProps) {
  const { mutate: addToCart, isPending } = useAddToCart();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const allImages = useMemo(() => {
    const imgs: string[] = [];
    if (product.images?.length > 0) {
      imgs.push(...product.images);
    } else if (product.imageUrl) {
      imgs.push(product.imageUrl);
    }
    return imgs;
  }, [product.images, product.imageUrl]);

  const hasMultipleImages = allImages.length > 1;

  const handlePrevImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev + 1) % allImages.length);
  }, [allImages.length]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addToCart(
      { productId: product.id, quantity: 1, product },
      {
        onSuccess: () => {
          toast({
            title: "Agregado al carrito",
            description: `${product.name} se agrego correctamente.`,
          });
        },
        onError: (err) => {
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const pricing = getDisplayPrice(product);
  const formattedPrice = "S/ " + pricing.current.toFixed(2);

  return (
    <Link href={`/product/${product.id}`} data-testid={`card-product-${product.id}`} className="group flex flex-col bg-card rounded-xl sm:rounded-2xl overflow-hidden border border-border/50 hover:shadow-xl hover:border-border transition-all duration-300">
      <div className="relative aspect-square bg-accent/50 overflow-hidden">
        {pricing.discount ? (
          <span className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-md" data-testid={`badge-discount-${product.id}`}>
            -{pricing.discount}%
          </span>
        ) : badge ? (
          <span className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-md">
            {badge}
          </span>
        ) : null}
        {allImages.length > 0 ? (
          <img
            src={toWebP(allImages[currentImageIndex])}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-3xl sm:text-4xl font-bold bg-gradient-to-br from-accent to-muted">
            {product.name.charAt(0)}
          </div>
        )}

        {hasMultipleImages && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 active:scale-90 text-white rounded-full p-0.5 sm:p-1 transition-all duration-200 z-10"
              data-testid={`button-card-prev-${product.id}`}
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 active:scale-90 text-white rounded-full p-0.5 sm:p-1 transition-all duration-200 z-10"
              data-testid={`button-card-next-${product.id}`}
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {allImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-all ${idx === currentImageIndex ? "bg-white scale-125" : "bg-white/50"}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="hidden sm:block absolute inset-x-0 bottom-0 p-4 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <Button
            className="w-full rounded-xl shadow-lg font-medium h-10 text-sm active:scale-95"
            onClick={handleAddToCart}
            disabled={isPending || product.inventory === 0}
            data-testid={`button-quick-add-${product.id}`}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {product.inventory === 0 ? "Agotado" : "Agregar"}
          </Button>
        </div>
      </div>

      <div className="p-2.5 sm:p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-foreground text-xs sm:text-sm leading-tight line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] mb-1" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
        {product.category && (
          <span className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-3">{product.category.name}</span>
        )}
        <div className="mt-auto">
          {pricing.original ? (
            <div className="flex items-center gap-1.5">
              <span className="line-through text-muted-foreground text-[10px] sm:text-xs">S/ {pricing.original.toFixed(2)}</span>
              <span className="text-red-600 dark:text-red-400 font-bold text-sm sm:text-base">{formattedPrice}</span>
            </div>
          ) : (
            <p className="text-primary font-bold text-sm sm:text-base">{formattedPrice}</p>
          )}
        </div>

        <div className="sm:hidden mt-2">
          <Button
            className="w-full rounded-lg font-medium h-9 text-xs active:scale-95"
            onClick={handleAddToCart}
            disabled={isPending || product.inventory === 0}
            data-testid={`button-quick-add-mobile-${product.id}`}
          >
            <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
            {product.inventory === 0 ? "Agotado" : "Agregar"}
          </Button>
        </div>
      </div>
    </Link>
  );
}
