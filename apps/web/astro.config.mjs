import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  site: 'https://www.chainhub.one',
  compressHTML: true,
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        'chain-setup-display-paths': path.join(monorepoRoot, 'cli/adapters/setup-display-paths.ts'),
      },
    },
    server: {
      fs: {
        allow: [monorepoRoot],
      },
    },
  },
});
