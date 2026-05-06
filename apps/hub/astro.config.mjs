import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "astro/config"
import icon from "astro-icon"
import tailwindcss from "@tailwindcss/vite"

import react from "@astrojs/react";

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.resolve(rootDir, "..")

/** Local dashboard: static build for `chain hub`; dev uses proxy to the Bun API server. */
export default defineConfig({
  output: "static",
  compressHTML: true,
  integrations: [icon(), react()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        "/api": { target: "http://127.0.0.1:2342", changeOrigin: true },
      },
      fs: {
        allow: [monorepoRoot],
      },
    },
  },
})