// SPDX-License-Identifier: AGPL-3.0-or-later
import { BACKUP_FORMAT, type BackupFile, backupFile } from '@ult/shared';
import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { exceptions, series, sessions, settings } from '../db/schema';
import type { AppEnv } from '../env';
import { exceptionDto, seriesDto, settingsDto } from '../lib/dto';
import { requireAuth } from '../lib/middleware';
import { getSettingsRow } from '../lib/settings';
import { parseJson } from '../lib/validate';
import { importSessions } from './sessions';

export const backupRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get('/', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const [cfg, seriesRows, exRows, sessionRows] = await Promise.all([
      getSettingsRow(db, userId),
      db.select().from(series).where(eq(series.userId, userId)),
      db.select().from(exceptions).where(eq(exceptions.userId, userId)),
      db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .orderBy(asc(sessions.date), asc(sessions.startTime)),
    ]);
    const body: BackupFile = {
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: c.get('clock').now().toISOString(),
      settings: settingsDto(cfg),
      series: seriesRows.map((s) => {
        const { id, ...rest } = seriesDto(s);
        return { id, ...rest };
      }),
      exceptions: exRows.map(exceptionDto),
      // planned sessions are regenerated from the series – only keep what matters
      sessions: sessionRows
        .filter((s) => s.status !== 'planned' || s.isOverride || !s.seriesId)
        .map((s) => ({
          occurrenceKey: s.occurrenceKey,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          title: s.title,
          team: s.team,
          location: s.location,
          units: s.units,
          payCents: s.payCents,
          kind: s.kind,
          status: s.status,
          note: s.note,
        })),
    };
    return c.json(body);
  })
  .post('/restore', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const now = c.get('clock').now();
    const backup = await parseJson(c, backupFile);
    if (backup.settings) {
      await getSettingsRow(db, userId);
      await db.update(settings).set(backup.settings).where(eq(settings.userId, userId));
    }
    let seriesCreated = 0;
    for (const s of backup.series) {
      const res = await db
        .insert(series)
        .values({ ...s, userId })
        .onConflictDoNothing()
        .returning({ id: series.id });
      seriesCreated += res.length;
    }
    let exceptionsCreated = 0;
    for (const e of backup.exceptions) {
      // series reference only if the series belongs to this user
      const owned =
        e.seriesId &&
        (await db.query.series.findFirst({
          where: and(eq(series.id, e.seriesId), eq(series.userId, userId)),
        }));
      const res = await db
        .insert(exceptions)
        .values({ ...e, seriesId: owned ? e.seriesId : null, userId })
        .onConflictDoNothing()
        .returning({ id: exceptions.id });
      exceptionsCreated += res.length;
    }
    const sessionResult = await importSessions(db, userId, backup.sessions, 'skip', now);
    return c.json({ seriesCreated, exceptionsCreated, ...sessionResult });
  });
