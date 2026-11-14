// SPDX-License-Identifier: AGPL-3.0-or-later
import { GitHub, OAuth2RequestError, generateState } from 'arctic';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { Db } from '../db';
import { devices, oauthAccounts, settings, users } from '../db/schema';
import type { AppEnv, Bindings } from '../env';
import {
  clearSessionCookie,
  createAuthSession,
  createWebDevice,
  invalidateSession,
  readSessionCookie,
  setSessionCookie,
  validateSessionToken,
} from '../lib/auth';
import { newId } from '../lib/crypto';

const STATE_COOKIE = 'ult_oauth_state';

export function isAllowedGithubId(env: Pick<Bindings, 'ALLOWED_GITHUB_IDS'>, githubId: string): boolean {
  const allowed = (env.ALLOWED_GITHUB_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(githubId);
}

/** Finds or creates the user for a GitHub account. */
export async function upsertGithubUser(
  db: Db,
  gh: { id: string; name: string; avatarUrl: string | null },
): Promise<string> {
  const acc = await db.query.oauthAccounts.findFirst({
    where: and(eq(oauthAccounts.provider, 'github'), eq(oauthAccounts.providerUserId, gh.id)),
  });
  if (acc) {
    await db.update(users).set({ name: gh.name, avatarUrl: gh.avatarUrl }).where(eq(users.id, acc.userId));
    return acc.userId;
  }
  const userId = newId();
  await db.batch([
    db.insert(users).values({ id: userId, name: gh.name, avatarUrl: gh.avatarUrl }),
    db.insert(oauthAccounts).values({ id: newId(), userId, provider: 'github', providerUserId: gh.id }),
    db.insert(settings).values({ id: newId(), userId }),
  ]);
  return userId;
}

function appUrl(env: Bindings, reqUrl: string, path: string): string {
  return new URL(path, env.APP_ORIGIN || new URL(reqUrl).origin).toString();
}

export const authRoutes = new Hono<AppEnv>()
  .get('/github', (c) => {
    if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET) {
      return c.json({ error: 'GitHub-Login ist nicht konfiguriert' }, 503);
    }
    const callback = new URL('/api/auth/github/callback', c.req.url).toString();
    const github = new GitHub(c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET, callback);
    const state = generateState();
    setCookie(c, STATE_COOKIE, state, {
      httpOnly: true,
      secure: new URL(c.req.url).protocol === 'https:',
      sameSite: 'Lax',
      path: '/',
      maxAge: 600,
    });
    return c.redirect(github.createAuthorizationURL(state, []).toString());
  })
  .get('/github/callback', async (c) => {
    const { code, state } = c.req.query();
    const stored = getCookie(c, STATE_COOKIE);
    if (!code || !state || !stored || state !== stored)
      return c.redirect(appUrl(c.env, c.req.url, '/login?error=state'));
    if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET) return c.text('not configured', 503);
    const callback = new URL('/api/auth/github/callback', c.req.url).toString();
    const github = new GitHub(c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET, callback);
    let accessToken: string;
    try {
      accessToken = (await github.validateAuthorizationCode(code)).accessToken();
    } catch (e) {
      const reason = e instanceof OAuth2RequestError ? 'oauth' : 'network';
      return c.redirect(appUrl(c.env, c.req.url, `/login?error=${reason}`));
    }
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'uebungsleiter-tracker' },
    });
    if (!res.ok) return c.redirect(appUrl(c.env, c.req.url, '/login?error=github'));
    const gh = (await res.json()) as {
      id: number;
      login: string;
      name: string | null;
      avatar_url: string | null;
    };
    if (!isAllowedGithubId(c.env, String(gh.id))) {
      return c.redirect(appUrl(c.env, c.req.url, '/login?error=forbidden'));
    }
    const db = c.get('db');
    const now = c.get('clock').now();
    const userId = await upsertGithubUser(db, {
      id: String(gh.id),
      name: gh.name || gh.login,
      avatarUrl: gh.avatar_url,
    });
    const deviceId = await createWebDevice(db, userId, c.req.header('user-agent'), now);
    const { token, expiresAt } = await createAuthSession(db, userId, deviceId, now);
    setSessionCookie(c, token, expiresAt);
    return c.redirect(appUrl(c.env, c.req.url, '/'));
  })
  .post('/logout', async (c) => {
    const token = readSessionCookie(c);
    if (token) {
      const db = c.get('db');
      const session = await validateSessionToken(db, token, c.get('clock').now());
      // the browser "device" belongs to this login – remove it together with the session
      if (session?.deviceId) await db.delete(devices).where(eq(devices.id, session.deviceId));
      await invalidateSession(db, token);
    }
    clearSessionCookie(c);
    return c.json({ ok: true });
  });
