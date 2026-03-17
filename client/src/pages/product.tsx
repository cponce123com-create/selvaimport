import { useParams, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProduct } from "@/hooks/use-products";
import { useAddToCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft, ShieldCheck, Truck, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { toWebP, getDisplayPrice } from "@/lib/utils";
import { useLocation } from "wouter";

export default function ProductDetail() {
  const { id } = useParams();
  const { data: product, isLoading } = useProduct(Number(id));
  const { mutate: addToCart, isPending } = useAddToCart();
  const { data: user } = useAuth();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [, setLocation] = useLocation();

  if (isLoading) return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-4 w-24 bg-muted mb-8 rounded"></div>
        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square bg-muted rounded-3xl"></div>
          <div className="space-y-6 pt-8">
            <div className="h-10 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded w-full"></div>
          </div>
        </div>
      </div>
    </AppLayout>
  );

  if (!product) return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4" data-testid="text-product-not-found">Producto no encontrado</h2>
        <Link href="/"><Button data-testid="button-back-shop">Volver a la Tienda</Button></Link>
      </div>
    </AppLayout>
  );

  const allImages: string[] = product.images && product.images.length > 0
    ? product.images
    : product.imageUrl
      ? [product.imageUrl]
      : [];

  const pricing = getDisplayPrice(product);
  const formattedPrice = "S/ " + pricing.current.toFixed(2);
  const isTacora = product.category?.slug === "tacora";

  const handleAdd = () => {
    addToCart({ productId: product.id, quantity, product }, {
      onSuccess: () => {
        toast({ title: "Agregado al carrito", description: `${quantity}x ${product.name} agregado.` });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handlePreviousImage = () => {
    setSelectedImage(prev => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImage(prev => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Link href={isTacora ? "/tacora" : "/"} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors" data-testid="link-back-catalog">
          <ArrowLeft className="w-4 h-4 mr-2" /> {isTacora ? "Volver a TACORA" : "Volver al catalogo"}
        </Link>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div className="sticky top-24 space-y-3">
            <div className="relative bg-accent/30 rounded-3xl overflow-hidden aspect-square border border-border/50 group">
              {allImages.length > 0 ? (
                <img
                  src={toWebP(allImages[selectedImage] || allImages[0])}
                  alt={product.name}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  data-testid="img-product-main"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-8xl font-bold">
                  {product.name.charAt(0)}
                </div>
              )}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={handlePreviousImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-all duration-200 md:opacity-0 md:invisible md:group-hover:opacity-100 md:group-hover:visible"
                    data-testid="button-prev-image"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-all duration-200 md:opacity-0 md:invisible md:group-hover:opacity-100 md:group-hover:visible"
                    data-testid="button-next-image"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 justify-center" data-testid="image-thumbnails">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                      selectedImage === i
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border/50 hover:border-border opacity-70 hover:opacity-100"
                    }`}
                    data-testid={`button-thumbnail-${i}`}
                  >
                    <img src={toWebP(url)} alt={`Vista ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col py-4 md:py-8">
            {product.category && (
              <span className="text-sm uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                {product.category.name}
              </span>
            )}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-product-title">
              {product.name}
            </h1>
            <div className="mb-4 sm:mb-6" data-testid="text-product-price">
              {pricing.original ? (
                <div className="flex items-center gap-3">
                  <span className="line-through text-muted-foreground text-base sm:text-lg">S/ {pricing.original.toFixed(2)}</span>
                  <span className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{formattedPrice}</span>
                  <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">-{pricing.discount}%</span>
                </div>
              ) : (
                <span className="text-xl sm:text-2xl font-medium text-primary">{formattedPrice}</span>
              )}
            </div>

            <p className="text-muted-foreground text-sm sm:text-lg mb-6 sm:mb-10 leading-relaxed text-balance">
              {product.description}
            </p>

            <div className="space-y-4 sm:space-y-6 bg-card border rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-10">
              <div className="flex items-center gap-4">
                <span className="font-medium">Cantidad</span>
                <div className="flex items-center border rounded-lg bg-background">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="px-4 py-2.5 hover:bg-accent text-lg transition-colors active:bg-accent"
                    data-testid="button-qty-minus"
                  >-</button>
                  <span className="w-12 text-center font-medium" data-testid="text-quantity">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="px-4 py-2.5 hover:bg-accent text-lg transition-colors active:bg-accent"
                    data-testid="button-qty-plus"
                  >+</button>
                </div>
              </div>

              <Button
                className="w-full py-5 sm:py-6 text-base sm:text-lg rounded-xl shadow-xl shadow-primary/20 min-h-[48px] active:scale-[0.98]"
                size="lg"
                onClick={handleAdd}
                disabled={isPending || product.inventory === 0}
                data-testid="button-add-to-cart"
              >
                <ShoppingCart className="w-5 h-5 mr-3" />
                {product.inventory === 0 ? "Agotado" : "Agregar al Carrito"}
              </Button>

              {product.inventory > 0 && product.inventory < 10 && (
                <p className="text-sm text-amber-600 text-center font-medium">
                  Solo quedan {product.inventory} en stock
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-8">
              <div className="flex flex-col items-center text-center gap-2 text-muted-foreground">
                <Truck className="w-6 h-6" />
                <span className="text-sm font-medium">Envio Gratis<br/>Compras +S/ 300</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2 text-muted-foreground">
                <RefreshCw className="w-6 h-6" />
                <span className="text-sm font-medium">Devoluciones<br/>30 Dias</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2 text-muted-foreground">
                <ShieldCheck className="w-6 h-6" />
                <span className="text-sm font-medium">Compra<br/>Segura</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
