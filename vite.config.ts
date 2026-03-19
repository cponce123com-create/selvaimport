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
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'tiptap-vendor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-image',
            '@tiptap/extension-link',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-text-align',
            '@tiptap/extension-underline',
          ],
          'motion-vendor': ['framer-motion'],
          'charts-vendor': ['recharts'],
          'utils-vendor': ['date-fns', 'zod', 'clsx', 'tailwind-merge'],
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
