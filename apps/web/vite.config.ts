// SPDX-License-Identifier: AGPL-3.0-or-later
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: false } },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
