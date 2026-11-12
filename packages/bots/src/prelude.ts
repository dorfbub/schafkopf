import {
  type Card,
  type HandView,
  type PreludeMove,
  RANKS,
  orderFor,
  pointsOf,
  rankOf,
} from '@schafkopf/core';

/**
 * Vorspiel für alle Bots (Hochzeit, K5): eine Hochzeit nehmen sie nie an; müssen sie doch
 * Karten zurückgeben (etwa als Vertretung eines Menschen, der angenommen hat), geben sie die
 * niedrigsten erlaubten – keine Trümpfe, wenig Augen, niedriger Rang.
 */
export function preludeMove(view: HandView): PreludeMove {
  const moves = view.legalMoves;
  const decline = moves.find((m) => m.type === 'decline');
  if (decline) return decline;
  const gives = moves.flatMap((m) => (m.type === 'give' ? [m] : []));
  if (gives.length === 0) return moves[0]!;
  const trumps = view.contract ? orderFor(view.contract, 0).trumps : [];
  // Trumpf zählt teurer als jede Farbkarte; danach Augen, dann Rang (Sieben am billigsten).
  const cardCost = (c: Card) =>
    (trumps.includes(c) ? 1000 : 0) + pointsOf(c) * 10 + RANKS.length - RANKS.indexOf(rankOf(c));
  const cost = (m: { cards: Card[] }) => m.cards.reduce((sum, c) => sum + cardCost(c), 0);
  return gives.reduce((best, m) => (cost(m) < cost(best) ? m : best));
}
