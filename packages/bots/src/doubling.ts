import {
  type Card,
  type CardOrder,
  type Contract,
  type HandView,
  MODES,
  SUITS,
  card,
  effectiveSuit,
  orderFor,
  rankOf,
} from '@schafkopf/core';

/**
 * Kontra und Re für den Heuristik-Bot (B3). Der Bot wird nur gefragt, wenn er am Zug ist; ob er
 * überhaupt darf (`RuleSet.kontra`, Partei, erste Karte noch nicht gespielt), sagt ihm
 * `HandView.canDouble` – der Kern prüft das. Hier steht nur, ob sich das Doppeln lohnt.
 */

/** Bewertung eines Spiels für ein Blatt, wie `rateContract` (ab 0 würde man es spielen). */
export type RateFn = (hand: readonly Card[], contract: Contract, deckSize: number) => number;

/** Re: Spieler mit deutlich mehr als dem Nötigen, Mitspieler mit gutem Sauspiel-Blatt. */
const RE_MARGIN_DECLARER = 2.0;
const RE_MARGIN_PARTNER = 1.0;
/** Kontra gegen Partnerspiele: ein Blatt, mit dem man selbst ein gutes Sauspiel spielte. */
const KONTRA_TEAM = 6.4;
/**
 * Gegen eine Hochzeit höher: Der Partner hat sie nur mit starkem Trumpfblatt angenommen, der
 * Hochzeiter bringt Sauen mit.
 */
const KONTRA_WEDDING_EXTRA = 1.0;
/** Kontra gegen Einzelspiele: Anteil an der Trumpfstärke plus Sauen (siehe `kontraAlone`). */
const KONTRA_ALONE_SHARE = 0.5;
const KONTRA_ALONE_EXTRA = 1.5;

export function wantsDouble(view: HandView, rate: RateFn): boolean {
  const contract = view.contract;
  if (!view.canDouble || !contract || view.declarer === null) return false;
  if (MODES[contract.kind].goal !== 'points') return false; // Bettel: der Bot doppelt nicht
  const me = view.turn;
  const deckSize = view.handSizes.reduce((a, b) => a + b, 0);
  if (me === view.declarer) return rate(view.hand, contract, deckSize) >= RE_MARGIN_DECLARER;
  if (me === view.partner) {
    // Mitspieler (Sauspiel, Hochzeit): wie ein eigenes Sauspiel bewertet.
    const suit = contract.suit ?? 'eichel';
    return rate(view.hand, { kind: 'sauspiel', suit }, deckSize) >= RE_MARGIN_PARTNER;
  }
  return kontraStrength(view.hand, contract) >= 0;
}

const SAUSPIEL_WEIGHTS = [1.8, 1.6, 1.5, 1.4, 1.2, 1.2, 1.1, 1.1, 1.1, 1.0];

function sideValue(hand: readonly Card[], order: CardOrder): number {
  let s = 0;
  for (const suit of SUITS) {
    if (order.trumps.includes(card(suit, 'A'))) continue;
    const cards = hand.filter((c) => effectiveSuit(c, order) === suit);
    const has = (r: string) => cards.some((c) => rankOf(c) === r);
    if (has('A')) s += 1;
    if (has('A') && has('10')) s += 0.5;
  }
  return s;
}

/**
 * Stärke eines Gegenspielers gegen das angesagte Spiel; ab 0 sagt er Kontra.
 *  - Partnerspiele (Sauspiel, Hochzeit): zwei gegen zwei – er braucht ein Blatt, das selbst ein
 *    gutes Sauspiel wäre.
 *  - Einzelspiele: drei gegen einen, aber der Spieler hat meist die besten Trümpfe. Er braucht
 *    die Hälfte der Trumpfstärke des Spiels (hohe Trümpfe zählen mehr) und dazu Sauen.
 */
export function kontraStrength(hand: readonly Card[], contract: Contract): number {
  const order = orderFor(contract, 0);
  const trumps = hand.filter((c) => order.trumps.includes(c));
  const side = sideValue(hand, order);
  if (MODES[contract.kind].parties !== 'alone') {
    if (trumps.length < 4) return -10;
    const w = (c: Card) => SAUSPIEL_WEIGHTS[order.trumps.indexOf(c)] ?? 0.8;
    const voids = SUITS.filter(
      (s) =>
        !order.trumps.includes(card(s, 'A')) && !hand.some((c) => effectiveSuit(c, order) === s),
    ).length;
    const extra = MODES[contract.kind].parties === 'prelude' ? KONTRA_WEDDING_EXTRA : 0;
    return trumps.reduce((s, c) => s + w(c), 0) + side + 0.5 * voids - KONTRA_TEAM - extra;
  }
  const w = (i: number) => Math.max(0.6, 2.0 - 0.2 * i);
  const total = order.trumps.reduce((s, _c, i) => s + w(i), 0);
  const mine = trumps.reduce((s, c) => s + w(order.trumps.indexOf(c)), 0);
  return mine + side - KONTRA_ALONE_SHARE * total - KONTRA_ALONE_EXTRA;
}
