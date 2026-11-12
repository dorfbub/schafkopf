/**
 * Spielarten ("Modes"). Jede Spielart ist eine deklarative `ModeDefinition`.
 * Eine neue Spielart (z. B. Hochzeit, Ramsch) hinzufügen heißt:
 *   1. den Namen in `CONTRACT_KINDS` an der Stelle seines Rangs einfügen,
 *   2. einen Eintrag in `MODES` anlegen,
 *   3. Tests in `packages/core/test` ergänzen.
 * Stichlogik, Ansage und Abrechnung lesen nur diese Definitionen
 * (siehe docs/entwurf-sonderspiele.md, §2–§3).
 */

import { type Card, type Rank, type Suit, RANKS, SUITS, card, rankOf, suitOf } from './cards';
import type { HandState } from './hand';
import { type PreludeDefinition, weddingPrelude } from './prelude';
import type { Tariff } from './rules';
import { ramschOutcome } from './ramsch';
import type { Outcome } from './scoring';
import { type CardOrder, effectiveSuit } from './trick';

/**
 * Alle Spielarten, die ansagbaren in ihrer Rangfolge (niedrigste zuerst). Nicht ansagbare
 * Spielarten (Ramsch) stehen am Ende; maßgeblich für den Rang ist `BID_ORDER`.
 */
export const CONTRACT_KINDS = [
  'sauspiel',
  'hochzeit',
  'bettel',
  'eisenbahner',
  'geier',
  'farbwenz',
  'wenz',
  'solo',
  'ramsch',
] as const;
export type ContractKind = (typeof CONTRACT_KINDS)[number];

/**
 * Die klassischen Spielarten – Standard am Tisch und das, was der Heuristik-Bot kennt.
 * Spielarten, die später hinzukommen (Hausregeln), stehen bewusst nicht darin.
 */
export const CLASSIC_CONTRACTS: readonly ContractKind[] = [
  'sauspiel',
  'bettel',
  'geier',
  'farbwenz',
  'wenz',
  'solo',
];

/** Eine konkrete Ansage, z. B. Sauspiel auf die Eichel-Sau oder Herz-Solo Tout. */
export interface Contract {
  kind: ContractKind;
  /** Ruffarbe (Sauspiel) bzw. Trumpffarbe (Solo, Farbwenz). */
  suit?: Suit;
  tout?: boolean;
}

export interface LegalContext {
  contract: Contract;
  order: CardOrder;
  /** Aktuelle Hand des Spielers, der an der Reihe ist. */
  hand: readonly Card[];
  /** Bisher gespielte Karten des laufenden Stichs. */
  trick: readonly Card[];
  /** Karten aller abgeschlossenen Stiche (jeweils in Spielreihenfolge). */
  completedTricks: readonly (readonly Card[])[];
  /** Davonlaufen erlaubt (`RuleSet.davonlaufen`). */
  davonlaufen: boolean;
}

/** Wer spielt mit wem. */
export type Parties =
  /** Ansager gegen alle. */
  | 'alone'
  /** Partner ist der Besitzer der Rufsau, verdeckt bis die Sau fällt. */
  | 'calledAce'
  /** Partner ergibt sich aus dem Vorspiel und ist sofort bekannt (Hochzeit, K5). */
  | 'prelude'
  /** Jeder für sich, kein Ansager (Ramsch, K3b). */
  | 'everyone';

/** Tarifklasse einer Spielart: welcher Grundtarif aus `RuleSet.tariff` gilt. */
export type TariffClass = Exclude<keyof Tariff, 'extra' | 'stock'>;

