// SPDX-License-Identifier: AGPL-3.0-or-later
/** Money is always an integer amount of euro cents. */

const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/** `1550` → `15,50` (for CSV/XLSX cells without currency sign) */
export function centsToEuroString(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

/**
 * Parses German (`1.234,56`, `15,5 €`) or plain (`12.5`) euro input to cents.
 * Returns null for invalid input.
 */
export function parseEuroToCents(input: string): number | null {
  let s = input.replace(/€|\s|\u00a0/g, '');
  if (s === '') return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}
