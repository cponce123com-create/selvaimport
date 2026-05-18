# SELVA IMPORT - E-Commerce Platform

## Overview
Full-stack e-commerce platform ("SELVA IMPORT") built in Spanish, similar to Shopify MVP.

## Tech Stack
- **Frontend**: React + Vite, Tailwind CSS, Shadcn UI, TanStack Query, wouter
- **Backend**: Node.js + Express, session-based auth (passport-local)
- **Database**: PostgreSQL + Drizzle ORM
- **Images**: Cloudinary (upload, storage, optimization)
- **Extra**: framer-motion, recharts, date-fns, multer

## Project Structure
- `shared/schema.ts` - Database schema (users, categories, products [with images array], carts, cart_items, orders, order_items, site_pages, banner_slides)
- `shared/routes.ts` - API route definitions with Zod schemas
- `server/auth.ts` - Session auth with passport-local (password stripped from responses)
- `server/routes.ts` - Express API routes + seed data
- `server/storage.ts` - Storage interface (CRUD operations)
- `client/src/pages/` - All frontend pages
- `client/src/components/layout/` - AppLayout, AdminLayout
- `client/src/components/product/` - ProductCard
- `client/src/hooks/` - Custom hooks (use-auth, use-cart, use-products, use-orders, use-categories)

## Key Features
- Product catalog with categories and search
- **Guest checkout** - no login required, localStorage-based cart, guest order API
- Shopping cart (works for both guests and logged-in users)
- Checkout with shipping options (Recojo/San Ramon/La Merced/Shalom), WhatsApp order, Yape QR
- Orders and receipts (guest receipts via `?guest=1` query param)
- Auth with roles (admin/customer)
- Admin dashboard with CRUD for products, categories, orders
- **Admin customers panel** - shows registered users + guest buyers with stats
- Product image upload (up to 5 per product) via Cloudinary
- **Image gallery with arrows** on product detail page (prev/next navigation, always visible on mobile, hover on desktop)
- **Administrable banner carousel** - Ripley-style homepage banner with promo image + 2 featured product cards per slide
  - Admin panel at `/admin/banner` for full CRUD (create, edit, delete, reorder, toggle active)
  - Each slide: title, subtitle, promo image (Cloudinary), 2 product selectors, CTA button text/link, active toggle
  - Auto-rotates every 5 seconds with smooth transitions, manual arrows + dot indicators
  - Falls back to static hero when no slides exist
  - Data stored in `banner_slides` table, API at `/api/banner-slides` (public) and `/api/admin/banner-slides` (admin)
- Ofertas/Novedades nav links scroll to sections smoothly
- Category filter pills below catalog title
- Products marked as `isOffer` appear in carousel + Ofertas section
- **Discount/offer system** - products have `offerPrice` field; admin sets normal price + offer price, discount % auto-calculated; discount badge (-XX%) shown on product image; strikethrough original price + red offer price across all pages (home, product detail, cart, checkout); server uses effective price (offerPrice when valid) for order totals
- **WebP image optimization** - `toWebP()` utility auto-converts Cloudinary (`f_webp,q_auto`) and Unsplash (`fm=webp`) URLs to WebP format
- **Auto-slug generation** - slugs auto-generated from product names server-side, with `-2`, `-3` suffix for duplicates
- **CMS for legal/info pages** - admin can edit Terminos, Privacidad, Envios, Quienes Somos pages
- **WhatsApp emoji encoding** fixed - all wa.me URLs properly use encodeURIComponent
- 10 categories: Tecnologia, Moda y Accesorios, Hogar y Cocina, Belleza y Cuidado Personal, Salud y Bienestar, Juguetes y Ninos, Papeleria y Oficina, Mascotas, Deportes y Fitness, Herramientas y Ferreteria

## Guest Checkout
- Guest cart stored in `localStorage` key `selva_import_guest_cart`
- `use-cart.ts` exports `useGuestCart()`, `clearGuestCart()`, dispatches `"guest-cart-update"` window event
- Guest order endpoint: `POST /api/orders/guest` (no auth required)
- Guest order lookup: `GET /api/orders/guest/:id` (no auth required)
- Receipt page uses `?guest=1` query param to fetch guest orders
- `orders.userId` is nullable; `guestName`/`guestPhone` columns store guest identity
- Login page has "Continuar como Invitado" button

## Logo
- Official logo at `client/public/logo-selva-import.jpg`
- Displayed in: AppLayout header/footer, AdminLayout sidebar, login page, proforma

## Environment Variables
All configurable values are driven by environment variables. See `.env.example` for the full list.
- **Required**: `DATABASE_URL`, `SESSION_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Optional**: `PORT` (default 5000), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `VITE_WHATSAPP_NUMBER`, `COOKIE_SECURE`
- `VITE_` prefixed vars are baked into the frontend build

## Admin Credentials
- Default: `admin@selvaimport.com` (configurable via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars)
  - ⚠️ En producción, ADMIN_PASSWORD es OBLIGATORIO. Si no se configura, no se crea el admin.

## Language & Branding
- 100% Spanish UI
- Store name: SELVA IMPORT
- Prices in Soles Peruanos (S/) format
- Date formatting with date-fns Spanish locale

## Checkout/WhatsApp Config
- WhatsApp number: configurable via `VITE_WHATSAPP_NUMBER` (default: 51998130656)
- Shipping: Recojo (free), San Ramon (S/4), La Merced (S/8), Shalom (by coordination)
- Yape QR: public/yape-qr.jpg (user's real QR image)
- WhatsApp message: Plain text (no emojis), `======` separators, structured sections (buildWhatsAppMessage in ProformaImage.tsx)
- Proforma image: html2canvas generates PNG of styled HTML receipt (ProformaImage component)
  - Download as PNG file
  - Share via navigator.share (mobile) or auto-download + open WhatsApp (desktop)
  - Available in checkout (preview) and receipt page (after order placed)
- Proforma includes: store name, PEDIDO/PROFORMA title, products table, subtotal, shipping, total, client data, date, payment method

## Cloudinary Config
- Environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- Upload endpoint: POST /api/upload (multipart, admin-only)
- Delete endpoint: DELETE /api/upload (admin-only)
- Images stored in "selva-import" folder, auto-optimized to 1200x1200 max

## Mobile Optimization
- Hamburger menu (slide-down) with icons, auto-closes on route change and viewport resize to desktop
- 2-column product grid on mobile (`grid-cols-2`), 3-4 columns on desktop
- Responsive hero banner (smaller on mobile, vertical layout for offer slides)
- Lazy-loaded images (`loading="lazy"`)
- Product card "Agregar" button below text on mobile, hover overlay on desktop
- Touch-friendly buttons: min-h-[44px] for product quick-add, min-h-[48px] for primary actions
- `active:scale-[0.98]` feedback on major buttons
- Checkout: customer data fields appear first on mobile (CSS order), shipping options second
- Phone input: `type="tel"` + `inputMode="numeric"` for numeric keyboard
- `autoComplete` attributes on all checkout inputs

## Session Config
- Cookie `secure` auto-set based on `NODE_ENV` (true in production, false in development)
- Override with `COOKIE_SECURE=false` if running production without HTTPS
- Session cookie max age: 30 days
- `connect-pg-simple` with `createTableIfMissing: true`

## Build & Deploy
- `npm run dev` - Development (Express + Vite HMR)
- `npm run build` - Production build (frontend to dist/public, server to dist/index.cjs)
- `npm run start` - Run production server
- `npm run db:push` - Sync database schema
- See `DEPLOY.md` for full deployment instructions
- Replit plugins load conditionally (only when `REPL_ID` is set)
