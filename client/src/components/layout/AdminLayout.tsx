import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Package, Tags, ShoppingCart, ArrowLeft, Users, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-access-denied">Acceso Denegado</h1>
        <p className="text-muted-foreground mb-6">Necesitas privilegios de administrador para acceder a esta area.</p>
        <Link href="/">
          <Button data-testid="button-return-home"><ArrowLeft className="w-4 h-4 mr-2" /> Volver al Inicio</Button>
        </Link>
      </div>
    );
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Package, label: "Productos", path: "/admin/products" },
    { icon: Tags, label: "Categorias", path: "/admin/categories" },
    { icon: ShoppingCart, label: "Pedidos", path: "/admin/orders" },
    { icon: Users, label: "Clientes", path: "/admin/customers" },
    { icon: FileText, label: "Contenido", path: "/admin/content" },
    { icon: Image, label: "Portada", path: "/admin/banner" },
  ];

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="w-64 border-r bg-card flex flex-col sticky top-0 h-screen hidden md:flex shadow-sm">
        <div className="h-16 flex items-center px-6 border-b gap-2.5">
          <img src="/logo-selva-import.jpg" alt="Selva Import" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-xl tracking-tight" data-testid="text-admin-title">SELVA IMPORT</span>
        </div>
        <div className="px-4 py-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Panel Admin</span>
        </div>
        <nav className="flex-1 py-2 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path} data-testid={`link-admin-${item.path.split('/').pop()}`} className={`
                flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
              `}>
                <item.icon className={`w-4 h-4 mr-3 ${isActive ? "opacity-100" : "opacity-70"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Link href="/">
            <Button variant="outline" className="w-full justify-start text-muted-foreground" data-testid="button-back-to-store">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver a la Tienda
            </Button>
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden h-16 border-b bg-card flex items-center px-4 justify-between">
          <span className="font-bold text-lg">Admin</span>
          <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
