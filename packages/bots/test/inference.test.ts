import { describe, expect, it } from 'vitest';
import {
  type Card,
  type HandState,
  DEFAULT_RULES,
  applyAction,
  createRng,
  dealHand,
  handViewFor,
  shuffle,
} from '@schafkopf/core';
import { createHeuristicBot, createInference } from '../src';

/**
 * Gewichtete Verteilungen (B5): Die Gewichtsfunktion bevorzugt Verteilungen, die zu Ansage und
 * Kartenspiel der anderen passen – weich, nie mit Gewicht null.
 */

/** Spielt mit Heuristik-Bots, bis `stop` zutrifft; gibt den Zustand zurück (oder null). */
function playUntil(seed: number, stop: (s: HandState) => boolean): HandState | null {
  const bots = [0, 1, 2, 3].map((s) => createHeuristicBot(100 * seed + s));
  let state = dealHand(DEFAULT_RULES, seed % 4, seed);
  for (let step = 0; step < 200; step++) {
    if (state.phase === 'finished') return null;
    if (stop(state)) return state;
    const action = bots[state.turn]!.decide(handViewFor(state, state.turn), DEFAULT_RULES);
    const r = applyAction(state, { ...action, seat: state.turn });
    if (!r.ok) throw new Error(r.error);
    state = r.state;
  }
  return null;
}

/** Eingabe der Gewichtung aus Sicht von `me` (fertige Stiche, gespielte Karten je Sitz). */
function inputFor(state: HandState, me: number) {
  const view = handViewFor(state, me);
  const playedBy: Card[][] = state.hands.map(() => []);
  for (const t of [...state.tricks, state.currentTrick]) {
    t.cards.forEach((c, i) => playedBy[(t.leader + i) % state.hands.length]!.push(c));
  }
  return { view, me, rules: DEFAULT_RULES, tricks: state.tricks, playedBy };
}

/** Eine zufällige Verteilung der Karten der anderen, passend zu den Kartenzahlen. */
function randomHands(state: HandState, me: number, seed: number): Card[][] {
  const rest = shuffle(
    state.hands.flatMap((h, s) => (s === me ? [] : h)),
    createRng(seed),
  );
  return state.hands.map((h, s) => (s === me ? [...h] : rest.splice(0, h.length)));
}

describe('Gewichtete Verteilungen', () => {
  it('Ansage: Wer „weiter“ sagt, hat eher kein Spiel, der Ansager eher seines', () => {
    let checked = 0;
    for (let seed = 1; seed < 200 && checked < 20; seed++) {
      // Vor der ersten Karte eines Einzelspiels: nur die Ansage verrät etwas.
      const state = playUntil(
        seed,
        (s) => s.phase === 'playing' && s.currentTrick.cards.length === 0 && s.tricks.length === 0,
      );
      if (!state || state.contract?.kind !== 'solo' || state.declarer === null) continue;
      const declarer = state.declarer;
      const passer = state.bids.find((b) => b.call.type === 'pass' && b.seat !== declarer)?.seat;
      if (passer === undefined) continue;
      const me = [0, 1, 2, 3].find((s) => s !== declarer && s !== passer)!;
      const infer = createInference(inputFor(state, me), createRng(1))!;
      // Wahre Verteilung gegen dieselbe mit getauschten Blättern von Ansager und „weiter“-Sager.
      const swapped = state.hands.map((h) => [...h]);
      swapped[declarer] = [...state.hands[passer]!];
      swapped[passer] = [...state.hands[declarer]!];
      const wTrue = infer(state.hands, -Infinity);
      const wSwapped = infer(swapped, -Infinity);
      expect(wTrue - wSwapped).toBeGreaterThan(Math.log(10));
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('Kartenspiel: Die wahre Verteilung passt besser als zufällige', () => {
    let checked = 0;
    let better = 0;
    for (let seed = 1; seed < 100 && checked < 30; seed++) {
      const state = playUntil(seed, (s) => s.phase === 'playing' && s.tricks.length === 4);
      if (!state) continue;
      const me = state.turn;
      const infer = createInference(inputFor(state, me), createRng(2))!;
      const wTrue = infer(state.hands, -Infinity);
      const others = Array.from({ length: 20 }, (_, i) =>
        infer(randomHands(state, me, i), -Infinity),
      );
      const mean = others.reduce((a, b) => a + b, 0) / others.length;
      if (wTrue > mean) better++;
      // Weich: nie ganz ausgeschlossen.
      for (const w of others) expect(Number.isFinite(w)).toBe(true);
      checked++;
    }
    expect(checked).toBe(30);
    expect(better).toBeGreaterThan(25);
  });

  it('bricht unter der Schwelle ab, liefert dann einen Wert darunter', () => {
    const state = playUntil(3, (s) => s.phase === 'playing' && s.tricks.length === 5)!;
    const me = state.turn;
    const infer = createInference(inputFor(state, me), createRng(3))!;
    for (let i = 0; i < 20; i++) {
      const hands = randomHands(state, me, 100 + i);
      const full = infer(hands, -Infinity);
      const cut = infer(hands, full + 1);
      expect(cut).toBeLessThan(full + 1);
      expect(cut).toBeGreaterThanOrEqual(full);
    }
  });
});
