import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrders, useUpdateOrderStatus } from "@/hooks/use-orders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

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

export default function AdminOrders() {
  const { data: orders = [], isLoading } = useOrders();
  const { mutate: updateStatus } = useUpdateOrderStatus();
  const { toast } = useToast();

  const handleStatusChange = (id: number, status: string) => {
    updateStatus({ id, status }, {
      onSuccess: () => toast({ title: "Estado del pedido actualizado" })
    });
  };

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
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-admin-orders-title">Pedidos</h1>
        <p className="text-muted-foreground mt-1">Gestiona y rastrea los pedidos de los clientes.</p>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Cambiar Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">No se encontraron pedidos</TableCell></TableRow>
            ) : (
              orders.map((o: any) => (
                <TableRow key={o.id} data-testid={`row-order-${o.id}`}>
                  <TableCell className="font-medium">#{o.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {o.guestName || o.shippingAddress?.split(" | ")[0] || "Cliente"}
                      </span>
                      {!o.userId && <span className="text-xs text-blue-600">Invitado</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(o.createdAt), "d MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="font-medium">S/ {Number(o.totalAmount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${getStatusColor(o.status)}`}>
                      {statusLabels[o.status.toLowerCase()] || o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select defaultValue={o.status} onValueChange={(v) => handleStatusChange(o.id, v)}>
                      <SelectTrigger className="w-[140px] ml-auto h-8 text-xs" data-testid={`select-order-status-${o.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="pagado">Pagado</SelectItem>
                        <SelectItem value="enviado">Enviado</SelectItem>
                        <SelectItem value="entregado">Entregado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
