import { describe, expect, it } from 'vitest';
import {
  type Card,
  type Contract,
  type HandState,
  DEFAULT_RULES,
  applyAction,
  createRng,
  dealHand,
  handViewFor,
  legalCards,
  legalContracts,
  pick,
  sameContract,
} from '../src';

/** Baut einen Spielzustand mit festen Händen (Sitz 0 kommt raus, Geber ist Sitz 3). */
function handWith(hands: Card[][]): HandState {
  const state = dealHand(DEFAULT_RULES, 3, 1);
  return { ...state, hands, initialHands: hands.map((h) => [...h]) };
}

function bidAll(state: HandState, bids: (Contract | null)[]): HandState {
  let current = state;
  for (const contract of bids) {
    const result = applyAction(current, { type: 'bid', seat: current.turn, contract });
    if (!result.ok) throw new Error(result.error);
    current = result.state;
  }
  return current;
}

function play(state: HandState, card: Card): HandState {
  const result = applyAction(state, { type: 'play', seat: state.turn, card });
  if (!result.ok) throw new Error(`${result.error}: ${card}`);
  return result.state;
}

// Sitz 0 spielt, Sitz 2 hat die Gras-Sau und drei weitere Gras-Karten.
const HANDS: Card[][] = [
  ['EO', 'GO', 'HO', 'EU', 'HA', 'H10', 'G7', 'S7'],
  ['SO', 'GU', 'HK', 'H9', 'EA', 'E10', 'G8', 'S8'],
  ['HU', 'SU', 'GA', 'G10', 'GK', 'G9', 'EK', 'S9'],
  ['H8', 'H7', 'E9', 'E8', 'E7', 'SA', 'S10', 'SK'],
];
const GRAS: Contract = { kind: 'sauspiel', suit: 'gras' };

describe('Ansage', () => {
  it('Sauspiel nur auf Farben, von denen man eine Karte, aber nicht die Sau hat', () => {
    const state = handWith(HANDS);
    const sauspiele = legalContracts(state, 0).filter((c) => c.kind === 'sauspiel');
    // Sitz 0 hat Gras und Schellen, aber keine Eichel-Farbkarte.
    expect(sauspiele.map((c) => c.suit).sort()).toEqual(['gras', 'schellen']);
  });

  it('wer nicht an der Reihe ist, darf nichts ansagen', () => {
    const state = handWith(HANDS);
    expect(legalContracts(state, 1)).toEqual([]);
    expect(applyAction(state, { type: 'bid', seat: 1, contract: null })).toEqual({
      ok: false,
      error: 'not_your_turn',
    });
  });

  it('eine spätere Ansage muss die frühere überbieten', () => {
    const state = bidAll(handWith(HANDS), [GRAS]);
    const options = legalContracts(state, 1);
    expect(options.some((c) => c.kind === 'sauspiel')).toBe(false);
    expect(options.some((c) => c.kind === 'wenz')).toBe(true);
  });

  it('das höchste Gebot spielt; der Erste nach dem Geber kommt raus', () => {
    const state = bidAll(handWith(HANDS), [GRAS, null, { kind: 'wenz' }, null]);
    expect(state.phase).toBe('playing');
    expect(state.contract).toEqual({ kind: 'wenz' });
    expect(state.declarer).toBe(2);
    expect(state.partner).toBeNull();
    expect(state.turn).toBe(0);
  });

  it('alle weiter: Spiel endet ohne Zahlung (zusammenwerfen)', () => {
    const state = bidAll(handWith(HANDS), [null, null, null, null]);
    expect(state.phase).toBe('finished');
    expect(state.result).toEqual({ kind: 'passed', payments: [0, 0, 0, 0] });
  });
});

