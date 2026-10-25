import path from "node:path";
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_URL = "https://www.chainhub.one";
const DOCS_CONTENT = path.resolve(dirname, "../docs/src/content");

/** Emits sitemap.xml at build time — root plus every docs page found in apps/docs/src/content. */
function sitemapPlugin(): Plugin {
  return {
    name: "emit-sitemap",
    apply: "build",
    generateBundle() {
      const urls = [
        { loc: "/", priority: "1.0", changefreq: "weekly" },
        ...readdirSync(DOCS_CONTENT)
          .filter((file) => file.endsWith(".mdx"))
          .sort()
          .map((file) => {
            const name = file.replace(/\.mdx$/, "");
            const loc = name === "index" ? "/docs/" : `/docs/${name}`;
            return {
              loc,
              lastmod: statSync(path.join(DOCS_CONTENT, file)).mtime.toISOString().slice(0, 10),
              priority: name === "index" ? "0.8" : name === "getting-started" ? "0.7" : "0.6",
              changefreq: "monthly"
            };
          })
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>${u.lastmod ? `
    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: xml });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), sitemapPlugin()],
  clearScreen: false,
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 4322,
    strictPort: true,
    proxy: {
      // apps/docs runs as its own Vite dev server (bun run dev:docs, port
      // 4323) with base "/docs/" — proxy it through so the "Docs" nav link
      // works locally the same way it will in production.
      "/docs": {
        target: "http://127.0.0.1:4323",
        changeOrigin: true,
        ws: true
      }
    }
  }
});
