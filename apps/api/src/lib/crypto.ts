// SPDX-License-Identifier: AGPL-3.0-or-later
/** Tokens: 256 bit randomness, stored only as SHA-256 hex (cheap and safe at this entropy). */

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// No 0/O/1/I to avoid typos when typing the code.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePairingCode(length = 8): string {
  const out: string[] = [];
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      // rejection sampling → uniform distribution (256 % 32 === 0, but keep it generic)
      if (b < 256 - (256 % CODE_ALPHABET.length) && out.length < length)
        out.push(CODE_ALPHABET[b % CODE_ALPHABET.length]!);
    }
  }
  return out.join('');
}

export function newId(): string {
  return crypto.randomUUID();
}
