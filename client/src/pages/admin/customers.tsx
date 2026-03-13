import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Users, UserCheck, UserX, ShoppingCart, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Customer {
  id: string | number;
  name: string;
  email: string;
  type: "registered" | "guest";
  ordersCount: number;
  totalSpent: number;
  createdAt: string | null;
}

export default function AdminCustomers() {
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: [api.admin.customers.path],
    queryFn: async () => {
      const res = await fetch(api.admin.customers.path, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar clientes");
      return await res.json();
    },
  });

  const filtered = (customers || []).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  const registered = filtered.filter(c => c.type === "registered");
  const guests = filtered.filter(c => c.type === "guest");
  const totalCustomers = (customers || []).length;
  const totalRegistered = (customers || []).filter(c => c.type === "registered").length;
  const totalGuests = (customers || []).filter(c => c.type === "guest").length;
  const totalRevenue = (customers || []).reduce((acc, c) => acc + c.totalSpent, 0);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-customers-title">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus clientes registrados e invitados</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/10 p-2 rounded-lg"><Users className="w-5 h-5 text-primary" /></div>
              <span className="text-sm font-medium text-muted-foreground">Total Clientes</span>
            </div>
            <p className="text-3xl font-bold" data-testid="stat-total-customers">{totalCustomers}</p>
          </div>
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg"><UserCheck className="w-5 h-5 text-green-600" /></div>
              <span className="text-sm font-medium text-muted-foreground">Registrados</span>
            </div>
            <p className="text-3xl font-bold" data-testid="stat-registered">{totalRegistered}</p>
          </div>
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg"><UserX className="w-5 h-5 text-blue-600" /></div>
              <span className="text-sm font-medium text-muted-foreground">Invitados</span>
            </div>
            <p className="text-3xl font-bold" data-testid="stat-guests">{totalGuests}</p>
          </div>
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg"><DollarSign className="w-5 h-5 text-amber-600" /></div>
              <span className="text-sm font-medium text-muted-foreground">Ingresos Totales</span>
            </div>
            <p className="text-3xl font-bold" data-testid="stat-total-revenue">S/ {totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-customers"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando clientes...</div>
        ) : (
          <div className="space-y-8">
            {registered.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  Clientes Registrados ({registered.length})
                </h2>
                <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-4 font-semibold">Cliente</th>
                        <th className="text-left p-4 font-semibold">Correo</th>
                        <th className="text-center p-4 font-semibold">Pedidos</th>
                        <th className="text-right p-4 font-semibold">Total Gastado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {registered.map((c) => (
                        <tr key={c.id} className="hover:bg-accent/30 transition-colors" data-testid={`row-customer-${c.id}`}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{c.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">{c.email}</td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1">
                              <ShoppingCart className="w-3.5 h-3.5" />
                              {c.ordersCount}
                            </span>
                          </td>
                          <td className="p-4 text-right font-semibold">S/ {c.totalSpent.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {guests.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <UserX className="w-5 h-5 text-blue-600" />
                  Compradores Invitados ({guests.length})
                </h2>
                <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-4 font-semibold">Nombre</th>
                        <th className="text-left p-4 font-semibold">Contacto</th>
                        <th className="text-center p-4 font-semibold">Pedidos</th>
                        <th className="text-right p-4 font-semibold">Total Gastado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {guests.map((c) => (
                        <tr key={c.id} className="hover:bg-accent/30 transition-colors" data-testid={`row-guest-${c.id}`}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-medium">{c.name}</span>
                                <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">Invitado</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">{c.email}</td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1">
                              <ShoppingCart className="w-3.5 h-3.5" />
                              {c.ordersCount}
                            </span>
                          </td>
                          <td className="p-4 text-right font-semibold">S/ {c.totalSpent.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold mb-1">Sin clientes</h3>
                <p className="text-muted-foreground text-sm">
                  {search ? "No se encontraron clientes con esa busqueda." : "Aun no hay clientes registrados."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
