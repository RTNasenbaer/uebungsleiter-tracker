// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { centsToEuroString, formatCents, parseEuroToCents } from '../src/money';

describe('money', () => {
  it('formats cents as German EUR', () => {
    expect(formatCents(1500)).toBe('15,00 €');
    expect(formatCents(330000)).toBe('3.300,00 €');
    expect(formatCents(0)).toBe('0,00 €');
  });

  it('parses user input to cents', () => {
    expect(parseEuroToCents('15')).toBe(1500);
    expect(parseEuroToCents('15,5')).toBe(1550);
    expect(parseEuroToCents('15,50 €')).toBe(1550);
    expect(parseEuroToCents('1.234,56')).toBe(123456);
    expect(parseEuroToCents('12.5')).toBe(1250);
    expect(parseEuroToCents('abc')).toBeNull();
    expect(parseEuroToCents('')).toBeNull();
  });

  it('renders plain decimal strings for CSV', () => {
    expect(centsToEuroString(1550)).toBe('15,50');
    expect(centsToEuroString(5)).toBe('0,05');
  });
});
