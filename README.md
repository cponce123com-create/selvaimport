# Selva Import 🛒

Tienda online full-stack construida con React y Node.js. Permite a clientes comprar con o sin registro, y a administradores gestionar el catálogo, pedidos, contenido y notificaciones en tiempo real por Telegram.

🌐 **Demo en vivo:** https://selvaimport.onrender.com

---

## Características principales

### Para el cliente
- Catálogo con categorías, búsqueda en tiempo real y filtros
- Búsqueda con resultados instantáneos mientras escribe (dropdown)
- Página de producto con zoom en imágenes, compartir por WhatsApp y consulta directa
- Productos relacionados ("también te puede interesar")
- Checkout sin registro (como invitado) o con cuenta
- Carrito persistente — localStorage para invitados, base de datos para registrados
- Cupones de descuento (porcentaje o monto fijo)
- Pop-up de bienvenida con cupón para nuevos visitantes
- Pago por Yape QR + coordinación por WhatsApp
- Proforma descargable como imagen
- Breadcrumbs de navegación en páginas de producto
- PWA instalable — funciona como app en el celular sin App Store
- Modo offline básico — carga aunque haya mala señal

### Para el administrador
- Panel completo de gestión de productos (crear, editar, eliminar, stock, imágenes, video)
- Compresión automática de imágenes antes de subir (sin pérdida de calidad visible)
- Gestión de categorías
- Panel de pedidos con búsqueda, filtros por estado y exportación a CSV
- Gestión de clientes (registrados e invitados)
- Banner carousel administrable (imágenes y videos)
- Editor de secciones del home (filas y rectángulos estilo Amazon)
- Gestión de cupones de descuento
- Editor de páginas estáticas (términos, privacidad, envíos, quiénes somos)
- Alerta de stock bajo por Telegram cuando un producto tiene 5 o menos unidades
- Notificación por Telegram en cada nuevo pedido

### Notificaciones Telegram
- Nuevo pedido → mensaje al admin con datos del cliente y total
- Cambio de estado de pedido → notificación al admin y al cliente (si dejó su teléfono)
- Stock bajo → alerta automática al admin después de cada venta

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite 7, Tailwind CSS, Shadcn UI |
| Routing | Wouter |
| Estado del servidor | TanStack Query (React Query) |
| Animaciones | Framer Motion |
| Backend | Node.js + Express 5 |
| Base de datos | PostgreSQL + Drizzle ORM |
| Autenticación | Passport.js (sesiones en PostgreSQL) |
| Imágenes | Cloudinary + Sharp + compresión en cliente |
| Notificaciones | Telegram Bot API |
| PWA | vite-plugin-pwa + Workbox |
| Seguridad | cookie-parser, rate limiting, tokens httpOnly |

---

## Requisitos previos

- Node.js 20+
- PostgreSQL 14+ (local, Neon, Supabase o Render)
- Cuenta en Cloudinary (plan gratuito es suficiente)
- Bot de Telegram (opcional, para notificaciones)

---

## Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/selvaimport.git
cd selvaimport

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores (ver sección Variables de entorno)

# 4. Crear las tablas en la base de datos
npm run db:push

# 5. Iniciar en modo desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5000`.

---

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores. **Nunca subas el archivo `.env` al repositorio.**

### Requeridas

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `SESSION_SECRET` | String aleatorio largo para firmar sesiones. Genera uno con: `openssl rand -hex 32` |
| `CLOUDINARY_CLOUD_NAME` | Nombre de tu cloud en Cloudinary |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary |

### Opcionales

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `5000` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `ADMIN_EMAIL` | Email del administrador inicial | `admin@selvaimport.com` |
| `ADMIN_PASSWORD` | Contraseña del administrador inicial | Solo aplica en development |
| `VITE_WHATSAPP_NUMBER` | Número de WhatsApp con código de país, sin `+` | — |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram para notificaciones | — |
| `TELEGRAM_CHAT_ID` | ID del chat donde llegan las notificaciones | — |
| `COOKIE_SECURE` | Forzar cookies seguras. Poner `false` si no hay HTTPS directo | `true` en producción |
| `SITE_URL` | URL pública del sitio, usada en el sitemap | — |

> **Nota sobre `VITE_WHATSAPP_NUMBER`:** Esta variable se incluye en el build del frontend. Si la cambias en Render, debes hacer un nuevo deploy para que tome efecto.

> **Nota sobre `ADMIN_PASSWORD`:** En producción, si no se configura esta variable y el administrador no existe, no se crea ningún admin automáticamente. Siempre configúrala en las variables de entorno de tu servidor.

---

## Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo con HMR
npm run build      # Build de producción (frontend + backend)
npm run start      # Ejecutar el build de producción
npm run check      # Verificación de tipos TypeScript
npm run db:push    # Sincronizar schema con la base de datos
```

---

## Estructura del proyecto

```
selvaimport/
├── client/                  # Frontend React
│   ├── public/              # Archivos estáticos (logo, QR, favicons)
│   ├── index.html           # HTML base con meta PWA y SEO
│   └── src/
│       ├── components/
│       │   ├── home/        # Secciones del home (filas, rectángulos)
│       │   ├── layout/      # AppLayout (navbar, footer, búsqueda)
│       │   ├── order/       # Proforma de pedido
│       │   ├── product/     # ProductCard
│       │   └── ui/          # Componentes Shadcn UI
│       ├── hooks/           # Custom hooks (auth, cart, orders, products...)
│       ├── lib/             # Utilidades (toWebP, getDisplayPrice...)
│       └── pages/
│           ├── admin/       # Panel de administración
│           │   ├── banner.tsx
│           │   ├── categories.tsx
│           │   ├── content.tsx
│           │   ├── coupons.tsx
│           │   ├── customers.tsx
│           │   ├── dashboard.tsx
│           │   ├── home-sections.tsx
│           │   ├── orders.tsx      # Búsqueda, filtros y exportación CSV
│           │   └── products.tsx    # CRUD + compresión de imágenes
│           ├── checkout.tsx        # Flujo de compra
│           ├── home.tsx            # Página principal + popup de bienvenida
│           ├── product.tsx         # Detalle de producto + zoom + compartir
│           ├── receipt.tsx         # Confirmación de pedido
│           └── ...
├── server/                  # Backend Express
│   ├── auth.ts              # Passport.js + validación de registro
│   ├── db.ts                # Conexión a PostgreSQL
│   ├── db-init.ts           # Creación de tablas e índices al iniciar
│   ├── index.ts             # Entry point + cookie-parser
│   ├── rateLimiter.ts       # Rate limiting para auth y API
│   ├── routes.ts            # Todos los endpoints de la API
│   ├── static.ts            # Servir archivos estáticos en producción
│   ├── storage.ts           # Capa de datos con caché en memoria
│   ├── telegram.ts          # Notificaciones por Telegram
│   └── vite.ts              # Vite dev server (solo desarrollo)
├── shared/                  # Código compartido cliente/servidor
│   ├── schema.ts            # Schema Drizzle + tipos TypeScript
│   └── routes.ts            # Definiciones de API con Zod
├── script/
│   └── build.ts             # Script de compilación
├── vite.config.ts           # Vite + PWA config
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## Base de datos

El esquema se define en `shared/schema.ts` con Drizzle ORM. Las tablas principales son:

- `users` — clientes registrados y administradores
- `products` — catálogo con imágenes, video, precio de oferta e inventario
- `categories` — categorías del catálogo
- `orders` — pedidos de usuarios registrados e invitados
- `order_items` — líneas de cada pedido
- `carts` / `cart_items` — carrito de usuarios registrados
- `coupons` — cupones de descuento con límite de usos y fecha de expiración
- `banner_slides` — slides del carrusel principal
- `home_rows` / `home_row_items` — filas de productos del home
- `home_rectangles` / `home_rectangle_items` — sección de rectángulos del home
- `site_pages` — páginas estáticas editables desde el admin

Al arrancar, `db-init.ts` crea automáticamente las tablas y los índices de rendimiento si no existen, sin necesidad de correr migraciones manualmente.

---

## Seguridad implementada

- **Rate limiting** en login, registro y endpoints de invitados
- **Sesiones en PostgreSQL** — sobreviven reinicios del servidor
- **Token de invitado en cookie httpOnly** — no expuesto en URLs
- **Validación de contraseña** — mínimo 8 caracteres con letras y números
- **Caché con invalidación** — productos en memoria con TTL de 60 segundos
- **Índices en base de datos** — en `orders.user_id`, `cart_items.cart_id`, `order_items.order_id` y más

---

## PWA y modo offline

La tienda está configurada como Progressive Web App:

- Los clientes pueden instalarla desde el navegador móvil (Chrome/Safari) sin App Store
- El Service Worker cachea imágenes de Cloudinary por 30 días
- Los productos se cachean por 5 minutos — la tienda carga aunque no haya señal
- Las categorías se cachean por 10 minutos

---

## Despliegue en Render

1. Crear un **Web Service** conectado al repositorio
2. Configurar en la sección **Environment** todas las variables requeridas
3. Agregar una base de datos **PostgreSQL** en Render y copiar la `DATABASE_URL`
4. Usar estos comandos:
   - **Build:** `npm install && npm run build`
   - **Start:** `npm run start`
5. Render asigna el `PORT` automáticamente

Ver [DEPLOY.md](./DEPLOY.md) para instrucciones detalladas incluyendo Railway, VPS y configuración de Nginx.

---

## Rendimiento (Lighthouse)

| Categoría | Desktop | Móvil |
|-----------|---------|-------|
| Rendimiento | 78/100 | 52/100 |
| Accesibilidad | 92/100 | 92/100 |
| Buenas prácticas | 100/100 | 100/100 |
| SEO | 91/100 | 91/100 |

---

## Licencia

MIT
