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

/** Spielarten mit Laufenden (Bettel hat keine). */
export type LaufendeKind = Exclude<ContractKind, 'bettel'>;
export const LAUFENDE_KINDS: readonly LaufendeKind[] = [
  'sauspiel',
  'solo',
  'wenz',
  'geier',
  'farbwenz',
];

export interface RuleSet {
  /** Anzahl Spieler. Aktuell nur 4; 3 ist für den Dreier-Modus mit kurzem Blatt vorgesehen. */
  players: number;
  deck: DeckKind;
  /** Erlaubte Spielarten. */
  contracts: ContractKind[];
  allowTout: boolean;
  allPassed: AllPassedRule;
  tariff: Tariff;
  /** Ab wie vielen Laufenden gezahlt wird, je Spielart (1–8). */
  laufende: Record<LaufendeKind, number>;
  /** „Sie“ (alle Ober und Unter im Solo) wird erkannt und bezahlt. */
  sie: boolean;
  /** Davonlaufen mit vier Karten der Ruffarbe erlaubt. */
  davonlaufen: boolean;
}

export const DEFAULT_RULES: RuleSet = {
  players: 4,
  deck: 'lang',
  contracts: [...CONTRACT_KINDS],
  allowTout: true,
  allPassed: 'zusammenwerfen',
  tariff: { sauspiel: 10, solo: 50, extra: 10 },
  laufende: { sauspiel: 3, solo: 3, wenz: 2, geier: 2, farbwenz: 3 },
  sie: true,
  davonlaufen: true,
};

/** Was der Gastgeber ändern darf: alles außer Spielerzahl, Blatt und „alle weiter“. */
export type RuleOptions = Pick<
  RuleSet,
  'contracts' | 'allowTout' | 'tariff' | 'laufende' | 'sie' | 'davonlaufen'
>;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isInt(v: unknown, min: number, max: number): v is number {
  return Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
}

/**
 * Prüft Einstellungen aus unsicherer Quelle (Netz, Speicherstand) und gibt sie
 * als frisches Objekt zurück – oder `null`, wenn irgendetwas nicht passt.
 */
export function parseRuleOptions(raw: unknown): RuleOptions | null {
  if (!isObj(raw)) return null;
  const { contracts, allowTout, tariff, laufende, sie, davonlaufen } = raw;
  if (!Array.isArray(contracts) || !contracts.every((k) => CONTRACT_KINDS.includes(k))) return null;
  const kinds = new Set(contracts as ContractKind[]);
  if (!kinds.has('sauspiel')) return null;
  if (typeof allowTout !== 'boolean' || typeof sie !== 'boolean') return null;
  if (typeof davonlaufen !== 'boolean') return null;
  if (!isObj(tariff) || !isObj(laufende)) return null;
  const MAX_TARIFF = 100_000;
  if (!isInt(tariff.sauspiel, 0, MAX_TARIFF)) return null;
  if (!isInt(tariff.solo, 0, MAX_TARIFF) || !isInt(tariff.extra, 0, MAX_TARIFF)) return null;
  const run = {} as Record<LaufendeKind, number>;
  for (const kind of LAUFENDE_KINDS) {
    const n = laufende[kind];
    if (!isInt(n, 1, 8)) return null;
    run[kind] = n;
  }
  return {
    contracts: CONTRACT_KINDS.filter((k) => kinds.has(k)),
    allowTout,
    tariff: { sauspiel: tariff.sauspiel, solo: tariff.solo, extra: tariff.extra },
    laufende: run,
    sie,
    davonlaufen,
  };
}

/** Übernimmt geprüfte Einstellungen in ein `RuleSet`. */
export function withRuleOptions(rules: RuleSet, options: RuleOptions): RuleSet {
  return { ...rules, ...options };
}
