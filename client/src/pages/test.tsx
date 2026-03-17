import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";

export default function TestPage() {
  useEffect(() => {
    // ── Widget de Widjet ──────────────────────────────────────────────────────
    (window as any).__wj = (window as any).__wj || {};
    (window as any).__wj.widgetId = "d7ad0b38-9356-416a-8b35-4676a6e9d33a";
    (window as any).__wj.product_name = "widjet";

    const existingScript = document.getElementById("widjet-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "widjet-script";
      script.async = true;
      script.src =
        "https://jqvcafbrccpmygiihyry.supabase.co/functions/v1/widget-loader";
      document.head.appendChild(script);
    }

    // Limpieza al desmontar (opcional: quitar el script al salir de la página)
    return () => {
      const s = document.getElementById("widjet-script");
      if (s) s.remove();
      // Limpiar la instancia del widget si expone un método de destroy
      if ((window as any).__wj?.destroy) {
        (window as any).__wj.destroy();
      }
    };
  }, []);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 min-h-[60vh]">
        {/* Encabezado */}
        <div className="mb-8 border-b pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold mb-3 uppercase tracking-wider">
            Zona de pruebas
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
            TEST — Widget
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Esta página es exclusiva para probar integraciones y widgets externos.
            El widget de <strong>Widjet</strong> está cargado en esta página.
          </p>
        </div>

        {/* Contenedor del widget */}
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 sm:p-10 flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
          <p className="text-sm text-muted-foreground">
            El widget de Widjet se cargará automáticamente en esta página.<br />
            Si no aparece, verifica que el <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">widgetId</code> sea correcto.
          </p>
          {/* Widjet puede inyectar su UI en cualquier parte del DOM;
              algunos widgets usan un div con id específico */}
          <div id="widjet-container" className="w-full" />
        </div>

        {/* Información técnica */}
        <div className="mt-8 bg-gray-50 rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Detalles del widget cargado</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600 font-mono">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <span className="block text-gray-400 mb-1">widgetId</span>
              <span className="break-all">d7ad0b38-9356-416a-8b35-4676a6e9d33a</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <span className="block text-gray-400 mb-1">product_name</span>
              <span>widjet</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:col-span-2">
              <span className="block text-gray-400 mb-1">script src</span>
              <span className="break-all">
                https://jqvcafbrccpmygiihyry.supabase.co/functions/v1/widget-loader
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
