import { useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, MessageCircle, Loader2, FileImage } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "51998130656";

interface ProformaItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface ProformaData {
  orderId?: number;
  items: ProformaItem[];
  subtotal: number;
  shippingLabel: string;
  shippingCost: number;
  isShalom: boolean;
  total: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  date: Date;
}

export function ProformaImage({ data, className }: { data: ProformaData; className?: string }) {
  const proformaRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const generateImage = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (!proformaRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(proformaRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        width: proformaRef.current.scrollWidth,
        height: proformaRef.current.scrollHeight,
      });
      return canvas;
    } catch (err) {
      console.error("Error generating proforma image:", err);
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const canvas = await generateImage();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `proforma-selva-import${data.orderId ? `-${data.orderId}` : ""}-${format(data.date, "yyyyMMdd")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [generateImage, data.orderId, data.date]);

  const handleShareWhatsApp = useCallback(async () => {
    const canvas = await generateImage();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      let sharedFile = false;
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], "proforma-selva-import.png", { type: "image/png" });
        const shareData = { files: [file] };
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            sharedFile = true;
          } catch {}
        }
      }
      if (!sharedFile) {
        const link = document.createElement("a");
        link.download = `proforma-selva-import${data.orderId ? `-${data.orderId}` : ""}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setTimeout(() => {
          const messageText =
            "PROFORMA - SELVA IMPORT\n" +
            "Hola, te envio mi proforma de pedido.\n" +
            "Total: S/ " + (data.isShalom ? data.subtotal.toFixed(2) + " + envio Shalom" : data.total.toFixed(2)) + "\n\n" +
            "La proforma se descargo como imagen, adjuntala en este chat.";
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`, "_blank", "noopener,noreferrer");
        }, 500);
      }
    }, "image/png");
  }, [generateImage, data]);

  const formattedDate = format(data.date, "d 'de' MMMM, yyyy", { locale: es });

  return (
    <div className={className}>
      <div
        ref={proformaRef}
        style={{
          width: "600px",
          fontFamily: "'Segoe UI', Arial, sans-serif",
          backgroundColor: "#ffffff",
          color: "#1a1a1a",
          padding: "0",
          fontSize: "14px",
          lineHeight: "1.5",
        }}
      >
        <div style={{
          background: "linear-gradient(135deg, #1a5632 0%, #2d8a4e 100%)",
          padding: "32px 40px",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "1px" }}>SELVA IMPORT</div>
            <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "4px", letterSpacing: "0.5px" }}>Tu tienda de confianza</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: "13px",
              fontWeight: "700",
              background: "rgba(255,255,255,0.2)",
              padding: "6px 16px",
              borderRadius: "20px",
              display: "inline-block",
            }}>
              PEDIDO / PROFORMA
            </div>
            {data.orderId && (
              <div style={{ fontSize: "12px", marginTop: "8px", opacity: 0.9 }}>
                N° {String(data.orderId).padStart(4, "0")}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "24px 40px 0 40px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "24px",
            marginBottom: "24px",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "8px" }}>
                Datos del Cliente
              </div>
              <div style={{ background: "#f8f9fa", padding: "12px 16px", borderRadius: "10px", fontSize: "13px" }}>
                <div style={{ marginBottom: "4px" }}><strong>Nombre:</strong> {data.customerName}</div>
                <div style={{ marginBottom: "4px" }}><strong>Teléfono:</strong> {data.customerPhone}</div>
                <div><strong>Dirección:</strong> {data.customerAddress}</div>
              </div>
            </div>
            <div style={{ width: "180px", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "8px" }}>
                Detalles
              </div>
              <div style={{ background: "#f8f9fa", padding: "12px 16px", borderRadius: "10px", fontSize: "13px" }}>
                <div style={{ marginBottom: "4px" }}><strong>Fecha:</strong> {formattedDate}</div>
                <div><strong>Envío:</strong> {data.shippingLabel}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 40px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #1a5632" }}>
                <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: "700", color: "#1a5632", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Producto</th>
                <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: "700", color: "#1a5632", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", width: "60px" }}>Cant.</th>
                <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: "700", color: "#1a5632", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", width: "100px" }}>P. Unit.</th>
                <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: "700", color: "#1a5632", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", width: "100px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee", background: i % 2 === 0 ? "#ffffff" : "#fafbfc" }}>
                  <td style={{ padding: "10px 8px", fontWeight: "500" }}>{item.name}</td>
                  <td style={{ padding: "10px 8px", textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>S/ {item.unitPrice.toFixed(2)}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: "600" }}>S/ {(item.unitPrice * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "20px 40px" }}>
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
          }}>
            <div style={{ width: "250px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#666" }}>
                <span>Subtotal</span>
                <span>S/ {data.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#666" }}>
                <span>Envío</span>
                <span>{data.shippingCost === 0 ? "GRATIS" : data.isShalom ? "Por coordinar" : `S/ ${data.shippingCost.toFixed(2)}`}</span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 16px",
                marginTop: "8px",
                background: "linear-gradient(135deg, #1a5632 0%, #2d8a4e 100%)",
                borderRadius: "10px",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "18px",
              }}>
                <span>TOTAL</span>
                <span>S/ {data.isShalom ? `${data.subtotal.toFixed(2)}+` : data.total.toFixed(2)}</span>
              </div>
              {data.isShalom && (
                <div style={{ fontSize: "11px", color: "#d97706", textAlign: "right", marginTop: "4px" }}>
                  + costo de envío Shalom por coordinar
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{
          margin: "0 40px",
          padding: "16px 20px",
          background: "#f0fdf4",
          borderRadius: "10px",
          border: "1px solid #bbf7d0",
          fontSize: "12px",
          color: "#166534",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          <span><strong>Metodo de pago:</strong> Yape / Transferencia - Envia tu comprobante por WhatsApp para confirmar.</span>
        </div>

        <div style={{
          padding: "16px 40px 24px 40px",
          marginTop: "16px",
          borderTop: "1px solid #eee",
          textAlign: "center",
          fontSize: "11px",
          color: "#999",
        }}>
          <div>SELVA IMPORT - Gracias por tu preferencia</div>
          <div style={{ marginTop: "2px" }}>WhatsApp: {WHATSAPP_NUMBER.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, "+$1 $2 $3 $4")}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button
          onClick={handleDownload}
          disabled={generating}
          className="flex-1 gap-2"
          variant="outline"
          data-testid="button-download-proforma"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Descargar Proforma PNG
        </Button>
        <Button
          onClick={handleShareWhatsApp}
          disabled={generating}
          className="flex-1 gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white"
          data-testid="button-share-proforma-whatsapp"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
          Enviar Proforma por WhatsApp
        </Button>
      </div>
    </div>
  );
}

export function buildWhatsAppMessage(data: ProformaData): string {
  const fecha = format(data.date, "d 'de' MMMM, yyyy", { locale: es });

  const productosTexto = data.items.map((item, i) => {
    const lineTotal = (item.unitPrice * item.quantity).toFixed(2);
    return `${i + 1}. ${item.name}\n   Cant: ${item.quantity} x S/ ${item.unitPrice.toFixed(2)} = S/ ${lineTotal}`;
  }).join("\n\n");

  const shippingCostText = data.isShalom
    ? "Por coordinar"
    : data.shippingCost === 0
      ? "GRATIS"
      : `S/ ${data.shippingCost.toFixed(2)}`;

  const totalText = data.isShalom
    ? `S/ ${data.subtotal.toFixed(2)} + envio Shalom`
    : `S/ ${data.total.toFixed(2)}`;

  const message = [
    "SELVA IMPORT",
    "==============================",
    "PEDIDO NUEVO",
    `Fecha: ${fecha}`,
    data.orderId ? `N. Pedido: #${String(data.orderId).padStart(4, "0")}` : "",
    "==============================",
    "",
    "PRODUCTOS:",
    "",
    productosTexto,
    "",
    "==============================",
    "RESUMEN:",
    `Subtotal: S/ ${data.subtotal.toFixed(2)}`,
    `Envio: ${data.shippingLabel} - ${shippingCostText}`,
    `TOTAL: ${totalText}`,
    "==============================",
    "",
    "DATOS DEL CLIENTE:",
    `Nombre: ${data.customerName}`,
    `Telefono: ${data.customerPhone}`,
    `Direccion: ${data.customerAddress}`,
    `Metodo: ${data.shippingLabel}`,
    "==============================",
    "",
    "Pago por: Yape / Transferencia",
    "Adjunto proforma del pedido",
    "",
    "Gracias por su compra",
    "SELVA IMPORT - Tu tienda de confianza",
  ].filter(line => line !== undefined).join("\n");

  return message;
}
