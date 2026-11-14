// SPDX-License-Identifier: AGPL-3.0-or-later
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // SPA: served by the Worker (not_found_handling = single-page-application) and bundled into the Android app
    adapter: adapter({ fallback: 'index.html', pages: 'build', assets: 'build', strict: true }),
  },
};

export default config;
