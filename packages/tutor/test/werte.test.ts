import { afterEach, describe, expect, it } from 'vitest';
import {
  REGELWERTE,
  type RuleId,
  advise,
  currentAsk,
  optionKey,
  ruleHits,
  ruleValue,
} from '../src';
import { FAELLE, inputOf } from './faelle';

/** Lagen, in denen mindestens zwei Faustregeln greifen. */
const mehrfach = () => (gefunden ??= suche());
let gefunden: ReturnType<typeof suche> | null = null;
function suche() {
  return FAELLE.flatMap((fall) => {
    const input = inputOf(fall);
    const ask = fall.ask ?? currentAsk(input)!;
    const hits = ruleHits(input, ask);
    return hits.length >= 2 ? [{ fall, input, ask, ids: hits.map((h) => h.id) }] : [];
  });
}

const gesichert = { ...REGELWERTE };
afterEach(() => {
  for (const id of Object.keys(REGELWERTE)) delete REGELWERTE[id as RuleId];
  Object.assign(REGELWERTE, gesichert);
});

const messung = (cents: number, fehler = 1) => ({ cents, fehler, lagen: 100, haeufigkeit: 1 });

describe('Faustregeln nach gemessenem Wert (T4)', { timeout: 60_000 }, () => {
  it('es gibt Lagen, in denen mehrere Regeln greifen', () => {
    expect(mehrfach().length).toBeGreaterThan(0);
  });

  it('nennt bei mehreren greifenden Regeln die mit dem höheren Wert zuerst', () => {
    for (const { input, ask, ids } of mehrfach()) {
      const [a, b] = ids as [RuleId, RuleId];
      for (const id of ids) delete REGELWERTE[id];
      REGELWERTE[a] = messung(5);
      REGELWERTE[b] = messung(40);
      const hits = ruleHits(input, ask);
      expect(hits[0]!.id, `${a} / ${b}`).toBe(b);
      REGELWERTE[a] = messung(40);
      REGELWERTE[b] = messung(5);
      expect(ruleHits(input, ask)[0]!.id).toBe(a);
    }
  });

  it('ordnet die Gründe der Empfehlung nach Wert', () => {
    // Zwei Regeln, die für dieselbe Empfehlung sprechen: die wertvollere steht in `reasons` vorn.
    let geprueft = 0;
    for (const { input, ask, ids } of mehrfach().slice(0, 6)) {
      const [a, b] = ids as [RuleId, RuleId];
      for (const id of ids) delete REGELWERTE[id];
      REGELWERTE[a] = messung(5);
      REGELWERTE[b] = messung(40);
      const advice = advise(input, ask)!;
      const ids2 = advice.reasons.map((r) => r.id);
      if (ids2.includes(a) && ids2.includes(b)) {
        expect(ids2.indexOf(b)).toBeLessThan(ids2.indexOf(a));
        geprueft++;
      }
    }
    expect(geprueft).toBeGreaterThan(0);
  });

  it('gibt den Wert an die Regel, aber nur wenn er sicher positiv gemessen ist', () => {
    const { input, ask, ids } = mehrfach()[0]!;
    const [a, b] = ids as [RuleId, RuleId];
    REGELWERTE[a] = messung(8, 1);
    REGELWERTE[b] = messung(1, 5); // im Rauschen
    const hits = ruleHits(input, ask);
    expect(hits.find((h) => h.id === a)!.wert?.cents).toBe(8);
    expect(hits.find((h) => h.id === b)!.wert).toBeUndefined();
    expect(ruleValue(b)).toBeNull();
  });

  it('lässt Regeln ohne Messung in ihrer Reihenfolge', () => {
    for (const { input, ask, ids } of mehrfach()) {
      for (const id of ids) delete REGELWERTE[id];
      expect(ruleHits(input, ask).map((h) => h.id)).toEqual(ids);
    }
  });

  it('ändert die Empfehlung nicht', () => {
    const { input, ask } = mehrfach()[0]!;
    const vorher = advise(input, ask)!;
    for (const h of ruleHits(input, ask)) REGELWERTE[h.id] = messung(10);
    expect(optionKey(advise(input, ask)!.recommended)).toBe(optionKey(vorher.recommended));
  });
});
