import { describe, expect, it } from 'vitest';
import { type Card, DEFAULT_RULES, type HandState, handViewFor } from '@schafkopf/core';
import { type TutorOption, advise, currentAsk, optionKey, questionsFor, review } from '../src';
import { act, deal, declare, fixedHand, input } from './lagen';

/**
 * Hochzeit beraten (T3): annehmen oder ablehnen, wenn sie angeboten wird, und welche Karte(n)
 * zurück, wenn man angenommen hat – einfach und arabisch. Sitz 0 macht die Hochzeit, Sitz 1 wird
 * gefragt (Geber 3, alle sagen „weiter“).
 */

const EINFACH = { ...DEFAULT_RULES, contracts: [...DEFAULT_RULES.contracts, 'hochzeit' as const] };
const ARABISCH = {
  ...DEFAULT_RULES,
  contracts: [...DEFAULT_RULES.contracts, 'arabischeHochzeit' as const],
};

const HOCHZEITER = ['HK', 'EA', 'E10', 'GA', 'G10', 'S9', 'S8', 'E7'] as Card[];
const ARABER = ['HK', 'H9', 'EA', 'E10', 'GA', 'G10', 'S9', 'S8'] as Card[];

const STARK = ['EO', 'GO', 'SO', 'EU', 'HA', 'GK', 'G9', 'S7'] as Card[];
const SCHWACH = ['E8', 'E9', 'G7', 'G8', 'S7', 'SK', 'H7', 'H8'] as Card[];
const STARK_ARAB = ['EO', 'GO', 'HO', 'SO', 'EU', 'HA', 'GK', 'S7'] as Card[];
const ARAB_GIVE = ['EO', 'GO', 'HO', 'EU', 'HA', 'GK', 'G9', 'S7'] as Card[];

function angebot(arabisch: boolean, hand1: Card[]): HandState {
  const rules = arabisch ? ARABISCH : EINFACH;
  const kind = arabisch ? ('arabischeHochzeit' as const) : ('hochzeit' as const);
  const hands = deal({ 0: arabisch ? ARABER : HOCHZEITER, 1: hand1 }, rules);
  return declare(fixedHand(hands, rules), 0, { kind });
}

const nimmtAn = (s: HandState) => act(s, 1, { type: 'prelude', move: { type: 'accept' } });
const move = (o: TutorOption) => (o.type === 'prelude' ? o.move : null);
const given = (o: TutorOption): Card[] => {
  const m = move(o);
  return m?.type === 'give' ? m.cards : [];
};

describe('Hochzeit: annehmen oder ablehnen', () => {
  it.each([
    ['einfach', false, STARK],
    ['arabisch', true, STARK_ARAB],
  ])('empfiehlt mit vielen Trümpfen anzunehmen (%s)', (_, arabisch, hand) => {
    const state = angebot(arabisch, hand);
    expect(currentAsk(input(state, 1))).toBe('prelude');
    const advice = advise(input(state, 1))!;
    expect(move(advice.recommended)?.type).toBe('accept');
    expect(advice.basis).toBe('suche');
    // Für das Annehmen gibt es keine Faustregel (T5: gemessen nie besser als Ablehnen, die Suche
    // entscheidet); der Denkanstoß ist der allgemeine zum Angebot.
    expect(advice.reasons.map((r) => r.id)).not.toContain('hochzeit.ablehnen.schwach');
    expect(advice.hint.key).toBe('denkanstoss.hochzeit.annehmen');
    // Beide Möglichkeiten sind bewertet; „ablehnen“ zählt 0, annehmen bringt im Schnitt mehr.
    const cents = (t: string) => advice.options.find((o) => move(o.option)?.type === t)!.cents!;
    expect(cents('decline')).toBe(0);
    expect(cents('accept')).toBeGreaterThan(0);
  });

  it.each([
    ['einfach', false],
    ['arabisch', true],
  ])('empfiehlt mit schwachem Blatt abzulehnen (%s)', (_, arabisch) => {
    const advice = advise(input(angebot(arabisch, SCHWACH), 1))!;
    expect(move(advice.recommended)?.type).toBe('decline');
    expect(advice.reasons.map((r) => r.id)).toContain('hochzeit.ablehnen.schwach');
    expect(advice.options.find((o) => move(o.option)?.type === 'accept')!.cents!).toBeLessThan(0);
  });

  it('bietet im Vorspiel die Fragen zur Hochzeit an', () => {
    const qs = questionsFor(input(angebot(false, STARK), 1));
    expect(qs.map((q) => q.id)).toEqual(['frage.hochzeit.annehmen']);
    expect(qs[0]!.ask).toBe('prelude');
    expect(qs[0]!.params).toMatchObject({ spieler: 0, spiel: 'hochzeit' });
  });

  it('schweigt, wenn man im Vorspiel nicht dran ist', () => {
    // Sitz 2 wird erst gefragt, wenn Sitz 1 abgelehnt hat.
    const state = angebot(false, STARK);
    expect(advise(input(state, 2))).toBeNull();
    expect(currentAsk(input(state, 0))).toBeNull();
    expect(questionsFor(input(state, 2))).toEqual([]);
  });
});

