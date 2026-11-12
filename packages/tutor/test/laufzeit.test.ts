import { describe, expect, it } from 'vitest';
import { advise, importance, review } from '../src';
import { FAELLE, inputOf } from './faelle';

/**
 * Entscheidungszeit unter 300 ms (Abnahme T1) – gemessen über alle Lagen, also Ansage mit vielen
 * Spielen, Kontra und Kartenwahl mit acht erlaubten Karten im ersten Stich.
 */
describe('Laufzeit', () => {
  it('beantwortet jede Frage unter 300 ms', () => {
    advise(inputOf(FAELLE[1]!)); // Aufwärmen (JIT)
    const times: number[] = [];
    for (const fall of FAELLE) {
      const tutorInput = inputOf(fall);
      const start = performance.now();
      const advice = advise(tutorInput, fall.ask);
      times.push(performance.now() - start);
      expect(advice).not.toBeNull();
    }
    expect(Math.max(...times)).toBeLessThan(300);
  }, 30_000);

  it('rechnet für Rückblick und Wichtigkeit nicht länger', () => {
    const fall = FAELLE.find((f) => f.rule === 'karte.schmieren')!;
    const tutorInput = inputOf(fall);
    const start = performance.now();
    importance(tutorInput);
    review(tutorInput, { type: 'card', card: 'E7' });
    expect((performance.now() - start) / 2).toBeLessThan(300);
  });
});
