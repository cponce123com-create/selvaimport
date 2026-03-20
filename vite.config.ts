import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo-selva-import.jpg", "parrot_favicon_*.png", "yape-qr.*"],
      manifest: {
        name: "Selva Import",
        short_name: "Selva Import",
        description: "Tu tienda de confianza en San Ramón. Tecnología, moda, hogar y más.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "es",
        icons: [
          { src: "/parrot_favicon_192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/parrot_favicon_512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
        screenshots: [
          { src: "/logo-selva-import.jpg", sizes: "512x512", type: "image/jpeg", form_factor: "narrow" },
        ],
      },
      workbox: {
        // Cachear assets estáticos (JS, CSS, fonts) — estrategia Cache First
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff2}"],
        // Cachear páginas visitadas — estrategia Network First (intenta red, cae a caché)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cloudinary-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 días
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/products/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-products",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 5 }, // 5 minutos
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/categories/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-categories",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 10 }, // 10 minutos
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    ...(process.env.REPL_ID !== undefined
      ? await Promise.all([
          import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default()),
          import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
          import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ])
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "radix-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-accordion",
            "@radix-ui/react-avatar",
          ],
          "tiptap-vendor": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-image",
            "@tiptap/extension-link",
            "@tiptap/extension-placeholder",
            "@tiptap/extension-text-align",
            "@tiptap/extension-underline",
          ],
          "motion-vendor": ["framer-motion"],
          "charts-vendor": ["recharts"],
          "utils-vendor": ["date-fns", "zod", "clsx", "tailwind-merge"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
