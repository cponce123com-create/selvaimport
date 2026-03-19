# SELVA IMPORT 🛒

Tienda online full-stack construida en español, inspirada en un MVP de Shopify. Permite a clientes comprar productos con o sin registro, y a administradores gestionar el catálogo, pedidos y contenido del sitio.

🌐 **Demo en vivo:** https://selvaimport.onrender.com

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, Shadcn UI |
| Routing | Wouter |
| Estado del servidor | TanStack Query (React Query) |
| Backend | Node.js + Express 5 |
| Base de datos | PostgreSQL + Drizzle ORM |
| Autenticación | Passport.js (session-based) |
| Imágenes | Cloudinary + Sharp |
| Animaciones | Framer Motion |

---

## Requisitos previos

- Node.js 20+
- PostgreSQL (local o en Neon / Supabase)
- Cuenta en Cloudinary (plan gratuito es suficiente)

---

## Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/cponce123com-create/selvaimport.git
cd selvaimport

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales (ver sección Variables de entorno)

# 4. Sincronizar el esquema de base de datos
npm run db:push

# 5. Iniciar en modo desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5000`.

---

## Variables de entorno

Copia `.env.example` y completa los valores:

```env
# Base de datos
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Sesión (usar un string largo y aleatorio)
SESSION_SECRET=un_string_muy_secreto_aqui

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Opcional
PORT=5000
ADMIN_EMAIL=admin@tutienda.com
ADMIN_PASSWORD=una_password_segura
VITE_WHATSAPP_NUMBER=51999999999
COOKIE_SECURE=false  # true en producción con HTTPS
```

---

## Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo con HMR
npm run build      # Build de producción
npm run start      # Correr el build de producción
npm run check      # Verificación de tipos TypeScript
npm run db:push    # Sincronizar schema con la base de datos
```

---

## Estructura del proyecto

```
selvaimport/
├── client/              # Frontend React
│   └── src/
│       ├── components/  # Componentes UI reutilizables
│       ├── hooks/       # Custom hooks (auth, cart, products...)
│       ├── pages/       # Páginas de la tienda y admin
│       └── lib/         # Utilidades y configuración
├── server/              # Backend Express
│   ├── index.ts         # Entry point
│   ├── routes.ts        # Endpoints de la API
│   ├── auth.ts          # Configuración de Passport
│   └── storage.ts       # Capa de acceso a datos
├── shared/              # Código compartido cliente/servidor
│   ├── schema.ts        # Schema de Drizzle + tipos
│   └── routes.ts        # Schemas Zod para validación
└── .github/
    └── workflows/       # CI/CD con GitHub Actions
```

---

## Funcionalidades principales

- **Catálogo de productos** con categorías, búsqueda y filtros
- **Sistema de descuentos** con precio normal y precio oferta
- **Checkout para invitados** sin necesidad de registro
- **Carrito persistente** (localStorage para invitados, DB para usuarios registrados)
- **Envío por WhatsApp** con mensaje estructurado y proforma en imagen
- **Panel de administración** completo (productos, categorías, pedidos, clientes, banner, CMS)
- **Banner carousel** administrable estilo Ripley
- **Optimización de imágenes** automática con Sharp + Cloudinary WebP
- **Pagos**: Yape QR + coordinación por WhatsApp

---

## Despliegue en producción

Ver [DEPLOY.md](./DEPLOY.md) para instrucciones detalladas de despliegue en Render.

**Resumen rápido:**
1. Crear un Web Service en Render apuntando a este repo
2. Configurar las variables de entorno en el dashboard de Render
3. Build command: `npm run build`
4. Start command: `npm run start`

---

## Credenciales de admin en desarrollo

Las credenciales por defecto solo aplican si no se configuran las variables de entorno:

```
Email:    admin@selvaimport.com
Password: admin123
```

> ⚠️ **En producción**, configura siempre `ADMIN_EMAIL` y `ADMIN_PASSWORD` con valores seguros en las variables de entorno de Render.

---

## Métricas de rendimiento (Lighthouse)

| Categoría | Desktop | Móvil |
|---|---|---|
| Rendimiento | 78/100 | 52/100 |
| Accesibilidad | 92/100 | 92/100 |
| Buenas prácticas | 100/100 | 100/100 |
| SEO | 91/100 | 91/100 |

---

## Licencia

MIT