export interface ModeDefinition {
  kind: ContractKind;
  /** false = entsteht nur durch eine Tischregel (Ramsch), nie durch Ansage. */
  biddable: boolean;
  /** Bedeutung von `Contract.suit`. */
  suitRole: 'none' | 'called' | 'trump';
  /** Wer spielt mit wem. */
  parties: Parties;
  /** Welcher Grundtarif gilt. */
  tariff: TariffClass;
  canTout: boolean;
  /**
   * 'points' = 61 Augen nötig; 'noTricks' = Ansager darf keinen Stich machen;
   * 'fewestPoints' = jeder für sich, wer die meisten Augen hat, verliert (Ramsch).
   */
  goal: 'points' | 'noTricks' | 'fewestPoints';
  /** Gibt es Laufende? Die Schwelle steht im `RuleSet` (`laufende`). */
  hasLaufende: boolean;
  /**
   * Trümpfe (volles Blatt) für den Stich mit Index `trick` (0-basiert), höchster zuerst.
   * Ein Stich liegt immer ganz in einer Phase; der Index hat bewusst keinen Standardwert.
   */
  trumps(contract: Contract, trick: number): Card[];
  /** Trümpfe, über die Laufende zählen (Standard: `trumps(contract, 0)`). */
  laufendeTrumps?(contract: Contract): Card[];
  /** Abweichende Rang-Reihenfolge der Farbkarten (Standard: `RANKS`). */
  rankOrder?: readonly Rank[];
  /** Darf dieses Blatt die Spielart überhaupt ansagen? (Standard: ja; Hochzeit: genau ein Trumpf) */
  eligible?(hand: readonly Card[]): boolean;
  /**
   * Welche Farben darf ein Spieler mit dieser Hand ansagen? (Standard: alle)
   * `forced`: er muss spielen (Muss) – die Spielart darf die Bedingung dann lockern.
   */
  suitChoices?(hand: readonly Card[], ctx?: { forced: boolean }): Suit[];
  /** Sonderregeln, die die bedienbaren Karten weiter einschränken (z. B. Rufsau). */
  restrictLegal?(ctx: LegalContext, candidates: Card[]): Card[];
  /** Eigene Auswertung statt der Partei-Abrechnung (Stufe 1, z. B. Ramsch). */
  outcome?(state: HandState): Outcome;
  /** Ablauf zwischen Ansage und erstem Stich (Hochzeit), siehe `prelude.ts`. */
  prelude?: PreludeDefinition;
}

const OBER: Card[] = SUITS.map((s) => card(s, 'O'));
const UNTER: Card[] = SUITS.map((s) => card(s, 'U'));
const ZEHNER: Card[] = SUITS.map((s) => card(s, '10'));

/** Karten einer Farbe ohne die genannten Ränge, hoch → niedrig. */
function suitCards(suit: Suit, without: readonly Rank[]): Card[] {
  return RANKS.filter((r) => !without.includes(r)).map((r) => card(suit, r));
}

/** Trümpfe wie im Sauspiel: Ober, Unter, Herz. */
function sauspielTrumps(): Card[] {
  return [...OBER, ...UNTER, ...suitCards('herz', ['O', 'U'])];
}

/** Anzahl der Sauspiel-Trümpfe in einer Hand (Liste erst beim ersten Aufruf gebaut). */
let sauspielTrumpList: readonly Card[] | null = null;
function countSauspielTrumps(hand: readonly Card[]): number {
  sauspielTrumpList ??= sauspielTrumps();
  return hand.filter((c) => sauspielTrumpList!.includes(c)).length;
}

function requireSuit(contract: Contract): Suit {
  if (!contract.suit) throw new Error(`Spielart ${contract.kind} braucht eine Farbe`);
  return contract.suit;
}

/**
 * Rufbar ist jede Farbe außer Herz, von der man eine Farbkarte, aber nicht die Sau hat.
 * Muss (`forced`) und nach diesen Regeln „gesperrt“: dann auch eine Sau, von deren Farbe man
 * keine Karte hat – nur nicht Herz und keine, die man selbst hält.
 */
function rufbar(hand: readonly Card[], ctx?: { forced: boolean }): Suit[] {
  const candidates = SUITS.filter((suit) => suit !== 'herz' && !hand.includes(card(suit, 'A')));
  const normal = candidates.filter((suit) =>
    hand.some((c) => suitOf(c) === suit && rankOf(c) !== 'O' && rankOf(c) !== 'U'),
  );
  return normal.length === 0 && ctx?.forced ? candidates : normal;
}

/**
 * Sonderregeln für den Besitzer der Rufsau:
 *  - Wird die Ruffarbe angespielt, muss die Sau zugegeben werden.
 *  - Die Ruffarbe darf nur mit der Sau angespielt werden – außer mit 4 oder mehr
 *    Karten der Ruffarbe ("Davonlaufen").
 *  - Die Sau darf nicht abgeworfen werden, solange die Ruffarbe nicht gespielt wurde
 *    (außer es ist die letzte Karte).
 * Nach dem Davonlaufen ist die Sau frei.
 */
function restrictRufsau(ctx: LegalContext, candidates: Card[]): Card[] {
  const called = requireSuit(ctx.contract);
  const sau = card(called, 'A');
  if (!ctx.hand.includes(sau)) return candidates;

  const isCalled = (c: Card) => effectiveSuit(c, ctx.order) === called;
  const ledBefore = ctx.completedTricks.some((t) => isCalled(t[0]!));
  if (ledBefore) return candidates;

  if (ctx.trick.length === 0) {
    if (ctx.davonlaufen && ctx.hand.filter(isCalled).length >= 4) return candidates;
    return candidates.filter((c) => !isCalled(c) || c === sau);
  }
  if (isCalled(ctx.trick[0]!)) return [sau];

  const withoutSau = candidates.filter((c) => c !== sau);
  return withoutSau.length > 0 ? withoutSau : candidates;
}

