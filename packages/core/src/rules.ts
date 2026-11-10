/**
 * Tischregeln. Alles, was sich Runden beim Eröffnen des Tisches aussuchen
 * können sollen, gehört hier hinein – nicht als Konstante in die Spiellogik.
 */

import type { DeckKind } from './cards';
import { CONTRACT_KINDS, type ContractKind } from './modes';

/** Was passiert, wenn alle "weiter" sagen. Geplant: 'ramsch' | 'stock' | 'muss'. */
export type AllPassedRule = 'zusammenwerfen';

export interface Tariff {
  /** Grundtarif Sauspiel (in Cent). */
  sauspiel: number;
  /** Grundtarif für alle Einzelspiele (Solo, Wenz, Geier, Farbwenz, Bettel). */
  solo: number;
  /** Aufschlag je Schneider, Schwarz und Laufendem. */
  extra: number;
}

export interface RuleSet {
  /** Anzahl Spieler. Aktuell nur 4; 3 ist für den Dreier-Modus mit kurzem Blatt vorgesehen. */
  players: number;
  deck: DeckKind;
  /** Erlaubte Spielarten. */
  contracts: ContractKind[];
  allowTout: boolean;
  allPassed: AllPassedRule;
  tariff: Tariff;
}

export const DEFAULT_RULES: RuleSet = {
  players: 4,
  deck: 'lang',
  contracts: [...CONTRACT_KINDS],
  allowTout: true,
  allPassed: 'zusammenwerfen',
  tariff: { sauspiel: 10, solo: 50, extra: 10 },
};
