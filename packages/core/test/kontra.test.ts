import { describe, expect, it } from 'vitest';
import {
  type Action,
  type BidCall,
  type Card,
  type CompletedTrick,
  type Contract,
  type HandState,
  type RuleSet,
  DEFAULT_RULES,
  applyAction,
  applyTableAction,
  canDouble,
  createRng,
  createTable,
  dealHand,
  handViewFor,
  legalCalls,
  legalCards,
  newHandLog,
  pick,
  replay,
  scoreHand,
  startHand,
} from '../src';

const KONTRA_RULES: RuleSet = { ...DEFAULT_RULES, kontra: true };

// Sitz 0 spielt, Sitz 2 hat die Gras-Sau (wie in hand.test.ts). Geber ist Sitz 3.
const HANDS: Card[][] = [
  ['EO', 'GO', 'HO', 'EU', 'HA', 'H10', 'G7', 'S7'],
  ['SO', 'GU', 'HK', 'H9', 'EA', 'E10', 'G8', 'S8'],
  ['HU', 'SU', 'GA', 'G10', 'GK', 'G9', 'EK', 'S9'],
  ['H8', 'H7', 'E9', 'E8', 'E7', 'SA', 'S10', 'SK'],
];
const GRAS: Contract = { kind: 'sauspiel', suit: 'gras' };

/** Sitz 0 sagt ein Gras-Sauspiel an, alle anderen „weiter“. Sitz 0 kommt heraus. */
function sauspiel(rules: RuleSet = KONTRA_RULES): HandState {
  let state: HandState = {
    ...dealHand(rules, 3, 1),
    hands: HANDS.map((h) => [...h]),
    initialHands: HANDS.map((h) => [...h]),
  };
  const calls: BidCall[] = [
    { type: 'interest' },
    { type: 'pass' },
    { type: 'pass' },
    { type: 'pass' },
    { type: 'declare', contract: GRAS },
  ];
  for (const call of calls) state = act(state, { type: 'bid', seat: state.turn, call });
  return state;
}

function act(state: HandState, action: Action): HandState {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`${result.error}: ${JSON.stringify(action)}`);
  return result.state;
}

const double = (state: HandState, seat: number) => applyAction(state, { type: 'double', seat });

describe('Kontra', () => {
  it('ist ohne die Tischregel nicht erlaubt (Standard aus)', () => {
    expect(DEFAULT_RULES.kontra).toBe(false);
    const state = sauspiel(DEFAULT_RULES);
    for (const seat of [0, 1, 2, 3]) expect(canDouble(state, seat)).toBe(false);
    expect(double(state, 1)).toEqual({ ok: false, error: 'illegal_double' });
  });

  it('nur durch Gegenspieler – Spieler und Mitspieler dürfen nicht', () => {
    const state = sauspiel();
    expect(state.partner).toBe(2);
    expect([0, 1, 2, 3].map((s) => canDouble(state, s))).toEqual([false, true, false, true]);
    expect(double(state, 0)).toEqual({ ok: false, error: 'illegal_double' });
    expect(double(state, 2)).toEqual({ ok: false, error: 'illegal_double' });
  });

  it('außerhalb der Reihe: ein Gegenspieler sagt Kontra, obwohl der Spieler herauskommt', () => {
    const state = sauspiel();
    expect(state.turn).toBe(0);
    const next = act(state, { type: 'double', seat: 3 });
    expect(next.doubling).toEqual({ kontra: 3, re: null });
    expect(next.turn).toBe(0); // am Zug ändert sich nichts
    expect(state.doubling).toEqual({ kontra: null, re: null }); // Zustand nicht verändert
  });

  it('höchstens einmal je Spiel: nach Kontra kein zweites Kontra', () => {
    const state = act(sauspiel(), { type: 'double', seat: 1 });
    expect(canDouble(state, 3)).toBe(false);
    expect(double(state, 3)).toEqual({ ok: false, error: 'illegal_double' });
  });

  it('nur vor der ersten Karte', () => {
    const state = sauspiel();
    const played = act(state, { type: 'play', seat: 0, card: legalCards(state, 0)[0]! });
    expect(canDouble(played, 1)).toBe(false);
    expect(double(played, 1)).toEqual({ ok: false, error: 'illegal_double' });
  });

  it('nicht während der Ansage', () => {
    const state = dealHand(KONTRA_RULES, 3, 1);
    expect(canDouble(state, 1)).toBe(false);
    expect(double(state, 1)).toEqual({ ok: false, error: 'wrong_phase' });
  });

  it('kein Kontra ohne Spielerpartei (Ramsch, Annahme 24)', () => {
    // Ramsch kommt mit K3b; hier steht ein laufendes Spiel ohne Ansager für ihn.
    const ramsch: HandState = { ...sauspiel(), declarer: null, partner: null };
    for (const seat of [0, 1, 2, 3]) expect(canDouble(ramsch, seat)).toBe(false);
  });

  it('kein Kontra nach Zusammenwerfen', () => {
    let state = dealHand(KONTRA_RULES, 3, 1);
    for (let i = 0; i < 4; i++) {
      state = act(state, { type: 'bid', seat: state.turn, call: { type: 'pass' } });
    }
    expect(state.phase).toBe('finished');
    expect(double(state, 1)).toEqual({ ok: false, error: 'wrong_phase' });
  });
});

