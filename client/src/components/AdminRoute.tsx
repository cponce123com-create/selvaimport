import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

interface AdminRouteProps {
  component: React.ComponentType;
}

/**
 * Wrapper que protege rutas del panel admin.
 *
 * - Si la sesión está cargando: muestra spinner.
 * - Si no hay usuario autenticado: redirige a /login.
 * - Si el usuario no es admin: redirige a / (tienda).
 * - Si es admin: renderiza el componente normalmente.
 */
export function AdminRoute({ component: Component }: AdminRouteProps) {
  const { data: user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "var(--color-text-secondary)",
          fontSize: 14,
        }}
      >
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "admin") {
    return <Redirect to="/" />;
  }

  return <Component />;
}
