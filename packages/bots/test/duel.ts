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
 * Prüfling gegen drei Referenz-Bots, Seeds `1..games`, der Platz des Prüflings wandert jedes
 * Spiel weiter. Jede Verteilung wird ein zweites Mal nur mit Referenz-Bots gespielt.
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
  for (let i = 0; i < games; i++) {
    const seat = i % 4;
    const bot = candidate(1000 + i);
    const timed: Bot = {
      decide(view: HandView) {
        const start = performance.now();
        const action = bot.decide(view);
        const ms = performance.now() - start;
        time += ms;
        decisions++;
        maxMs = Math.max(maxMs, ms);
        return action;
      },
    };
    const others = (s: number) => reference(2000 + 4 * i + s);
    const mixed = [0, 1, 2, 3].map((s) => (s === seat ? timed : others(s)));
    const plain = [0, 1, 2, 3].map((s) => others(s));
    const got = playHand(mixed, 1 + i, i % 4, rules).result!.payments[seat]!;
    const ref = playHand(plain, 1 + i, i % 4, rules).result!.payments[seat]!;
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
