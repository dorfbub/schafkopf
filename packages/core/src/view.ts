/**
 * Sichten: das, was ein einzelner Spieler sehen darf. Der Host schickt niemals
 * den vollen Zustand über das Netz, sondern nur `TableView`s – fremde Karten
 * verlassen den Host nicht. Oberfläche und Bots arbeiten ausschließlich auf Sichten.
 */

import { type Card, card } from './cards';
import {
  type Bid,
  type CompletedTrick,
  type HandPhase,
  type HandState,
  type Seat,
  type Trick,
  legalCards,
  legalContracts,
} from './hand';
import { type Contract, MODES } from './modes';
import type { RuleSet } from './rules';
import type { HandResult } from './scoring';
import type { PlayerInfo, TableState } from './table';

export interface HandView {
  phase: HandPhase;
  dealer: Seat;
  turn: Seat;
  /** Eigene Karten (leer für Zuschauer). */
  hand: Card[];
  /** Anzahl Karten je Sitz. */
  handSizes: number[];
  bids: Bid[];
  contract: Contract | null;
  declarer: Seat | null;
  /** Mitspieler im Sauspiel – erst gesetzt, wenn die Rufsau gefallen ist (oder man es selbst ist). */
  partner: Seat | null;
  currentTrick: Trick;
  lastTrick: CompletedTrick | null;
  /** Anzahl gewonnener Stiche je Sitz. */
  tricksWon: number[];
  /** Nur gefüllt, wenn man selbst an der Reihe ist. */
  legalCards: Card[];
  legalContracts: Contract[];
  result: HandResult | null;
}

export interface TableView {
  /** Eigener Sitz; null = Zuschauer. */
  you: Seat | null;
  rules: RuleSet;
  seats: (PlayerInfo | null)[];
  balances: number[];
  dealer: Seat;
  handNo: number;
  hand: HandView | null;
}

function partnerVisible(state: HandState, viewer: Seat | null): boolean {
  if (state.partner === null || !state.contract) return false;
  if (state.phase === 'finished' || viewer === state.partner) return true;
  if (MODES[state.contract.kind].suitRole !== 'called') return false;
  const sau = card(state.contract.suit!, 'A');
  return state.currentTrick.cards.includes(sau) || state.tricks.some((t) => t.cards.includes(sau));
}

export function handViewFor(state: HandState, viewer: Seat | null): HandView {
  const players = state.rules.players;
  return {
    phase: state.phase,
    dealer: state.dealer,
    turn: state.turn,
    hand: viewer === null ? [] : [...state.hands[viewer]!],
    handSizes: state.hands.map((h) => h.length),
    bids: state.bids,
    contract: state.contract,
    declarer: state.declarer,
    partner: partnerVisible(state, viewer) ? state.partner : null,
    currentTrick: state.currentTrick,
    lastTrick: state.tricks.at(-1) ?? null,
    tricksWon: Array.from(
      { length: players },
      (_, seat) => state.tricks.filter((t) => t.winner === seat).length,
    ),
    legalCards: viewer === null ? [] : legalCards(state, viewer),
    legalContracts: viewer === null ? [] : legalContracts(state, viewer),
    result: state.result,
  };
}

export function tableViewFor(table: TableState, viewer: Seat | null): TableView {
  return {
    you: viewer,
    rules: table.rules,
    seats: table.seats,
    balances: table.balances,
    dealer: table.dealer,
    handNo: table.handNo,
    hand: table.hand ? handViewFor(table.hand, viewer) : null,
  };
}
