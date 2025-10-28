// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Enable server-side rendering for API routes
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()]
  },
  site: 'https://cyberbrosecurity.work',
  integrations: [sitemap()]
});