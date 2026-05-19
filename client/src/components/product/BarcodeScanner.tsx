import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Barcode, Camera, CameraOff, Loader2, Scan } from "lucide-react";

// Type declarations for BarcodeDetector Web API (Chrome, Edge)
interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: readonly { x: number; y: number }[];
}

declare class BarcodeDetector {
  constructor(options?: { formats?: string[] });
  static getSupportedFormats(): Promise<string[]>;
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeScannerProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Escáner de código de barras con cámara.
 *
 * Estrategia híbrida:
 * 1. Si `BarcodeDetector` está disponible (Chrome, Edge, Safari ≥16.4) → API nativa + requestAnimationFrame
 * 2. Si NO está disponible (Safari iOS <16.4, Firefox) → @zxing/browser (BrowserMultiFormatReader)
 * 3. Si nada funciona → entrada manual
 */
export function BarcodeScanner({ value, onChange }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectedRef = useRef(false);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);

  // Detectar soporte de BarcodeDetector
  useEffect(() => {
    if ("BarcodeDetector" in window) {
      BarcodeDetector.getSupportedFormats()
        .then((formats: string[]) => {
          setSupported(formats.length > 0);
        })
        .catch(() => setSupported(false));
    } else {
      setSupported(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    // Detener ZXing si está activo
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {
        // ignorar
      }
      zxingControlsRef.current = null;
    }

    // Detener stream de cámara
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
    detectedRef.current = false;
  }, []);

  // ── Modo ZXing (fallback para Firefox, Safari iOS) ──
  const startZxingScanner = useCallback(async () => {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");

      const codeReader = new BrowserMultiFormatReader();

      // Obtener cámara trasera
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const backCamera = devices.find(
        (d: any) =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("environment") ||
          d.label.toLowerCase().includes("trasera") ||
          d.label.toLowerCase().includes("posterior")
      ) || devices[devices.length - 1];

      if (!backCamera) {
        throw new Error("No se encontró ninguna cámara");
      }

      // Iniciar stream manualmente para tener control
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: backCamera.deviceId
            ? { exact: backCamera.deviceId }
            : "environment",
        } as any,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanning(true);
      detectedRef.current = false;

      // Decodificar continuamente con ZXing
      const controls = await codeReader.decodeFromVideoDevice(
        backCamera.deviceId,
        videoRef.current!,
        (result: any, error: any) => {
          if (result && !detectedRef.current) {
            const code = result.getText();
            if (code && code.trim()) {
              detectedRef.current = true;
              onChange(code.trim());
              controls.stop();
              stopCamera();
            }
          }
        }
      );

      zxingControlsRef.current = controls;
    } catch (err: any) {
      console.error("ZXing scanner error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setCameraError(
          "Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador."
        );
      } else if (
        err.name === "NotFoundError" ||
        err.message?.includes("no se encontr")
      ) {
        setCameraError(
          "No se encontró ninguna cámara en este dispositivo."
        );
      } else {
        setCameraError(
          "No se pudo iniciar el escáner. Verifica los permisos de la cámara."
        );
      }
    }
  }, [onChange, stopCamera]);

  // ── Modo BarcodeDetector nativo (Chrome, Edge, Safari moderno) ──
  const startNativeScanner = useCallback(async () => {
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
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setCameraError(
          "Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador."
        );
      } else if (
        err.name === "NotFoundError"
      ) {
        setCameraError(
          "No se encontró ninguna cámara en este dispositivo."
        );
      } else {
        setCameraError(
          "No se pudo acceder a la cámara. Verifica los permisos."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Loop de detección nativo mientras la cámara está activa ──
  useEffect(() => {
    if (!scanning || !videoRef.current || supported !== true) return;

    let animFrame: number;
    let detector: BarcodeDetector | null = null;

    try {
      detector = new BarcodeDetector({
        formats: [
          "ean_13", "ean_8", "upc_a", "upc_e",
          "code_128", "code_39", "qr", "itf", "codabar",
        ],
      });
    } catch {
      console.warn("BarcodeDetector no soportado para los formatos solicitados");
      stopCamera();
      return;
    }

    const detect = async () => {
      if (!videoRef.current || detectedRef.current || !detector) return;

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
  }, [scanning, supported, onChange, stopCamera]);

  // ── Limpiar al desmontar ──
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleToggle = async () => {
    // Limpiar errores previos
    setCameraError(null);

    if (scanning) {
      stopCamera();
    } else {
      // Estrategia híbrida:
      // Si BarcodeDetector está disponible → modo nativo (más rápido)
      // Si no → ZXing fallback (Firefox, Safari iOS)
      if (supported === true) {
        await startNativeScanner();
      } else {
        await startZxingScanner();
      }
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

        {/* Escáner con cámara — siempre disponible (ZXing fallback cuando no hay BarcodeDetector) */}
        <Button
          type="button"
          variant={scanning ? "destructive" : "outline"}
          size="icon"
          onClick={handleToggle}
          disabled={loading}
          title={
            scanning
              ? "Detener escáner"
              : "Escanear código de barras con la cámara"
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
      </div>

      {/* Mensaje de error de cámara */}
      {cameraError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <p>{cameraError}</p>
        </div>
      )}

      {/* Vista previa de la cámara */}
      {scanning && !cameraError && (
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

      {/* Mensaje informativo */}
      {supported === false && !scanning && !cameraError && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Scan className="w-3 h-3" />
          Usando escáner compatible con todos los navegadores (incluye iOS y Firefox).
        </p>
      )}
    </div>
  );
}
