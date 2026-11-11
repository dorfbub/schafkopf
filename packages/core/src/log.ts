/**
 * Spielprotokoll: ein Spiel ist durch Regeln, Geber, Seed und die Folge der Aktionen
 * (mit Sitz) vollständig bestimmt. `replay` baut daraus den Endzustand nach.
 *
 * Ein `HandLog` enthält alle Karten (über den Seed) und bleibt deshalb beim Host.
 * Nach außen geht nur die `HandSummary` eines fertigen Spiels.
 */

import { type Action, type HandState, type Seat, applyAction, dealHand } from './hand';
import { type Seed, toSeed } from './rng';
import type { SeedInput } from './rng';
import type { RuleSet } from './rules';
import type { HandResult } from './scoring';

export interface HandLog {
  /** Laufende Nummer des Spiels am Tisch (ab 1). */
  handNo: number;
  rules: RuleSet;
  dealer: Seat;
  seed: Seed;
  /** Alle angenommenen Aktionen in zeitlicher Folge. */
  actions: Action[];
}

/**
 * Zusammenfassung eines fertigen Spiels – ohne Karten, für alle sichtbar.
 * `result` nennt Ansage, Spieler, Augen, Ergebnis und Zahlungen.
 */
export interface HandSummary {
  handNo: number;
  dealer: Seat;
  result: HandResult;
}

export function newHandLog(handNo: number, rules: RuleSet, dealer: Seat, seed: SeedInput): HandLog {
  return { handNo, rules, dealer, seed: toSeed(seed), actions: [] };
}

/** Wiederholt das Spiel. Wirft bei einem Protokoll, das nicht regelkonform abläuft. */
export function replay(log: HandLog): HandState {
  let state = dealHand(log.rules, log.dealer, log.seed);
  log.actions.forEach((action, i) => {
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(`Protokoll ungültig bei Aktion ${i}: ${result.error}`);
    state = result.state;
  });
  return state;
}

/** Die Zusammenfassung eines fertigen Spiels; `null`, solange es läuft. */
export function summarize(log: HandLog, state: HandState): HandSummary | null {
  return state.result ? { handNo: log.handNo, dealer: log.dealer, result: state.result } : null;
}
