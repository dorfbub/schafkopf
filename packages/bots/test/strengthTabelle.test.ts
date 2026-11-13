import { describe, expect, it } from 'vitest';
import { BID_ORDER, DEFAULT_RULES, type RuleSet } from '@schafkopf/core';
import { createHeuristicBot, createStrongBot } from '../src';
import { compare, duel } from './duel';

/**
 * Ansage-Tabellen (B4): Bots mit Tabelle gegen dieselben Bots mit den alten Schwellen, gepaart
 * ausgewertet (siehe `duel`: ein Prüfling mit Tabelle, die übrigen Sitze ohne; dieselbe
 * Verteilung ein zweites Mal ganz ohne Tabelle). Positiv heißt: die Tabelle bringt mehr.
 * Im normalen Lauf klein gehalten (nur die Richtung); der große Lauf mit den Schwellen:
 *
 *   BOTS_FULL=1 npx vitest run packages/bots/test/strengthTabelle.test.ts
 *
 * Messwerte: docs/STRATEGIEN.md, „Ansage-Tabellen“.
 */
const FULL = Boolean(process.env.BOTS_FULL);

const alt = (seed: number) => createHeuristicBot(seed, { ansage: 'faustregel' });
const neu = (seed: number) => createHeuristicBot(seed);

const HAUSREGELN: RuleSet = { ...DEFAULT_RULES, contracts: [...BID_ORDER] };
const KURZ4: RuleSet = { ...DEFAULT_RULES, deck: 'kurz' };
const KURZ3: RuleSet = { ...DEFAULT_RULES, deck: 'kurz', players: 3 };

describe('Ansage-Tabellen: Normal mit Tabelle gegen Normal ohne', () => {
  const cases: [string, RuleSet, number, number][] = [
    // Name, Regeln, Spiele (klein / groß), Schwelle im großen Lauf (Cent je Spiel)
    // Gemessen (20 000 Spiele): +5,01 ± 0,39 / +11,4 ± 0,5 / +15,0 ± 0,6 / +13,6 ± 0,4.
    ['lang/4, Standard', DEFAULT_RULES, FULL ? 20000 : 1000, 3],
    ['lang/4, alle Hausregeln', HAUSREGELN, FULL ? 20000 : 1000, 8],
    ['kurz/4', KURZ4, FULL ? 20000 : 1000, 8],
    ['kurz/3', KURZ3, FULL ? 20000 : 1000, 8],
  ];
  it.each(cases)('%s', { timeout: 1_200_000 }, (_, rules, games, threshold) => {
    const r = duel(games, neu, alt, rules);
    console.log(`Tabelle gegen Faustregel (${_}): ${JSON.stringify(r)}`);
    if (FULL) {
      expect(r.paired).toBeGreaterThan(threshold);
      expect(r.paired).toBeGreaterThan(3 * r.stdError);
    } else {
      expect(r.paired).toBeGreaterThan(0);
    }
    // Laufzeit im Browser unverändert: „Normal“ bleibt weit unter 50 ms je Entscheidung.
    expect(r.maxMs).toBeLessThan(50);
  });
});

describe('Ansage-Tabellen: Stark mit Tabelle gegen Stark ohne', () => {
  // Beide Fassungen von Stark auf demselben Platz gegen dieselben Normal-Bots (mit Tabelle, wie am
  // Tisch). Teuer (Stark rechnet je Entscheidung rund 20 ms), daher im normalen Lauf ausgelassen.
  // Gemessen (4000 Spiele): +2,8 ± 0,8 ct je Spiel.
  it.skipIf(!FULL)('Stark mit Tabelle ist besser', { timeout: 3_600_000 }, () => {
    const r = compare(
      4000,
      (seed) => createStrongBot(seed),
      (seed) => createStrongBot(seed, { ansage: 'faustregel' }),
      neu,
    );
    console.log(`Stark: Tabelle gegen Faustregel: ${JSON.stringify(r)}`);
    expect(r.paired).toBeGreaterThan(1);
    expect(r.paired).toBeGreaterThan(3 * r.stdError);
  });
});
