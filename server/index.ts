import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initDatabase } from "./db-init";

// ── Validación de environment variables requeridas ──
const REQUIRED_VARS = ["DATABASE_URL", "SESSION_SECRET"] as const;
for (const varName of REQUIRED_VARS) {
  if (!process.env[varName]) {
    console.error(`[ENV] FATAL: ${varName} is required but not set.`);
    process.exit(1);
  }
}

// Variables opcionales — solo warning
const OPTIONAL_VARS = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;
for (const varName of OPTIONAL_VARS) {
  if (!process.env[varName]) {
    console.warn(`[ENV] WARNING: ${varName} is not set. Related features will be unavailable.`);
  }
}

const app = express();
const httpServer = createServer(app);

app.use(compression());
app.use(cookieParser());

// ── Helmet: seguridad de headers (CSP, HSTS, XSS, etc.) ──
// CSP en modo report-only para detectar violaciones sin bloquear
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com", "https://pagead2.googlesyndication.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https://res.cloudinary.com", "data:", "blob:"],
      connectSrc: ["'self'", "https://res.cloudinary.com"],
      fontSrc: ["'self'"],
      frameSrc: ["https://accounts.google.com"],
    },
    reportOnly: true,
  },
  crossOriginEmbedderPolicy: false,
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// ── Middleware global de errores ──
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[ERROR] ${status} - ${message}`);
  if (status === 500) {
    console.error(err.stack);
  }

  if (res.headersSent) {
    return next(err);
  }

  return res.status(status).json({ message });
});

(async () => {
  try {
    await initDatabase();
    const { pool } = await import("./db");
    await pool.query("SELECT 1");
    console.log("[DB] Conexión a la base de datos exitosa ✓");
  } catch (err) {
    console.error("[DB] ERROR al conectar con la base de datos:", err);
  }

  await registerRoutes(httpServer, app);

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);

  httpServer.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
