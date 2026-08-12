import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src")
    }
  },
  server: {
    port: 4322,
    strictPort: true,
    allowedHosts: ["dev.jewebsite.online"],
    proxy: {
      // apps/docs runs as its own Vite dev server (bun run dev:docs, port
      // 4323) with base "/docs/" — proxy it through so the "Docs" nav link
      // works locally the same way it will in production.
      "/docs": {
        target: "http://localhost:4323",
        changeOrigin: true,
        ws: true
      }
    }
  }
});
