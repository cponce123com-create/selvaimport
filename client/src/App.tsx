import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminRoute } from "@/components/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { lazy, Suspense } from "react";

// Public Pages
const Home = lazy(() => import("@/pages/home"));
const ProductDetail = lazy(() => import("@/pages/product"));
const Cart = lazy(() => import("@/pages/cart"));
const Checkout = lazy(() => import("@/pages/checkout"));
const Orders = lazy(() => import("@/pages/orders"));
const Receipt = lazy(() => import("@/pages/receipt"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const SitePage = lazy(() => import("@/pages/page"));
const TacoraPage = lazy(() => import("@/pages/tacora"));
const SelvaNaturalPage = lazy(() => import("@/pages/selva-natural"));

// Admin Pages (lazy — se cargan solo si el usuario llega a /admin)
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminProducts = lazy(() => import("@/pages/admin/products"));
const AdminCategories = lazy(() => import("@/pages/admin/categories"));
const AdminOrders = lazy(() => import("@/pages/admin/orders"));
const AdminCustomers = lazy(() => import("@/pages/admin/customers"));
const AdminContent = lazy(() => import("@/pages/admin/content"));
const AdminBanner = lazy(() => import("@/pages/admin/banner"));
const AdminCoupons = lazy(() => import("@/pages/admin/coupons"));
const AdminSuppliers = lazy(() => import("@/pages/admin/suppliers"));
const AdminPurchaseReport = lazy(() => import("@/pages/admin/purchase-report"));
const AdminHomeSections = lazy(() => import("@/pages/admin/home-sections"));

const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Cargando...</div>}>
      <Switch>
        {/* ── Rutas públicas ── */}
        <Route path="/" component={Home} />
        <Route path="/product/:slug" component={ProductDetail} />
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/orders" component={Orders} />
        <Route path="/order/:id" component={Receipt} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/page/:slug" component={SitePage} />
        <Route path="/tacora" component={TacoraPage} />
        <Route path="/selva-natural" component={SelvaNaturalPage} />

        {/* ── Rutas admin protegidas ── */}
        <Route path="/admin">
          {() => <AdminRoute component={AdminDashboard} />}
        </Route>
        <Route path="/admin/products">
          {() => <AdminRoute component={AdminProducts} />}
        </Route>
        <Route path="/admin/categories">
          {() => <AdminRoute component={AdminCategories} />}
        </Route>
        <Route path="/admin/orders">
          {() => <AdminRoute component={AdminOrders} />}
        </Route>
        <Route path="/admin/customers">
          {() => <AdminRoute component={AdminCustomers} />}
        </Route>
        <Route path="/admin/content">
          {() => <AdminRoute component={AdminContent} />}
        </Route>
        <Route path="/admin/banner">
          {() => <AdminRoute component={AdminBanner} />}
        </Route>
        <Route path="/admin/coupons">
          {() => <AdminRoute component={AdminCoupons} />}
        </Route>
        <Route path="/admin/suppliers">
          {() => <AdminRoute component={AdminSuppliers} />}
        </Route>
        <Route path="/admin/purchase-report">
          {() => <AdminRoute component={AdminPurchaseReport} />}
        </Route>
        <Route path="/admin/home-sections">
          {() => <AdminRoute component={AdminHomeSections} />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