describe('Re', () => {
  it('erst nach Kontra', () => {
    const state = sauspiel();
    expect(canDouble(state, 0)).toBe(false);
    const kontra = act(state, { type: 'double', seat: 1 });
    expect(canDouble(kontra, 0)).toBe(true);
  });

  it('nur durch die Spielerpartei – auch der Mitspieler darf (Annahme 18)', () => {
    const kontra = act(sauspiel(), { type: 'double', seat: 1 });
    expect([0, 1, 2, 3].map((s) => canDouble(kontra, s))).toEqual([true, false, true, false]);
    expect(double(kontra, 3)).toEqual({ ok: false, error: 'illegal_double' });
    const re = act(kontra, { type: 'double', seat: 2 });
    expect(re.doubling).toEqual({ kontra: 1, re: 2 });
  });

  it('höchstens einmal und nur vor der ersten Karte', () => {
    const kontra = act(sauspiel(), { type: 'double', seat: 1 });
    const re = act(kontra, { type: 'double', seat: 0 });
    for (const seat of [0, 1, 2, 3]) expect(canDouble(re, seat)).toBe(false);
    const played = act(kontra, { type: 'play', seat: 0, card: legalCards(kontra, 0)[0]! });
    expect(double(played, 0)).toEqual({ ok: false, error: 'illegal_double' });
  });
});

describe('Sicht auf Kontra und Re', () => {
  it('alle sehen, wer Kontra gesagt hat; erlaubt ist es nur in der eigenen Sicht', () => {
    const state = act(sauspiel(), { type: 'double', seat: 3 });
    for (const seat of [0, 1, 2, 3]) {
      expect(handViewFor(state, seat).doubling).toEqual({ kontra: 3, re: null });
    }
    expect(handViewFor(state, 0).canDouble).toBe(true);
    expect(handViewFor(state, 1).canDouble).toBe(false);
    expect(handViewFor(state, null).canDouble).toBe(false);
  });

  it('Kontra verrät den Mitspieler nicht, Re durch den Mitspieler schon (Annahme 23)', () => {
    const kontra = act(sauspiel(), { type: 'double', seat: 1 });
    expect(handViewFor(kontra, 3).partner).toBeNull();
    const reBySpieler = act(kontra, { type: 'double', seat: 0 });
    expect(handViewFor(reBySpieler, 3).partner).toBeNull();
    const reByPartner = act(kontra, { type: 'double', seat: 2 });
    expect(handViewFor(reByPartner, 3).partner).toBe(2);
    expect(handViewFor(reByPartner, 1).partner).toBe(2);
  });
});

