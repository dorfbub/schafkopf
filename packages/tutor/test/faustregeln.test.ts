import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RULES, RULE_IDS, advise, optionKey } from '../src';
import { FAELLE, inputOf } from './faelle';

describe('Faustregeln: feste Lagen', () => {
  for (const fall of FAELLE) {
    it(`${fall.rule}: ${fall.title}`, () => {
      const advice = advise(inputOf(fall), fall.ask);
      expect(advice).not.toBeNull();
      expect(fall.expect(advice!.recommended), optionKey(advice!.recommended)).toBe(true);
      expect(advice!.reasons.map((r) => r.id)).toContain(fall.rule);
      // Der Denkanstoß verrät die Lösung nicht: Er gehört zur ersten Faustregel, nicht zur Karte.
      expect(advice!.hint.key).toBe(`denkanstoss.${advice!.reasons[0]!.id}`);
      expect(advice!.reasons.length).toBeLessThanOrEqual(2);
    });
  }
});

describe('Faustregeln: Katalog', () => {
  it('hat mindestens 25 Faustregeln, jede mit eindeutiger Kennung', () => {
    expect(RULE_IDS.length).toBeGreaterThanOrEqual(25);
    expect(new Set(RULE_IDS).size).toBe(RULE_IDS.length);
    expect(RULES.map((r) => r.id)).toEqual([...RULE_IDS]);
  });

  it('hat für jede Faustregel eine feste Lage', () => {
    const covered = new Set(FAELLE.map((f) => f.rule));
    expect(RULE_IDS.filter((id) => !covered.has(id))).toEqual([]);
  });

  it('beschreibt jede Faustregel in docs/STRATEGIEN.md', () => {
    const doc = readFileSync(new URL('../../../docs/STRATEGIEN.md', import.meta.url), 'utf8');
    expect(RULE_IDS.filter((id) => !doc.includes(`\`${id}\``))).toEqual([]);
  });
});
