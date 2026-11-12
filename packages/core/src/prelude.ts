/**
 * Vorspiel-Hook (siehe docs/entwurf-sonderspiele.md, §4): Abläufe zwischen Ansage und erstem
 * Stich. Der Kern kennt nur den Rahmen (Phase `prelude`, Aktion `prelude`); was passiert, steht in
 * der `PreludeDefinition` der Spielart. Umgesetzt ist `weddingPrelude(n)` für die Hochzeit
 * (n = 1, K5) und später die arabische Hochzeit (n = 2, H3).
 */

import type { Card } from './cards';
import type { HandState, Seat } from './hand';
import { orderFor } from './modes';

/** Ein Zug im Vorspiel. */
export type PreludeMove =
  { type: 'accept' } | { type: 'decline' } | { type: 'give'; cards: Card[] };

/** Öffentlicher Eintrag im Verlauf des Vorspiels – ohne Karten. */
export interface PreludeLogEntry {
  seat: Seat;
  move: PreludeMove['type'];
}

/** Zustand des Vorspiels; reine Daten, liegt in `HandState.prelude` und ist öffentlich. */
export interface PreludeState {
  /** `offer`: reihum annehmen oder ablehnen; `exchange`: der Partner gibt Karten zurück. */
  step: 'offer' | 'exchange';
  /** Wer noch gefragt wird, in Reihenfolge (nur im Schritt `offer`). */
  asking: Seat[];
  partner: Seat | null;
  log: PreludeLogEntry[];
}

export type PreludeStep =
  /** Weiter im Vorspiel; `hands` nur, wenn sich Karten bewegt haben. */
  | { type: 'continue'; prelude: PreludeState; hands?: Card[][] }
  /** Das Spiel beginnt mit diesem Partner und diesen Händen. */
  | { type: 'play'; partner: Seat | null; hands: Card[][] }
  /** Das Spiel kommt nicht zustande; der Ansager gilt als „weiter“. */
  | { type: 'failed' };

export interface PreludeDefinition {
  start(state: HandState): PreludeState;
  /** Wer im Vorspiel am Zug ist. */
  turn(state: HandState): Seat;
  /** Erlaubte Züge für `seat` (leer, wenn nicht am Zug). Der passive Zug steht vorn. */
  legalMoves(state: HandState, seat: Seat): PreludeMove[];
  /** Führt einen erlaubten Zug aus. Verändert `state` nicht. */
  apply(state: HandState, seat: Seat, move: PreludeMove): PreludeStep;
}

/** Alle Teilmengen der Größe `k`, in der Reihenfolge der Eingabe. */
function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  items.forEach((item, i) => {
    for (const rest of combinations(items.slice(i + 1), k - 1)) out.push([item, ...rest]);
  });
  return out;
}

/**
 * Hochzeit mit `n` Trümpfen (REGELN.md, „Hochzeit“, Annahmen 15, 16, 26):
 *  1. `offer`: reihum ab links vom Hochzeiter „nehme an“ oder „nein“; der Erste, der annimmt,
 *     wird Partner und bekommt sofort die `n` Trümpfe des Hochzeiters auf die Hand.
 *  2. `exchange`: Der Partner gibt `n` Karten zurück – Nicht-Trümpfe, soweit er welche hat.
 *  3. Danach beginnt das Spiel mit den getauschten Händen. Lehnen alle ab: `failed`.
 */
export function weddingPrelude(n: number): PreludeDefinition {
  const trumpsOf = (state: HandState): readonly Card[] => orderFor(state.contract!, 0).trumps;

  function turn(state: HandState): Seat {
    const prelude = state.prelude!;
    return prelude.step === 'offer' ? prelude.asking[0]! : prelude.partner!;
  }

  return {
    start(state) {
      const players = state.rules.players;
      const declarer = state.declarer!;
      return {
        step: 'offer',
        asking: Array.from({ length: players - 1 }, (_, i) => (declarer + 1 + i) % players),
        partner: null,
        log: [],
      };
    },

    turn,

    legalMoves(state, seat) {
      if (state.phase !== 'prelude' || !state.prelude || turn(state) !== seat) return [];
      if (state.prelude.step === 'offer') return [{ type: 'decline' }, { type: 'accept' }];
      const trumps = trumpsOf(state);
      const hand = state.hands[seat]!;
      const plain = hand.filter((c) => !trumps.includes(c)).length;
      const need = Math.min(n, plain);
      return combinations(hand, n)
        .filter((cards) => cards.filter((c) => !trumps.includes(c)).length === need)
        .map((cards) => ({ type: 'give', cards }));
    },

    apply(state, seat, move) {
      const prelude = state.prelude!;
      const declarer = state.declarer!;
      const log = [...prelude.log, { seat, move: move.type }];
      switch (move.type) {
        case 'decline': {
          const asking = prelude.asking.slice(1);
          if (asking.length === 0) return { type: 'failed' };
          return { type: 'continue', prelude: { ...prelude, asking, log } };
        }
        case 'accept': {
          const trumps = trumpsOf(state);
          const given = state.hands[declarer]!.filter((c) => trumps.includes(c));
          const hands = state.hands.map((h) => [...h]);
          hands[declarer] = hands[declarer]!.filter((c) => !given.includes(c));
          hands[seat] = [...hands[seat]!, ...given];
          return {
            type: 'continue',
            prelude: { step: 'exchange', asking: [], partner: seat, log },
            hands,
          };
        }
        case 'give': {
          const hands = state.hands.map((h) => [...h]);
          hands[seat] = hands[seat]!.filter((c) => !move.cards.includes(c));
          hands[declarer] = [...hands[declarer]!, ...move.cards];
          return { type: 'play', partner: seat, hands };
        }
      }
    },
  };
}
