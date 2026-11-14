// SPDX-License-Identifier: AGPL-3.0-or-later
// CI only: makes sure the D1 database exists and writes its id into wrangler.jsonc (never committed back).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const NAME = 'uebungsleiter-tracker';
const wrangler = (...args) => execFileSync('pnpm', ['exec', 'wrangler', ...args], { encoding: 'utf8' });

let dbs = JSON.parse(wrangler('d1', 'list', '--json'));
let db = dbs.find((d) => d.name === NAME);
if (!db) {
  console.log(`Creating D1 database ${NAME} …`);
  wrangler('d1', 'create', NAME);
  dbs = JSON.parse(wrangler('d1', 'list', '--json'));
  db = dbs.find((d) => d.name === NAME);
}
if (!db) throw new Error('D1 database could not be created');
const id = db.uuid ?? db.database_id ?? db.id;
const file = 'wrangler.jsonc';
writeFileSync(file, readFileSync(file, 'utf8').replace('00000000-0000-0000-0000-000000000000', id));
console.log(`Using D1 database ${NAME} (${id})`);
