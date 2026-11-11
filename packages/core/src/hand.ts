/**
 * Ein einzelnes Spiel (eine "Hand"): Geben → Ansagen → Stiche → Abrechnung.
 *
 * Die Ansage ist zweistufig (siehe docs/REGELN.md, „Ansage“): erst reihum „Ich würde“ /
 * „weiter“, dann Zweikämpfe um die Spielart, zuletzt nennt der Sieger sein genaues Spiel.
 *
 * Der Zustand ist ein reines Datenobjekt, `applyAction` eine reine Funktion:
 * (Zustand, Aktion) → neuer Zustand oder Regelfehler. Kein I/O, kein Zufall,
 * keine Zeit – damit läuft der Kern identisch im Browser, in Tests und in Bots.
 */

import { type Card, SUITS, card, createDeck, sumPoints } from './cards';
import {
  type Contract,
  type ContractKind,
  CONTRACT_KINDS,
  MODES,
  bidValue,
  orderFor,
  sameContract,
} from './modes';
import { createRng, shuffle, type SeedInput } from './rng';
import type { RuleSet } from './rules';
import { type HandResult, scoreHand } from './scoring';
import { followable, trickWinnerIndex } from './trick';

/** Sitzplatz 0..players-1; gespielt wird reihum aufsteigend. */
export type Seat = number;

/** Spielart ohne Farbe – das, was im Zweikampf genannt wird. */
export interface BidLevel {
  kind: ContractKind;
  tout?: boolean;
}

/** Ein Ruf in der Ansage. */
export type BidCall =
  | { type: 'pass' } // Stufe 1: „weiter“
  | { type: 'interest' } // Stufe 1: „Ich würde“
  | { type: 'name'; level: BidLevel } // Zweikampf: Forderer nennt eine Spielart
  | { type: 'hold' } // Zweikampf: Haltender sagt „ich auch“
  | { type: 'yield' } // Zweikampf: „gut“ bzw. aufgeben
  | { type: 'declare'; contract: Contract }; // Stufe 3: das genaue Spiel

export type PlayerAction = { type: 'bid'; call: BidCall } | { type: 'play'; card: Card };

export type Action = PlayerAction & { seat: Seat };

export interface Bid {
  seat: Seat;
  call: BidCall;
}

/** Stufe der Ansage: „Ich würde“/„weiter“, Zweikampf, Spiel nennen. */
export type AuctionStage = 'interest' | 'duel' | 'declare';

/** Stand der Ansage; öffentlich, denn alles wird laut gesagt. */
export interface Auction {
  stage: AuctionStage;
  /** Wer gerade hält (im Zweikampf) bzw. sein Spiel nennt (Stufe 3). */
  holder: Seat | null;
  /** Wer gerade fordert (nur im Zweikampf). */
  challenger: Seat | null;
  /** Interessenten, die noch fordern werden – in Sitzreihenfolge. */
  waiting: Seat[];
  /** Zuletzt im Zweikampf genannte Spielart; das Spiel muss mindestens so hoch sein. */
  level: BidLevel | null;
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
  /** Alle Rufe der Ansage in zeitlicher Folge. */
  bids: Bid[];
  auction: Auction;
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

export function dealHand(rules: RuleSet, dealer: Seat, seed: SeedInput): HandState {
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
    auction: { stage: 'interest', holder: null, challenger: null, waiting: [], level: null },
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

/** Alle Spielarten (mit/ohne Tout), die die Tischregeln zulassen – aufsteigend nach Rang. */
export function allLevels(rules: RuleSet): BidLevel[] {
  const out: BidLevel[] = [];
  for (const contract of allContracts(rules)) {
    const level: BidLevel = contract.tout
      ? { kind: contract.kind, tout: true }
      : { kind: contract.kind };
    if (!out.some((l) => bidValue(l) === bidValue(level))) out.push(level);
  }
  return out.sort((a, b) => bidValue(a) - bidValue(b));
}

/** Spiele, die `seat` mit seinem Blatt spielen dürfte, ab dem Rang `minValue`. */
function playable(state: HandState, seat: Seat, minValue: number): Contract[] {
  const hand = state.hands[seat]!;
  return allContracts(state.rules).filter((contract) => {
    if (bidValue(contract) < minValue) return false;
    const mode = MODES[contract.kind];
    return !mode.suitChoices || mode.suitChoices(hand).includes(contract.suit!);
  });
}

/** Rufe, die `seat` jetzt machen darf (leer, wenn nicht an der Reihe). Passive Rufe zuerst. */
export function legalCalls(state: HandState, seat: Seat): BidCall[] {
  if (state.phase !== 'bidding' || state.turn !== seat) return [];
  const { stage, holder, level } = state.auction;
  const current = level ? bidValue(level) : 0;
  if (stage === 'interest') {
    const calls: BidCall[] = [{ type: 'pass' }];
    if (playable(state, seat, 0).length > 0) calls.push({ type: 'interest' });
    return calls;
  }
  if (stage === 'duel') {
    const calls: BidCall[] = [{ type: 'yield' }];
    if (seat === holder) {
      if (playable(state, seat, current).length > 0) calls.push({ type: 'hold' });
      return calls;
    }
    for (const l of allLevels(state.rules)) {
      if (bidValue(l) > current && playable(state, seat, bidValue(l)).length > 0) {
        calls.push({ type: 'name', level: l });
      }
    }
    return calls;
  }
  return playable(state, seat, current).map((contract) => ({ type: 'declare', contract }));
}

/** Spiele, die `seat` jetzt nennen darf – nur in Stufe 3, sonst leer. */
export function legalContracts(state: HandState, seat: Seat): Contract[] {
  return legalCalls(state, seat).flatMap((c) => (c.type === 'declare' ? [c.contract] : []));
}

function sameCall(a: BidCall, b: BidCall): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'name' && b.type === 'name') {
    return a.level.kind === b.level.kind && Boolean(a.level.tout) === Boolean(b.level.tout);
  }
  if (a.type === 'declare' && b.type === 'declare') return sameContract(a.contract, b.contract);
  return true;
}

