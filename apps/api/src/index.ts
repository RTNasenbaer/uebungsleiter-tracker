// SPDX-License-Identifier: AGPL-3.0-or-later
import { systemClock } from '@ult/shared';
import { createApp } from './app';
import { runCron } from './cron';
import { createDb } from './db';
import type { Bindings } from './env';

const app = createApp();

export default {
  fetch: app.fetch,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runCron(createDb(env.DB), systemClock).then(() => undefined));
  },
} satisfies ExportedHandler<Bindings>;
