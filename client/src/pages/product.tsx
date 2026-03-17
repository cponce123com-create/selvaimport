import { useParams, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProduct } from "@/hooks/use-products";
import { useAddToCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft, ShieldCheck, Truck, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, Package, AlertCircle, Recycle } from "lucide-react";
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

  const hasVideo = !!product.videoUrl;
  const totalMediaCount = allImages.length + (hasVideo ? 1 : 0);

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
    setSelectedImage(prev => (prev === 0 ? totalMediaCount - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImage(prev => (prev === totalMediaCount - 1 ? 0 : prev + 1));
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
              {hasVideo && selectedImage === 0 ? (
                <video
                  src={product.videoUrl!}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  poster={allImages[0] ? toWebP(allImages[0]) : undefined}
                />
              ) : allImages.length > 0 ? (
                <img
                  src={toWebP(allImages[hasVideo ? selectedImage - 1 : selectedImage] || allImages[0])}
                  alt={product.name}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  data-testid="img-product-main"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-8xl font-bold">
                  {product.name.charAt(0)}
                </div>
              )}
              {totalMediaCount > 1 && (
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
            {totalMediaCount > 1 && (
              <div className="flex gap-2 justify-center overflow-x-auto py-2 no-scrollbar" data-testid="image-thumbnails">
                {hasVideo && (
                  <button
                    onClick={() => setSelectedImage(0)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 relative ${
                      selectedImage === 0
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border/50 hover:border-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-primary border-b-[6px] border-b-transparent ml-1" />
                      </div>
                    </div>
                    {allImages[0] && <img src={toWebP(allImages[0])} alt="Video preview" className="w-full h-full object-cover" />}
                  </button>
                )}
                {allImages.map((url, i) => {
                  const index = hasVideo ? i + 1 : i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(index)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                        selectedImage === index
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border/50 hover:border-border opacity-70 hover:opacity-100"
                      }`}
                      data-testid={`button-thumbnail-${i}`}
                    >
                      <img src={toWebP(url)} alt={`Vista ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
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

            {isTacora ? (
              <div className="border-t pt-8">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-6">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="flex-shrink-0">
                      <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600 dark:text-amber-500 mt-0.5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-900 dark:text-amber-100 text-sm sm:text-base mb-2">
                        Producto de Segunda Mano
                      </h3>
                      <p className="text-amber-800 dark:text-amber-200 text-xs sm:text-sm leading-relaxed">
                        Este es un producto de segunda mano. No tiene cambios ni devoluciones. Por favor, revisa cuidadosamente el estado del producto al momento de la entrega. La aceptación del producto implica conformidad con su estado y funcionamiento.
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-medium">
                        <Recycle className="w-4 h-4" />
                        <span>Revisar antes de aceptar</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t pt-8">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 sm:p-6">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="flex-shrink-0">
                      <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 dark:text-blue-400 mt-0.5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm sm:text-base mb-2">
                        Verificación en la Entrega
                      </h3>
                      <p className="text-blue-800 dark:text-blue-200 text-xs sm:text-sm leading-relaxed">
                        Por favor, revisa el producto al momento de la entrega. La aceptación del producto implica conformidad con su estado y funcionamiento.
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-medium">
                        <Package className="w-4 h-4" />
                        <span>Inspecciona antes de aceptar</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
