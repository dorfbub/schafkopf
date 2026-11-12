/**
 * Tischregeln. Alles, was sich Runden beim Eröffnen des Tisches aussuchen
 * können sollen, gehört hier hinein – nicht als Konstante in die Spiellogik.
 */

import type { DeckKind } from './cards';
import { BID_ORDER, CLASSIC_CONTRACTS, type ContractKind, kindFitsPlayers } from './modes';

/**
 * Was passiert, wenn alle "weiter" sagen. Umgesetzt in der Registry `ALL_PASSED`
 * (`allPassed.ts`), die für jeden Eintrag hier einen Schritt kennt.
 */
export const ALL_PASSED_RULES = ['zusammenwerfen', 'ramsch', 'stock', 'muss'] as const;
export type AllPassedRule = (typeof ALL_PASSED_RULES)[number];

export interface Tariff {
  /** Grundtarif Sauspiel (in Cent). */
  sauspiel: number;
  /** Grundtarif für alle Einzelspiele (Solo, Wenz, Geier, Farbwenz, Bettel). */
  solo: number;
  /** Aufschlag je Schneider, Schwarz und Laufendem. */
  extra: number;
  /** Ramsch: zahlt der Verlierer an jeden der anderen (Durchmarsch: bekommt der Sieger). */
  ramsch: number;
  /** Stock: zahlt jeder in den Pott, wenn alle „weiter“ sagen. */
  stock: number;
}

/** Unteroptionen für Ramsch (gelten nur bei `allPassed: 'ramsch'`). */
export interface RamschOptions {
  /** Wer 91 oder mehr Augen hat, gewinnt stattdessen. */
  durchmarsch: boolean;
  /** Jeder Spieler ohne Stich verdoppelt, was der Verlierer zahlt. */
  jungfrau: boolean;
}

/** Spielarten mit Laufenden (Bettel und Ramsch haben keine). */
export type LaufendeKind = Exclude<ContractKind, 'bettel' | 'ramsch'>;
export const LAUFENDE_KINDS: readonly LaufendeKind[] = [
  'sauspiel',
  'solo',
  'wenz',
  'geier',
  'farbwenz',
  'hochzeit',
  'arabischeHochzeit',
  'eisenbahner',
];

export interface RuleSet {
  /** Anzahl Spieler: 4 oder 3 (Dreier, nur mit kurzer Karte; siehe `TABLE_SETUPS`). */
  players: number;
  deck: DeckKind;
  /**
   * Erlaubte Spielarten (nur ansagbare, in der Reihenfolge von `BID_ORDER`). Zu dritt bleiben die
   * Partnerspiele gespeichert, sind aber nicht ansagbar (`availableKinds`).
   */
  contracts: ContractKind[];
  allowTout: boolean;
  allPassed: AllPassedRule;
  tariff: Tariff;
  ramsch: RamschOptions;
  /** Ab wie vielen Laufenden gezahlt wird, je Spielart (1–8). */
  laufende: Record<LaufendeKind, number>;
  /** „Sie“ (alle Ober und Unter im Solo) wird erkannt und bezahlt. */
  sie: boolean;
  /** Davonlaufen mit vier Karten der Ruffarbe erlaubt. */
  davonlaufen: boolean;
  /** Kontra und Re erlaubt (K4). */
  kontra: boolean;
}

export const DEFAULT_RULES: RuleSet = {
  players: 4,
  deck: 'lang',
  // Ausdrücklich aufgezählt (nicht alle aus `CONTRACT_KINDS`): Spielarten, die später
  // hinzukommen (Hausregeln), sind standardmäßig aus.
  contracts: [...CLASSIC_CONTRACTS],
  allowTout: true,
  allPassed: 'zusammenwerfen',
  tariff: { sauspiel: 10, solo: 50, extra: 10, ramsch: 10, stock: 10 },
  ramsch: { durchmarsch: true, jungfrau: true },
  laufende: {
    sauspiel: 3,
    solo: 3,
    wenz: 2,
    geier: 2,
    farbwenz: 3,
    hochzeit: 3,
    arabischeHochzeit: 3,
    eisenbahner: 2,
  },
  sie: true,
  davonlaufen: true,
  kontra: false,
};

