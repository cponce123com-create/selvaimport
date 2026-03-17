import { AppLayout } from "@/components/layout/AppLayout";
import { ProductCard } from "@/components/product/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useMemo } from "react";
import { Tag, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function TacoraPage() {
  const { data: categories } = useCategories();
  
  const tacoraCategory = useMemo(() => 
    categories?.find(c => c.slug === "tacora"), 
    [categories]
  );

  const { data: products, isLoading } = useProducts({
    categoryId: tacoraCategory?.id
  });

  return (
    <AppLayout>
      <div className="bg-muted/30 border-b">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
                <Tag className="w-4 h-4" />
                SECCIÓN ESPECIAL
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">TACORA</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Nuestra sección exclusiva de productos de segunda mano y oportunidades únicas. 
                Calidad garantizada al mejor precio del mercado.
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="bg-primary text-primary-foreground p-8 rounded-3xl shadow-2xl rotate-3 flex flex-col items-center gap-4 max-w-[280px]">
                <ShoppingBag className="w-12 h-12" />
                <div className="text-center">
                  <p className="font-bold text-xl">Oportunidades Únicas</p>
                  <p className="text-sm opacity-90">Stock limitado, ¡aprovecha ahora!</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 min-h-[60vh]">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Próximamente más productos</h3>
            <p className="text-muted-foreground mb-8 max-w-xs">
              Estamos preparando nuevas ofertas de segunda mano para ti. Vuelve pronto.
            </p>
            <a href="/" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
              Explorar tienda principal <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
