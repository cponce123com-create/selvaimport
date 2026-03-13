import { AppLayout } from "@/components/layout/AppLayout";
import { useOrders } from "@/hooks/use-orders";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function Orders() {
  const { data: orders, isLoading } = useOrders();

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'pending' || s === 'pendiente') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s === 'paid' || s === 'pagado') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (s === 'shipped' || s === 'enviado') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (s === 'delivered' || s === 'entregado') return 'bg-green-100 text-green-800 border-green-200';
    if (s === 'cancelled' || s === 'cancelado') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8" data-testid="text-orders-title">Historial de Pedidos</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-20 bg-card border rounded-3xl">
            <PackageOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-semibold mb-2" data-testid="text-no-orders">No tienes pedidos aun</h3>
            <p className="text-muted-foreground mb-6">Cuando realices pedidos, apareceran aqui.</p>
            <Link href="/"><Button data-testid="button-start-shopping">Empezar a Comprar</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <Link key={order.id} href={`/order/${order.id}`} className="block group" data-testid={`link-order-${order.id}`}>
                <div className="bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg">Pedido #{order.id}</span>
                      <Badge variant="outline" className={`${getStatusColor(order.status)}`}>
                        {statusLabels[order.status.toLowerCase()] || order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Realizado el {format(new Date(order.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 sm:text-right">
                    <div>
                      <p className="text-sm text-muted-foreground">Monto Total</p>
                      <p className="font-semibold text-lg">S/ {Number(order.totalAmount).toFixed(2)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      &rarr;
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