/** Fertig gespieltes Spiel mit gewünschtem Ergebnis (wie in scoring.test.ts). */
function finished(options: {
  contract: Contract;
  declarer: number;
  partner?: number;
  partyPoints: number;
  partyTricks: number;
  initialHands?: Card[][];
  doubling: HandState['doubling'];
  pot?: number;
}): HandState {
  const base = dealHand(KONTRA_RULES, 3, 7);
  const opponent = [0, 1, 2, 3].find((s) => s !== options.declarer && s !== options.partner)!;
  const tricks: CompletedTrick[] = Array.from({ length: 8 }, (_, i) => {
    const forParty = i < options.partyTricks;
    const points = forParty
      ? i === 0
        ? options.partyPoints
        : 0
      : i === options.partyTricks
        ? 120 - options.partyPoints
        : 0;
    return { leader: 0, cards: [], winner: forParty ? options.declarer : opponent, points };
  });
  return {
    ...base,
    phase: 'finished',
    contract: options.contract,
    declarer: options.declarer,
    partner: options.partner ?? null,
    initialHands: options.initialHands ?? [
      ['EO', 'HO', 'EU', 'HU'],
      ['GO', 'SO', 'GU', 'SU'],
      ['EA', 'GA', 'HA', 'SA'],
      ['E10', 'G10', 'H10', 'S10'],
    ],
    hands: [[], [], [], []],
    tricks,
    doubling: options.doubling,
    carry: { pot: options.pot ?? 0, factor: 1 },
  };
}

describe('Abrechnung mit Kontra und Re', () => {
  const won = (doubling: HandState['doubling'], pot = 0) =>
    finished({
      contract: GRAS,
      declarer: 0,
      partner: 2,
      partyPoints: 61,
      partyTricks: 4,
      doubling,
      pot,
    });

  it('Kontra verdoppelt den Spielwert', () => {
    const r = scoreHand(won({ kontra: 1, re: null }));
    expect(r.outcome!.value).toBe(10); // Spielwert selbst bleibt, der Faktor kommt in Stufe 2
    expect(r.factors).toEqual([{ reason: 'kontra', factor: 2 }]);
    expect(r.payments).toEqual([20, -20, 20, -20]);
  });

  it('Re vervierfacht den Spielwert', () => {
    const r = scoreHand(won({ kontra: 1, re: 2 }));
    expect(r.factors).toEqual([
      { reason: 'kontra', factor: 2 },
      { reason: 're', factor: 2 },
    ]);
    expect(r.payments).toEqual([40, -40, 40, -40]);
  });

  it('gilt auch für die Verlierer-Seite: verlorenes Solo mit Kontra', () => {
    const r = scoreHand(
      finished({
        contract: { kind: 'solo', suit: 'herz' },
        declarer: 1,
        partyPoints: 50,
        partyTricks: 3,
        doubling: { kontra: 0, re: null },
      }),
    );
    expect(r.payments).toEqual([100, -300, 100, 100]);
  });

  it('Tout wird mitverdoppelt: ×2 bzw. ×4 auf den doppelten Wert', () => {
    const tout = (doubling: HandState['doubling']) =>
      scoreHand(
        finished({
          contract: { kind: 'solo', suit: 'herz', tout: true },
          declarer: 0,
          partyPoints: 120,
          partyTricks: 8,
          doubling,
        }),
      );
    expect(tout({ kontra: null, re: null }).payments).toEqual([300, -100, -100, -100]);
    expect(tout({ kontra: 1, re: null }).payments).toEqual([600, -200, -200, -200]);
    expect(tout({ kontra: 1, re: 0 }).payments).toEqual([1200, -400, -400, -400]);
  });

  it('Sie wird mitverdoppelt (Annahme 18)', () => {
    const sie: Card[] = ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HU', 'SU'];
    const r = scoreHand(
      finished({
        contract: { kind: 'solo', suit: 'herz' },
        declarer: 0,
        partyPoints: 120,
        partyTricks: 8,
        initialHands: [sie, ['EA'], ['GA'], ['HA']],
        doubling: { kontra: 2, re: null },
      }),
    );
    expect(r.outcome!.details).toMatchObject({ sie: true });
    expect(r.outcome!.value).toBe(200);
    expect(r.payments).toEqual([1200, -400, -400, -400]);
  });

  it('der Pott wird nicht verdoppelt (Annahme 12)', () => {
    const r = scoreHand(won({ kontra: 1, re: 0 }, 40));
    // Spielwert 10 × 4 = 40 je Gegner; der Pott (40) geht unverdoppelt an die Spielerpartei.
    expect(r.payments).toEqual([60, -40, 60, -40]);
    expect(r.potDelta).toBe(-40);
    expect(r.payments.reduce((a, b) => a + b, 0) + r.potDelta).toBe(0);
  });

  it('Kontra und Bock multiplizieren sich (Annahme 25)', () => {
    const state = won({ kontra: 1, re: null });
    const r = scoreHand({ ...state, carry: { pot: 0, factor: 2 } });
    expect(r.payments).toEqual([40, -40, 40, -40]);
  });
});

