import { useState, useEffect } from "react";
import { RotateCw, X } from "lucide-react";

export function UpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    // Escuchar el evento 'sw.updated' que emite vite-plugin-pwa
    const handler = () => setNeedRefresh(true);
    document.addEventListener("sw.updated", handler);
    return () => document.removeEventListener("sw.updated", handler);
  }, []);

  if (!needRefresh) return null;

  const handleUpdate = () => {
    // Intentar el SKIP_WAITING estándar de Workbox
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.waiting?.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      });
    }
  };

  const handleDismiss = () => setNeedRefresh(false);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[999] mx-auto max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-primary text-primary-foreground rounded-2xl shadow-2xl p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Nueva versión disponible</p>
          <p className="text-xs opacity-80">Actualiza para ver los últimos cambios</p>
        </div>
        <button
          onClick={handleUpdate}
          className="inline-flex items-center gap-1.5 bg-white text-primary font-medium text-xs px-3 py-2 rounded-xl hover:bg-white/90 transition-colors whitespace-nowrap"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
        <button
          onClick={handleDismiss}
          className="text-primary-foreground/70 hover:text-primary-foreground transition-colors p-1"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
