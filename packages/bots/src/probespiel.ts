import {
  type Card,
  type HandState,
  type HandView,
  type Rng,
  type Seat,
  MODES,
  card,
  effectiveSuit,
  legalCards,
  orderFor,
  sumPoints,
  trickWinnerIndex,
} from '@schafkopf/core';
import { type Memory, heuristicCard, markVoid } from './heuristicBot';

/**
 * Bausteine der Probespiele des starken Bots (B2) und der Gewichtung der Verteilungen (B5):
 * ein Spielstand als `HandState`, in dem alle Sitze nach der Heuristik ziehen.
 */

/** Sicht eines Sitzes im Probespiel – nur die Felder, die die Heuristik beim Kartenspiel liest. */
export function simView(state: HandState, seat: Seat, legal: Card[], memory: Memory): HandView {
  const tricksWon = state.hands.map(() => 0);
  for (const t of state.tricks) tricksWon[t.winner]!++;
  const parties = MODES[state.contract!.kind].parties;
  const sau =
    parties === 'calledAce' && state.contract!.suit ? card(state.contract!.suit, 'A') : null;
  const partnerKnown =
    state.partner !== null &&
    (parties !== 'calledAce' ||
      seat === state.partner ||
      state.doubling.re === state.partner ||
      (sau !== null && memory.played.has(sau)));
  return {
    phase: 'playing',
    dealer: state.dealer,
    turn: seat,
    hand: state.hands[seat]!,
    handSizes: state.hands.map((h) => h.length),
    bids: state.bids,
    auction: state.auction,
    contract: state.contract,
    declarer: state.declarer,
    partner: partnerKnown ? state.partner : null,
    prelude: null,
    currentTrick: state.currentTrick,
    lastTrick: state.tricks.at(-1) ?? null,
    tricks: null,
    tricksWon,
    legalCards: legal,
    legalCalls: [],
    legalMoves: [],
    doubling: state.doubling,
    canDouble: false,
    result: null,
  };
}

/** Legt eine Karte; verändert `state` und `memory` (beides Kopien des Probespiels). */
export function playInPlace(state: HandState, memory: Memory, seat: Seat, c: Card): void {
  const players = state.hands.length;
  const order = orderFor(state.contract!, state.tricks.length);
  state.hands[seat] = state.hands[seat]!.filter((x) => x !== c);
  const trick = state.currentTrick;
  const lead = trick.cards[0];
  if (lead !== undefined) {
    const leadSuit = effectiveSuit(lead, order);
    if (effectiveSuit(c, order) !== leadSuit) markVoid(memory, seat, leadSuit, order);
  }
  trick.cards.push(c);
  memory.played.add(c);
  if (trick.cards.length < players) {
    state.turn = (seat + 1) % players;
    return;
  }
  const winner = (trick.leader + trickWinnerIndex(trick.cards, order)) % players;
  state.tricks.push({
    leader: trick.leader,
    cards: trick.cards,
    winner,
    points: sumPoints(trick.cards),
  });
  memory.pointsWon[winner] = (memory.pointsWon[winner] ?? 0) + sumPoints(trick.cards);
  memory.tricksSeen = state.tricks.length;
  state.currentTrick = { leader: winner, cards: [] };
  state.turn = winner;
}

/** Spielt von `state` aus mit der Heuristik zu Ende (verändert `state` und `memory`). */
export function playToEnd(state: HandState, memory: Memory, rng: Rng): void {
  while (state.hands.some((h) => h.length > 0)) {
    const seat = state.turn;
    const legal = legalCards(state, seat);
    const c =
      legal.length === 1
        ? legal[0]!
        : heuristicCard(simView(state, seat, legal, memory), memory, rng);
    playInPlace(state, memory, seat, c);
  }
  state.phase = 'finished';
}
