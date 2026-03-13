import { AppLayout } from "@/components/layout/AppLayout";
import { useCart, useUpdateCartItem, useClearCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { useState, useEffect } from "react";
import { toWebP, getDisplayPrice } from "@/lib/utils";

export default function Cart() {
  const { data: cart, isLoading } = useCart();
  const { data: user } = useAuth();
  const { mutate: updateQuantity } = useUpdateCartItem();
  const { mutate: clearCart } = useClearCart();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener("guest-cart-update", handler);
    return () => window.removeEventListener("guest-cart-update", handler);
  }, []);

  if (isLoading) return <AppLayout><div className="p-20 text-center">Cargando carrito...</div></AppLayout>;

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

  const total = items.reduce((acc: number, item: any) => {
    const p = getDisplayPrice(item.product);
    return acc + (p.current * item.quantity);
  }, 0);

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
            <div className="bg-primary text-primary-foreground rounded-3xl p-8 shadow-xl sticky top-24">
              <h3 className="text-2xl font-bold mb-6">Resumen del Pedido</h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-primary-foreground/80">
                  <span>Subtotal</span>
                  <span>S/ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-primary-foreground/80">
                  <span>Envio</span>
                  <span>Calculado al pagar</span>
                </div>
                <div className="border-t border-primary-foreground/20 pt-4 mt-4 flex justify-between items-end">
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
