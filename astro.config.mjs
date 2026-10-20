import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://zerogrunt.saran.info',
  output: 'static',
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
