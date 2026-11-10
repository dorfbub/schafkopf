/**
 * Spielarten ("Modes"). Jede Spielart ist eine deklarative `ModeDefinition`.
 * Eine neue Spielart (z. B. Hochzeit, Ramsch) hinzufügen heißt:
 *   1. `ContractKind` erweitern,
 *   2. einen Eintrag in `MODES` anlegen,
 *   3. Tests in `packages/core/test` ergänzen.
 * Stichlogik, Ansage und Abrechnung lesen nur diese Definitionen.
 */

import { type Card, type Rank, type Suit, RANKS, SUITS, card, rankOf, suitOf } from './cards';
import { type CardOrder, effectiveSuit } from './trick';

export const CONTRACT_KINDS = ['sauspiel', 'bettel', 'geier', 'farbwenz', 'wenz', 'solo'] as const;
export type ContractKind = (typeof CONTRACT_KINDS)[number];

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
}

export interface ModeDefinition {
  kind: ContractKind;
  /** Rangfolge bei der Ansage: höherer Wert überbietet niedrigeren. */
  rank: number;
  /** Bedeutung von `Contract.suit`. */
  suitRole: 'none' | 'called' | 'trump';
  /** Spielt der Ansager allein gegen alle? (false = Partnerspiel) */
  alone: boolean;
  canTout: boolean;
  /** 'points' = 61 Augen nötig; 'noTricks' = Ansager darf keinen Stich machen. */
  goal: 'points' | 'noTricks';
  /** Ab wie vielen Laufenden gezahlt wird; null = keine Laufenden. */
  minLaufende: number | null;
  /** Alle Trümpfe (volles Blatt), höchster zuerst. */
  trumps(contract: Contract): Card[];
  /** Abweichende Rang-Reihenfolge der Farbkarten (Standard: `RANKS`). */
  rankOrder?: readonly Rank[];
  /** Welche Farben darf ein Spieler mit dieser Hand ansagen? (Standard: alle) */
  suitChoices?(hand: readonly Card[]): Suit[];
  /** Sonderregeln, die die bedienbaren Karten weiter einschränken (z. B. Rufsau). */
  restrictLegal?(ctx: LegalContext, candidates: Card[]): Card[];
}

const OBER: Card[] = SUITS.map((s) => card(s, 'O'));
const UNTER: Card[] = SUITS.map((s) => card(s, 'U'));

/** Karten einer Farbe ohne die genannten Ränge, hoch → niedrig. */
function suitCards(suit: Suit, without: readonly Rank[]): Card[] {
  return RANKS.filter((r) => !without.includes(r)).map((r) => card(suit, r));
}

function requireSuit(contract: Contract): Suit {
  if (!contract.suit) throw new Error(`Spielart ${contract.kind} braucht eine Farbe`);
  return contract.suit;
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
    if (ctx.hand.filter(isCalled).length >= 4) return candidates;
    return candidates.filter((c) => !isCalled(c) || c === sau);
  }
  if (isCalled(ctx.trick[0]!)) return [sau];

  const withoutSau = candidates.filter((c) => c !== sau);
  return withoutSau.length > 0 ? withoutSau : candidates;
}

export const MODES: Record<ContractKind, ModeDefinition> = {
  sauspiel: {
    kind: 'sauspiel',
    rank: 1,
    suitRole: 'called',
    alone: false,
    canTout: false,
    goal: 'points',
    minLaufende: 3,
    trumps: () => [...OBER, ...UNTER, ...suitCards('herz', ['O', 'U'])],
    // Rufbar ist jede Farbe außer Herz, von der man eine Karte, aber nicht die Sau hat.
    suitChoices: (hand) =>
      SUITS.filter(
        (suit) =>
          suit !== 'herz' &&
          !hand.includes(card(suit, 'A')) &&
          hand.some((c) => suitOf(c) === suit && rankOf(c) !== 'O' && rankOf(c) !== 'U'),
      ),
    restrictLegal: restrictRufsau,
  },
  bettel: {
    kind: 'bettel',
    rank: 2,
    suitRole: 'none',
    alone: true,
    canTout: false,
    goal: 'noTricks',
    minLaufende: null,
    trumps: () => [],
    // Im Bettel gibt es keine Trümpfe; der Zehner reiht sich zwischen Unter und Neuner ein.
    rankOrder: ['A', 'K', 'O', 'U', '10', '9', '8', '7'],
  },
  geier: {
    kind: 'geier',
    rank: 3,
    suitRole: 'none',
    alone: true,
    canTout: true,
    goal: 'points',
    minLaufende: 2,
    trumps: () => [...OBER],
  },
  farbwenz: {
    kind: 'farbwenz',
    rank: 4,
    suitRole: 'trump',
    alone: true,
    canTout: true,
    goal: 'points',
    minLaufende: 3,
    trumps: (contract) => [...UNTER, ...suitCards(requireSuit(contract), ['U'])],
  },
  wenz: {
    kind: 'wenz',
    rank: 5,
    suitRole: 'none',
    alone: true,
    canTout: true,
    goal: 'points',
    minLaufende: 2,
    trumps: () => [...UNTER],
  },
  solo: {
    kind: 'solo',
    rank: 6,
    suitRole: 'trump',
    alone: true,
    canTout: true,
    goal: 'points',
    minLaufende: 3,
    trumps: (contract) => [...OBER, ...UNTER, ...suitCards(requireSuit(contract), ['O', 'U'])],
  },
};

export function orderFor(contract: Contract): CardOrder {
  const mode = MODES[contract.kind];
  return { trumps: mode.trumps(contract), rankOrder: mode.rankOrder ?? RANKS };
}

/** Wert einer Ansage zum Überbieten; Tout schlägt jede Ansage ohne Tout. */
export function bidValue(contract: Contract): number {
  return MODES[contract.kind].rank + (contract.tout ? 100 : 0);
}

export function sameContract(a: Contract, b: Contract): boolean {
  return a.kind === b.kind && a.suit === b.suit && Boolean(a.tout) === Boolean(b.tout);
}
