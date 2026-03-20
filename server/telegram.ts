// =====================================================
// ARCHIVO: server/telegram.ts
// Servicio de notificaciones por Telegram
// =====================================================

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function sendTelegramMessage(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !chatId) {
    console.warn("⚠️  Telegram no configurado (faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID)");
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ Error enviando notificación a Telegram:", err);
    } else {
      console.log("✅ Notificación Telegram enviada correctamente");
    }
  } catch (e) {
    console.error("❌ Error de conexión con Telegram:", e);
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
  const telefonoLinea = order.guestPhone
    ? `📱 <b>Teléfono:</b> ${order.guestPhone}\n`
    : "";

  const ahora = new Date().toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `🛒 <b>¡NUEVO PEDIDO #${order.id}!</b>

👤 <b>Cliente:</b> ${nombre}
${telefonoLinea}📍 <b>Dirección / Datos:</b>
${order.shippingAddress}

💰 <b>Total:</b> S/ ${Number(order.totalAmount).toFixed(2)}

⏰ <b>Fecha:</b> ${ahora}

👉 Revisa el panel de administración para ver el detalle completo.`.trim();
}
