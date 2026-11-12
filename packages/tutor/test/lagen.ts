import {
  type Card,
  type Contract,
  type HandState,
  type PlayerAction,
  type RuleSet,
  type Seat,
  DEFAULT_RULES,
  applyAction,
  createDeck,
  dealHand,
  handViewFor,
} from '@schafkopf/core';
import type { TutorInput } from '../src';

/**
 * Feste Lagen für die Tests: Hände von Hand vorgeben, den Rest auffüllen, Ansage und Karten über
 * `applyAction` spielen – also nur Zustände, die im echten Spiel entstehen können.
 */

/** Hände: vorgegebene Sitze wie angegeben, die übrigen der Reihe nach mit den restlichen Karten. */
export function deal(
  fixed: Partial<Record<Seat, Card[]>>,
  rules: RuleSet = DEFAULT_RULES,
): Card[][] {
  const used = new Set(Object.values(fixed).flat());
  const rest = createDeck(rules.deck).filter((c) => !used.has(c));
  const size = rest.length / (rules.players - Object.keys(fixed).length) || 0;
  const hands: Card[][] = [];
  for (let s = 0; s < rules.players; s++) hands.push(fixed[s] ?? rest.splice(0, size));
  const all = hands.flat();
  if (all.length !== createDeck(rules.deck).length || new Set(all).size !== all.length) {
    throw new Error('Hände passen nicht zum Blatt');
  }
  return hands;
}

/** Spiel mit festen Händen; Geber 3, also beginnt Sitz 0 Ansage und ersten Stich. */
export function fixedHand(hands: Card[][], rules: RuleSet = DEFAULT_RULES, dealer: Seat = 3) {
  const state = dealHand(rules, dealer, 1);
  return { ...state, hands: hands.map((h) => [...h]), initialHands: hands.map((h) => [...h]) };
}

export function act(state: HandState, seat: Seat, action: PlayerAction): HandState {
  const result = applyAction(state, { ...action, seat });
  if (!result.ok) throw new Error(`${result.error}: ${JSON.stringify(action)} von Sitz ${seat}`);
  return result.state;
}

/** Ansage: `declarer` sagt „Ich würde“, alle anderen „weiter“, dann nennt er `contract`. */
export function declare(state: HandState, declarer: Seat, contract: Contract): HandState {
  let s = state;
  for (let i = 0; i < s.rules.players; i++) {
    const seat = s.turn;
    s = act(s, seat, { type: 'bid', call: { type: seat === declarer ? 'interest' : 'pass' } });
  }
  return act(s, declarer, { type: 'bid', call: { type: 'declare', contract } });
}

/** Alle sagen „weiter“ (mit der Tischregel Ramsch beginnt dann der Ramsch). */
export function allPass(state: HandState): HandState {
  let s = state;
  for (let i = 0; i < s.rules.players; i++)
    s = act(s, s.turn, { type: 'bid', call: { type: 'pass' } });
  return s;
}

/** Spielt die Karten der Reihe nach, jeweils vom Sitz, der am Zug ist. */
export function play(state: HandState, ...cards: Card[]): HandState {
  return cards.reduce((s, c) => act(s, s.turn, { type: 'play', card: c }), state);
}

/** Eingabe des Tutors für `seat`: seine Sicht, die Regeln und die gesehenen Stiche. */
export function input(state: HandState, seat: Seat): TutorInput {
  return { view: handViewFor(state, seat), rules: state.rules, seat, history: state.tricks };
}