describe('Kontra im Spielprotokoll', () => {
  it('der Tisch protokolliert Kontra und Re; replay ergibt denselben Zustand', () => {
    let table = createTable(KONTRA_RULES);
    table = {
      ...table,
      seats: [0, 1, 2, 3].map((i) => ({ name: `P${i}`, kind: 'bot', connected: true })),
    };
    const started = startHand(table, 42);
    if (!started.ok) throw new Error(started.error);
    table = started.table;
    const rng = createRng(7);
    let doubled = false;
    while (table.hand!.phase !== 'finished') {
      const hand = table.hand!;
      let action: Action;
      if (hand.phase === 'playing' && !doubled) {
        const seat = [0, 1, 2, 3].find((s) => canDouble(hand, s));
        if (seat === undefined) break; // kein Spiel zustande gekommen
        action = { type: 'double', seat };
        if (hand.doubling.kontra !== null) doubled = true;
      } else if (hand.phase === 'bidding') {
        action = { type: 'bid', seat: hand.turn, call: pick(legalCalls(hand, hand.turn), rng) };
      } else {
        action = { type: 'play', seat: hand.turn, card: pick(legalCards(hand, hand.turn), rng) };
      }
      const result = applyTableAction(table, action);
      if (!result.ok) throw new Error(result.error);
      table = result.table;
    }
    const log = table.logs.at(-1)!;
    const doubles = log.actions.filter((a) => a.type === 'double');
    if (table.hand!.contract) {
      expect(doubles).toHaveLength(2);
      expect(doubles[0]).toEqual({ type: 'double', seat: table.hand!.doubling.kontra });
    }
    expect(replay(log)).toEqual(table.hand);
  });

  it('replay lehnt ein Kontra ab, das nicht erlaubt war', () => {
    const log = newHandLog(1, KONTRA_RULES, 3, 1);
    log.actions.push({ type: 'double', seat: 0 });
    expect(() => replay(log)).toThrow(/wrong_phase/);
  });
});

describe('Zufallsspiele mit Kontra', () => {
  it('laufen sauber durch; Summe der Zahlungen bleibt 0', () => {
    const rng = createRng(2026);
    for (let game = 0; game < 200; game++) {
      let state = dealHand(KONTRA_RULES, game % 4, [game, 1, 2, 3]);
      while (state.phase !== 'finished') {
        const doublers = [0, 1, 2, 3].filter((s) => canDouble(state, s));
        if (doublers.length > 0 && rng() < 0.5) {
          state = act(state, { type: 'double', seat: pick(doublers, rng) });
          continue;
        }
        state =
          state.phase === 'bidding'
            ? act(state, {
                type: 'bid',
                seat: state.turn,
                call: pick(legalCalls(state, state.turn), rng),
              })
            : act(state, {
                type: 'play',
                seat: state.turn,
                card: pick(legalCards(state, state.turn), rng),
              });
      }
      const result = state.result!;
      expect(result.payments.reduce((a, b) => a + b, 0) + result.potDelta).toBe(0);
      const expected =
        (state.doubling.kontra !== null ? 2 : 1) * (state.doubling.re !== null ? 2 : 1);
      expect(result.factors.reduce((f, x) => f * x.factor, 1)).toBe(expected);
    }
  });
});
