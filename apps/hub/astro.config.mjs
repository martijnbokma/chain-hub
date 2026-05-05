import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "astro/config"
import tailwindcss from "@tailwindcss/vite"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.resolve(rootDir, "..")

/** Local dashboard: static build for `chain hub`; dev uses proxy to the Bun API server. */
export default defineConfig({
  output: "static",
  compressHTML: true,
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
