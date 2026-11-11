import {
  type Card,
  type Contract,
  type Seat,
  type TableView,
  SUITS,
  orderFor,
  rankOf,
  suitOf,
} from '@schafkopf/core';
import { TABLE_TEXT } from '../../i18n/de';

/** Position am Bildschirm relativ zum eigenen Platz; gespielt wird im Uhrzeigersinn. */
export const POSITIONS = ['bottom', 'left', 'top', 'right'] as const;
export type Position = (typeof POSITIONS)[number];

/** Hilfsfunktionen rund um die Sitze, aus Sicht des eigenen Platzes. */
export interface SeatInfo {
  /** Eigener Sitz; Zuschauer sehen den Tisch aus Sicht von Platz 1. */
  me: Seat;
  players: number;
  position(seat: Seat): Position;
  nameOf(seat: Seat): string;
}

export function seatInfo(view: TableView): SeatInfo {
  const players = view.seats.length;
  const me = view.you ?? 0;
  return {
    me,
    players,
    position: (seat) => POSITIONS[(seat - me + players) % players]!,
    nameOf: (seat) => view.seats[seat]?.name ?? TABLE_TEXT.seatFallback(seat),
  };
}

/**
 * Sortiert die Hand: Trümpfe zuerst (hoch → niedrig), dann die Farben. `trick` ist der Index
 * des laufenden Stichs – die Trümpfe können mit ihm wechseln.
 */
export function sortHand(hand: readonly Card[], contract: Contract | null, trick: number): Card[] {
  const order = orderFor(contract ?? { kind: 'sauspiel', suit: 'eichel' }, trick);
  const key = (c: Card) => {
    const trump = order.trumps.indexOf(c);
    if (trump >= 0) return trump;
    return 100 + SUITS.indexOf(suitOf(c)) * 10 + order.rankOrder.indexOf(rankOf(c));
  };
  return [...hand].sort((a, b) => key(a) - key(b));
}
