// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';

export async function parseJson<T extends z.ZodType>(c: Context, schema: T): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: 'Ungültiges JSON' });
  }
  return parseValue(schema, body);
}

export function parseValue<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const r = schema.safeParse(value);
  if (!r.success) {
    throw new HTTPException(400, {
      message: r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '),
    });
  }
  return r.data;
}
