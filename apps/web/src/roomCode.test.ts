import { describe, expect, it } from 'vitest';
import {
  ROOM_ALPHABET,
  ROOM_CODE_LENGTH,
  formatRoomCode,
  isValidRoomId,
  normalizeRoom,
  randomRoomId,
} from './roomCode';

/** Einfacher Zufallsgenerator mit festem Startwert (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return (n: number) =>
    Uint8Array.from({ length: n }, () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return (((t ^ (t >>> 14)) >>> 0) & 0xff) as number;
    });
}

describe('randomRoomId', () => {
  it('hat mindestens 10 Zeichen und nur Zeichen aus dem Alphabet', () => {
    const random = seeded(1);
    for (let i = 0; i < 200; i++) {
      const code = randomRoomId(random);
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      expect(ROOM_CODE_LENGTH).toBeGreaterThanOrEqual(10);
      expect(isValidRoomId(code)).toBe(true);
    }
  });

  it('verteilt die Zeichen gleichmäßig (Chi-Quadrat)', () => {
    const random = seeded(42);
    const counts = new Map<string, number>();
    const draws = 20000;
    for (let i = 0; i < draws; i++) {
      for (const c of randomRoomId(random)) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const expected = (draws * ROOM_CODE_LENGTH) / ROOM_ALPHABET.length;
    let chi = 0;
    for (const c of ROOM_ALPHABET) chi += ((counts.get(c) ?? 0) - expected) ** 2 / expected;
    // 30 Freiheitsgrade: der Wert 59,7 wird bei Gleichverteilung nur in 0,1 % der Fälle überschritten.
    expect(chi).toBeLessThan(59.7);
  });

  it('verwirft Bytes oberhalb der Grenze, statt sie per Modulo einzufalten', () => {
    // 248..255 würden ohne Rückweisung wieder auf 'a'..'h' fallen.
    const bytes = [255, 250, 248, ...Array(ROOM_CODE_LENGTH).fill(30)];
    const code = randomRoomId((n) => Uint8Array.from(bytes.slice(0, n)));
    expect(code).toBe('9'.repeat(ROOM_CODE_LENGTH));
  });

  it('zieht mehr Bytes nach, wenn viele verworfen werden', () => {
    let calls = 0;
    const code = randomRoomId((n) => {
      calls++;
      return new Uint8Array(n).fill(calls === 1 ? 255 : 0);
    });
    expect(calls).toBe(2);
    expect(code).toBe('a'.repeat(ROOM_CODE_LENGTH));
  });
});

describe('tolerante Eingabe', () => {
  it('ignoriert Bindestriche, Leerzeichen und Groß-/Kleinschreibung', () => {
    expect(normalizeRoom(' K7MQ-x2pd hn ')).toBe('k7mqx2pdhn');
    expect(normalizeRoom('k7mq–x2pd_hn')).toBe('k7mqx2pdhn');
  });

  it('erkennt gültige und ungültige Codes', () => {
    expect(isValidRoomId('k7mqx2pdhn')).toBe(true);
    expect(isValidRoomId('k7m2xp')).toBe(false); // alter, kurzer Code
    expect(isValidRoomId('k7mqx2pdh0')).toBe(false); // 0 gibt es nicht
  });

  it('gruppiert die Anzeige', () => {
    expect(formatRoomCode('k7mqx2pdhn')).toBe('k7mq-x2pd-hn');
    expect(formatRoomCode('k7mqx')).toBe('k7mq-x');
    expect(formatRoomCode('')).toBe('');
  });
});