describe('Rufsau', () => {
  const start = () => bidAll(handWith(HANDS), [GRAS, null, null, null]);

  it('der Besitzer der Rufsau ist der Mitspieler, bleibt aber verdeckt', () => {
    const state = start();
    expect(state.partner).toBe(2);
    expect(handViewFor(state, 0).partner).toBeNull();
    expect(handViewFor(state, 1).partner).toBeNull();
    expect(handViewFor(state, 2).partner).toBe(2);
  });

  it('wird die Ruffarbe angespielt, muss die Sau fallen – danach kennt jeder den Mitspieler', () => {
    let state = play(start(), 'G7');
    state = play(state, 'G8');
    expect(legalCards(state, 2)).toEqual(['GA']);
    state = play(state, 'GA');
    expect(handViewFor(state, 3).partner).toBe(2);
  });

  it('die Sau darf nicht abgeworfen werden, solange die Ruffarbe nicht gespielt wurde', () => {
    // Sitz 0 spielt Schellen an; Sitz 2 bedient. Dann Eichel: Sitz 2 hat nur den König.
    let state = play(start(), 'S7');
    state = play(state, 'S8');
    expect(legalCards(state, 2)).toEqual(['S9']);
    state = play(state, 'S9');
    state = play(state, 'SA'); // Sitz 3 macht den Stich und spielt Eichel
    state = play(state, 'E9');
    state = play(state, 'EU'); // Sitz 0 sticht
    state = play(state, 'EA');
    state = play(state, 'EK');
    // Sitz 0 zieht zweimal Trumpf; Sitz 2 muss beide Male bedienen und ist danach trumpffrei.
    state = play(state, 'EO');
    state = play(state, 'SO');
    state = play(state, 'HU');
    state = play(state, 'H8');
    state = play(state, 'GO');
    state = play(state, 'GU');
    state = play(state, 'SU');
    state = play(state, 'H7');
    // Beim dritten Trumpf dürfte Sitz 2 abwerfen – nur nicht die Sau.
    state = play(state, 'HA');
    state = play(state, 'HK');
    expect(legalCards(state, 2).sort()).toEqual(['G10', 'G9', 'GK']);
  });

  it('mit vier Karten der Ruffarbe darf der Mitspieler davonlaufen', () => {
    // Sitz 2 kommt per Trumpfstich ans Spiel und hat noch GA, G10, GK, G9.
    const hands: Card[][] = [
      ['GO', 'HO', 'EU', 'HA', 'H10', 'G7', 'S7', 'E7'],
      ['SO', 'GU', 'HK', 'H9', 'EA', 'E10', 'G8', 'S8'],
      ['EO', 'SU', 'GA', 'G10', 'GK', 'G9', 'EK', 'S9'],
      ['HU', 'H8', 'H7', 'E9', 'E8', 'SA', 'S10', 'SK'],
    ];
    let state = bidAll(handWith(hands), [GRAS, null, null, null]);
    state = play(state, 'GO');
    state = play(state, 'SO');
    state = play(state, 'EO');
    state = play(state, 'H7');
    expect(state.turn).toBe(2);
    expect(legalCards(state, 2)).toContain('G9');
  });

  it('mit weniger als vier Karten darf die Ruffarbe nur mit der Sau angespielt werden', () => {
    const hands: Card[][] = [
      ['GO', 'HO', 'EU', 'HA', 'H10', 'G7', 'S7', 'GK'],
      ['SO', 'GU', 'HK', 'H9', 'EA', 'E10', 'G8', 'S8'],
      ['EO', 'SU', 'GA', 'G10', 'E7', 'G9', 'EK', 'S9'],
      ['HU', 'H8', 'H7', 'E9', 'E8', 'SA', 'S10', 'SK'],
    ];
    let state = bidAll(handWith(hands), [GRAS, null, null, null]);
    state = play(state, 'GO');
    state = play(state, 'SO');
    state = play(state, 'EO');
    state = play(state, 'H7');
    const legal = legalCards(state, 2);
    expect(legal).toContain('GA');
    expect(legal).not.toContain('G10');
    expect(legal).not.toContain('G9');
  });
});

describe('Spielablauf', () => {
  it('falsche Karte und falscher Spieler werden abgelehnt', () => {
    const state = bidAll(handWith(HANDS), [GRAS, null, null, null]);
    expect(applyAction(state, { type: 'play', seat: 0, card: 'EA' })).toEqual({
      ok: false,
      error: 'illegal_card',
    });
    expect(applyAction(state, { type: 'play', seat: 1, card: 'EA' })).toEqual({
      ok: false,
      error: 'not_your_turn',
    });
  });

  it('der Zustand wird nie verändert, sondern kopiert', () => {
    const state = bidAll(handWith(HANDS), [GRAS, null, null, null]);
    const frozen = JSON.stringify(state);
    play(state, 'EO');
    expect(JSON.stringify(state)).toBe(frozen);
  });

  it('zufällige, regelkonforme Spiele laufen immer sauber durch', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed);
      let state = dealHand(DEFAULT_RULES, seed % 4, seed);
      while (state.phase !== 'finished') {
        const seat = state.turn;
        if (state.phase === 'bidding') {
          const options = legalContracts(state, seat);
          // Etwa jede dritte Ansage ist ein Spiel – so kommen alle Spielarten vor.
          const contract = options.length > 0 && rng() < 0.35 ? pick(options, rng) : null;
          const result = applyAction(state, { type: 'bid', seat, contract });
          if (!result.ok) throw new Error(`Seed ${seed}: ${result.error}`);
          state = result.state;
        } else {
          const cards = legalCards(state, seat);
          expect(cards.length, `Seed ${seed}: keine erlaubte Karte`).toBeGreaterThan(0);
          const result = applyAction(state, { type: 'play', seat, card: pick(cards, rng) });
          if (!result.ok) throw new Error(`Seed ${seed}: ${result.error}`);
          state = result.state;
        }
      }
      const result = state.result!;
      expect(
        result.payments.reduce((a, b) => a + b, 0),
        `Seed ${seed}: Zahlungen`,
      ).toBe(0);
      if (result.kind === 'played') {
        expect(state.tricks).toHaveLength(8);
        expect(state.tricks.reduce((sum, t) => sum + t.points, 0)).toBe(120);
        expect(state.hands.every((h) => h.length === 0)).toBe(true);
        expect(sameContract(result.contract, state.contract!)).toBe(true);
      }
    }
  });
});
