import { describe, expect, it } from 'vitest';
import { type Card, type HandState, type Seat, handViewFor } from '@schafkopf/core';
import { advise, importance, questionsFor, review } from '../src';
import { FAELLE } from './faelle';
import { input } from './lagen';

/**
 * Tauscht verdeckte Karten zweier anderer Sitze (gleich viele, noch nicht gespielt). Die Sicht
 * von `viewer` bleibt dieselbe – nur das, was er nicht sehen kann, ändert sich.
 */
function swapHidden(state: HandState, a: Seat, b: Seat): HandState {
  const n = Math.min(state.hands[a]!.length, state.hands[b]!.length);
  const k = Math.max(1, Math.floor(n / 2));
  const hands = state.hands.map((h) => [...h]);
  const fromA = hands[a]!.splice(0, k);
  const fromB = hands[b]!.splice(0, k);
  hands[a]!.push(...fromB);
  hands[b]!.push(...fromA);
  const playedBy = (s: Seat): Card[] =>
    [...state.tricks, state.currentTrick].flatMap((t) =>
      t.cards.filter((_, i) => (t.leader + i) % state.rules.players === s),
    );
  const initialHands = hands.map((h, s) => [...h, ...playedBy(s)]);
  return { ...state, hands, initialHands };
}

describe('Der Tutor nutzt nichts Verdecktes', () => {
  // Lagen aus allen Bereichen: Ansage, Kontra, Kartenspiel als Spieler und als Gegenspieler.
  const ids = [
    'ansage.sauspiel.grundblatt',
    'kontra.gegen.partnerspiel',
    'spieler.trumpf.ziehen',
    'gegner.rufsau.suchen',
    'karte.schmieren',
    'ramsch.durchmarsch.verhindern',
  ];
  for (const id of ids) {
    it(`gleiche Sicht, andere verdeckte Karten → gleiche Antwort (${id})`, () => {
      const fall = FAELLE.find((f) => f.rule === id)!;
      const { state, seat } = fall.lage();
      const others = [0, 1, 2, 3].filter((s) => s !== seat);
      const swapped = swapHidden(state, others[0]!, others[1]!);
      expect(swapped.hands).not.toEqual(state.hands);
      expect(handViewFor(swapped, seat)).toEqual(handViewFor(state, seat));
      const a = input(state, seat);
      const b = input(swapped, seat);
      expect(advise(b, fall.ask)).toEqual(advise(a, fall.ask));
      expect(importance(b, fall.ask)).toEqual(importance(a, fall.ask));
      expect(questionsFor(b)).toEqual(questionsFor(a));
      const move = advise(a, fall.ask)!.options.at(-1)!.option;
      expect(review(b, move)).toEqual(review(a, move));
    });
  }
});
