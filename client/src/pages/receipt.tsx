import { AppLayout } from "@/components/layout/AppLayout";
import { useOrder } from "@/hooks/use-orders";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProformaImage } from "@/components/order/ProformaImage";
import { useState, useMemo } from "react";
import { toWebP } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  pendiente: "Pendiente",
  paid: "Pagado",
  pagado: "Pagado",
  shipped: "Enviado",
  enviado: "Enviado",
  delivered: "Entregado",
  entregado: "Entregado",
  cancelled: "Cancelado",
  cancelado: "Cancelado",
};

function useGuestOrder(id: number, isGuest: boolean) {
  return useQuery({
    queryKey: ["/api/orders/guest", id],
    queryFn: async () => {
      // El token viaja automáticamente en la cookie httpOnly, sin exponerlo en la URL
      const res = await fetch(`/api/orders/guest/${id}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!id && isGuest,
  });
}

export default function Receipt() {
  const { id } = useParams();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isGuest = searchParams.get("guest") === "1";
  const authOrder = useOrder(Number(id));
  const guestOrder = useGuestOrder(isGuest ? Number(id) : 0, isGuest);

  const order = isGuest ? guestOrder.data : authOrder.data;
  const isLoading = isGuest ? guestOrder.isLoading : authOrder.isLoading;

  const [showProforma, setShowProforma] = useState(false);

  const addressParts = useMemo(() => {
    if (!order) return { clientName: "", clientPhone: "", shippingMethod: "", address: "" };
    const parts = order.shippingAddress.split(" | ");
    const clientName = parts.find((p: string) => !p.startsWith("Tel:") && !p.startsWith("Envio:") && parts.indexOf(p) === 0) || "";
    const clientPhone = parts.find((p: string) => p.startsWith("Tel:"))?.replace("Tel: ", "") || "";
    const shippingMethod = parts.find((p: string) => p.startsWith("Envio:"))?.replace("Envio: ", "") || "";
    const address = parts.filter((p: string) => !p.startsWith("Tel:") && !p.startsWith("Envio:") && parts.indexOf(p) !== 0).join(", ") || order.shippingAddress;
    return { clientName, clientPhone, shippingMethod, address };
  }, [order]);

  const shippingCosts: Record<string, number> = {
    "Recojo en tienda": 0,
    "Envio a San Ramon urbano": 4,
    "Envio a La Merced": 8,
  };

  if (isLoading) return <AppLayout><div className="p-20 text-center">Cargando recibo...</div></AppLayout>;
  if (!order) return <AppLayout><div className="p-20 text-center">Pedido no encontrado.</div></AppLayout>;

  const { clientName, clientPhone, shippingMethod, address } = addressParts;
  const isShalom = shippingMethod.includes("Shalom");
  const shippingCost = shippingCosts[shippingMethod] ?? (isShalom ? -1 : 0);
  const productSubtotal = Number(order.totalAmount);
  const grandTotal = shippingCost > 0 ? productSubtotal + shippingCost : productSubtotal;

  const proformaData = {
    orderId: order.id,
    items: (order.items || []).map((item: any) => ({
      name: item.product?.name || "Producto",
      quantity: item.quantity,
      unitPrice: Number(item.price),
    })),
    subtotal: productSubtotal,
    shippingLabel: shippingMethod || "No especificado",
    shippingCost: shippingCost,
    isShalom,
    total: grandTotal,
    customerName: clientName || order.guestName || "Cliente",
    customerPhone: clientPhone || order.guestPhone || "",
    customerAddress: address || order.shippingAddress,
    date: new Date(order.createdAt),
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href={isGuest ? "/" : "/orders"} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8" data-testid="link-back-orders">
          <ArrowLeft className="w-4 h-4 mr-2" /> {isGuest ? "Volver al inicio" : "Volver a pedidos"}
        </Link>

        <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
          <div className="bg-primary text-primary-foreground p-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-order-confirmed">Pedido Confirmado</h1>
                <p className="text-primary-foreground/80">Gracias por tu compra</p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-sm text-primary-foreground/80">Numero de Pedido</p>
              <p className="text-xl font-bold font-mono" data-testid="text-order-number">#{order.id}</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid sm:grid-cols-2 gap-8 mb-10 pb-10 border-b">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Datos del Cliente</h3>
                <dl className="space-y-2 text-sm">
                  {(clientName || order.guestName) && <div className="flex justify-between"><dt className="text-muted-foreground">Nombre</dt><dd className="font-medium">{clientName || order.guestName}</dd></div>}
                  {(clientPhone || order.guestPhone) && <div className="flex justify-between"><dt className="text-muted-foreground">Telefono</dt><dd className="font-medium">{clientPhone || order.guestPhone}</dd></div>}
                  <div className="flex justify-between"><dt className="text-muted-foreground">Direccion</dt><dd className="font-medium text-right max-w-[200px]">{address}</dd></div>
                  {shippingMethod && <div className="flex justify-between"><dt className="text-muted-foreground">Envio</dt><dd className="font-medium">{shippingMethod}</dd></div>}
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detalles del Pedido</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Fecha</dt><dd className="font-medium">{format(new Date(order.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Estado</dt><dd className="font-medium">{statusLabels[order.status.toLowerCase()] || order.status}</dd></div>
                </dl>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-6">Productos del Pedido</h3>
            <ul className="space-y-4 mb-8">
              {order.items?.map((item: any) => (
                <li key={item.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-card border rounded overflow-hidden">
                      {(item.product?.images?.[0] || item.product?.imageUrl) && <img src={toWebP(item.product.images?.[0] || item.product.imageUrl)} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-medium">{item.product?.name || 'Producto desconocido'}</p>
                      <p className="text-sm text-muted-foreground">Cant: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-semibold">S/ {(Number(item.price) * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-end pt-6 border-t">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>S/ {productSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Envio</span>
                  <span>{shippingCost === 0 ? "GRATIS" : shippingCost === -1 ? "Por coordinar" : `S/ ${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-bold" data-testid="text-order-total">
                    S/ {isShalom ? `${productSubtotal.toFixed(2)}+` : grandTotal.toFixed(2)}
                  </span>
                </div>
                {isShalom && (
                  <p className="text-xs text-amber-600">+ costo de envio Shalom por coordinar</p>
                )}
              </div>
            </div>

            {isGuest && order.guestAccessToken && (
              <div className="mt-8 pt-6 border-t">
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Link de Seguimiento
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Guarda este enlace para seguir tu pedido:
                  </p>
                  <div className="flex items-center gap-2 bg-background border rounded-lg p-3 text-sm font-mono break-all">
                    <span className="flex-1 min-w-0 truncate">
                      https://selvaimport.onrender.com/track-order/{order.id}?token={order.guestAccessToken}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0 h-8 px-3 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `https://selvaimport.onrender.com/track-order/${order.id}?token=${order.guestAccessToken}`
                        );
                      }}
                    >
                      Copiar enlace
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t">
              <Button
                onClick={() => setShowProforma(true)}
                className="w-full sm:w-auto gap-2"
                variant="outline"
                data-testid="button-view-proforma"
              >
                <FileImage className="w-4 h-4" />
                Ver y Descargar Proforma
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showProforma} onOpenChange={setShowProforma}>
        <DialogContent className="max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              Proforma del Pedido #{order.id}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Descarga o comparte tu proforma como imagen</p>
          </DialogHeader>
          <div className="overflow-x-auto">
            <ProformaImage data={proformaData} />
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
