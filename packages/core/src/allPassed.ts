/**
 * „Alle weiter“ als Registry (siehe docs/entwurf-sonderspiele.md, §5): Für jede Tischregel
 * `RuleSet.allPassed` ein Eintrag, der aus dem Zustand nach der letzten Ansage einen Schritt
 * macht. `hand.ts` ruft nur `ALL_PASSED[rules.allPassed](state)` und führt den Schritt aus.
 *
 * Eine neue Regel (Ramsch, Stock, Muss) heißt: `AllPassedRule` erweitern, hier einen Eintrag
 * anlegen und – falls nötig – `AllPassedStep` um eine Schrittart ergänzen, die `hand.ts`
 * ausführt (geplant: `play` für Ramsch, `forced` und `fallback` für das Muss).
 */

import type { HandState } from './hand';
import type { AllPassedRule } from './rules';
import { type HandResult, passedResult } from './scoring';

export type AllPassedStep =
  /** Das Spiel endet ohne Stiche mit diesem Ergebnis (Zusammenwerfen, später Stock). */
  { type: 'finish'; result: HandResult };

export const ALL_PASSED: Record<AllPassedRule, (state: HandState) => AllPassedStep> = {
  zusammenwerfen: (state) => ({ type: 'finish', result: passedResult(state.rules.players) }),
};
