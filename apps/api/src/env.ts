// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Clock } from '@ult/shared';
import type { Db } from './db';

export interface Bindings {
  DB: D1Database;
  ASSETS?: Fetcher;
  ENVIRONMENT: string;
  ENABLE_TEST_ROUTES: string;
  /** Origin of the web app if it differs from the worker origin (e.g. http://localhost:5173 in dev) */
  APP_ORIGIN: string;
  SOURCE_URL: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  /** comma separated numeric GitHub user ids */
  ALLOWED_GITHUB_IDS?: string;
}

export interface Variables {
  db: Db;
  clock: Clock;
  userId: string;
  deviceId: string | null;
  authKind: 'cookie' | 'bearer';
}

export type AppEnv = { Bindings: Bindings; Variables: Variables };

export function testRoutesEnabled(env: Bindings): boolean {
  return env.ENABLE_TEST_ROUTES === 'true' && env.ENVIRONMENT !== 'production';
}
