import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
  plugins: [
    react(),
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
    // Dividir el bundle en chunks más pequeños para carga más rápida
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — se cachea entre versiones
          'react-vendor': ['react', 'react-dom'],
          // React Query — librería grande pero estable
          'query-vendor': ['@tanstack/react-query'],
          // Radix UI — muchos componentes, chunk separado
          'radix-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-accordion',
            '@radix-ui/react-avatar',
          ],
          // Editor Tiptap — muy pesado, solo se usa en admin
          'tiptap-vendor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-image',
            '@tiptap/extension-link',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-text-align',
            '@tiptap/extension-underline',
          ],
          // Framer Motion — animaciones
          'motion-vendor': ['framer-motion'],
          // Charts — solo se usa en dashboard admin
          'charts-vendor': ['recharts'],
          // Utilidades
          'utils-vendor': ['date-fns', 'zod', 'clsx', 'tailwind-merge'],
        },
      },
    },
    // Aumentar el límite de advertencia a 600kb (chunks grandes de vendor son normales)
    chunkSizeWarningLimit: 600,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
