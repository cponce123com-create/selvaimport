import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrders } from "@/hooks/use-orders";
import { useProducts } from "@/hooks/use-products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalSales = orders.length;
  const totalProducts = products.length;

  const chartData = [
    { name: "Lun", total: Math.floor(totalRevenue * 0.1) },
    { name: "Mar", total: Math.floor(totalRevenue * 0.15) },
    { name: "Mie", total: Math.floor(totalRevenue * 0.05) },
    { name: "Jue", total: Math.floor(totalRevenue * 0.2) },
    { name: "Vie", total: Math.floor(totalRevenue * 0.3) },
    { name: "Sab", total: Math.floor(totalRevenue * 0.1) },
    { name: "Dom", total: Math.floor(totalRevenue * 0.1) },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Vista General</h1>
        <p className="text-muted-foreground mt-1">Resumen de tu tienda SELVA IMPORT.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="rounded-2xl shadow-sm border-border/50 bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-revenue">S/ {totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-border/50 bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos</CardTitle>
            <ShoppingCart className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-orders">+{totalSales}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-border/50 bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Productos</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-products">{totalProducts}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-border/50 bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Promedio</CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              S/ {totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 rounded-2xl shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Resumen de Ingresos</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `S/ ${value}`} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 rounded-2xl shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Pedidos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Pedido #{order.id}</p>
                    <p className="text-sm text-muted-foreground capitalize">{order.status}</p>
                  </div>
                  <div className="ml-auto font-medium">+S/ {Number(order.totalAmount).toFixed(2)}</div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay pedidos recientes.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