describe('Hochzeit: zurückgeben', () => {
  it('einfach: macht die einzelne Schellen-Karte frei', () => {
    const state = nimmtAn(angebot(false, STARK));
    expect(state.phase).toBe('prelude');
    const inp = input(state, 1);
    expect(questionsFor(inp).map((q) => q.id)).toEqual(['frage.hochzeit.zurueck']);
    const advice = advise(inp)!;
    expect(given(advice.recommended)).toEqual(['S7']);
    expect(advice.reasons.map((r) => r.id)).toContain('hochzeit.zurueckgeben.farbe.frei');
    // Es stehen nur erlaubte Rückgaben zur Wahl: keine Trümpfe.
    for (const o of advice.options)
      for (const c of given(o.option)) expect(inp.view.hand).toContain(c);
    expect(
      advice.options.every((o) =>
        given(o.option).every((c) => !['EO', 'GO', 'SO', 'EU', 'HA', 'HK'].includes(c)),
      ),
    ).toBe(true);
    expect(advice.options[0]!.cents).not.toBeNull();
  });

  it('einfach: ohne Farbe zum Freimachen eine kleine Karte', () => {
    const state = nimmtAn(angebot(false, ['EO', 'GO', 'EU', 'HA', 'GK', 'G9', 'S7', 'SK']));
    const advice = advise(input(state, 1))!;
    expect(advice.reasons.map((r) => r.id)).toContain('hochzeit.zurueckgeben.klein');
    expect(given(advice.recommended)).toHaveLength(1);
    expect(['S7', 'G9']).toContain(given(advice.recommended)[0]);
  });

  it('arabisch: zwei Karten, die eine Farbe frei machen', () => {
    const state = nimmtAn(angebot(true, ARAB_GIVE));
    const inp = input(state, 1);
    expect(inp.view.hand).toHaveLength(10);
    const advice = advise(inp)!;
    const cards = given(advice.recommended);
    expect(cards).toHaveLength(2);
    expect(cards).toContain('S7');
    expect(advice.reasons.map((r) => r.id)).toContain('hochzeit.zurueckgeben.farbe.frei');
    expect(questionsFor(inp)[0]!.params).toEqual({ anzahl: 2 });
  });

  it('bewertet die Rückgabe hinterher', () => {
    const state = nimmtAn(angebot(false, STARK));
    const inp = input(state, 1);
    const r = review(inp, { type: 'prelude', move: { type: 'give', cards: ['S7'] } })!;
    expect(r.verdict).toBe('gut');
    const other = review(inp, { type: 'prelude', move: { type: 'give', cards: ['GK'] } })!;
    expect(['gut', 'vertretbar', 'fehler']).toContain(other.verdict);
    // Ein Trumpf ist nicht erlaubt und steht nicht zur Wahl.
    expect(review(inp, { type: 'prelude', move: { type: 'give', cards: ['EO'] } })).toBeNull();
  });

  it('kennt eindeutige Schlüssel für Rückgaben, unabhängig von der Reihenfolge', () => {
    const a: TutorOption = { type: 'prelude', move: { type: 'give', cards: ['G9', 'S7'] } };
    const b: TutorOption = { type: 'prelude', move: { type: 'give', cards: ['S7', 'G9'] } };
    expect(optionKey(a)).toBe(optionKey(b));
    expect(optionKey({ type: 'prelude', move: { type: 'accept' } })).not.toBe(
      optionKey({ type: 'prelude', move: { type: 'decline' } }),
    );
  });
});

describe('Hochzeit: der Tutor nutzt nichts Verdecktes', () => {
  /** Tauscht verdeckte Karten der Sitze 2 und 3 (beide nicht der Fragende, nicht der Hochzeiter). */
  const swapped = (state: HandState): HandState => {
    const hands = state.hands.map((h) => [...h]);
    const a = hands[2]!.splice(0, 4);
    const b = hands[3]!.splice(0, 4);
    hands[2]!.push(...b);
    hands[3]!.push(...a);
    return { ...state, hands, initialHands: hands.map((h) => [...h]) };
  };

  it.each([
    ['Annehmen', () => angebot(false, STARK)],
    ['Annehmen, arabisch', () => angebot(true, STARK_ARAB)],
    ['Rückgabe', () => nimmtAn(angebot(false, STARK))],
    ['Rückgabe, arabisch', () => nimmtAn(angebot(true, ARAB_GIVE))],
  ])('gleiche Sicht, andere verdeckte Karten → gleiche Antwort (%s)', (_, make) => {
    const state = make();
    const other = swapped(state);
    expect(other.hands).not.toEqual(state.hands);
    expect(handViewFor(other, 1)).toEqual(handViewFor(state, 1));
    const a = input(state, 1);
    const b = input(other, 1);
    expect(advise(b)).toEqual(advise(a));
    expect(questionsFor(b)).toEqual(questionsFor(a));
    const o = advise(a)!.options.at(-1)!.option;
    expect(review(b, o)).toEqual(review(a, o));
  });

  it('sieht den Hochzeiter nur über seine Sicht (nicht dessen Hand)', () => {
    const state = angebot(false, STARK);
    const view = handViewFor(state, 1);
    expect(view.hand).toEqual(state.hands[1]);
    expect(JSON.stringify(view)).not.toContain('"HK"'); // die Karte des Hochzeiters ist verdeckt
  });
});
