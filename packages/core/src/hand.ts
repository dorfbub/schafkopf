/**
 * Ein einzelnes Spiel (eine "Hand"): Geben → Ansagen → Stiche → Abrechnung.
 *
 * Der Zustand ist ein reines Datenobjekt, `applyAction` eine reine Funktion:
 * (Zustand, Aktion) → neuer Zustand oder Regelfehler. Kein I/O, kein Zufall,
 * keine Zeit – damit läuft der Kern identisch im Browser, in Tests und in Bots.
 */

import { type Card, SUITS, card, createDeck, sumPoints } from './cards';
import { type Contract, CONTRACT_KINDS, MODES, bidValue, orderFor, sameContract } from './modes';
import { createRng, shuffle } from './rng';
import type { RuleSet } from './rules';
import { type HandResult, scoreHand } from './scoring';
import { followable, trickWinnerIndex } from './trick';

/** Sitzplatz 0..players-1; gespielt wird reihum aufsteigend. */
export type Seat = number;

export type PlayerAction =
  | { type: 'bid'; contract: Contract | null } // null = "weiter"
  | { type: 'play'; card: Card };

export type Action = PlayerAction & { seat: Seat };

export interface Bid {
  seat: Seat;
  contract: Contract | null;
}

export interface Trick {
  leader: Seat;
  /** cards[i] stammt von Sitz (leader + i) % players. */
  cards: Card[];
}

export interface CompletedTrick extends Trick {
  winner: Seat;
  points: number;
}

export type HandPhase = 'bidding' | 'playing' | 'finished';

export interface HandState {
  rules: RuleSet;
  dealer: Seat;
  phase: HandPhase;
  /** Wer ist an der Reihe (Ansage oder Karte). */
  turn: Seat;
  hands: Card[][];
  /** Hände direkt nach dem Geben – für Laufende, Sie und Nachvollziehbarkeit. */
  initialHands: Card[][];
  bids: Bid[];
  contract: Contract | null;
  declarer: Seat | null;
  /** Mitspieler im Sauspiel (Besitzer der Rufsau); sonst null. */
  partner: Seat | null;
  tricks: CompletedTrick[];
  currentTrick: Trick;
  result: HandResult | null;
}

export type RuleError = 'wrong_phase' | 'not_your_turn' | 'illegal_bid' | 'illegal_card';

export type ActionResult = { ok: true; state: HandState } | { ok: false; error: RuleError };

export function dealHand(rules: RuleSet, dealer: Seat, seed: number): HandState {
  const deck = shuffle(createDeck(rules.deck), createRng(seed));
  const size = deck.length / rules.players;
  if (!Number.isInteger(size)) throw new Error('Blatt lässt sich nicht gleichmäßig verteilen');
  const hands = Array.from({ length: rules.players }, (_, i) =>
    deck.slice(i * size, (i + 1) * size),
  );
  const first = (dealer + 1) % rules.players;
  return {
    rules,
    dealer,
    phase: 'bidding',
    turn: first,
    hands,
    initialHands: hands.map((h) => [...h]),
    bids: [],
    contract: null,
    declarer: null,
    partner: null,
    tricks: [],
    currentTrick: { leader: first, cards: [] },
    result: null,
  };
}

/** Alle Ansagen, die die Tischregeln grundsätzlich zulassen (ohne Blick auf die Hand). */
export function allContracts(rules: RuleSet): Contract[] {
  const out: Contract[] = [];
  for (const kind of CONTRACT_KINDS) {
    if (!rules.contracts.includes(kind)) continue;
    const mode = MODES[kind];
    const suits = mode.suitRole === 'none' ? [undefined] : SUITS;
    for (const suit of suits) {
      const base: Contract = suit ? { kind, suit } : { kind };
      out.push(base);
      if (mode.canTout && rules.allowTout) out.push({ ...base, tout: true });
    }
  }
  return out;
}

function highestBid(bids: readonly Bid[]): (Bid & { contract: Contract }) | null {
  let best: (Bid & { contract: Contract }) | null = null;
  for (const bid of bids) {
    if (bid.contract && (!best || bidValue(bid.contract) > bidValue(best.contract))) {
      best = { seat: bid.seat, contract: bid.contract };
    }
  }
  return best;
}

