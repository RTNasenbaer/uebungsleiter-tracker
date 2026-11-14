// SPDX-License-Identifier: AGPL-3.0-or-later
import { exceptionBulkInput, exceptionInput } from '@ult/shared';
import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Db } from '../db';
import { exceptions, series } from '../db/schema';
import type { AppEnv } from '../env';
import { newId } from '../lib/crypto';
import { exceptionDto } from '../lib/dto';
import { applyException } from '../lib/materialize';
import { requireAuth } from '../lib/middleware';
import { parseJson } from '../lib/validate';

async function assertSeries(db: Db, userId: string, seriesId: string | null) {
  if (!seriesId) return;
  const s = await db.query.series.findFirst({
    where: and(eq(series.id, seriesId), eq(series.userId, userId)),
  });
  if (!s) throw new HTTPException(400, { message: 'Training nicht gefunden' });
}

export const exceptionRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get('/', async (c) => {
    const rows = await c
      .get('db')
      .select()
      .from(exceptions)
      .where(eq(exceptions.userId, c.get('userId')))
      .orderBy(asc(exceptions.fromDate));
    return c.json(rows.map(exceptionDto));
  })
  .post('/', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const input = await parseJson(c, exceptionInput);
    await assertSeries(db, userId, input.seriesId);
    const [row] = await db
      .insert(exceptions)
      .values({ ...input, id: newId(), userId })
      .returning();
    await applyException(db, userId, input);
    return c.json(exceptionDto(row!), 201);
  })
  /** .ics import (parsed on the client) */
  .post('/bulk', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const { items } = await parseJson(c, exceptionBulkInput);
    const existing = await db.select().from(exceptions).where(eq(exceptions.userId, userId));
    const seen = new Set(existing.map((e) => `${e.fromDate}|${e.toDate}|${e.label}|${e.seriesId ?? ''}`));
    let created = 0;
    for (const item of items) {
      const sig = `${item.fromDate}|${item.toDate}|${item.label}|${item.seriesId ?? ''}`;
      if (seen.has(sig)) continue;
      await assertSeries(db, userId, item.seriesId);
      await db.insert(exceptions).values({ ...item, id: newId(), userId });
      await applyException(db, userId, item);
      seen.add(sig);
      created++;
    }
    return c.json({ created, skipped: items.length - created });
  })
  .put('/:id', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const input = await parseJson(c, exceptionInput);
    await assertSeries(db, userId, input.seriesId);
    const [row] = await db
      .update(exceptions)
      .set({ ...input, updatedAt: c.get('clock').now().toISOString() })
      .where(and(eq(exceptions.id, c.req.param('id')), eq(exceptions.userId, userId)))
      .returning();
    if (!row) throw new HTTPException(404, { message: 'Ausfall nicht gefunden' });
    await applyException(db, userId, input);
    return c.json(exceptionDto(row));
  })
  .delete('/:id', async (c) => {
    // sessions in the range come back with the next lazy materialization
    const res = await c
      .get('db')
      .delete(exceptions)
      .where(and(eq(exceptions.id, c.req.param('id')), eq(exceptions.userId, c.get('userId'))))
      .returning({ id: exceptions.id });
    if (res.length === 0) throw new HTTPException(404, { message: 'Ausfall nicht gefunden' });
    return c.json({ ok: true });
  });
