import { useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
type AdSlotVariant = "product" | "row";

interface AdSlotProps {
  /** "product" = ocupa 1 celda del grid (mismo tamaño que un producto)
   *  "row"     = ocupa toda la fila (col-span-full) */
  variant: AdSlotVariant;
  /** Slot ID de AdSense (ej: "1234567890"). Si no se pasa, muestra placeholder */
  adSlot?: string;
  /** Publisher ID de AdSense (ej: "ca-pub-XXXXXXXXXXXXXXXX") */
  adClient?: string;
  /** Clase CSS extra opcional */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────
export function AdSlot({ variant, adSlot, adClient, className = "" }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isConfigured = Boolean(adSlot && adClient);

  // Empuja el anuncio de AdSense cuando el componente se monta
  useEffect(() => {
    if (!isConfigured) return;
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}
  }, [isConfigured]);

  // ── Estilos según variante ─────────────────────────────────────────────────
  const wrapperClass =
    variant === "row"
      ? `col-span-full w-full ${className}`
      : `${className}`;

  // ── Placeholder (cuando aún no hay AdSense configurado) ───────────────────
  if (!isConfigured) {
    return (
      <div
        ref={containerRef}
        className={wrapperClass}
        aria-label="Espacio publicitario"
      >
        {variant === "row" ? (
          // Fila completa — banner horizontal
          <div className="w-full h-[90px] sm:h-[100px] bg-gradient-to-r from-gray-100 to-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-3 text-gray-400 text-xs font-medium select-none">
            <svg className="w-5 h-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Publicidad — Fila completa</span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="hidden sm:inline text-gray-300">728 × 90</span>
          </div>
        ) : (
          // Celda de producto — cuadrado/rectángulo
          <div className="w-full aspect-[3/4] bg-gradient-to-b from-gray-100 to-gray-50 border border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 text-xs font-medium select-none p-3">
            <svg className="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-center leading-tight">Publicidad</span>
            <span className="text-gray-300">300 × 400</span>
          </div>
        )}
      </div>
    );
  }

  // ── AdSense real ──────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={wrapperClass} aria-label="Publicidad">
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
          height: variant === "row" ? "90px" : "auto",
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={variant === "row" ? "horizontal" : "auto"}
        data-full-width-responsive="true"
      />
    </div>
  );
}
