import { describe, expect, it } from 'vitest';
import {
  type Card,
  type HandState,
  type RuleSet,
  DEFAULT_RULES,
  MODES,
  applyAction,
  createRng,
  dealHand,
  handViewFor,
  legalCalls,
  legalCards,
  legalContracts,
  pick,
} from '../src';

const MUSS: RuleSet = { ...DEFAULT_RULES, allPassed: 'muss' };

/** Feste Hände, Geber Sitz 3, dann sagen alle „weiter“. */
function allPassed(hands: Card[][], rules: RuleSet = MUSS): HandState {
  let state: HandState = {
    ...dealHand(rules, 3, 1),
    hands,
    initialHands: hands.map((h) => [...h]),
  };
  for (let i = 0; i < 4; i++) {
    const r = applyAction(state, { type: 'bid', seat: state.turn, call: { type: 'pass' } });
    if (!r.ok) throw new Error(r.error);
    state = r.state;
  }
  return state;
}

// Sitz 1 hat den Eichel-Ober und von jeder Farbe eine Karte, aber keine Sau.
const NORMAL: Card[][] = [
  ['GO', 'HO', 'SO', 'EU', 'GU', 'HU', 'SU', 'HA'],
  ['EO', 'E7', 'G7', 'S7', 'H10', 'HK', 'H9', 'H8'],
  ['EA', 'E10', 'EK', 'E9', 'E8', 'G8', 'G9', 'S8'],
  ['GA', 'G10', 'GK', 'SA', 'S10', 'SK', 'S9', 'H7'],
];

// Sitz 1 hat keine Schellen, kann aber Eichel und Gras rufen: nicht gesperrt.
const OHNE_SCHELLEN: Card[][] = [
  ['GO', 'HO', 'SO', 'EU', 'GU', 'HU', 'SU', 'S7'],
  ['EO', 'E7', 'G7', 'H10', 'HK', 'H9', 'H8', 'HA'],
  ['EA', 'E10', 'EK', 'E9', 'E8', 'G8', 'G9', 'S8'],
  ['GA', 'G10', 'GK', 'SA', 'S10', 'SK', 'S9', 'H7'],
];

// Sitz 1 hält Eichel- und Gras-Sau und hat keine Schellen: gesperrt.
const GESPERRT: Card[][] = [
  ['GO', 'HO', 'SO', 'EU', 'GU', 'HU', 'SU', 'HA'],
  ['EO', 'EA', 'GA', 'E7', 'H10', 'HK', 'H9', 'H8'],
  ['E10', 'EK', 'E9', 'E8', 'G8', 'G9', 'S8', 'G7'],
  ['G10', 'GK', 'SA', 'S10', 'SK', 'S9', 'H7', 'S7'],
];

// Sitz 1 hält alle drei Farb-Säue.
const DREI_SAEUE: Card[][] = [
  ['GO', 'HO', 'SO', 'EU', 'GU', 'HU', 'SU', 'H7'],
  ['EO', 'EA', 'GA', 'SA', 'H10', 'HK', 'H9', 'H8'],
  ['E10', 'EK', 'E9', 'E8', 'E7', 'G10', 'GK', 'G9'],
  ['G8', 'G7', 'S10', 'SK', 'S9', 'S8', 'S7', 'HA'],
];

const suits = (state: HandState, seat: number) =>
  legalContracts(state, seat).map((c) => `${c.kind}:${c.suit}`);

