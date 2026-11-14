// SPDX-License-Identifier: AGPL-3.0-or-later
/** DESIGN.md §2/§14: no hex colors, Tailwind palette colors, emojis or external font requests outside the token files. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../src');
const ALLOWED = ['lib/styles/tokens.css', 'lib/styles/tokens.gen.ts'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(svelte|ts|css|html)$/.test(name) ? [path] : [];
  });
}

const sources = files(SRC)
  .map((path) => ({ file: relative(SRC, path).replaceAll('\\', '/'), text: readFileSync(path, 'utf8') }))
  .filter((s) => !ALLOWED.includes(s.file));

function offenders(re: RegExp) {
  return sources.flatMap(({ file, text }) =>
    text.split('\n').flatMap((line, i) => (re.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
  );
}

describe('design rules', () => {
  it('uses no hex colors outside the generated token files', () => {
    // `#` followed by 3–8 hex digits that is not part of an id selector/anchor like href="#main"
    expect(offenders(/(?<![\w&/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b(?![\w-])/)).toEqual([]);
  });

  it('uses no Tailwind palette colors (only semantic tokens)', () => {
    expect(
      offenders(
        /\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via|decoration|accent|caret|divide|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d{2,3})?\b/,
      ),
    ).toEqual([]);
  });

  it('uses no emojis', () => {
    expect(offenders(/(?![©®™])\p{Extended_Pictographic}/u)).toEqual([]);
  });

  it('loads no fonts or scripts from external CDNs', () => {
    expect(offenders(/fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com|cdnjs/)).toEqual([]);
  });
});