/** Erlaubte Besetzungen: Spielerzahl und Blatt (REGELN.md, „Kurze Karte und Dreier“). */
export const TABLE_SETUPS: readonly { players: number; deck: DeckKind }[] = [
  { players: 4, deck: 'lang' },
  { players: 4, deck: 'kurz' },
  { players: 3, deck: 'kurz' },
];

/** Spielarten, die an diesem Tisch angesagt werden können: eingeschaltet und passend zur Spielerzahl. */
export function availableKinds(rules: Pick<RuleSet, 'contracts' | 'players'>): ContractKind[] {
  return BID_ORDER.filter((k) => rules.contracts.includes(k) && kindFitsPlayers(k, rules.players));
}

/** Was der Gastgeber ändern darf – seit K6 auch Spielerzahl und Blatt. */
export type RuleOptions = Pick<
  RuleSet,
  | 'players'
  | 'deck'
  | 'contracts'
  | 'allowTout'
  | 'allPassed'
  | 'tariff'
  | 'ramsch'
  | 'laufende'
  | 'sie'
  | 'davonlaufen'
  | 'kontra'
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
  const { players, deck } = raw;
  const { contracts, allowTout, allPassed, tariff, ramsch, laufende, sie, davonlaufen, kontra } =
    raw;
  const setup = TABLE_SETUPS.find((s) => s.players === players && s.deck === deck);
  if (!setup) return null;
  if (!Array.isArray(contracts) || !contracts.every((k) => BID_ORDER.includes(k))) return null;
  const kinds = new Set(contracts as ContractKind[]);
  if (!kinds.has('sauspiel')) return null;
  if (typeof allowTout !== 'boolean' || typeof sie !== 'boolean') return null;
  if (typeof davonlaufen !== 'boolean' || typeof kontra !== 'boolean') return null;
  if (!ALL_PASSED_RULES.includes(allPassed as AllPassedRule)) return null;
  // Zu dritt: kein Muss (ohne Sauspiel kein Pflichtspiel) und mindestens ein Einzelspiel.
  if (setup.players < 4 && allPassed === 'muss') return null;
  if (availableKinds({ contracts: [...kinds], players: setup.players }).length === 0) return null;
  if (!isObj(tariff) || !isObj(laufende) || !isObj(ramsch)) return null;
  const MAX_TARIFF = 100_000;
  if (!isInt(tariff.sauspiel, 0, MAX_TARIFF)) return null;
  if (!isInt(tariff.solo, 0, MAX_TARIFF) || !isInt(tariff.extra, 0, MAX_TARIFF)) return null;
  if (!isInt(tariff.ramsch, 0, MAX_TARIFF) || !isInt(tariff.stock, 0, MAX_TARIFF)) return null;
  if (typeof ramsch.durchmarsch !== 'boolean' || typeof ramsch.jungfrau !== 'boolean') return null;
  const run = {} as Record<LaufendeKind, number>;
  for (const kind of LAUFENDE_KINDS) {
    const n = laufende[kind];
    if (!isInt(n, 1, 8)) return null;
    run[kind] = n;
  }
  return {
    players: setup.players,
    deck: setup.deck,
    contracts: BID_ORDER.filter((k) => kinds.has(k)),
    allowTout,
    allPassed: allPassed as AllPassedRule,
    tariff: {
      sauspiel: tariff.sauspiel,
      solo: tariff.solo,
      extra: tariff.extra,
      ramsch: tariff.ramsch,
      stock: tariff.stock,
    },
    ramsch: { durchmarsch: ramsch.durchmarsch, jungfrau: ramsch.jungfrau },
    laufende: run,
    sie,
    davonlaufen,
    kontra,
  };
}

/** Übernimmt geprüfte Einstellungen in ein `RuleSet`. */
export function withRuleOptions(rules: RuleSet, options: RuleOptions): RuleSet {
  return { ...rules, ...options };
}
