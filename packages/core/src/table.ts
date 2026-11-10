/**
 * Der Tisch: Sitzplätze, Kontostände und die Folge der Spiele.
 * Wie `hand.ts` rein funktional; der Host (packages/net) hält den Zustand.
 */

import {
  type Action,
  type HandState,
  type RuleError,
  type Seat,
  applyAction,
  dealHand,
} from './hand';
import { DEFAULT_RULES, type RuleSet } from './rules';

export interface PlayerInfo {
  name: string;
  kind: 'human' | 'bot';
  connected: boolean;
}

export interface TableState {
  rules: RuleSet;
  seats: (PlayerInfo | null)[];
  /** Kontostand je Sitz in Cent; Summe ist immer 0. */
  balances: number[];
  dealer: Seat;
  /** Laufende Nummer des Spiels, beginnend bei 1. 0 = noch in der Lobby. */
  handNo: number;
  hand: HandState | null;
}

export type TableResult =
  | { ok: true; table: TableState }
  | { ok: false; error: RuleError | 'no_hand' | 'seats_open' | 'hand_running' };

export function createTable(rules: RuleSet = DEFAULT_RULES): TableState {
  return {
    rules,
    seats: Array.from({ length: rules.players }, () => null),
    balances: Array.from({ length: rules.players }, () => 0),
    dealer: 0,
    handNo: 0,
    hand: null,
  };
}

/** Startet das erste bzw. nächste Spiel. Der Geber wandert reihum weiter. */
export function startHand(table: TableState, seed: number): TableResult {
  if (table.seats.some((s) => s === null)) return { ok: false, error: 'seats_open' };
  if (table.hand && table.hand.phase !== 'finished') return { ok: false, error: 'hand_running' };
  const dealer = table.hand ? (table.dealer + 1) % table.rules.players : table.dealer;
  return {
    ok: true,
    table: {
      ...table,
      dealer,
      handNo: table.handNo + 1,
      hand: dealHand(table.rules, dealer, seed),
    },
  };
}

export function applyTableAction(table: TableState, action: Action): TableResult {
  if (!table.hand) return { ok: false, error: 'no_hand' };
  const result = applyAction(table.hand, action);
  if (!result.ok) return result;
  const hand = result.state;
  const balances = hand.result
    ? table.balances.map((b, seat) => b + hand.result!.payments[seat]!)
    : table.balances;
  return { ok: true, table: { ...table, hand, balances } };
}
