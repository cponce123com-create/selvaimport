import { AppLayout } from "@/components/layout/AppLayout";
import { useCart, useUpdateCartItem, useClearCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Trash2, ArrowRight, ShoppingBag, Ticket } from "lucide-react";
import { useState, useEffect } from "react";
import { toWebP, getDisplayPrice } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const { data: cart, isLoading } = useCart();
  const { data: user } = useAuth();
  const { mutate: updateQuantity } = useUpdateCartItem();
  const { mutate: clearCart } = useClearCart();
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener("guest-cart-update", handler);
    return () => window.removeEventListener("guest-cart-update", handler);
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un código de cupón",
        variant: "destructive",
      });
      return;
    }

    setValidatingCoupon(true);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.toUpperCase() }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: "Cupón inválido",
          description: error.message || "El cupón no es válido",
          variant: "destructive",
        });
        return;
      }

      const coupon = await response.json();
      setAppliedCoupon(coupon);
      localStorage.setItem("selva_applied_coupon", JSON.stringify(coupon));
      toast({
        title: "¡Cupón aplicado!",
        description: `Descuento de ${coupon.discountType === "percentage" ? coupon.discountValue + "%" : "S/ " + coupon.discountValue}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo validar el cupón",
        variant: "destructive",
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast({
      title: "Cupón removido",
      description: "El descuento ha sido cancelado",
    });
  };

  if (isLoading) return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-lg mb-10" />
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b bg-muted/20">
                <div className="h-5 w-32 bg-muted rounded" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 flex gap-6">
                  <div className="w-24 h-24 bg-muted rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-48 bg-muted rounded" />
                    <div className="h-4 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-muted rounded-3xl p-8 sticky top-24 space-y-6">
              <div className="h-7 w-40 bg-muted-foreground/20 rounded" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-muted-foreground/20 rounded" />
                <div className="h-4 w-full bg-muted-foreground/20 rounded" />
                <div className="h-4 w-3/4 bg-muted-foreground/20 rounded" />
              </div>
              <div className="h-12 w-full bg-muted-foreground/20 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  if (isEmpty) return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-muted-foreground/50" />
        <h2 className="text-3xl font-bold mb-4" data-testid="text-cart-empty">Tu carrito esta vacio</h2>
        <p className="text-muted-foreground mb-8">Comienza a explorar y agrega los productos que te gusten.</p>
        <div className="flex justify-center gap-4">
          <Link href="/"><Button data-testid="button-shop-now">Comprar Ahora</Button></Link>
        </div>
      </div>
    </AppLayout>
  );

  const subtotal = items.reduce((acc: number, item: any) => {
    const p = getDisplayPrice(item.product);
    return acc + (p.current * item.quantity);
  }, 0);

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === "percentage") {
      discount = (subtotal * Number(appliedCoupon.discountValue)) / 100;
    } else {
      discount = Number(appliedCoupon.discountValue);
    }
  }

  const total = Math.max(0, subtotal - discount);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-10" data-testid="text-cart-title">Tu Carrito</h1>

        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-muted/20">
                <h3 className="font-semibold">{items.length} {items.length === 1 ? 'Producto' : 'Productos'}</h3>
                <Button variant="ghost" size="sm" onClick={() => clearCart()} className="text-destructive hover:text-destructive hover:bg-destructive/10" data-testid="button-clear-cart">
                  <Trash2 className="w-4 h-4 mr-2" /> Vaciar Todo
                </Button>
              </div>
              <ul className="divide-y">
                {items.map((item: any) => (
                  <li key={item.productId || item.id} className="p-6 flex gap-6 sm:items-center flex-col sm:flex-row hover:bg-accent/30 transition-colors" data-testid={`cart-item-${item.productId || item.id}`}>
                    <div className="w-24 h-24 bg-muted rounded-xl flex-shrink-0 overflow-hidden border">
                      {(item.product.images?.[0] || item.product.imageUrl) ? (
                        <img src={toWebP(item.product.images?.[0] || item.product.imageUrl)} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground text-2xl">
                          {item.product.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Link href={`/product/${item.product.id || item.productId}`} className="font-semibold text-lg hover:underline decoration-primary/50">
                        {item.product.name}
                      </Link>
                      {(() => {
                        const p = getDisplayPrice(item.product);
                        return p.original ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="line-through text-muted-foreground text-sm">S/ {p.original.toFixed(2)}</span>
                            <span className="text-red-600 dark:text-red-400 font-medium">S/ {p.current.toFixed(2)}</span>
                          </div>
                        ) : (
                          <p className="text-primary font-medium mt-1">S/ {p.current.toFixed(2)}</p>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-4 sm:ml-auto">
                      <div className="flex items-center border rounded-lg bg-background shadow-sm">
                        <button
                          className="px-3 py-1.5 hover:bg-muted transition-colors"
                          onClick={() => updateQuantity({ id: item.id, quantity: item.quantity - 1, productId: item.productId })}
                          data-testid={`button-cart-minus-${item.productId || item.id}`}
                        >-</button>
                        <span className="w-10 text-center font-medium text-sm">{item.quantity}</span>
                        <button
                          className="px-3 py-1.5 hover:bg-muted transition-colors"
                          onClick={() => updateQuantity({ id: item.id, quantity: item.quantity + 1, productId: item.productId })}
                          data-testid={`button-cart-plus-${item.productId || item.id}`}
                        >+</button>
                      </div>
                      <p className="font-semibold w-20 text-right">
                        S/ {(getDisplayPrice(item.product).current * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-primary text-primary-foreground rounded-3xl p-8 shadow-xl sticky top-24 space-y-6">
              <h3 className="text-2xl font-bold">Resumen del Pedido</h3>
              
              {/* Sección de Cupón */}
              <div className="bg-primary-foreground/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  <span className="font-semibold text-sm">Código de Descuento</span>
                </div>
                {appliedCoupon ? (
                  <div className="space-y-2">
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="font-mono font-bold text-sm">{appliedCoupon.code}</p>
                        <p className="text-xs text-primary-foreground/70">
                          Descuento: {appliedCoupon.discountType === "percentage" ? appliedCoupon.discountValue + "%" : "S/ " + appliedCoupon.discountValue}
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-xs underline hover:opacity-70 transition-opacity"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ingresa tu cupón"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === "Enter" && handleApplyCoupon()}
                      className="bg-background text-foreground border-primary-foreground/20 placeholder:text-primary-foreground/50 text-sm h-9"
                      disabled={validatingCoupon}
                    />
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="bg-background text-foreground hover:bg-background/90 h-9 px-3 text-sm"
                      size="sm"
                    >
                      {validatingCoupon ? "..." : "Aplicar"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Detalles del Total */}
              <div className="space-y-4">
                <div className="flex justify-between text-primary-foreground/80">
                  <span>Subtotal</span>
                  <span>S/ {subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-300">
                    <span>Descuento</span>
                    <span>-S/ {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-primary-foreground/80">
                  <span>Envio</span>
                  <span>Calculado al pagar</span>
                </div>
                <div className="border-t border-primary-foreground/20 pt-4 flex justify-between items-end">
                  <span className="font-medium text-lg">Total Estimado</span>
                  <span className="text-3xl font-bold" data-testid="text-cart-total">S/ {total.toFixed(2)}</span>
                </div>
              </div>
              <Link href="/checkout" className="block">
                <Button className="w-full bg-background text-foreground hover:bg-background/90 active:scale-[0.98] text-base sm:text-lg py-5 sm:py-6 rounded-xl group transition-all min-h-[48px]" data-testid="button-checkout">
                  Proceder al Pago <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