export const MODES: Record<ContractKind, ModeDefinition> = {
  sauspiel: {
    kind: 'sauspiel',
    biddable: true,
    suitRole: 'called',
    parties: 'calledAce',
    tariff: 'sauspiel',
    canTout: false,
    goal: 'points',
    hasLaufende: true,
    trumps: () => sauspielTrumps(),
    suitChoices: rufbar,
    restrictLegal: restrictRufsau,
  },
  hochzeit: {
    kind: 'hochzeit',
    biddable: true,
    suitRole: 'none',
    parties: 'prelude',
    tariff: 'sauspiel',
    canTout: false,
    goal: 'points',
    hasLaufende: true,
    trumps: () => sauspielTrumps(),
    eligible: (hand) => countSauspielTrumps(hand) === 1,
    prelude: weddingPrelude(1),
  },
  bettel: {
    kind: 'bettel',
    biddable: true,
    suitRole: 'none',
    parties: 'alone',
    tariff: 'solo',
    canTout: false,
    goal: 'noTricks',
    hasLaufende: false,
    trumps: () => [],
    // Im Bettel gibt es keine Trümpfe; der Zehner reiht sich zwischen Unter und Neuner ein.
    rankOrder: ['A', 'K', 'O', 'U', '10', '9', '8', '7'],
  },
  // Hausregel (H1): wie der Wenz, nur mit den vier Zehnern als Trümpfen. Standardmäßig aus.
  eisenbahner: {
    kind: 'eisenbahner',
    biddable: true,
    suitRole: 'none',
    parties: 'alone',
    tariff: 'solo',
    canTout: true,
    goal: 'points',
    hasLaufende: true,
    trumps: () => [...ZEHNER],
  },
  geier: {
    kind: 'geier',
    biddable: true,
    suitRole: 'none',
    parties: 'alone',
    tariff: 'solo',
    canTout: true,
    goal: 'points',
    hasLaufende: true,
    trumps: () => [...OBER],
  },
  farbwenz: {
    kind: 'farbwenz',
    biddable: true,
    suitRole: 'trump',
    parties: 'alone',
    tariff: 'solo',
    canTout: true,
    goal: 'points',
    hasLaufende: true,
    trumps: (contract) => [...UNTER, ...suitCards(requireSuit(contract), ['U'])],
  },
  wenz: {
    kind: 'wenz',
    biddable: true,
    suitRole: 'none',
    parties: 'alone',
    tariff: 'solo',
    canTout: true,
    goal: 'points',
    hasLaufende: true,
    trumps: () => [...UNTER],
  },
  solo: {
    kind: 'solo',
    biddable: true,
    suitRole: 'trump',
    parties: 'alone',
    tariff: 'solo',
    canTout: true,
    goal: 'points',
    hasLaufende: true,
    trumps: (contract) => [...OBER, ...UNTER, ...suitCards(requireSuit(contract), ['O', 'U'])],
  },
  ramsch: {
    kind: 'ramsch',
    biddable: false,
    suitRole: 'none',
    parties: 'everyone',
    tariff: 'ramsch',
    canTout: false,
    goal: 'fewestPoints',
    hasLaufende: false,
    trumps: () => sauspielTrumps(),
    // Aufruf erst zur Laufzeit: `ramsch.ts` liest seinerseits `MODES` (Kreis der Module).
    outcome: (state) => ramschOutcome(state),
  },
};

/** Ansagbare Spielarten, niedrigste zuerst. Einzige Quelle für den Rang. */
export const BID_ORDER: readonly ContractKind[] = CONTRACT_KINDS.filter((k) => MODES[k].biddable);

/** Stich- und Bedienordnung für den Stich mit Index `trick` (0-basiert). */
export function orderFor(contract: Contract, trick: number): CardOrder {
  const mode = MODES[contract.kind];
  return { trumps: mode.trumps(contract, trick), rankOrder: mode.rankOrder ?? RANKS };
}

/** Trümpfe, über die Laufende zählen. */
export function laufendeTrumpsFor(contract: Contract): Card[] {
  const mode = MODES[contract.kind];
  return mode.laufendeTrumps?.(contract) ?? mode.trumps(contract, 0);
}

/** Wert einer Ansage zum Überbieten (Rang in `BID_ORDER`); Tout schlägt jede Ansage ohne Tout. */
export function bidValue(level: { kind: ContractKind; tout?: boolean }): number {
  const rank = BID_ORDER.indexOf(level.kind);
  if (rank < 0) throw new Error(`Spielart ${level.kind} ist nicht ansagbar`);
  return rank + 1 + (level.tout ? 100 : 0);
}

export function sameContract(a: Contract, b: Contract): boolean {
  return a.kind === b.kind && a.suit === b.suit && Boolean(a.tout) === Boolean(b.tout);
}
