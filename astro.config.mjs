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
  trailingSlash: 'ignore', // Let the system handle trailing slashes naturally
  integrations: [sitemap()],
  // Redirect www to non-www for canonical URLs
  redirects: {
    '/www': '/'
  }
});