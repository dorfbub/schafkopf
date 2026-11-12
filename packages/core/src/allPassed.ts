/**
 * „Alle weiter“ als Registry (siehe docs/entwurf-sonderspiele.md, §5): Für jede Tischregel
 * `RuleSet.allPassed` ein Eintrag, der aus dem Zustand nach der letzten Ansage einen Schritt
 * macht. `hand.ts` ruft nur `ALL_PASSED[rules.allPassed](state)` und führt den Schritt aus.
 *
 * Eine neue Regel (Ramsch, Stock, Muss) heißt: `AllPassedRule` erweitern, hier einen Eintrag
 * anlegen und – falls nötig – `AllPassedStep` um eine Schrittart ergänzen, die `hand.ts`
 * ausführt (`play` für Ramsch, `forced` und `fallback` für das Muss).
 */

import type { HandState, Seat } from './hand';
import { type Contract, MODES } from './modes';
import type { AllPassedRule } from './rules';
import { type HandResult, passedResult } from './scoring';

/** Stock: Jeder zahlt den Einsatz in den Pott; es wird nicht gespielt. */
function stockResult(state: HandState): HandResult {
  const { players, tariff } = state.rules;
  return {
    ...passedResult(players),
    // `|| 0` macht aus −0 (Einsatz 0) eine schlichte 0.
    payments: Array.from({ length: players }, () => -tariff.stock || 0),
    potDelta: players * tariff.stock,
  };
}

export type AllPassedStep =
  /** Das Spiel endet ohne Stiche mit diesem Ergebnis (Zusammenwerfen, Stock). */
  | { type: 'finish'; result: HandResult }
  /** Es wird ohne Ansager gespielt (Ramsch). */
  | { type: 'play'; contract: Contract }
  /** `seat` muss ein Sauspiel nennen (Muss). */
  | { type: 'forced'; seat: Seat }
  /** Geht nicht – stattdessen gilt diese Regel (Muss mit drei eigenen Säuen). */
  | { type: 'fallback'; rule: Exclude<AllPassedRule, 'muss'> };

export const ALL_PASSED: Record<AllPassedRule, (state: HandState) => AllPassedStep> = {
  zusammenwerfen: (state) => ({ type: 'finish', result: passedResult(state.rules.players) }),
  ramsch: () => ({ type: 'play', contract: { kind: 'ramsch' } }),
  stock: (state) => ({ type: 'finish', result: stockResult(state) }),
  muss: (state) => {
    // Zu dritt gibt es kein Sauspiel und damit kein Muss (Annahme 53); der Host lässt die
    // Einstellung gar nicht zu – Schutz für fremde Regelsätze.
    if (state.rules.players < 4) return { type: 'fallback', rule: 'zusammenwerfen' };
    const seat = state.hands.findIndex((h) => h.includes('EO'));
    const hand = state.hands[seat];
    // Ohne Eichel-Ober (kurzes Blatt hat ihn immer; Schutz für fremde Blätter) oder ohne
    // rufbare Sau – er hält alle drei Farb-Säue – wird zusammengeworfen.
    if (!hand || MODES.sauspiel.suitChoices!(hand, { forced: true }).length === 0) {
      return { type: 'fallback', rule: 'zusammenwerfen' };
    }
    return { type: 'forced', seat };
  },
};
