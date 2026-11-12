import { describe, expect, it } from 'vitest';
import { advise, currentAsk, importance, optionKey, questionsFor, review } from '../src';
import { FAELLE, inputOf } from './faelle';

const fall = (rule: string) => inputOf(FAELLE.find((f) => f.rule === rule)!);

describe('Rückblick: Bewertung hinterher', () => {
  it('nennt den empfohlenen Zug „gut“ und spricht ihn nicht an', () => {
    const tutorInput = fall('spieler.solo.von.oben');
    const r = review(tutorInput, { type: 'card', card: 'EO' })!;
    expect(r.verdict).toBe('gut');
    expect(r.lossCents).toBe(0);
    expect(r.mention).toBe(false);
  });

  it('meldet einen teuren Fehler mit Verlust und Faustregel', () => {
    // Solo statt sicherem Solo Tout: kostet die Hälfte des Spielwerts.
    const tutorInput = fall('ansage.tout.nur.sicher');
    const move = {
      type: 'bid',
      call: { type: 'declare', contract: { kind: 'solo', suit: 'herz' } },
    } as const;
    const r = review(tutorInput, move)!;
    expect(r.verdict).toBe('fehler');
    expect(r.mention).toBe(true);
    expect(r.lossCents).toBeGreaterThan(100);
    expect(r.rule?.id).toBe('ansage.tout.nur.sicher');
    expect(optionKey(r.best)).toBe('bid:declare:solo:herz::tout');
  });

  it('nennt kleine Unterschiede im Rauschen der Stichprobe nicht „Fehler“', () => {
    // Im Ramsch die Neun statt der Zehn unter die Sau: kaum ein Unterschied.
    const r = review(fall('ramsch.hoch.drunter'), { type: 'card', card: 'G9' })!;
    expect(r.verdict).not.toBe('fehler');
    expect(r.mention).toBe(false);
  });

  it('nennt die Faustregel, der ein schlechter Zug gefolgt ist', () => {
    const r = review(fall('ansage.tout.nur.sicher'), {
      type: 'bid',
      call: { type: 'declare', contract: { kind: 'solo', suit: 'herz' } },
    })!;
    expect(r.misleading?.id).toBe('ansage.solo.trumpflaenge');
  });

  it('gibt `null` für einen Zug, der nicht zur Wahl stand', () => {
    expect(review(fall('spieler.solo.von.oben'), { type: 'card', card: 'S7' })).toBeNull();
  });
});

describe('Wichtigkeit für den Automatikmodus', () => {
  it('meldet sich, wenn ein naheliegender Fehlgriff viel kostet', () => {
    const imp = importance(fall('ansage.tout.nur.sicher'));
    expect(imp.level).toBe('hoch');
    expect(imp.auto).toBe(true);
  });

  it('bleibt still bei klaren oder gleichwertigen Entscheidungen', () => {
    expect(importance(fall('ansage.zu.schwach')).auto).toBe(false);
    expect(importance(fall('ramsch.hoch.drunter')).auto).toBe(false);
  });

  it('ist niedrig, wenn nichts zu entscheiden ist', () => {
    const tutorInput = fall('spieler.solo.von.oben');
    const notMine = { ...tutorInput, seat: 1 };
    expect(importance(notMine, 'card')).toEqual({ stakeCents: 0, level: 'niedrig', auto: false });
  });
});

describe('Advice', () => {
  it('bewertet alle Möglichkeiten, die beste zuerst', () => {
    const a = advise(fall('spieler.trumpf.ziehen'))!;
    expect(a.ask).toBe('card');
    expect(a.basis).toBe('suche');
    expect(a.options).toHaveLength(8);
    const cents = a.options.map((o) => o.cents!);
    expect([...cents].sort((x, y) => y - x)).toEqual(cents);
  });

  it('spricht nur für den eigenen Sitz und nur, wenn man am Zug ist', () => {
    const tutorInput = fall('spieler.trumpf.ziehen');
    expect(advise({ ...tutorInput, seat: 2 }, 'card')).toBeNull();
    expect(advise(tutorInput, 'bid')).toBeNull();
    expect(advise(tutorInput, 'double')).toBeNull(); // Kontra ist am Tisch aus
  });

  it('kommt ohne vollständige Stiche mit Faustregeln aus', () => {
    const tutorInput = fall('ramsch.durchmarsch.verhindern');
    const a = advise({ ...tutorInput, history: [] })!;
    expect(a.basis).toBe('faustregel');
    expect(a.options.every((o) => o.cents === null)).toBe(true);
    expect(optionKey(a.recommended)).toBe('card:SA');
    expect(a.reasons[0]?.id).toBe('ramsch.durchmarsch.verhindern');
  });

  it('nennt Faustregeln, die hier nicht passen, als Ausnahme', () => {
    const a = advise(fall('ansage.tout.nur.sicher'))!;
    expect(a.overruled.map((h) => h.id)).toContain('ansage.solo.trumpflaenge');
  });

  it('gibt bei gleichem Seed dieselbe Antwort', () => {
    const tutorInput = fall('karte.schmieren');
    expect(advise(tutorInput, 'card', { seed: 7 })).toEqual(
      advise(tutorInput, 'card', { seed: 7 }),
    );
  });
});

describe('Auswahlfragen', () => {
  it('bietet vor der Ansage „Soll ich spielen?“ und „Welches Spiel?“', () => {
    expect(questionsFor(fall('ansage.sauspiel.grundblatt')).map((q) => q.id)).toEqual([
      'frage.ansage.spielen',
      'frage.ansage.welches.spiel',
    ]);
  });

  it('fragt im Zweikampf nach dem höheren Spiel, mit Gegner und Spielart', () => {
    expect(questionsFor(fall('zweikampf.eigener.wert'))).toEqual([
      { id: 'frage.ansage.zweikampf', ask: 'bid', params: { gegner: 0, spiel: '' } },
    ]);
  });

  it('bietet Kontra und die Kartenwahl, wenn man herauskommt und noch doppeln darf', () => {
    const tutorInput = fall('kontra.gegen.partnerspiel');
    expect(questionsFor(tutorInput).map((q) => q.id)).toEqual([
      'frage.kontra',
      'frage.karte.welche',
    ]);
    expect(currentAsk(tutorInput)).toBe('card');
  });

  it('bietet Re nach einem Kontra, auch außerhalb der Reihe', () => {
    const tutorInput = fall('re.mit.reserve');
    expect(questionsFor(tutorInput).map((q) => q.id)).toEqual(['frage.re']);
    expect(currentAsk(tutorInput)).toBe('double');
  });
});
