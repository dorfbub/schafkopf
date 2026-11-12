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
import { ALL_PASSED } from './allPassed';
import {
  type Contract,
  type ContractKind,
  MODES,
  bidValue,
  davonlaufenAb,
  orderFor,
  sameContract,
} from './modes';
import type { PreludeMove, PreludeState } from './prelude';
import { createRng, shuffle, type SeedInput } from './rng';
import { type AllPassedRule, type RuleSet, availableKinds } from './rules';
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

export type PlayerAction =
  | { type: 'bid'; call: BidCall }
  /** Zug im Vorspiel (Hochzeit: annehmen, ablehnen, Karten zurückgeben). */
  | { type: 'prelude'; move: PreludeMove }
  | { type: 'play'; card: Card }
  /** Kontra bzw. Re (K4) – außerhalb der Reihe, solange die erste Karte nicht liegt. */
  | { type: 'double' };

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
  /** Muss: `holder` muss ein Sauspiel nennen (Stufe 3 ohne „weiter“). */
  forced: boolean;
  /**
   * Wer in einem Zweikampf aufgegeben hat, in zeitlicher Folge. Scheitert das Vorspiel (keiner
   * nimmt die Hochzeit an), rücken diese Spieler nach (Annahme 27).
   */
  yielded: Seat[];
  /** Spielarten, deren Vorspiel in diesem Spiel gescheitert ist; sie sind nicht mehr ansagbar. */
  failed: ContractKind[];
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

export type HandPhase = 'bidding' | 'prelude' | 'playing' | 'finished';

/**
 * Was der Tisch dem Spiel mitgibt (siehe docs/entwurf-sonderspiele.md, §7). Reine Daten;
 * das Spiel kennt den Tisch selbst nicht.
 */
export interface HandCarry {
  /** Stock in Cent; 0, wenn nicht gespielt. */
  pot: number;
  /** Faktor auf den Spielwert (Bockrunde: 2, sonst 1; K4). */
  factor: number;
}

/** Kontra und Re (K4): wer es gesagt hat, sonst `null`. Öffentlich, denn es wird laut gesagt. */
export interface Doubling {
  kontra: Seat | null;
  re: Seat | null;
}

/** Übertrag ohne Pott und ohne Faktor. */
export const NO_CARRY: HandCarry = { pot: 0, factor: 1 };

export interface HandState {
  rules: RuleSet;
  dealer: Seat;
  phase: HandPhase;
  /** Wer ist an der Reihe (Ansage oder Karte). */
  turn: Seat;
  hands: Card[][];
  /**
   * Hände zu Beginn des Kartenspiels – für Laufende und Sie. Direkt nach dem Geben; nach einem
   * Tausch im Vorspiel (Hochzeit) der Stand danach (Annahme 15).
   */
  initialHands: Card[][];
  /** Alle Rufe der Ansage in zeitlicher Folge. */
  bids: Bid[];
  auction: Auction;
  contract: Contract | null;
  /** Ansager; `null` auch bei laufendem Spiel, wenn die Spielart keinen hat (Ramsch). */
  declarer: Seat | null;
  /** Mitspieler im Sauspiel (Besitzer der Rufsau) bzw. aus dem Vorspiel (Hochzeit); sonst null. */
  partner: Seat | null;
  /** Stand des Vorspiels, nur in der Phase `prelude`. */
  prelude: PreludeState | null;
  tricks: CompletedTrick[];
  currentTrick: Trick;
  /** Übertrag vom Tisch (Pott, Faktor). */
  carry: HandCarry;
  /** Kontra und Re (K4). */
  doubling: Doubling;
  result: HandResult | null;
}

export type RuleError =
  | 'wrong_phase'
  | 'not_your_turn'
  | 'illegal_bid'
  | 'illegal_move'
  | 'illegal_card'
  | 'illegal_double';

export type ActionResult = { ok: true; state: HandState } | { ok: false; error: RuleError };

export function dealHand(
  rules: RuleSet,
  dealer: Seat,
  seed: SeedInput,
  carry: HandCarry = NO_CARRY,
): HandState {
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
    auction: {
      stage: 'interest',
      holder: null,
      challenger: null,
      waiting: [],
      level: null,
      forced: false,
      yielded: [],
      failed: [],
    },
    contract: null,
    declarer: null,
    partner: null,
    prelude: null,
    tricks: [],
    currentTrick: { leader: first, cards: [] },
    carry: { pot: carry.pot, factor: carry.factor },
    doubling: { kontra: null, re: null },
    result: null,
  };
}

