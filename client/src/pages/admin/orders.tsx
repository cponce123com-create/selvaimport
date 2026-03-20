import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrders, useUpdateOrderStatus } from "@/hooks/use-orders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Search, Download, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useState, useMemo } from "react";

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

function useDeleteOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Error al eliminar el pedido");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      toast({ title: "Pedido eliminado correctamente" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export default function AdminOrders() {
  const { data: orders = [], isLoading } = useOrders();
  const { mutate: updateStatus } = useUpdateOrderStatus();
  const { mutate: deleteOrder, isPending: isDeleting } = useDeleteOrder();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const handleStatusChange = (id: number, status: string) => {
    updateStatus({ id, status }, {
      onSuccess: () => toast({ title: "Estado del pedido actualizado" }),
    });
  };

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders.filter((o: any) => {
      const name = (o.guestName || o.shippingAddress?.split(" | ")[0] || "").toLowerCase();
      const phone = (o.guestPhone || o.shippingAddress || "").toLowerCase();
      const id = String(o.id);
      const matchSearch = !q || name.includes(q) || phone.includes(q) || id.includes(q);
      const matchStatus = statusFilter === "todos" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const handleExportCSV = () => {
    const rows = [
      ["ID", "Cliente", "Teléfono", "Dirección", "Estado", "Total", "Fecha"],
      ...filteredOrders.map((o: any) => {
        const parts = o.shippingAddress?.split(" | ") || [];
        const name = o.guestName || parts[0] || "Cliente";
        const phone = o.guestPhone || parts.find((p: string) => p.startsWith("Tel:"))?.replace("Tel: ", "") || "";
        const address = parts.filter((p: string) => !p.startsWith("Tel:") && !p.startsWith("Envio:")).slice(1).join(", ");
        return [
          `#${o.id}`, name, phone, address,
          o.status, `S/ ${Number(o.totalAmount).toFixed(2)}`,
          format(new Date(o.createdAt), "dd/MM/yyyy HH:mm", { locale: es }),
        ];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${filteredOrders.length} pedidos exportados` });
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending"  || s === "pendiente") return "bg-amber-100 text-amber-800 border-amber-200";
    if (s === "paid"     || s === "pagado")    return "bg-blue-100 text-blue-800 border-blue-200";
    if (s === "shipped"  || s === "enviado")   return "bg-indigo-100 text-indigo-800 border-indigo-200";
    if (s === "delivered"|| s === "entregado") return "bg-green-100 text-green-800 border-green-200";
    if (s === "cancelled"|| s === "cancelado") return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const isCancelled = (status: string) =>
    status === "cancelado" || status === "cancelled";

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-admin-orders-title">Pedidos</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona y rastrea los pedidos de los clientes.
              Los pedidos cancelados devuelven el stock automáticamente.
            </p>
          </div>
          <Button variant="outline" onClick={handleExportCSV} className="flex-shrink-0 gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nombre, teléfono o número de pedido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Filtrar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pagado">Pagado</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="entregado">Entregado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(search || statusFilter !== "todos") && (
          <p className="text-xs text-muted-foreground mt-2">
            Mostrando {filteredOrders.length} de {orders.length} pedidos
          </p>
        )}
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
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Cargando...</TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">No se encontraron pedidos</TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((o: any) => (
                <TableRow
                  key={o.id}
                  data-testid={`row-order-${o.id}`}
                  className={isCancelled(o.status) ? "opacity-60" : ""}
                >
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
                  <TableCell className={`font-medium ${isCancelled(o.status) ? "line-through text-muted-foreground" : ""}`}>
                    S/ {Number(o.totalAmount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(o.status)}>
                      {statusLabels[o.status.toLowerCase()] || o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      defaultValue={o.status}
                      onValueChange={(v) => handleStatusChange(o.id, v)}
                    >
                      <SelectTrigger
                        className="w-[140px] ml-auto h-8 text-xs"
                        data-testid={`select-order-status-${o.id}`}
                      >
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
                  <TableCell className="text-right">
                    {isCancelled(o.status) ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar pedido #{o.id}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Este pedido está cancelado y su stock ya fue devuelto.
                              Al eliminarlo desaparecerá de las estadísticas. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => deleteOrder(o.id)}
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <span className="w-8 inline-block" />
                    )}
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
