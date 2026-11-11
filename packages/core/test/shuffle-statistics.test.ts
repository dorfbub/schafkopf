/**
 * Statistische Prüfung des Mischens (siehe docs/ARCHITEKTUR.md, „Mischen“).
 * Feste Seeds → die Tests sind deterministisch; die Schwellen entsprechen einer
 * Irrtumswahrscheinlichkeit von 0,1 % (eine echte Schieflage fällt trotzdem deutlich auf).
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RULES,
  type Card,
  type Seed,
  createDeck,
  createRng,
  dealHand,
  isSeed,
  orderFor,
  shuffle,
  toSeed,
} from '../src';

/** Obere 99,9-%-Grenze der Chi-Quadrat-Verteilung (Wilson–Hilferty-Näherung). */
function chiSquareLimit(df: number): number {
  const z = 3.0902;
  const c = 2 / (9 * df);
  return df * Math.pow(1 - c + z * Math.sqrt(c), 3);
}

/** Feste Seed-Folge: Seed i ist die Kurzform i·2654435761 + 1 (wird auf 128 Bit gestreut). */
const seedAt = (i: number): Seed => toSeed((i * 2654435761 + 1) >>> 0);

const SHUFFLES = 20_000;
const deck = createDeck('lang');

describe('xoshiro128** (createRng)', () => {
  it('liefert die Referenzfolge des Original-Algorithmus', () => {
    // Python-Referenzimplementierung nach Blackman/Vigna, Zustand [1, 2, 3, 4].
    const expected = [11520, 0, 5927040, 70819200, 2031721883];
    const rng = createRng([1, 2, 3, 4]);
    expect(Array.from({ length: 5 }, () => Math.round(rng() * 4294967296))).toEqual(expected);
  });

  it('ist deterministisch und der Seed ist JSON-fest', () => {
    const seed = seedAt(7);
    const viaJson: unknown = JSON.parse(JSON.stringify(seed));
    expect(isSeed(viaJson)).toBe(true);
    expect(shuffle(deck, createRng(seed))).toEqual(shuffle(deck, createRng(viaJson as Seed)));
  });

  it('nutzt alle 128 Bit: Seeds, die sich nur in einem Wort unterscheiden, mischen anders', () => {
    const base = shuffle(deck, createRng([1, 2, 3, 4]));
    for (let word = 0; word < 4; word++) {
      const seed: [number, number, number, number] = [1, 2, 3, 4];
      seed[word] = 99;
      expect(shuffle(deck, createRng(seed))).not.toEqual(base);
    }
  });

  it('isSeed lehnt Fremdes ab', () => {
    expect(isSeed([1, 2, 3])).toBe(false);
    expect(isSeed([1, 2, 3, -1])).toBe(false);
    expect(isSeed([1, 2, 3, 1.5])).toBe(false);
    expect(isSeed('abcd')).toBe(false);
  });
});

describe('Mischen ist gleichverteilt', () => {
  const positions = new Map<Card, number[]>(
    deck.map((c) => [c, new Array(32).fill(0) as number[]]),
  );
  const owners = new Map<Card, number[]>(deck.map((c) => [c, new Array(4).fill(0) as number[]]));
  const trumpCounts = [0, 0, 0, 0].map(() => new Array(9).fill(0) as number[]);
  const order = orderFor({ kind: 'sauspiel', suit: 'eichel' }, 0);
  const topThree = order.trumps.slice(0, 3);
  let topThreeWithOneSeat = 0;

  for (let i = 0; i < SHUFFLES; i++) {
    const shuffled = shuffle(deck, createRng(seedAt(i)));
    shuffled.forEach((c, pos) => positions.get(c)![pos]!++);
    const state = dealHand(DEFAULT_RULES, i % 4, seedAt(i));
    state.initialHands.forEach((hand, seat) => {
      hand.forEach((c) => owners.get(c)![seat]!++);
      trumpCounts[seat]![hand.filter((c) => order.trumps.includes(c)).length]!++;
    });
    if (state.initialHands.some((h) => topThree.every((c) => h.includes(c)))) topThreeWithOneSeat++;
  }

  it('jede Karte steht gleich oft an jeder Position (Chi-Quadrat über alle 32×32 Felder)', () => {
    let chi = 0;
    for (const counts of positions.values()) {
      for (const n of counts) chi += (n - SHUFFLES / 32) ** 2 / (SHUFFLES / 32);
    }
    // Jede Karte hat 31 Freiheitsgrade, 32 Karten.
    expect(chi).toBeLessThan(chiSquareLimit(32 * 31));
    expect(chi).toBeGreaterThan(2 * 32 * 31 - chiSquareLimit(32 * 31)); // nicht „zu glatt“
  });

  it('jede Karte kommt gleich oft zu jedem Spieler (je Karte Chi-Quadrat, 3 Freiheitsgrade)', () => {
    for (const [c, counts] of owners) {
      let chi = 0;
      for (const n of counts) chi += (n - SHUFFLES / 4) ** 2 / (SHUFFLES / 4);
      // 32 Prüfungen: Grenze für 0,1 % / 32 ≈ 0,003 %.
      expect(chi, `Karte ${c}`).toBeLessThan(21.5);
    }
  });

  it('Trumpfzahl pro Hand im Sauspiel folgt der hypergeometrischen Verteilung', () => {
    // 14 Trümpfe unter 32 Karten, 8 Karten pro Hand.
    const choose = (n: number, k: number) => {
      let r = 1;
      for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
      return r;
    };
    const p = Array.from(
      { length: 9 },
      (_, k) => (choose(14, k) * choose(18, 8 - k)) / choose(32, 8),
    );
    expect(order.trumps).toHaveLength(14);
    for (let seat = 0; seat < 4; seat++) {
      let chi = 0;
      let df = -1;
      let restObs = 0;
      let restExp = 0;
      for (let k = 0; k <= 8; k++) {
        const expected = p[k]! * SHUFFLES;
        if (expected < 5) {
          restObs += trumpCounts[seat]![k]!;
          restExp += expected;
        } else {
          chi += (trumpCounts[seat]![k]! - expected) ** 2 / expected;
          df++;
        }
      }
      if (restExp > 0) {
        chi += (restObs - restExp) ** 2 / restExp;
        df++;
      }
      expect(chi, `Platz ${seat}`).toBeLessThan(chiSquareLimit(df));
    }
  });

  it('die drei höchsten Trümpfe (3 Laufende) landen so oft bei einem Spieler wie berechnet', () => {
    // P(ein bestimmter Spieler hält 3 bestimmte Karten) = C(29,5)/C(32,8) ≈ 1,129 %.
    const pOne = (8 * 7 * 6) / (32 * 31 * 30);
    const p = 4 * pOne; // genau ein Spieler kann sie halten
    const mean = SHUFFLES * p;
    const sd = Math.sqrt(SHUFFLES * p * (1 - p));
    expect(Math.abs(topThreeWithOneSeat - mean)).toBeLessThan(4 * sd);
  });
});
