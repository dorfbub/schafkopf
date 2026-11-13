import {
  type Card,
  type CardOrder,
  type ContractKind,
  type HandView,
  type PreludeMove,
  SUITS,
  effectiveSuit,
  orderFor,
  rankOf,
} from '@schafkopf/core';

/**
 * Hochzeit und arabische Hochzeit für den Heuristik-Bot (B3): wann er sie ansagt, wann er sie
 * annimmt und welche Karten er zurückgibt. Beide Spielarten haben die Trümpfe des Sauspiels;
 * sie unterscheiden sich nur in der Zahl der getauschten Karten.
 */

/** Zahl der Karten, die bei dieser Spielart getauscht werden (0 = keine Hochzeit). */
export function weddingSize(kind: ContractKind): number {
  if (kind === 'hochzeit') return 1;
  if (kind === 'arabischeHochzeit') return 2;
  return 0;
}

const SAUSPIEL_ORDER: CardOrder = orderFor({ kind: 'hochzeit' }, 0);
const TRUMP_WEIGHTS = [1.8, 1.6, 1.5, 1.4, 1.2, 1.2, 1.1, 1.1, 1.1, 1.0];

const isTrump = (c: Card) => SAUSPIEL_ORDER.trumps.includes(c);

function trumpWeight(c: Card): number {
  const i = SAUSPIEL_ORDER.trumps.indexOf(c);
  return i < 0 ? 0 : (TRUMP_WEIGHTS[i] ?? 0.8);
}

/** Farben, die im Sauspiel Nicht-Trümpfe haben (alle außer Herz). */
const SIDE_SUITS = SUITS.filter((s) => s !== 'herz');

/** Sauen und blanke Zehner neben der Sau – die Stiche, die der Hochzeiter selbst macht. */
function sideValue(hand: readonly Card[]): number {
  let s = 0;
  for (const suit of SIDE_SUITS) {
    const cards = hand.filter((c) => effectiveSuit(c, SAUSPIEL_ORDER) === suit);
    const has = (r: string) => cards.some((c) => rankOf(c) === r);
    if (has('A')) s += 1;
    if (has('A') && has('10')) s += 0.5;
  }
  return s;
}

export function sideVoids(hand: readonly Card[]): number {
  return SIDE_SUITS.filter((s) => !hand.some((c) => effectiveSuit(c, SAUSPIEL_ORDER) === s)).length;
}

/**
 * Lohnt sich die Hochzeit mit diesem Blatt? Der Hochzeiter gibt seine Trümpfe ab und spielt mit
 * dem stärksten Trumpfblatt am Tisch, das annimmt. Selbst bringt er nur seine Farbstiche ein:
 * gefragt sind zwei Sauen (oder Sau mit Zehn und eine weitere hohe Karte). Scheitert sie, kostet
 * es nichts – dann gilt er als „weiter“. Rückgabe wie `rateContract`: ab 0 ansagen.
 */
export function rateWedding(hand: readonly Card[], n: number): number {
  const trumps = hand.filter(isTrump).length;
  if (trumps !== n) return -10;
  return sideValue(hand) - WEDDING_THRESHOLD;
}
const WEDDING_THRESHOLD = 2.0;

/**
 * Nimmt der Bot die Hochzeit an? Er bekommt `n` Trümpfe (welche, weiß er nicht – gerechnet wird
 * mit einem mittleren) und gibt `n` Farbkarten zurück, kann also eine kurze Farbe frei machen.
 * Gefordert ist ein Blatt, mit dem er fast selbst ein Sauspiel spielen würde; der Hochzeiter
 * steuert seine Sauen bei.
 */
export function rateAcceptWedding(hand: readonly Card[], n: number): number {
  const trumps = hand.filter(isTrump);
  if (trumps.length + n < 5) return -10;
  const score =
    trumps.reduce((s, c) => s + trumpWeight(c), 0) +
    n * 1.1 +
    sideValue(hand) +
    0.5 * sideVoids(hand);
  return score - ACCEPT_THRESHOLD;
}
const ACCEPT_THRESHOLD = 7.2;

/**
 * Welche Karten gibt der Partner zurück? Bevorzugt so, dass eine Farbe frei wird (er sticht sie
 * dann mit seinen Trümpfen), und keine Trümpfe. Die Augen bleiben in der Partei, zählen also nicht;
 * eine Sau behält er lieber selbst, weil er öfter herauskommt als der trumpflose Hochzeiter.
 */
export function weddingGiveScore(hand: readonly Card[], cards: readonly Card[]): number {
  const rest = hand.filter((c) => !cards.includes(c));
  let s = 3 * sideVoids(rest);
  for (const c of cards) {
    if (isTrump(c)) s -= 100 + trumpWeight(c);
    if (rankOf(c) === 'A') s -= 0.5;
    // Kleine Karten zuerst: die Rangstelle als feiner Unterschied.
    s += SAUSPIEL_ORDER.rankOrder.indexOf(rankOf(c)) * 0.01;
  }
  return s;
}

export function chooseWeddingGive(hand: readonly Card[], gives: readonly Card[][]): Card[] {
  return gives.reduce((best, cards) =>
    weddingGiveScore(hand, cards) > weddingGiveScore(hand, best) ? cards : best,
  );
}

/** Vorspiel-Zug des Heuristik-Bots: annehmen oder ablehnen, Karten zurückgeben. */
export function weddingMove(view: HandView): PreludeMove {
  const moves = view.legalMoves;
  const n = view.contract ? weddingSize(view.contract.kind) : 0;
  const accept = moves.find((m) => m.type === 'accept');
  const decline = moves.find((m) => m.type === 'decline');
  if (accept && decline) {
    return n > 0 && rateAcceptWedding(view.hand, n) >= 0 ? accept : decline;
  }
  const gives = moves.flatMap((m) => (m.type === 'give' ? [m.cards] : []));
  if (gives.length > 0) return { type: 'give', cards: chooseWeddingGive(view.hand, gives) };
  return moves[0]!;
}
