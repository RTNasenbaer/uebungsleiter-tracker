// SPDX-License-Identifier: AGPL-3.0-or-later
// Seeds the local D1 database with a test user and the example series "U12, Di 18:00–19:30" since 1.9.
// Only placeholder data – never real personal data.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const now = new Date();
const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
const startsOn = `${year}-09-01`;
const userId = '00000000-0000-4000-8000-000000000001';

const sql = `
INSERT OR IGNORE INTO users (id, name) VALUES ('${userId}', 'Test Trainer');
INSERT OR IGNORE INTO oauth_accounts (id, user_id, provider, provider_user_id)
  VALUES ('00000000-0000-4000-8000-000000000002', '${userId}', 'github', '1');
INSERT OR IGNORE INTO settings (id, user_id, display_name, club_name, report_recipient)
  VALUES ('00000000-0000-4000-8000-000000000003', '${userId}', 'Trainer, Test', 'TV Beispielstadt', 'kasse@example.org');
INSERT OR IGNORE INTO series (id, user_id, title, team, location, weekdays, start_time, end_time, starts_on, color)
  VALUES ('00000000-0000-4000-8000-000000000010', '${userId}', 'Training', 'U12', 'Sporthalle Mitte', 2, '18:00', '19:30', '${startsOn}', '#2563eb');
`;

const dir = mkdtempSync(join(tmpdir(), 'ult-seed-'));
const file = join(dir, 'seed.sql');
writeFileSync(file, sql);
execFileSync('pnpm', ['exec', 'wrangler', 'd1', 'execute', 'DB', '--local', `--file=${file}`], {
  stdio: 'inherit',
});
console.log(`Seeded test user (GitHub id 1, use /api/test/login) and series U12 since ${startsOn}.`);
