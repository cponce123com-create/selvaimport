import rateLimit from "express-rate-limit";

/**
 * Límite para endpoints de autenticación:
 * máx 10 intentos cada 15 minutos por IP.
 * Protege contra fuerza bruta en login y registro.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiados intentos. Por favor espera 15 minutos antes de intentarlo de nuevo.",
  },
  skip: () => process.env.NODE_ENV === "development",
});

/**
 * Límite para creación de pedidos de invitados:
 * máx 20 pedidos cada hora por IP.
 * Previene spam de pedidos falsos.
 */
export const guestOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Has realizado demasiados pedidos. Por favor intenta de nuevo en una hora.",
  },
  skip: () => process.env.NODE_ENV === "development",
});

/**
 * Límite general para la API pública:
 * máx 300 peticiones cada 5 minutos por IP.
 * Protege contra scraping masivo del catálogo.
 */
export const generalApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiadas peticiones. Por favor espera unos minutos.",
  },
  skip: () => process.env.NODE_ENV === "development",
});
