import { describe, expect, it } from 'vitest';
import { CONTRAST_PAIRS, contrast } from './contrast';
import tokens from './tokens.css?raw';

function token(name: string): string {
  const match = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})\\b`, 'i'));
  if (!match) throw new Error(`Variable ${name} fehlt oder ist keine Hex-Farbe`);
  return match[1]!;
}

describe('Kontraste der Gestaltungsvariablen (WCAG AA)', () => {
  it('berechnet bekannte Werte', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBe(1);
  });

  for (const pair of CONTRAST_PAIRS) {
    it(`${pair.use}: ${pair.fg} auf ${pair.bg} ≥ ${pair.min} : 1`, () => {
      expect(contrast(token(pair.fg), token(pair.bg))).toBeGreaterThanOrEqual(pair.min);
    });
  }
});
