import { describe, expect, it } from 'vitest';
import { type Contract, DEFAULT_RULES, dealHand, orderFor } from '@schafkopf/core';
import { ANSAGE_SCHWELLE, ansageWertInSicht, bettelSafe } from '@schafkopf/bots';
import { type RuleHit, ruleHits } from '../src';
import { act, input } from './lagen';

/**
 * T5: Bei Bettel und Tout widerspricht Max der Ansage-Tabelle (B4) nicht – ihre Werte sind die
 * belegte Grundlage, nicht die alte Regel „nur von unten gedeckt“ bzw. „nur praktisch sicher“.
 */
const RULES_TOUT = { ...DEFAULT_RULES, allowTout: true };
const MIN = ANSAGE_SCHWELLE * DEFAULT_RULES.tariff.sauspiel;
const BETTEL: Contract = { kind: 'bettel' };

/** Sitz 0 ist als Erster mit der Ansage dran (Geber 3). */
function lage(seed: number, rules = DEFAULT_RULES) {
  const state = dealHand(rules, 3, seed);
  return { state, view: input(state, 0) };
}

describe('Max und die Ansage-Tabelle: Bettel', () => {
  const hits: { seed: number; hit: RuleHit; wert: number | null }[] = [];
  const grenz = { tragbar: 0, gedeckt: 0 };
  for (let seed = 1; seed <= 3000; seed++) {
    const { state, view } = lage(seed);
    const hit = ruleHits(view, 'bid').find((h) => h.id === 'ansage.bettel.nur.sicher');
    const wert = ansageWertInSicht(view.view, BETTEL, view.rules);
    const gedeckt = bettelSafe(state.hands[0]!, orderFor(BETTEL, 0), 32);
    if (wert !== null && wert > MIN && !gedeckt) grenz.tragbar++;
    if (wert !== null && wert <= MIN && gedeckt) grenz.gedeckt++;
    if (hit) hits.push({ seed, hit, wert });
  }

  it('rät zum Bettel genau dann, wenn die Tabelle ihn lohnend nennt', () => {
    expect(hits.length).toBeGreaterThan(20);
    for (const { seed, hit, wert } of hits) {
      const fuerBettel = hit.params.sicher === 1;
      expect(fuerBettel, `Seed ${seed}, Wert ${wert}`).toBe(wert !== null && wert > MIN);
    }
  });

  it('kennt Grenzfälle, in denen Tabelle und alte Regel auseinandergingen', () => {
    // Blätter, die nicht „von unten gedeckt“ sind, aber laut Tabelle lohnen – und umgekehrt.
    expect(grenz.tragbar).toBeGreaterThan(0);
    for (const { seed, hit, wert } of hits) {
      if (wert !== null && wert > MIN) expect(hit.params.sicher, `Seed ${seed}`).toBe(1);
    }
  });
});

describe('Max und die Ansage-Tabelle: Tout', () => {
  it(
    'rät zu Tout nur, wo die Tabelle es höher bewertet als das Spiel ohne',
    { timeout: 60_000 },
    () => {
      let geprueft = 0;
      for (let seed = 1; seed <= 15000; seed++) {
        // Sitz 0 sagt „Ich würde“, die anderen „weiter“: Stufe 3, Tout ist wählbar.
        let state = dealHand(RULES_TOUT, 3, seed);
        for (let i = 0; i < 4; i++) {
          state = act(state, state.turn, {
            type: 'bid',
            call: { type: state.turn === 0 ? 'interest' : 'pass' },
          });
        }
        const view = input(state, 0);
        const hit = ruleHits(view, 'bid').find((h) => h.id === 'ansage.tout.nur.sicher');
        if (!hit) continue;
        for (const o of hit.favored) {
          if (o.type !== 'bid' || o.call.type !== 'declare') continue;
          const c = o.call.contract;
          const plain = ansageWertInSicht(view.view, { ...c, tout: false }, view.rules);
          const wert = ansageWertInSicht(view.view, c, view.rules);
          expect(wert, `Seed ${seed}`).not.toBeNull();
          expect(wert!, `Seed ${seed}`).toBeGreaterThan(MIN);
          if (c.tout) expect(wert!, `Seed ${seed}`).toBeGreaterThanOrEqual(plain ?? -Infinity);
          else expect(plain!, `Seed ${seed}`).toBeGreaterThanOrEqual(0);
          geprueft++;
        }
      }
      expect(geprueft).toBeGreaterThan(0);
    },
  );
});