/** Alle Ansagen, die die Tischregeln grundsätzlich zulassen (ohne Blick auf die Hand). */
export function allContracts(rules: RuleSet): Contract[] {
  const out: Contract[] = [];
  for (const kind of availableKinds(rules)) {
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

/**
 * Spiele, die `seat` mit seinem Blatt spielen dürfte, ab dem Rang `minValue`. Im Muss
 * (`auction.forced`) nur Sauspiele, mit gelockerter Ruf-Bedingung. Spielarten, deren Vorspiel
 * gescheitert ist, nicht mehr.
 */
function playable(state: HandState, seat: Seat, minValue: number): Contract[] {
  const hand = state.hands[seat]!;
  const { forced, failed } = state.auction;
  return allContracts(state.rules).filter((contract) => {
    if (bidValue(contract) < minValue) return false;
    if (forced && contract.kind !== 'sauspiel') return false;
    if (failed.includes(contract.kind)) return false;
    const mode = MODES[contract.kind];
    if (mode.eligible && !mode.eligible(hand)) return false;
    return !mode.suitChoices || mode.suitChoices(hand, { forced }).includes(contract.suit!);
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

/** Züge, die `seat` im Vorspiel jetzt machen darf (leer, wenn nicht am Zug). Passiv zuerst. */
export function legalPreludeMoves(state: HandState, seat: Seat): PreludeMove[] {
  if (state.phase !== 'prelude' || !state.contract) return [];
  return MODES[state.contract.kind].prelude?.legalMoves(state, seat) ?? [];
}

/** Gleicher Zug? Karten beim Zurückgeben ohne Rücksicht auf die Reihenfolge. */
function sameMove(a: PreludeMove, b: PreludeMove): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'give' && b.type === 'give') {
    return [...a.cards].sort().join() === [...b.cards].sort().join();
  }
  return true;
}

/** Karten, die `seat` jetzt spielen darf (leer, wenn nicht an der Reihe). */
export function legalCards(state: HandState, seat: Seat): Card[] {
  if (state.phase !== 'playing' || state.turn !== seat || !state.contract) return [];
  const order = orderFor(state.contract, state.tricks.length);
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
      davonlaufenAb: davonlaufenAb(state.rules.deck),
    },
    candidates,
  );
}

/**
 * Darf `seat` jetzt Kontra bzw. Re sagen? An keinen Zug gebunden, aber nur, solange die erste
 * Karte nicht liegt (REGELN.md, „Kontra und Re“, Annahmen 18, 20–22): Kontra jeder Gegenspieler,
 * Re nach einem Kontra jeder aus der Spielerpartei. Ohne Spielerpartei (Ramsch) kein Kontra.
 */
export function canDouble(state: HandState, seat: Seat): boolean {
  if (!state.rules.kontra || state.phase !== 'playing' || state.declarer === null) return false;
  if (state.tricks.length > 0 || state.currentTrick.cards.length > 0) return false;
  const inParty = seat === state.declarer || seat === state.partner;
  const { kontra, re } = state.doubling;
  if (kontra === null) return !inParty;
  return re === null && inParty;
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

/** Die angesagte Spielart hat ein Vorspiel (Hochzeit): dorthin statt zum Kartenspiel. */
function startPrelude(next: HandState, declarer: Seat, contract: Contract): void {
  const prelude = MODES[contract.kind].prelude!;
  next.contract = contract;
  next.declarer = declarer;
  next.phase = 'prelude';
  next.prelude = prelude.start(next);
  next.turn = prelude.turn(next);
}

function startPlay(next: HandState, declarer: Seat | null, contract: Contract): void {
  const players = next.rules.players;
  next.contract = contract;
  next.declarer = declarer;
  if (MODES[contract.kind].parties === 'calledAce') {
    const sau = card(contract.suit!, 'A');
    next.partner = next.initialHands.findIndex((h) => h.includes(sau));
  }
  const first = (next.dealer + 1) % players;
  next.phase = 'playing';
  next.turn = first;
  next.currentTrick = { leader: first, cards: [] };
}

/** Alle haben „weiter“ gesagt: die Tischregel aus der Registry entscheidet. Ändert `next`. */
function allPassed(next: HandState, rule: AllPassedRule = next.rules.allPassed): void {
  const step = ALL_PASSED[rule](next);
  switch (step.type) {
    case 'finish':
      next.phase = 'finished';
      next.result = step.result;
      return;
    case 'play':
      startPlay(next, null, step.contract);
      return;
    case 'forced':
      next.auction.stage = 'declare';
      next.auction.holder = step.seat;
      next.auction.forced = true;
      next.turn = step.seat;
      return;
    case 'fallback':
      allPassed(next, step.rule);
      return;
  }
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
        allPassed(next);
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
      auction.yielded.push(seat);
      nextDuel(next);
      return { ok: true, state: next };
    case 'declare':
      if (MODES[call.contract.kind].prelude) startPrelude(next, seat, call.contract);
      else startPlay(next, seat, call.contract);
      return { ok: true, state: next };
  }
}

/**
 * Das Vorspiel ist gescheitert (keiner nimmt die Hochzeit an): Der Ansager gilt als „weiter“.
 * Wer vorher in einem Zweikampf aufgegeben hat, rückt nach und trägt es neu aus – ohne
 * Mindest-Spielart, aber ohne die gescheiterte (Annahmen 16, 27). Gibt es niemanden, gilt die
 * Regel für alle „weiter“. Ändert `next`.
 */
function preludeFailed(next: HandState): void {
  const players = next.rules.players;
  const auction = next.auction;
  const failedSeat = next.declarer;
  auction.failed.push(next.contract!.kind);
  next.phase = 'bidding';
  next.contract = null;
  next.declarer = null;
  next.partner = null;
  next.prelude = null;

  const first = (next.dealer + 1) % players;
  const back = Array.from({ length: players }, (_, i) => (first + i) % players).filter(
    (s) => s !== failedSeat && auction.yielded.includes(s) && playable(next, s, 0).length > 0,
  );
  auction.yielded = [];
  auction.level = null;
  auction.challenger = null;
  if (back.length === 0) {
    auction.holder = null;
    auction.waiting = [];
    allPassed(next);
    return;
  }
  auction.holder = back[0]!;
  auction.waiting = back.slice(1);
  nextDuel(next);
}

function applyPrelude(state: HandState, seat: Seat, raw: PreludeMove): ActionResult {
  if (!legalPreludeMoves(state, seat).some((m) => sameMove(m, raw))) {
    return { ok: false, error: 'illegal_move' };
  }
  // Nur die bekannten Felder übernehmen – Züge kommen aus dem Netz.
  const move: PreludeMove =
    raw.type === 'give' ? { type: 'give', cards: [...raw.cards] } : { type: raw.type };
  const definition = MODES[state.contract!.kind].prelude!;
  const step = definition.apply(state, seat, move);
  const next = structuredClone(state);
  switch (step.type) {
    case 'continue':
      next.prelude = step.prelude;
      next.partner = step.prelude.partner;
      if (step.hands) next.hands = step.hands;
      next.turn = definition.turn(next);
      return { ok: true, state: next };
    case 'play':
      next.hands = step.hands;
      next.initialHands = step.hands.map((h) => [...h]);
      next.prelude = null;
      startPlay(next, next.declarer, next.contract!);
      next.partner = step.partner;
      return { ok: true, state: next };
    case 'failed':
      preludeFailed(next);
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
  const order = orderFor(next.contract!, next.tricks.length);
  const winner = (leader + trickWinnerIndex(cards, order)) % players;
  next.tricks.push({ leader, cards, winner, points: sumPoints(cards) });
  next.currentTrick = { leader: winner, cards: [] };
  next.turn = winner;

  if (next.hands.every((h) => h.length === 0)) {
    next.phase = 'finished';
    next.result = scoreHand(next);
  }
  return { ok: true, state: next };
}

function applyDouble(state: HandState, seat: Seat): ActionResult {
  if (!canDouble(state, seat)) return { ok: false, error: 'illegal_double' };
  const next = structuredClone(state);
  if (next.doubling.kontra === null) next.doubling.kontra = seat;
  else next.doubling.re = seat;
  return { ok: true, state: next };
}

export function applyAction(state: HandState, action: Action): ActionResult {
  if (action.type === 'double') {
    if (state.phase !== 'playing') return { ok: false, error: 'wrong_phase' };
    return applyDouble(state, action.seat);
  }
  const expected =
    action.type === 'bid' ? 'bidding' : action.type === 'prelude' ? 'prelude' : 'playing';
  if (state.phase !== expected) return { ok: false, error: 'wrong_phase' };
  if (state.turn !== action.seat) return { ok: false, error: 'not_your_turn' };
  switch (action.type) {
    case 'bid':
      return applyBid(state, action.seat, action.call);
    case 'prelude':
      return applyPrelude(state, action.seat, action.move);
    case 'play':
      return applyPlay(state, action.seat, action.card);
  }
}
