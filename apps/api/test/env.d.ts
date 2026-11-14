// SPDX-License-Identifier: AGPL-3.0-or-later
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import('../src/index');
  }
  interface Env {
    DB: D1Database;
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
    ENVIRONMENT: string;
    ENABLE_TEST_ROUTES: string;
    ALLOWED_GITHUB_IDS: string;
  }
}
