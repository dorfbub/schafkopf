/**
 * Allgemeine Stichlogik. Kennt keine Spielarten – sie bekommt nur eine
 * `CardOrder` (welche Karten sind Trumpf, in welcher Reihenfolge stechen die
 * übrigen) und leitet daraus Bedienpflicht und Stichgewinner ab.
 */

import { type Card, type Rank, type Suit, rankOf, suitOf } from './cards';

export interface CardOrder {
  /** Alle Trümpfe, höchster zuerst. */
  trumps: readonly Card[];
  /** Stichreihenfolge der Ränge innerhalb einer Nicht-Trumpf-Farbe, höchster zuerst. */
  rankOrder: readonly Rank[];
  /** Die Trümpfe als Menge (schnellere Abfrage); fehlt sie, gilt `trumps`. */
  trumpSet?: ReadonlySet<Card>;
}

/** Trumpf zählt beim Bedienen als eigene "Farbe". */
export type EffectiveSuit = Suit | 'trump';

export function isTrump(c: Card, order: CardOrder): boolean {
  return order.trumpSet ? order.trumpSet.has(c) : order.trumps.includes(c);
}

export function effectiveSuit(c: Card, order: CardOrder): EffectiveSuit {
  return isTrump(c, order) ? 'trump' : suitOf(c);
}

/** Stärke innerhalb derselben effektiven Farbe; Trumpf schlägt jede Farbkarte. */
export function strength(c: Card, order: CardOrder): number {
  const trumpIndex = order.trumps.indexOf(c);
  if (trumpIndex >= 0) return 1000 - trumpIndex;
  return order.rankOrder.length - order.rankOrder.indexOf(rankOf(c));
}

/** Index der Karte, die den Stich macht (cards[0] ist die angespielte Karte). */
export function trickWinnerIndex(cards: readonly Card[], order: CardOrder): number {
  const lead = effectiveSuit(cards[0]!, order);
  let best = 0;
  for (let i = 1; i < cards.length; i++) {
    const c = cards[i]!;
    const suit = effectiveSuit(c, order);
    if (suit !== lead && suit !== 'trump') continue; // abgeworfen
    const current = cards[best]!;
    const beatsSuit = suit === 'trump' && effectiveSuit(current, order) !== 'trump';
    const beatsRank =
      suit === effectiveSuit(current, order) && strength(c, order) > strength(current, order);
    if (beatsSuit || beatsRank) best = i;
  }
  return best;
}

/**
 * Karten, die nach der Bedienpflicht gespielt werden dürfen: Wer die angespielte
 * (effektive) Farbe hat, muss sie zugeben; sonst ist jede Karte erlaubt.
 * Kein Stichzwang, kein Trumpfzwang.
 */
export function followable(
  hand: readonly Card[],
  trick: readonly Card[],
  order: CardOrder,
): Card[] {
  if (trick.length === 0) return [...hand];
  const lead = effectiveSuit(trick[0]!, order);
  const matching = hand.filter((c) => effectiveSuit(c, order) === lead);
  return matching.length > 0 ? matching : [...hand];
}
