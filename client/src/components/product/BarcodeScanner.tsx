import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Barcode, Camera, CameraOff, Loader2, Scan } from "lucide-react";

interface BarcodeScannerProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Escáner de código de barras con cámara.
 *
 * - Usa la API nativa `BarcodeDetector` (Chrome, Edge, Safari reciente).
 * - Si no está disponible, permite ingreso manual del código.
 * - Botón toggle para activar/desactivar la cámara.
 */
export function BarcodeScanner({ value, onChange }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectedRef = useRef(false);

  // Detectar soporte de BarcodeDetector
  useEffect(() => {
    if ("BarcodeDetector" in window) {
      BarcodeDetector.getSupportedFormats().then((formats) => {
        setSupported(formats.length > 0);
      }).catch(() => setSupported(false));
    } else {
      setSupported(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
    detectedRef.current = false;
  }, []);

  const startScanner = useCallback(async () => {
    if (!supported) return;

    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanning(true);
      detectedRef.current = false;
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara. Verifica los permisos.");
    } finally {
      setLoading(false);
    }
  }, [supported]);

  // Loop de detección mientras la cámara está activa
  useEffect(() => {
    if (!scanning || !videoRef.current) return;

    const detector = new BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr", "itf", "codabar"],
    });

    let animFrame: number;

    const detect = async () => {
      if (!videoRef.current || detectedRef.current) return;

      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && !detectedRef.current) {
          const code = barcodes[0].rawValue;
          if (code && code.trim()) {
            detectedRef.current = true;
            onChange(code.trim());
            stopCamera();
            return;
          }
        }
      } catch {
        // Ignorar errores de detección temporal
      }

      if (!detectedRef.current) {
        animFrame = requestAnimationFrame(detect);
      }
    };

    animFrame = requestAnimationFrame(detect);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [scanning, onChange, stopCamera]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleToggle = () => {
    if (scanning) {
      stopCamera();
    } else {
      startScanner();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Código de barras (opcional)"
            className="pl-10"
            data-testid="input-product-barcode"
          />
        </div>

        {/* Escáner con cámara — solo si el navegador lo soporta */}
        {supported !== null && (
          <Button
            type="button"
            variant={scanning ? "destructive" : "outline"}
            size="icon"
            onClick={handleToggle}
            disabled={loading || supported === false}
            title={
              supported
                ? scanning
                  ? "Detener escáner"
                  : "Escanear código de barras"
                : "Escáner no disponible en este navegador"
            }
            data-testid="button-barcode-scan"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : scanning ? (
              <CameraOff className="w-4 h-4" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Vista previa de la cámara */}
      {scanning && (
        <div className="relative rounded-xl overflow-hidden border border-border bg-black/5">
          <video
            ref={videoRef}
            className="w-full max-h-48 object-cover"
            playsInline
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-0.5 bg-primary/70 rounded-full shadow-lg shadow-primary/50 animate-pulse" />
          </div>
          <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded-full flex items-center gap-1.5">
            <Scan className="w-3 h-3 text-primary" />
            Escaneando...
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
            onClick={stopCamera}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Mensaje si no hay soporte */}
      {supported === false && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Scan className="w-3 h-3" />
          Tu navegador no soporta escaneo con cámara. Ingresa el código manualmente.
        </p>
      )}
    </div>
  );
}
