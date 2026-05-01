import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.chainhub.one',
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
  },
});
