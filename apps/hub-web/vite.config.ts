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
    port: 4320,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:2342",
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // CodeMirror is left out on purpose: the editor is lazy-loaded, and a named chunk
            // pulled shared helpers into it, which made the entry preload all of it.
            if (id.includes("lucide-react") || id.includes("@radix-ui") || id.includes("cmdk")) {
              return "vendor-ui";
            }
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router/") ||
              id.includes("/@tanstack/")
            ) {
              return "vendor-react";
            }
          }
        }
      }
    }
  }
});