describe('Muss', () => {
  it('alle weiter: der Besitzer des Eichel-Obers muss ein Sauspiel nennen', () => {
    const state = allPassed(NORMAL);
    expect(state.phase).toBe('bidding');
    expect(state.auction).toMatchObject({ stage: 'declare', holder: 1, forced: true });
    expect(state.turn).toBe(1);
    expect(suits(state, 1)).toEqual(['sauspiel:eichel', 'sauspiel:gras', 'sauspiel:schellen']);
    // Kein „weiter“, keine andere Spielart, auch wenn das Blatt eine hergäbe.
    expect(legalCalls(state, 1).every((c) => c.type === 'declare')).toBe(true);
    expect(legalCalls(state, 0)).toEqual([]);
    // Alle sehen, dass gespielt werden muss und wer dran ist.
    expect(handViewFor(state, 2).auction).toMatchObject({ forced: true, holder: 1 });
  });

  it('nach der Ansage wird ein gewöhnliches Sauspiel gespielt', () => {
    const state = allPassed(NORMAL);
    const r = applyAction(state, {
      type: 'bid',
      seat: 1,
      call: { type: 'declare', contract: { kind: 'sauspiel', suit: 'gras' } },
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.state.phase).toBe('playing');
    expect(r.state.declarer).toBe(1);
    expect(r.state.partner).toBe(3);
    expect(r.state.turn).toBe(0);
  });

  it('eine andere Spielart wird abgelehnt', () => {
    const state = allPassed(NORMAL);
    const r = applyAction(state, {
      type: 'bid',
      seat: 1,
      call: { type: 'declare', contract: { kind: 'wenz' } },
    });
    expect(r).toEqual({ ok: false, error: 'illegal_bid' });
  });

  it('nicht gesperrt: eine Sau ohne eigene Farbkarte darf nicht gerufen werden', () => {
    const state = allPassed(OHNE_SCHELLEN);
    expect(suits(state, 1)).toEqual(['sauspiel:eichel', 'sauspiel:gras']);
  });

  it('gesperrt: dann darf er eine Sau ohne eigene Farbkarte rufen, aber nicht Herz', () => {
    const state = allPassed(GESPERRT);
    expect(suits(state, 1)).toEqual(['sauspiel:schellen']);
    const r = applyAction(state, {
      type: 'bid',
      seat: 1,
      call: { type: 'declare', contract: { kind: 'sauspiel', suit: 'schellen' } },
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.state.partner).toBe(3);
  });

  it('gesperrt gilt nur im Muss: nach den normalen Regeln kann er nichts rufen', () => {
    expect(MODES.sauspiel.suitChoices!(GESPERRT[1]!)).toEqual([]);
    expect(MODES.sauspiel.suitChoices!(GESPERRT[1]!, { forced: true })).toEqual(['schellen']);
    // Nicht gesperrt bleibt es auch im Muss bei den normalen Farben.
    expect(MODES.sauspiel.suitChoices!(OHNE_SCHELLEN[1]!, { forced: true })).toEqual([
      'eichel',
      'gras',
    ]);
    expect(MODES.sauspiel.suitChoices!(DREI_SAEUE[1]!, { forced: true })).toEqual([]);
  });

  it('hält er alle drei Farb-Säue, wird zusammengeworfen', () => {
    const state = allPassed(DREI_SAEUE);
    expect(state.phase).toBe('finished');
    expect(state.result).toMatchObject({ kind: 'passed', payments: [0, 0, 0, 0], potDelta: 0 });
  });

  it('die Rufsau-Regeln gelten für den Mitspieler unverändert', () => {
    const declared = applyAction(allPassed(GESPERRT), {
      type: 'bid',
      seat: 1,
      call: { type: 'declare', contract: { kind: 'sauspiel', suit: 'schellen' } },
    });
    if (!declared.ok) throw new Error(declared.error);
    const playing = declared.state;
    // Wird Schellen angespielt, muss Sitz 3 die Sau zugeben.
    const led: HandState = {
      ...playing,
      turn: 3,
      hands: playing.hands.map((h, s) => (s === 2 ? h.filter((c) => c !== 'S8') : h)),
      currentTrick: { leader: 2, cards: ['S8'] },
    };
    expect(legalCards(led, 3)).toEqual(['SA']);
    // Ohne Davonlaufen darf er Schellen nur mit der Sau anspielen.
    const lead: HandState = {
      ...playing,
      rules: { ...playing.rules, davonlaufen: false },
      turn: 3,
      currentTrick: { leader: 3, cards: [] },
    };
    const schellen = legalCards(lead, 3).filter((c) => c.startsWith('S'));
    expect(schellen).toEqual(['SA']);
    // Mit fünf Schellen darf er davonlaufen.
    const away: HandState = { ...lead, rules: playing.rules };
    expect(legalCards(away, 3).filter((c) => c.startsWith('S'))).toHaveLength(5);
  });

  it('zufällige Spiele: jedes „alle weiter“ wird ein Sauspiel des Eichel-Ober-Besitzers', () => {
    let forced = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed);
      let state = dealHand(MUSS, seed % 4, seed);
      const owner = state.hands.findIndex((h) => h.includes('EO'));
      for (let step = 0; state.phase !== 'finished'; step++) {
        if (step > 100) throw new Error('endet nicht');
        const seat = state.turn;
        const calls = legalCalls(state, seat);
        const action =
          state.phase === 'bidding'
            ? {
                type: 'bid' as const,
                seat,
                call: state.auction.stage === 'interest' ? calls[0]! : pick(calls, rng),
              }
            : { type: 'play' as const, seat, card: pick(legalCards(state, seat), rng) };
        const r = applyAction(state, action);
        if (!r.ok) throw new Error(`Seed ${seed}: ${r.error}`);
        state = r.state;
      }
      const result = state.result!;
      expect(result.payments.reduce((a, b) => a + b, 0)).toBe(0);
      if (result.kind === 'played') {
        forced++;
        expect(state.contract!.kind).toBe('sauspiel');
        expect(state.declarer).toBe(owner);
        expect(state.auction.forced).toBe(true);
      } else {
        // Zusammengeworfen nur, wenn der Eichel-Ober alle drei Farb-Säue hält.
        expect(
          (['EA', 'GA', 'SA'] as const).every((c) => state.initialHands[owner]!.includes(c)),
        ).toBe(true);
      }
    }
    expect(forced).toBeGreaterThan(280);
  });
});
