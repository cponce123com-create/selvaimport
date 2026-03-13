import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Home from "@/pages/home";
import ProductDetail from "@/pages/product";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Orders from "@/pages/orders";
import Receipt from "@/pages/receipt";
import Login from "@/pages/login";
import Register from "@/pages/register";

import SitePage from "@/pages/page";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminCategories from "@/pages/admin/categories";
import AdminOrders from "@/pages/admin/orders";
import AdminCustomers from "@/pages/admin/customers";
import AdminContent from "@/pages/admin/content";
import AdminBanner from "@/pages/admin/banner";

import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/orders" component={Orders} />
      <Route path="/order/:id" component={Receipt} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/page/:slug" component={SitePage} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/content" component={AdminContent} />
      <Route path="/admin/banner" component={AdminBanner} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
