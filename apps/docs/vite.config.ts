import path from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { visit } from "unist-util-visit";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Shown in the footer as "Docs for chain-hub vX" — the CLI package is the
// version users install.
const cliVersion = JSON.parse(
  readFileSync(path.resolve(dirname, "../../packages/cli/package.json"), "utf8")
).version as string;

type HastText = { type: "text"; value: string };

type HastElement = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: (HastElement | HastText)[];
};

/** Append a hover-reveal # anchor to every h2–h4 that rehype-slug gave an id. */
function rehypeHeadingLinks() {
  return (tree: HastElement) => {
    visit(tree, "element", (node: HastElement) => {
      const id = node.properties?.id;
      if (
        node.tagName &&
        /^h[2-4]$/.test(node.tagName) &&
        typeof id === "string" &&
        node.children
      ) {
        node.children.push({
          type: "element",
          tagName: "a",
          properties: {
            href: `#${id}`,
            className: ["heading-anchor"],
            ariaLabel: "Link to this section"
          },
          children: [{ type: "text", value: "#" }]
        });
      }
    });
  };
}

const CONTENT_DIR = path.resolve(dirname, "src/content");
const RAW_ID = "virtual:docs-raw";
const RAW_RESOLVED_ID = "\0docs-raw";

/**
 * Raw .mdx sources for the client-side search index. A `?raw` glob import
 * still gets transformed by the MDX plugin (it matches on the clean path),
 * so a virtual module is the reliable way to ship the uncompiled text.
 */
function docsRawPlugin(): Plugin {
  return {
    name: "docs-raw-content",
    resolveId(id) {
      return id === RAW_ID ? RAW_RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RAW_RESOLVED_ID) return null;
      const files = Object.fromEntries(
        readdirSync(CONTENT_DIR)
          .filter((name) => name.endsWith(".mdx"))
          .sort()
          .map((name) => [name, readFileSync(path.join(CONTENT_DIR, name), "utf8")])
      );
      return `export default ${JSON.stringify(files)};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(CONTENT_DIR)) return;
      const mod = server.moduleGraph.getModuleById(RAW_RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: "full-reload" });
      return [];
    }
  };
}

export default defineConfig({
  base: "/docs/",
  define: {
    __CHAIN_HUB_VERSION__: JSON.stringify(cliVersion)
  },
  plugins: [
    { enforce: "pre", ...mdx({
      providerImportSource: "@mdx-js/react",
      remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeHeadingLinks]
    }) },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    tailwindcss(),
    docsRawPlugin()
  ],
  clearScreen: false,
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 4323,
    strictPort: true
  }
});
