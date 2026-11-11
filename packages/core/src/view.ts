/**
 * Sichten: das, was ein einzelner Spieler sehen darf. Der Host schickt niemals
 * den vollen Zustand über das Netz, sondern nur `TableView`s – fremde Karten
 * verlassen den Host nicht. Oberfläche und Bots arbeiten ausschließlich auf Sichten.
 */

import { type Card, card } from './cards';
import {
  type Auction,
  type Bid,
  type BidCall,
  type CompletedTrick,
  type HandPhase,
  type HandState,
  type Seat,
  type Trick,
  legalCalls,
  legalCards,
} from './hand';
import { type Contract, MODES } from './modes';
import type { RuleSet } from './rules';
import type { HandSummary } from './log';
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
  /** Alle Rufe der Ansage – laut gesagt, also für alle sichtbar. */
  bids: Bid[];
  auction: Auction;
  contract: Contract | null;
  declarer: Seat | null;
  /** Mitspieler im Sauspiel – erst gesetzt, wenn die Rufsau gefallen ist (oder man es selbst ist). */
  partner: Seat | null;
  currentTrick: Trick;
  lastTrick: CompletedTrick | null;
  /**
   * Alle Stiche des Spiels in Reihenfolge (Ausspieler, Karten, Gewinner, Augen) – erst nach
   * Spielende, vorher `null`. Für den Spielverlauf im Ergebnis-Dialog.
   */
  tricks: CompletedTrick[] | null;
  /** Anzahl gewonnener Stiche je Sitz. */
  tricksWon: number[];
  /** Nur gefüllt, wenn man selbst an der Reihe ist. */
  legalCards: Card[];
  legalCalls: BidCall[];
  result: HandResult | null;
}

export interface TableView {
  /** Eigener Sitz; null = Zuschauer. */
  you: Seat | null;
  rules: RuleSet;
  seats: (PlayerInfo | null)[];
  balances: number[];
  /** Stock in Cent. */
  pot: number;
  dealer: Seat;
  handNo: number;
  hand: HandView | null;
  /** Fertige Spiele des Abends, älteste zuerst – ohne Karten. */
  history: HandSummary[];
}

function partnerVisible(state: HandState, viewer: Seat | null): boolean {
  if (state.partner === null || !state.contract) return false;
  if (state.phase === 'finished' || viewer === state.partner) return true;
  const parties = MODES[state.contract.kind].parties;
  if (parties === 'prelude') return true; // aus dem Vorspiel bekannt
  if (parties !== 'calledAce') return false;
  const sau = card(state.contract.suit!, 'A');
  return state.currentTrick.cards.includes(sau) || state.tricks.some((t) => t.cards.includes(sau));
}

/** Zahl der fertigen Stiche – der Index des laufenden Stichs für `orderFor`. */
export function tricksPlayed(view: Pick<HandView, 'tricksWon'>): number {
  return view.tricksWon.reduce((a, b) => a + b, 0);
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
    auction: state.auction,
    contract: state.contract,
    declarer: state.declarer,
    partner: partnerVisible(state, viewer) ? state.partner : null,
    currentTrick: state.currentTrick,
    lastTrick: state.tricks.at(-1) ?? null,
    tricks: state.phase === 'finished' ? state.tricks : null,
    tricksWon: Array.from(
      { length: players },
      (_, seat) => state.tricks.filter((t) => t.winner === seat).length,
    ),
    legalCards: viewer === null ? [] : legalCards(state, viewer),
    legalCalls: viewer === null ? [] : legalCalls(state, viewer),
    result: state.result,
  };
}

export function tableViewFor(table: TableState, viewer: Seat | null): TableView {
  return {
    you: viewer,
    rules: table.rules,
    seats: table.seats,
    balances: table.balances,
    pot: table.pot,
    dealer: table.dealer,
    handNo: table.handNo,
    hand: table.hand ? handViewFor(table.hand, viewer) : null,
    history: table.history,
  };
}
