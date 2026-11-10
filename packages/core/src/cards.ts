/**
 * Kartenmodell: bayerisches Blatt.
 *
 * Eine Karte ist ein kurzer String aus Farbkürzel + Rang, z. B. "EA" (Eichel-Sau),
 * "HO" (Herz-Ober), "S10" (Schellen-Zehner). Strings lassen sich direkt vergleichen,
 * serialisieren und über das Netz schicken.
 */

export const SUITS = ['eichel', 'gras', 'herz', 'schellen'] as const;
export type Suit = (typeof SUITS)[number];

/** Ränge in der natürlichen Stichreihenfolge einer Farbe (hoch → niedrig). */
export const RANKS = ['A', '10', 'K', 'O', 'U', '9', '8', '7'] as const;
export type Rank = (typeof RANKS)[number];

const SUIT_CODE = { eichel: 'E', gras: 'G', herz: 'H', schellen: 'S' } as const;
type SuitCode = (typeof SUIT_CODE)[Suit];
const CODE_SUIT: Record<string, Suit> = { E: 'eichel', G: 'gras', H: 'herz', S: 'schellen' };

export type Card = `${SuitCode}${Rank}`;

export function card(suit: Suit, rank: Rank): Card {
  return `${SUIT_CODE[suit]}${rank}`;
}

export function suitOf(c: Card): Suit {
  return CODE_SUIT[c.charAt(0)]!;
}

export function rankOf(c: Card): Rank {
  return c.slice(1) as Rank;
}

/** Augen je Rang. Summe über das ganze Blatt: 120. */
export const POINTS: Record<Rank, number> = {
  A: 11,
  '10': 10,
  K: 4,
  O: 3,
  U: 2,
  '9': 0,
  '8': 0,
  '7': 0,
};

export function pointsOf(c: Card): number {
  return POINTS[rankOf(c)];
}

export function sumPoints(cards: readonly Card[]): number {
  return cards.reduce((sum, c) => sum + pointsOf(c), 0);
}

/** "lang" = 32 Karten, "kurz" = 24 Karten (ohne 7er und 8er). */
export type DeckKind = 'lang' | 'kurz';

export function createDeck(kind: DeckKind): Card[] {
  const ranks = kind === 'kurz' ? RANKS.filter((r) => r !== '7' && r !== '8') : RANKS;
  return SUITS.flatMap((suit) => ranks.map((rank) => card(suit, rank)));
}

const ALL_CARDS = new Set<string>(createDeck('lang'));

export function isCard(value: unknown): value is Card {
  return typeof value === 'string' && ALL_CARDS.has(value);
}
