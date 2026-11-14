// SPDX-License-Identifier: AGPL-3.0-or-later
// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {}
  interface ImportMetaEnv {
    readonly VITE_DEFAULT_SERVER_URL?: string;
    readonly VITE_SOURCE_URL?: string;
    readonly VITE_ENABLE_TEST_LOGIN?: string;
  }
}

export {};
