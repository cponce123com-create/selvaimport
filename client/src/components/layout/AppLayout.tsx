import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import {
  ShoppingBag,
  User as UserIcon,
  LogOut,
  Package,
  ShieldCheck,
  Menu,
  X,
  Home,
  Tag,
  Sparkles,
  Grid3X3,
  Users,
  Headphones,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCallback, useState, useEffect } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading: authLoading } = useAuth();
  const { data: cart } = useCart();
  const { mutate: logout } = useLogout();
  const [, forceUpdate] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    window.addEventListener("guest-cart-update", handler);
    return () => window.removeEventListener("guest-cart-update", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = () => {
      if (mql.matches) setMobileMenuOpen(false);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const cartItemCount =
    cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

  const handleNavClick = useCallback(
    (sectionId: string) => {
      setMobileMenuOpen(false);

      if (location !== "/") {
        setLocation("/");
        setTimeout(() => {
          const el = document.getElementById(sectionId);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 400);
      } else {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [location, setLocation]
  );

  const handleMobileLink = useCallback(
    (path: string) => {
      setMobileMenuOpen(false);
      setLocation(path);
    },
    [setLocation]
  );

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/" data-testid="link-home" className="flex items-center gap-2 group">
              <img
                src="/logo-selva-import.jpg"
                alt="Selva Import"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover group-hover:scale-110 transition-transform shadow-sm"
              />
              <span className="font-bold text-lg sm:text-xl tracking-tight">SELVA IMPORT</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <button
              onClick={() => handleNavClick("inicio")}
              className="hover:text-foreground transition-colors"
              data-testid="link-inicio"
            >
              Inicio
            </button>

            <button
              onClick={() => handleNavClick("ofertas")}
              className="hover:text-foreground transition-colors"
              data-testid="link-ofertas"
            >
              Ofertas
            </button>

            <button
              onClick={() => handleNavClick("novedades")}
              className="hover:text-foreground transition-colors"
              data-testid="link-novedades"
            >
              Novedades
            </button>

            <Link
              href="/page/quienes-somos"
              className="hover:text-foreground transition-colors"
              data-testid="link-quienes-somos"
            >
              Quienes Somos
            </Link>
          </nav>

          <nav className="flex items-center gap-1 sm:gap-4">
            <Link href="/cart">
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full h-10 w-10"
                data-testid="button-cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {cartItemCount}
                  </span>
                )}
              </Button>
            </Link>

            {!authLoading &&
              (user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full border border-border h-10 w-10"
                      data-testid="button-user-menu"
                    >
                      <UserIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-48 shadow-xl rounded-xl">
                    <div className="p-2 px-3 flex flex-col">
                      <span className="font-semibold text-sm">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>

                    <DropdownMenuSeparator />

                    {user.role === "admin" && (
                      <>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link
                            href="/admin"
                            className="flex items-center w-full"
                            data-testid="link-admin"
                          >
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Panel Admin
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link
                        href="/orders"
                        className="flex items-center w-full"
                        data-testid="link-orders"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Mis Pedidos
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => logout()}
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Cerrar Sesion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button
                    variant="default"
                    className="rounded-full font-medium shadow-md shadow-primary/10 h-9 px-4 text-sm sm:h-10 sm:px-5"
                    data-testid="button-login"
                  >
                    Iniciar Sesion
                  </Button>
                </Link>
              ))}
          </nav>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" data-testid="mobile-menu-overlay">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="absolute top-14 left-0 right-0 bg-background border-b shadow-xl max-h-[calc(100vh-3.5rem)] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
            <div className="p-4 space-y-1">
              <button
                onClick={() => handleNavClick("inicio")}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
                data-testid="mobile-link-inicio"
              >
                <Home className="w-5 h-5 text-primary" />
                Inicio
              </button>

              <button
                onClick={() => handleNavClick("ofertas")}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
                data-testid="mobile-link-ofertas"
              >
                <Tag className="w-5 h-5 text-primary" />
                Ofertas
              </button>

              <button
                onClick={() => handleNavClick("novedades")}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
                data-testid="mobile-link-novedades"
              >
                <Sparkles className="w-5 h-5 text-primary" />
                Novedades
              </button>

              <button
                onClick={() => handleNavClick("catalogo")}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
                data-testid="mobile-link-categorias"
              >
                <Grid3X3 className="w-5 h-5 text-primary" />
                Categorias
              </button>

              <button
                onClick={() => handleMobileLink("/page/quienes-somos")}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
                data-testid="mobile-link-quienes-somos"
              >
                <Users className="w-5 h-5 text-primary" />
                Quienes Somos
              </button>

              <button
                onClick={() => handleMobileLink("/cart")}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
                data-testid="mobile-link-carrito"
              >
                <ShoppingBag className="w-5 h-5 text-primary" />
                Carrito
                {cartItemCount > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartItemCount}
                  </span>
                )}
              </button>

              <div className="border-t my-2" />

              <button
                onClick={() => handleMobileLink("/page/envios")}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors text-muted-foreground"
                data-testid="mobile-link-soporte"
              >
                <Headphones className="w-5 h-5" />
                Soporte
              </button>
            </div>

            {!authLoading && !user && (
              <div className="p-4 pt-0">
                <Button
                  onClick={() => handleMobileLink("/login")}
                  className="w-full py-5 rounded-xl text-base"
                  data-testid="mobile-button-login"
                >
                  Iniciar Sesion
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card py-10 sm:py-12 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <img
                  src="/logo-selva-import.jpg"
                  alt="Selva Import"
                  className="w-7 h-7 rounded-md object-cover"
                />
                <span className="font-bold text-lg text-foreground">SELVA IMPORT</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Tu tienda de confianza con los mejores productos importados al mejor precio.
              </p>
              <a
                href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "51998130656"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#25D366] hover:underline"
                data-testid="link-footer-whatsapp"
              >
                <MessageCircle className="w-4 h-4" />
                {(import.meta.env.VITE_WHATSAPP_NUMBER || "51998130656").replace(
                  /(\d{2})(\d{3})(\d{3})(\d{3})/,
                  "+$1 $2 $3 $4"
                )}
              </a>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3">Enlaces</h4>
              <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <button
                  onClick={() => handleNavClick("inicio")}
                  className="hover:text-foreground transition-colors text-left"
                >
                  Inicio
                </button>
                <button
                  onClick={() => handleNavClick("ofertas")}
                  className="hover:text-foreground transition-colors text-left"
                >
                  Ofertas
                </button>
                <button
                  onClick={() => handleNavClick("novedades")}
                  className="hover:text-foreground transition-colors text-left"
                >
                  Novedades
                </button>
                <Link
                  href="/page/quienes-somos"
                  className="hover:text-foreground transition-colors"
                  data-testid="link-footer-quienes-somos"
                >
                  Quienes Somos
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3">Soporte</h4>
              <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <Link
                  href="/page/terminos"
                  className="hover:text-foreground transition-colors"
                  data-testid="link-terminos"
                >
                  Terminos y Condiciones
                </Link>
                <Link
                  href="/page/privacidad"
                  className="hover:text-foreground transition-colors"
                  data-testid="link-privacidad"
                >
                  Politica de Privacidad
                </Link>
                <Link
                  href="/page/envios"
                  className="hover:text-foreground transition-colors"
                  data-testid="link-envios"
                >
                  Envios y Devoluciones
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-xs sm:text-sm text-muted-foreground text-center">
              SELVA IMPORT &copy; {new Date().getFullYear()} - Todos los derechos reservados
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}