/** Nur die bekannten Felder übernehmen – Rufe kommen aus dem Netz. */
function cleanCall(call: BidCall): BidCall {
  switch (call.type) {
    case 'name':
      return {
        type: 'name',
        level: { kind: call.level.kind, ...(call.level.tout ? { tout: true } : {}) },
      };
    case 'declare':
      return {
        type: 'declare',
        contract: {
          kind: call.contract.kind,
          ...(call.contract.suit ? { suit: call.contract.suit } : {}),
          ...(call.contract.tout ? { tout: true } : {}),
        },
      };
    default:
      return { type: call.type };
  }
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
      davonlaufen: state.rules.davonlaufen,
    },
    candidates,
  );
}

/** Nächster Zweikampf oder, wenn keiner mehr fordert, Stufe 3. Ändert `next`. */
function nextDuel(next: HandState): void {
  const auction = next.auction;
  const challenger = auction.waiting.shift();
  if (challenger === undefined) {
    auction.stage = 'declare';
    auction.challenger = null;
    next.turn = auction.holder!;
  } else {
    auction.stage = 'duel';
    auction.challenger = challenger;
    next.turn = challenger;
  }
}

function startPlay(next: HandState, declarer: Seat, contract: Contract): void {
  const players = next.rules.players;
  next.contract = contract;
  next.declarer = declarer;
  if (MODES[contract.kind].suitRole === 'called') {
    const sau = card(contract.suit!, 'A');
    next.partner = next.initialHands.findIndex((h) => h.includes(sau));
  }
  const first = (next.dealer + 1) % players;
  next.phase = 'playing';
  next.turn = first;
  next.currentTrick = { leader: first, cards: [] };
}

function applyBid(state: HandState, seat: Seat, raw: BidCall): ActionResult {
  if (!legalCalls(state, seat).some((c) => sameCall(c, raw))) {
    return { ok: false, error: 'illegal_bid' };
  }
  const call = cleanCall(raw);
  const next = structuredClone(state);
  const players = next.rules.players;
  const auction = next.auction;
  next.bids.push({ seat, call });

  switch (call.type) {
    case 'pass':
    case 'interest': {
      const first = (next.dealer + 1) % players;
      if (next.bids.length < players) {
        next.turn = (seat + 1) % players;
        return { ok: true, state: next };
      }
      const interested = Array.from({ length: players }, (_, i) => (first + i) % players).filter(
        (s) => next.bids.some((b) => b.seat === s && b.call.type === 'interest'),
      );
      if (interested.length === 0) {
        // Alle weiter. Aktuell einzige Regel: zusammenwerfen (siehe RuleSet.allPassed).
        next.phase = 'finished';
        next.result = { kind: 'passed', payments: Array.from({ length: players }, () => 0) };
        return { ok: true, state: next };
      }
      auction.holder = interested[0]!;
      auction.waiting = interested.slice(1);
      nextDuel(next);
      return { ok: true, state: next };
    }
    case 'name':
      auction.level = call.level;
      next.turn = auction.holder!;
      return { ok: true, state: next };
    case 'hold':
      next.turn = auction.challenger!;
      return { ok: true, state: next };
    case 'yield':
      // Gibt der Haltende auf, hält ab jetzt der Forderer.
      if (seat === auction.holder) auction.holder = auction.challenger;
      nextDuel(next);
      return { ok: true, state: next };
    case 'declare':
      startPlay(next, seat, call.contract);
      return { ok: true, state: next };
  }
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
    ? applyBid(state, action.seat, action.call)
    : applyPlay(state, action.seat, action.card);
}
