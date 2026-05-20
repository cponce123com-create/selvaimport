// =====================================================
// ARCHIVO: server/telegram.ts
// Servicio de notificaciones por Telegram
// =====================================================

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, body: object, retries = 1, delayMs = 5000): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return res;
      // Si el error es del servidor (5xx), reintentar
      if (res.status >= 500 && attempt < retries) {
        console.warn(`⚠️  Telegram respondió ${res.status}, reintentando en ${delayMs}ms...`);
        await delay(delayMs);
        continue;
      }
      return res;
    } catch (e) {
      if (attempt < retries) {
        console.warn(`⚠️  Error de red con Telegram, reintentando en ${delayMs}ms...`, e);
        await delay(delayMs);
        continue;
      }
      throw e;
    }
  }
  throw new Error("All Telegram retries failed");
}

export async function sendTelegramMessage(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !chatId) {
    console.warn("⚠️  Telegram no configurado (faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID)");
    return;
  }

  try {
    const res = await fetchWithRetry(
      `https://api.telegram.org/bot${token}/sendMessage`,
      { chat_id: chatId, text, parse_mode: "HTML" },
      1, // 1 reintento
      5000, // 5 segundos de delay
    );
    if (!res.ok) {
      console.error("❌ Error enviando notificación a Telegram:", await res.text());
    } else {
      console.log("✅ Notificación Telegram enviada correctamente");
    }
  } catch (e) {
    console.error("❌ Error de conexión con Telegram tras reintentos:", e);
  }
}

// Envía mensaje a un cliente por su número de teléfono
// Solo funciona si el cliente inició conversación con el bot con /start
export async function sendTelegramToPhone(phone: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const normalized = phone.replace(/[^0-9]/g, "");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: normalized, text, parse_mode: "HTML" }),
    });
    if (res.ok) {
      console.log(`✅ Notificación enviada al cliente ${normalized}`);
      return true;
    } else {
      console.log(`ℹ️  Cliente ${normalized} no ha iniciado el bot de Telegram`);
      return false;
    }
  } catch (e) {
    console.error("❌ Error enviando a cliente:", e);
    return false;
  }
}

export function buildOrderMessage(order: {
  id: number;
  guestName?: string | null;
  guestPhone?: string | null;
  shippingAddress: string;
  totalAmount: string;
}): string {
  const nombre = order.guestName ?? "Cliente registrado";
  const contactoLabel = order.guestPhone?.includes("@") ? "📧 <b>Email:</b>" : "📱 <b>Teléfono:</b>";
  const telefonoLinea = order.guestPhone ? `${contactoLabel} ${order.guestPhone}\n` : "";

  const ahora = new Date().toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return `🛒 <b>¡NUEVO PEDIDO #${order.id}!</b>

👤 <b>Cliente:</b> ${nombre}
${telefonoLinea}📍 <b>Dirección / Datos:</b>
${order.shippingAddress}

💰 <b>Total:</b> S/ ${Number(order.totalAmount).toFixed(2)}

⏰ <b>Fecha:</b> ${ahora}

👉 Revisa el panel de administración para ver el detalle completo.`.trim();
}

const STATUS_LABELS: Record<string, string> = {
  pagado: "✅ Pago confirmado",
  enviado: "🚚 Tu pedido está en camino",
  entregado: "🎉 Pedido entregado",
  cancelado: "❌ Pedido cancelado",
  pendiente: "⏳ Pendiente de confirmación",
  paid: "✅ Pago confirmado",
  shipped: "🚚 Tu pedido está en camino",
  delivered: "🎉 Pedido entregado",
  cancelled: "❌ Pedido cancelado",
};

const STATUS_DETAIL: Record<string, string> = {
  pagado: "Recibimos tu pago. Estamos preparando tu pedido.",
  enviado: "Tu pedido salió de nuestro local y está en camino hacia ti.",
  entregado: "¡Tu pedido fue entregado! Gracias por comprar en Selva Import.",
  cancelado: "Tu pedido fue cancelado. Si tienes dudas contáctanos por WhatsApp.",
  paid: "Recibimos tu pago. Estamos preparando tu pedido.",
  shipped: "Tu pedido salió de nuestro local y está en camino hacia ti.",
  delivered: "¡Tu pedido fue entregado! Gracias por comprar en Selva Import.",
  cancelled: "Tu pedido fue cancelado. Si tienes dudas contáctanos por WhatsApp.",
};

export function buildStatusMessage(order: {
  id: number;
  status: string;
  totalAmount: string;
  guestName?: string | null;
  guestPhone?: string | null;
}): string {
  const nombre = order.guestName ?? "Cliente";
  const statusLabel = STATUS_LABELS[order.status] ?? `Estado: ${order.status}`;
  const statusDetail = STATUS_DETAIL[order.status] ?? "";
  const whatsapp = process.env.VITE_WHATSAPP_NUMBER || "51998130656";

  return `${statusLabel}

Hola <b>${nombre}</b>, te informamos sobre tu pedido en <b>Selva Import</b>:

📦 <b>Pedido #${order.id}</b>
💰 <b>Total:</b> S/ ${Number(order.totalAmount).toFixed(2)}

${statusDetail}

¿Tienes dudas? Escríbenos por WhatsApp: wa.me/${whatsapp}`.trim();
}
