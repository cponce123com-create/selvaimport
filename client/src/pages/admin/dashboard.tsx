import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrders } from "@/hooks/use-orders";
import { useProducts } from "@/hooks/use-products";
import { useDashboardMetrics } from "@/hooks/use-dashboard";
import { Link } from "wouter";
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { useMemo } from "react";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-800" },
  pagado:    { label: "Pagado",    color: "bg-blue-100 text-blue-800" },
  enviado:   { label: "Enviado",   color: "bg-purple-100 text-purple-800" },
  entregado: { label: "Entregado", color: "bg-green-100 text-green-800" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export default function AdminDashboard() {
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts({ admin: true });
  const { data: metrics } = useDashboardMetrics();

  // ── Métricas principales ──────────────────────────────────────────────────
  // Excluir pedidos cancelados de todas las métricas
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== "cancelado" && o.status !== "cancelled"),
    [orders]
  );

  const totalRevenue = useMemo(
    () => activeOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
    [activeOrders]
  );

  const totalSales = activeOrders.length;
  const avgOrder = totalSales > 0 ? totalRevenue / totalSales : 0;

  const pendingOrders = useMemo(
    () => activeOrders.filter((o) => o.status === "pendiente" || o.status === "pagado").length,
    [activeOrders]
  );

  const lowStockProducts = useMemo(
    () => products.filter((p: any) => p.inventory <= 3 && p.isVisible),
    [products]
  );

  const outOfStockProducts = useMemo(
    () => products.filter((p: any) => p.inventory === 0 && p.isVisible),
    [products]
  );

  // ── Ventas por mes (últimos 6 meses) — datos REALES ───────────────────────
  const salesByMonth = useMemo(() => {
    const now = new Date();
    const months: { name: string; total: number; pedidos: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthOrders = activeOrders.filter((o) => {
        if (!o.createdAt) return false;
        const od = new Date(o.createdAt);
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
      });

      months.push({
        name: MESES[d.getMonth()],
        total: monthOrders.reduce((s, o) => s + Number(o.totalAmount), 0),
        pedidos: monthOrders.length,
      });
    }

    return months;
  }, [activeOrders]);

  // ── Top productos más vendidos — datos REALES ─────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<number, { name: string; qty: number; revenue: number }> = {};

    activeOrders.forEach((o) => {
      (o.items || []).forEach((item: any) => {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.product?.name || `Producto #${item.productId}`,
            qty: 0,
            revenue: 0,
          };
        }
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += Number(item.price) * item.quantity;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  // ── Pedidos recientes ─────────────────────────────────────────────────────
  const recentOrders = useMemo(
    () => [...activeOrders].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    }).slice(0, 6),
    [activeOrders]
  );

  // ── Clientes únicos ───────────────────────────────────────────────────────
  const uniqueCustomers = useMemo(() => {
    const registered = new Set(activeOrders.filter((o) => o.userId).map((o) => o.userId));
    const guests = new Set(activeOrders.filter((o) => !o.userId && o.guestPhone).map((o) => o.guestPhone));
    return registered.size + guests.size;
  }, [activeOrders]);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Vista General</h1>
        <p className="text-muted-foreground mt-1">Resumen actualizado de Selva Import.</p>
      </div>

      {/* ── Métricas del dashboard (server-side) ── */}
      {metrics && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border border-green-200 dark:border-green-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Ventas Hoy</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-800 dark:text-green-200">
              S/ {metrics.salesToday.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Pedidos Pendientes</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">{metrics.pendingOrders}</div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border border-red-200 dark:border-red-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-red-700 dark:text-red-300">Stock Bajo</span>
              <Package className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-800 dark:text-red-200">{metrics.lowStockItems}</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Ingresos del Mes</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
              S/ {metrics.monthlyRevenue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* ── Alertas ── */}
      {(outOfStockProducts.length > 0 || pendingOrders > 0) && (
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {outOfStockProducts.length > 0 && (
            <Link href="/admin/products">
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-red-100 transition-colors">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {outOfStockProducts.length} producto{outOfStockProducts.length > 1 ? "s" : ""} sin stock
                  </p>
                  <p className="text-xs text-red-600">Clic para gestionar productos →</p>
                </div>
              </div>
            </Link>
          )}
          {pendingOrders > 0 && (
            <Link href="/admin/orders">
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {pendingOrders} pedido{pendingOrders > 1 ? "s" : ""} pendiente{pendingOrders > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-amber-600">Clic para ver pedidos →</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── Tarjetas métricas ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Ingresos totales</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold" data-testid="text-total-revenue">
            S/ {totalRevenue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Total pedidos</span>
            <ShoppingCart className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold" data-testid="text-total-orders">{totalSales}</div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Ticket promedio</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">
            S/ {avgOrder.toFixed(2)}
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Clientes únicos</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{uniqueCustomers}</div>
        </div>
      </div>

      {/* ── Gráficos ── */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">

        {/* Ingresos por mes — DATOS REALES */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Ingresos por mes</h2>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByMonth} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `S/${Math.round(v)}`}
                  width={64}
                />
                <Tooltip
                  formatter={(value: number) => [`S/ ${value.toFixed(2)}`, "Ingresos"]}
                  contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} className="fill-primary" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pedidos por mes — DATOS REALES */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Pedidos por mes</h2>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip
                  formatter={(value: number) => [value, "Pedidos"]}
                  contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Line
                  type="monotone"
                  dataKey="pedidos"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  className="stroke-primary"
                  stroke="hsl(var(--primary))"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Tablas ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Top productos más vendidos */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Top productos</h2>
            <Link href="/admin/products">
              <span className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer">
                Ver todos <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin ventas registradas.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.qty} unidades vendidas</p>
                  </div>
                  <span className="text-sm font-semibold text-primary flex-shrink-0">
                    S/ {p.revenue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pedidos recientes */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Pedidos recientes</h2>
            <Link href="/admin/orders">
              <span className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer">
                Ver todos <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay pedidos aún.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => {
                const status = STATUS_LABEL[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
                const name = (order as any).guestName || (order as any).user?.name || `Cliente #${order.userId}`;
                const date = order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })
                  : "";
                return (
                  <div key={order.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">#{order.id} — {name}</p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-sm font-semibold flex-shrink-0">
                      S/ {Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Productos con poco stock */}
        {lowStockProducts.length > 0 && (
          <div className="bg-card border border-amber-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                Stock bajo
                <span className="text-xs font-normal text-muted-foreground">(3 unidades o menos)</span>
              </h2>
              <Link href="/admin/products">
                <span className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer">
                  Gestionar <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {lowStockProducts.slice(0, 8).map((p: any) => (
                <div
                  key={p.id}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    p.inventory === 0
                      ? "border-red-200 bg-red-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <p className="font-medium truncate text-xs">{p.name}</p>
                  <p className={`text-xs font-bold mt-0.5 ${p.inventory === 0 ? "text-red-600" : "text-amber-600"}`}>
                    {p.inventory === 0 ? "Sin stock" : `${p.inventory} restante${p.inventory > 1 ? "s" : ""}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
