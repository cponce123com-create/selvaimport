import { AppLayout } from "@/components/layout/AppLayout";
import { ProductCard } from "@/components/product/ProductCard";
import { HomeProductRow } from "@/components/home/HomeProductRow";
import { HomeRectanglesSection } from "@/components/home/HomeRectanglesSection";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Search,
  Sparkles,
  Tag,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { toWebP, getDisplayPrice } from "@/lib/utils";

interface BannerSlideData {
  id: number;
  title: string | null;
  subtitle: string | null;
  mediaType: "image" | "video";
  imageUrl: string | null;
  videoUrl: string | null;
  publicId: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  buttonCategoryId: number | null;
  sortOrder: number;
  isActive: boolean;
  product1?: {
    id: number;
    name: string;
    price: string;
    offerPrice?: string | null;
    isOffer?: boolean | null;
    imageUrl: string | null;
    images: string[] | null;
    description: string;
  } | null;
  product2?: {
    id: number;
    name: string;
    price: string;
    offerPrice?: string | null;
    isOffer?: boolean | null;
    imageUrl: string | null;
    images: string[] | null;
    description: string;
  } | null;
  buttonCategory?: { id: number; name: string; slug: string } | null;
}

function BannerProductCard({
  product,
}: {
  product: NonNullable<BannerSlideData["product1"]>;
}) {
  const img = toWebP(product.images?.[0] || product.imageUrl);
  const pricing = getDisplayPrice(product);

  return (
    <Link href={`/product/${product.id}`} data-testid={`banner-product-${product.id}`}>
      <div className="bg-white rounded-xl border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer h-full">
        <div className="relative h-[220px] overflow-hidden bg-white p-3 flex items-center justify-center">
          {img && (
            <img
              src={img}
              alt={product.name}
              className="max-w-full max-h-full object-contain p-2 group-hover:scale-110 transition-transform duration-300"
            />
          )}

          {pricing.discount && (
            <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              -{pricing.discount}%
            </span>
          )}
        </div>

        <div className="p-2.5 sm:p-3">
          <h4 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug mb-1.5">
            {product.name}
          </h4>

          {pricing.original ? (
            <div className="flex items-center gap-1.5">
              <span className="line-through text-gray-400 text-[10px] sm:text-xs">
                S/ {pricing.original.toFixed(2)}
              </span>
              <span className="font-bold text-red-600 text-sm sm:text-base">
                S/ {pricing.current.toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="font-bold text-foreground text-sm sm:text-base">
              S/ {pricing.current.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function getButtonLink(slide: BannerSlideData): {
  href: string;
  isCategoryLink: boolean;
} {
  if (slide.buttonCategoryId && slide.buttonCategory) {
    return {
      href: `/?cat=${slide.buttonCategoryId}#catalogo`,
      isCategoryLink: true,
    };
  }

  return {
    href: slide.buttonLink || "/#catalogo",
    isCategoryLink: false,
  };
}

function BannerCTA({
  slide,
  className,
}: {
  slide: BannerSlideData;
  className: string;
}) {
  if (!slide.buttonText) return null;

  const { href, isCategoryLink } = getButtonLink(slide);

  if (isCategoryLink) {
    return (
      <a href={href} className={className} data-testid="button-banner-cta">
        {slide.buttonText}
      </a>
    );
  }

  return (
    <Link href={href}>
      <span className={className} data-testid="button-banner-cta">
        {slide.buttonText}
      </span>
    </Link>
  );
}

function DynamicBannerSlide({ slide, priority }: { slide: BannerSlideData, priority?: boolean }) {
  const hasProducts = slide.product1 || slide.product2;
  const productCards = [slide.product1, slide.product2].filter(
    Boolean
  ) as NonNullable<BannerSlideData["product1"]>[];

  const isVideo = slide.mediaType === "video" && slide.videoUrl;
  const hasMedia = slide.imageUrl || slide.videoUrl;

  return (
    <div className="w-full h-full relative overflow-hidden">
      {isVideo ? (
        <video
          src={slide.videoUrl!}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={slide.imageUrl ? toWebP(slide.imageUrl, 1200) : undefined}
        />
      ) : slide.imageUrl ? (
        <img
          src={toWebP(slide.imageUrl, 1200)}
          srcSet={`${toWebP(slide.imageUrl, 600)} 600w, ${toWebP(slide.imageUrl, 1200)} 1200w, ${toWebP(slide.imageUrl, 1920)} 1920w`}
          sizes="100vw"
          alt={slide.title || ""}
          className="absolute inset-0 w-full h-full object-cover"
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          {...(priority ? { fetchPriority: "high" } : {})}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
      )}

      {hasMedia && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
      )}
      {hasMedia && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      )}

      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-full flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 flex items-end lg:items-center py-4 sm:py-6 lg:py-8">
            <div className="w-full max-w-xl">
              {slide.title && (
                <h2
                  className={`font-bold leading-[1.1] mb-1 sm:mb-2 ${
                    hasMedia ? "text-white drop-shadow-lg" : "text-foreground"
                  }`}
                  style={{ fontSize: "clamp(1.25rem, 3vw, 2.5rem)" }}
                  data-testid="text-banner-title"
                >
                  {slide.title}
                </h2>
              )}

              {slide.subtitle && (
                <p
                  className={`mb-3 sm:mb-4 ${
                    hasMedia ? "text-white/90 drop-shadow" : "text-muted-foreground"
                  }`}
                  style={{ fontSize: "clamp(0.75rem, 1.3vw, 1rem)" }}
                >
                  {slide.subtitle}
                </p>
              )}

              <BannerCTA
                slide={slide}
                className={`inline-block px-5 py-2 sm:px-7 sm:py-3 font-semibold rounded-full hover:scale-105 transition-transform duration-300 shadow-lg text-sm sm:text-base cursor-pointer ${
                  hasMedia
                    ? "bg-white text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              />
            </div>
          </div>

          {hasProducts && (
            <div className="hidden lg:flex lg:flex-col gap-4 py-4 lg:w-[320px] xl:w-[380px] flex-shrink-0">
              {productCards.map((p) => (
                <div key={p.id}>
                  <BannerProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasProducts && (
        <div className="lg:hidden relative">
          <div className="flex gap-3 px-4 pb-4 overflow-x-auto no-scrollbar">
            {productCards.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-[180px] sm:w-[220px]">
                <BannerProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | undefined>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: products, isLoading: productsLoading } = useProducts({
    search: search.length > 2 ? search : undefined,
    categoryId: selectedCat,
  });

  const { data: categories } = useCategories();

  const { data: bannerSlides = [], isLoading: bannerLoading } = useQuery<
    BannerSlideData[]
  >({
    queryKey: ["/api/banner-slides"],
  });

  const { data: homeRows = [] } = useQuery<any[]>({
    queryKey: ["/api/home-rows"],
  });

  const { data: homeRectangles = [] } = useQuery<any[]>({
    queryKey: ["/api/home-rectangles"],
  });

  const allProducts = products ?? [];
  const allCategories = categories ?? [];

  const visibleProducts = allProducts.filter(
    (p: any) => p.category?.slug !== "tacora"
  );

  const publicCategories = allCategories.filter(
    (cat: any) => cat.slug !== "tacora"
  );

  const offerProducts = useMemo(
    () => visibleProducts.filter((p: any) => p.isOffer),
    [visibleProducts]
  );

  const newProducts = useMemo(() => {
    return [...visibleProducts]
      .sort((a: any, b: any) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 6);
  }, [visibleProducts]);

  const hasDynamicSlides = bannerSlides.length > 0;
  const totalSlides = hasDynamicSlides ? bannerSlides.length : 1;

  useEffect(() => {
    if (currentSlide >= totalSlides && totalSlides > 0) {
      setCurrentSlide(0);
    }
  }, [totalSlides, currentSlide]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    if (totalSlides <= 1) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide, totalSlides]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace("#", "");
      setTimeout(() => scrollToSection(id), 300);
    }
  }, [scrollToSection]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get("cat");
    if (catParam) {
      setSelectedCat(Number(catParam));
      setTimeout(() => scrollToSection("catalogo"), 400);
    }
  }, [scrollToSection]);

  return (
    <AppLayout>
      <section
        id="inicio"
        className="relative overflow-hidden bg-gray-50 scroll-mt-24"
        data-testid="banner-carousel"
      >
        <div
          className="w-full relative"
          style={{ aspectRatio: "16/7", minHeight: "300px", maxHeight: "620px" }}
        >
          <AnimatePresence mode="wait">
            {bannerLoading ? (
              <div className="absolute inset-0 bg-white" />
            ) : hasDynamicSlides ? (
              <motion.div
                key={`slide-${bannerSlides[currentSlide]?.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0"
              >
                <DynamicBannerSlide 
                  slide={bannerSlides[currentSlide]} 
                  priority={currentSlide === 0}
                />
              </motion.div>
            ) : (
              <div className="absolute inset-0 bg-white" />
            )}
          </AnimatePresence>

          {totalSlides > 1 && !bannerLoading && hasDynamicSlides && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-md text-foreground flex items-center justify-center hover:bg-white transition-colors active:scale-95"
                data-testid="button-carousel-prev"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={nextSlide}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-md text-foreground flex items-center justify-center hover:bg-white transition-colors active:scale-95"
                data-testid="button-carousel-next"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div
                className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 sm:gap-2"
                data-testid="carousel-indicators"
              >
                {Array.from({ length: totalSlides }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentSlide
                        ? "w-7 bg-primary shadow-sm"
                        : "w-2 bg-gray-400/60 hover:bg-gray-500"
                    }`}
                    data-testid={`carousel-dot-${i}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Sección de 4 rectángulos estilo Amazon */}
      {homeRectangles.length > 0 && (
        <HomeRectanglesSection rectangles={homeRectangles} />
      )}

      {/* Filas estilo Amazon administrables */}
      {homeRows.map((row: any) => (
        <HomeProductRow
          key={row.id}
          title={row.title}
          products={row.items?.map((item: any) => item.product) || []}
        />
      ))}

      {offerProducts.length > 0 && (
        <section
          id="ofertas"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10"
        >
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <h2
              className="text-2xl sm:text-3xl font-bold text-foreground"
              data-testid="text-offers-title"
            >
              Ofertas Destacadas
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {offerProducts.map((product: any) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <ProductCard product={product} badge="OFERTA" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {newProducts.length > 0 && (
        <section id="novedades" className="bg-muted/30 py-10 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <h2
                className="text-2xl sm:text-3xl font-bold text-foreground"
                data-testid="text-new-arrivals-title"
              >
                Novedades
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {newProducts.map((product: any) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <ProductCard product={product} badge="NUEVO" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-6 mb-6 sm:mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <h2
                className="text-2xl sm:text-3xl font-bold text-foreground"
                data-testid="text-catalog-title"
              >
                Todos los Productos
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Encuentra exactamente lo que buscas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                className="pl-9 rounded-full bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-colors h-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-4 sm:pb-6 -mx-1 px-1">
          <button
            onClick={() => setSelectedCat(undefined)}
            data-testid="button-category-all"
            className={`whitespace-nowrap px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
              !selectedCat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-border"
            }`}
          >
            Todos
          </button>

          {publicCategories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              data-testid={`button-category-${cat.id}`}
              className={`whitespace-nowrap px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
                selectedCat === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-border"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse flex flex-col gap-3">
                <div className="bg-muted rounded-2xl aspect-square w-full"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="text-center py-16 sm:py-24 bg-muted/30 rounded-3xl border border-dashed">
            <h3
              className="text-lg sm:text-xl font-semibold mb-2"
              data-testid="text-no-products"
            >
              No se encontraron productos
            </h3>
            <p className="text-sm text-muted-foreground">
              Intenta ajustar tu busqueda o filtros.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {visibleProducts.map((product: any) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