/** Ansagen, die `seat` jetzt machen darf (leer, wenn nicht an der Reihe). */
export function legalContracts(state: HandState, seat: Seat): Contract[] {
  if (state.phase !== 'bidding' || state.turn !== seat) return [];
  const hand = state.hands[seat]!;
  const toBeat = highestBid(state.bids);
  const minValue = toBeat ? bidValue(toBeat.contract) : 0;
  return allContracts(state.rules).filter((contract) => {
    if (bidValue(contract) <= minValue) return false;
    const mode = MODES[contract.kind];
    if (mode.suitChoices && !mode.suitChoices(hand).includes(contract.suit!)) return false;
    return true;
  });
}

/** Karten, die `seat` jetzt spielen darf (leer, wenn nicht an der Reihe). */
export function legalCards(state: HandState, seat: Seat): Card[] {
  if (state.phase !== 'playing' || state.turn !== seat || !state.contract) return [];
  const order = orderFor(state.contract);
  const hand = state.hands[seat]!;
  const trick = state.currentTrick.cards;
  const candidates = followable(hand, trick, order);
  const restrict = MODES[state.contract.kind].restrictLegal;
  if (!restrict) return candidates;
  return restrict(
    {
      contract: state.contract,
      order,
      hand,
      trick,
      completedTricks: state.tricks.map((t) => t.cards),
    },
    candidates,
  );
}

function applyBid(state: HandState, seat: Seat, contract: Contract | null): ActionResult {
  if (contract && !legalContracts(state, seat).some((c) => sameContract(c, contract))) {
    return { ok: false, error: 'illegal_bid' };
  }
  const next = structuredClone(state);
  const players = next.rules.players;
  // Nur die bekannten Felder übernehmen – Aktionen kommen aus dem Netz.
  const clean: Contract | null = contract
    ? {
        kind: contract.kind,
        ...(contract.suit ? { suit: contract.suit } : {}),
        ...(contract.tout ? { tout: true } : {}),
      }
    : null;
  next.bids.push({ seat, contract: clean });

  if (next.bids.length < players) {
    next.turn = (seat + 1) % players;
    return { ok: true, state: next };
  }

  const best = highestBid(next.bids);
  if (!best) {
    // Alle weiter. Aktuell einzige Regel: zusammenwerfen (siehe RuleSet.allPassed).
    next.phase = 'finished';
    next.result = { kind: 'passed', payments: Array.from({ length: players }, () => 0) };
    return { ok: true, state: next };
  }

  next.contract = best.contract;
  next.declarer = best.seat;
  if (MODES[best.contract.kind].suitRole === 'called') {
    const sau = card(best.contract.suit!, 'A');
    next.partner = next.initialHands.findIndex((h) => h.includes(sau));
  }
  const first = (next.dealer + 1) % players;
  next.phase = 'playing';
  next.turn = first;
  next.currentTrick = { leader: first, cards: [] };
  return { ok: true, state: next };
}

function applyPlay(state: HandState, seat: Seat, played: Card): ActionResult {
  if (!legalCards(state, seat).includes(played)) return { ok: false, error: 'illegal_card' };
  const next = structuredClone(state);
  const players = next.rules.players;
  next.hands[seat] = next.hands[seat]!.filter((c) => c !== played);
  next.currentTrick.cards.push(played);

  if (next.currentTrick.cards.length < players) {
    next.turn = (seat + 1) % players;
    return { ok: true, state: next };
  }

  const { leader, cards } = next.currentTrick;
  const winner = (leader + trickWinnerIndex(cards, orderFor(next.contract!))) % players;
  next.tricks.push({ leader, cards, winner, points: sumPoints(cards) });
  next.currentTrick = { leader: winner, cards: [] };
  next.turn = winner;

  if (next.hands.every((h) => h.length === 0)) {
    next.phase = 'finished';
    next.result = scoreHand(next);
  }
  return { ok: true, state: next };
}

export function applyAction(state: HandState, action: Action): ActionResult {
  const expected = action.type === 'bid' ? 'bidding' : 'playing';
  if (state.phase !== expected) return { ok: false, error: 'wrong_phase' };
  if (state.turn !== action.seat) return { ok: false, error: 'not_your_turn' };
  return action.type === 'bid'
    ? applyBid(state, action.seat, action.contract)
    : applyPlay(state, action.seat, action.card);
}
