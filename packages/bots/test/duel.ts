import type { Bot, HandView, RuleSet } from '@schafkopf/core';
import { DEFAULT_RULES } from '@schafkopf/core';
import { playHand } from './simulate';

export interface DuelResult {
  /** Schnitt des Prüflings je Spiel in Cent. */
  average: number;
  /**
   * Gepaarter Vorteil je Spiel: Prüfling minus die Referenz auf demselben Platz mit denselben
   * Karten und Mitspielern. Glück mit den Karten fällt so heraus.
   */
  paired: number;
  /** Standardfehler von `paired`. */
  stdError: number;
  /** Spiele, in denen der Prüfling etwas anderes erreicht als die Referenz. */
  differing: number;
  /** Mittlere und längste Rechenzeit des Prüflings je Entscheidung (ms). */
  msPerDecision: number;
  maxMs: number;
}

/**
 * Prüfling gegen drei (zu dritt: zwei) Referenz-Bots, Seeds `1..games`, der Platz des Prüflings
 * wandert jedes Spiel weiter, der Geber alle n Spiele (vor B4 war der Prüfling immer Geber). Jede Verteilung wird ein zweites Mal nur mit Referenz-Bots gespielt.
 * Die Tischregeln bekommen alle Bots bei jedem Zug mit (wie vom Host).
 */
export function duel(
  games: number,
  candidate: (seed: number) => Bot,
  reference: (seed: number) => Bot,
  rules: RuleSet = DEFAULT_RULES,
): DuelResult {
  let sum = 0;
  let diff = 0;
  let sq = 0;
  let differing = 0;
  let time = 0;
  let decisions = 0;
  let maxMs = 0;
  const n = rules.players;
  const seats = Array.from({ length: n }, (_, s) => s);
  for (let i = 0; i < games; i++) {
    const seat = i % n;
    // Geber wandert langsamer als der Prüfling: Nach n² Spielen saß er an jeder Position.
    const dealer = Math.floor(i / n) % n;
    const bot = candidate(1000 + i);
    const timed: Bot = {
      decide(view: HandView, r?: RuleSet) {
        const start = performance.now();
        const action = bot.decide(view, r);
        const ms = performance.now() - start;
        time += ms;
        decisions++;
        maxMs = Math.max(maxMs, ms);
        return action;
      },
    };
    const others = (s: number) => reference(2000 + 4 * i + s);
    const mixed = seats.map((s) => (s === seat ? timed : others(s)));
    const plain = seats.map((s) => others(s));
    const got = playHand(mixed, 1 + i, dealer, rules).result!.payments[seat]!;
    const ref = playHand(plain, 1 + i, dealer, rules).result!.payments[seat]!;
    sum += got;
    diff += got - ref;
    sq += (got - ref) ** 2;
    if (got !== ref) differing++;
  }
  const paired = diff / games;
  const variance = Math.max(0, sq / games - paired ** 2);
  return {
    average: sum / games,
    paired,
    stdError: Math.sqrt(variance / games),
    differing,
    msPerDecision: time / Math.max(1, decisions),
    maxMs,
  };
}

/**
 * Zwei Prüflinge auf demselben Platz, mit denselben Karten und denselben Referenz-Bots: je Spiel
 * einmal mit `a`, einmal mit `b`. `paired` ist der Vorteil von `a` gegenüber `b` je Spiel. Billiger
 * als zwei `duel`s mit teuren Referenzen (B4: Stark mit und ohne Ansage-Tabelle).
 */
export function compare(
  games: number,
  a: (seed: number) => Bot,
  b: (seed: number) => Bot,
  reference: (seed: number) => Bot,
  rules: RuleSet = DEFAULT_RULES,
): Pick<DuelResult, 'paired' | 'stdError' | 'differing'> {
  let diff = 0;
  let sq = 0;
  let differing = 0;
  const n = rules.players;
  const seats = Array.from({ length: n }, (_, s) => s);
  for (let i = 0; i < games; i++) {
    const seat = i % n;
    const dealer = Math.floor(i / n) % n;
    const play = (candidate: Bot) => {
      const bots = seats.map((s) => (s === seat ? candidate : reference(2000 + 4 * i + s)));
      return playHand(bots, 1 + i, dealer, rules).result!.payments[seat]!;
    };
    const d = play(a(1000 + i)) - play(b(1000 + i));
    diff += d;
    sq += d * d;
    if (d !== 0) differing++;
  }
  const paired = diff / games;
  const variance = Math.max(0, sq / games - paired ** 2);
  return { paired, stdError: Math.sqrt(variance / games), differing };
}
