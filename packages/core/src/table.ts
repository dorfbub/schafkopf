/**
 * Der Tisch: Sitzplätze, Kontostände und die Folge der Spiele.
 * Wie `hand.ts` rein funktional; der Host (packages/net) hält den Zustand.
 */

import {
  type Action,
  type HandCarry,
  type HandState,
  type RuleError,
  type Seat,
  applyAction,
  dealHand,
} from './hand';
import { type HandLog, type HandSummary, newHandLog, summarize } from './log';
import type { SeedInput } from './rng';
import { DEFAULT_RULES, type RuleSet } from './rules';
import type { HandResult } from './scoring';

export interface PlayerInfo {
  name: string;
  kind: 'human' | 'bot';
  connected: boolean;
}

export interface TableState {
  rules: RuleSet;
  seats: (PlayerInfo | null)[];
  /** Kontostand je Sitz in Cent. Immer gilt: Summe(balances) + pot = 0. */
  balances: number[];
  /** Stock in Cent (noch nie gefüllt, solange es die Regel nicht gibt). */
  pot: number;
  dealer: Seat;
  /** Laufende Nummer des Spiels, beginnend bei 1. 0 = noch in der Lobby. */
  handNo: number;
  hand: HandState | null;
  /** Protokolle der letzten Spiele; das letzte gehört zu `hand`. Enthält alle Karten – nur beim Host. */
  logs: HandLog[];
  /** Zusammenfassungen der fertigen Spiele (alle des Abends), älteste zuerst. */
  history: HandSummary[];
}

/** So viele Protokolle behält der Tisch (die ältesten fallen heraus); Zusammenfassungen bleiben. */
export const MAX_LOGS = 100;

export type TableResult =
  | { ok: true; table: TableState }
  | { ok: false; error: RuleError | 'no_hand' | 'seats_open' | 'hand_running' };

export function createTable(rules: RuleSet = DEFAULT_RULES): TableState {
  return {
    rules,
    seats: Array.from({ length: rules.players }, () => null),
    balances: Array.from({ length: rules.players }, () => 0),
    pot: 0,
    dealer: 0,
    handNo: 0,
    hand: null,
    logs: [],
    history: [],
  };
}

/** Startet das erste bzw. nächste Spiel. Der Geber wandert reihum weiter. */
export function startHand(table: TableState, seed: SeedInput): TableResult {
  if (table.seats.some((s) => s === null)) return { ok: false, error: 'seats_open' };
  if (table.hand && table.hand.phase !== 'finished') return { ok: false, error: 'hand_running' };
  const dealer = table.hand ? (table.dealer + 1) % table.rules.players : table.dealer;
  const carry = carryFor(table);
  const handNo = table.handNo + 1;
  return {
    ok: true,
    table: {
      ...table,
      dealer,
      handNo,
      hand: dealHand(table.rules, dealer, seed, carry),
      logs: [...table.logs, newHandLog(handNo, table.rules, dealer, seed, carry)].slice(-MAX_LOGS),
    },
  };
}

/** Was der Tisch dem nächsten Spiel mitgibt. Bockrunden (K4) kämen hier als Faktor hinzu. */
function carryFor(table: TableState): HandCarry {
  return { pot: table.pot, factor: 1 };
}

/** Einzige Stelle, an der ein Ergebnis auf den Tisch wirkt. */
function settle(table: TableState, result: HandResult): TableState {
  return {
    ...table,
    balances: table.balances.map((b, seat) => b + result.payments[seat]!),
    pot: table.pot + result.potDelta,
  };
}

export function applyTableAction(table: TableState, action: Action): TableResult {
  if (!table.hand) return { ok: false, error: 'no_hand' };
  const result = applyAction(table.hand, action);
  if (!result.ok) return result;
  const hand = result.state;
  const last = table.logs.at(-1);
  if (!last) return { ok: false, error: 'no_hand' };
  // Gespeichert wird die bereinigte Aktion (Rufe kommen aus dem Netz und können Überzähliges tragen).
  const logged: Action =
    action.type === 'bid'
      ? { type: 'bid', seat: action.seat, call: hand.bids.at(-1)!.call }
      : action.type === 'play'
        ? { type: 'play', seat: action.seat, card: action.card }
        : { type: 'double', seat: action.seat };
  const log: HandLog = { ...last, actions: [...last.actions, logged] };
  const summary = summarize(log, hand);
  const next: TableState = {
    ...table,
    hand,
    logs: [...table.logs.slice(0, -1), log],
    history: summary ? [...table.history, summary] : table.history,
  };
  return { ok: true, table: hand.result ? settle(next, hand.result) : next };
}
