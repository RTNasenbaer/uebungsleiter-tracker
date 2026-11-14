// SPDX-License-Identifier: AGPL-3.0-or-later
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { type AppEnv, testRoutesEnabled } from './env';
import { context } from './lib/middleware';
import { authRoutes } from './routes/auth';
import { backupRoutes } from './routes/backup';
import { deviceRoutes, pairRoutes } from './routes/devices';
import { exceptionRoutes } from './routes/exceptions';
import { meRoutes } from './routes/me';
import { seriesRoutes } from './routes/series';
import { sessionRoutes } from './routes/sessions';
import { settingsRoutes } from './routes/settings';
import { testRoutes } from './routes/test';

/** Capacitor WebView origins (Android serves the bundled app from https://localhost). */
const CAPACITOR_ORIGINS = ['https://localhost', 'capacitor://localhost', 'http://localhost'];

export function createApp() {
  const app = new Hono<AppEnv>().basePath('/api');

  app.use(
    secureHeaders({
      contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      crossOriginResourcePolicy: 'cross-origin',
    }),
  );
  app.use(
    cors({
      origin: (origin, c) => {
        const allowed = [...CAPACITOR_ORIGINS, c.env.APP_ORIGIN].filter(Boolean);
        return allowed.includes(origin) ? origin : null;
      },
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'X-App-Version', 'X-Test-Now'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 86400,
    }),
  );
  app.use(context);

  app.get('/health', (c) => c.json({ ok: true, environment: c.env.ENVIRONMENT }));
  app.get('/meta', (c) => c.json({ sourceUrl: c.env.SOURCE_URL, githubLogin: !!c.env.GITHUB_CLIENT_ID }));

  app.route('/auth', authRoutes);
  app.route('/pair', pairRoutes);
  app.route('/me', meRoutes);
  app.route('/devices', deviceRoutes);
  app.route('/series', seriesRoutes);
  app.route('/sessions', sessionRoutes);
  app.route('/exceptions', exceptionRoutes);
  app.route('/settings', settingsRoutes);
  app.route('/backup', backupRoutes);

  app.use('/test/*', async (c, next) => {
    if (!testRoutesEnabled(c.env)) return c.json({ error: 'Not found' }, 404);
    return next();
  });
  app.route('/test', testRoutes);

  app.notFound((c) => c.json({ error: 'Not found' }, 404));
  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: 'Interner Fehler' }, 500);
  });
  return app;
}
