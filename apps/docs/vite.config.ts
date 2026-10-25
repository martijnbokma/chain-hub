import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { visit } from "unist-util-visit";

const dirname = path.dirname(fileURLToPath(import.meta.url));

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

export default defineConfig({
  base: "/docs/",
  plugins: [
    { enforce: "pre", ...mdx({
      providerImportSource: "@mdx-js/react",
      remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeHeadingLinks]
    }) },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    tailwindcss()
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
