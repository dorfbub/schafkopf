import { describe, expect, it } from 'vitest';
import {
  type Card,
  type CompletedTrick,
  type HandState,
  type RamschDetails,
  type RuleSet,
  type Seat,
  DEFAULT_RULES,
  applyAction,
  createRng,
  dealHand,
  handViewFor,
  legalCalls,
  legalCards,
  pick,
  scoreHand,
} from '../src';

const RAMSCH: RuleSet = { ...DEFAULT_RULES, allPassed: 'ramsch' };

function rules(patch: Partial<RuleSet['ramsch']> = {}): RuleSet {
  return { ...RAMSCH, ramsch: { ...RAMSCH.ramsch, ...patch } };
}

interface T {
  winner: Seat;
  points: number;
  cards?: Card[];
}

/** Fertiger Ramsch aus den gewünschten Stichen (Karten nur, wo sie zählen). */
function finished(tricks: T[], r: RuleSet = RAMSCH): HandState {
  const base = dealHand(r, 3, 1);
  const done: CompletedTrick[] = tricks.map((t) => ({
    leader: 0,
    cards: t.cards ?? [],
    winner: t.winner,
    points: t.points,
  }));
  return {
    ...base,
    phase: 'finished',
    contract: { kind: 'ramsch' },
    declarer: null,
    partner: null,
    hands: [[], [], [], []],
    tricks: done,
  };
}

function score(state: HandState) {
  const result = scoreHand(state);
  const details = result.outcome!.details as RamschDetails;
  expect(details.type).toBe('ramsch');
  expect(result.payments.reduce((a, b) => a + b, 0) + result.potDelta).toBe(0);
  return { result, details };
}

/** Acht Stiche, je zwei pro Sitz, mit den angegebenen Augen je Sitz (auf den ersten Stich). */
function evenTricks(points: number[]): T[] {
  return [0, 1, 2, 3].flatMap((seat) => [
    { winner: seat, points: points[seat]! },
    { winner: seat, points: 0 },
  ]);
}

describe('Ramsch: alle weiter', () => {
  it('es wird ohne Ansager gespielt; links vom Geber kommt heraus', () => {
    let state = dealHand(RAMSCH, 3, 5);
    for (let i = 0; i < 4; i++) {
      const r = applyAction(state, { type: 'bid', seat: state.turn, call: { type: 'pass' } });
      if (!r.ok) throw new Error(r.error);
      state = r.state;
    }
    expect(state.phase).toBe('playing');
    expect(state.contract).toEqual({ kind: 'ramsch' });
    expect(state.declarer).toBeNull();
    expect(state.partner).toBeNull();
    expect(state.turn).toBe(0);
    const view = handViewFor(state, 2);
    expect(view.declarer).toBeNull();
    expect(view.partner).toBeNull();
  });

  it('Trümpfe wie im Sauspiel, ohne Rufsau: Herz ist Trumpf', () => {
    const hands: Card[][] = [
      ['H7', 'E7', 'G7', 'S7', 'E8', 'G8', 'S8', 'E9'],
      ['EO', 'EA', 'GA', 'SA', 'G9', 'S9', 'E10', 'G10'],
      ['HA', 'EK', 'GK', 'SK', 'S10', 'EU', 'GU', 'HK'],
      ['H8', 'H9', 'H10', 'GO', 'HO', 'SO', 'HU', 'SU'],
    ];
    let state = dealHand(RAMSCH, 3, 1);
    state = { ...state, hands, initialHands: hands.map((h) => [...h]) };
    for (let i = 0; i < 4; i++) {
      const r = applyAction(state, { type: 'bid', seat: state.turn, call: { type: 'pass' } });
      if (!r.ok) throw new Error(r.error);
      state = r.state;
    }
    const r = applyAction(state, { type: 'play', seat: 0, card: 'H7' });
    if (!r.ok) throw new Error(r.error);
    // Sitz 1 hat keinen Herz, aber den Eichel-Ober: Trumpf muss bedient werden.
    expect(legalCards(r.state, 1)).toEqual(['EO']);
  });
});

describe('Ramsch: Abrechnung', () => {
  it('wer die meisten Augen hat, zahlt den Ramsch-Tarif an jeden der drei anderen', () => {
    const { result, details } = score(finished(evenTricks([20, 45, 30, 25])));
    expect(details.loser).toBe(1);
    expect(details.points).toEqual([20, 45, 30, 25]);
    expect(result.outcome!.declarerWon).toBeNull();
    expect(result.payments).toEqual([10, -30, 10, 10]);
    expect(result.factors).toEqual([]);
  });

  it('der Ramsch-Tarif ist einstellbar', () => {
    const r = { ...RAMSCH, tariff: { ...RAMSCH.tariff, ramsch: 25 } };
    const { result } = score(finished(evenTricks([20, 45, 30, 25]), r));
    expect(result.payments).toEqual([25, -75, 25, 25]);
  });

  it('Gleichstand nach Augen: wer mehr Stiche hat, verliert', () => {
    const tricks: T[] = [
      { winner: 0, points: 40 },
      { winner: 0, points: 0 },
      { winner: 1, points: 40 },
      { winner: 1, points: 0 },
      { winner: 1, points: 0 },
      { winner: 2, points: 20 },
      { winner: 3, points: 20 },
      { winner: 3, points: 0 },
    ];
    expect(score(finished(tricks)).details.loser).toBe(1);
  });

  it('Gleichstand nach Augen und Stichen: wer mehr Trümpfe in seinen Stichen hat, verliert', () => {
    const tricks: T[] = [
      { winner: 0, points: 40, cards: ['EO', 'GO', 'E7', 'G7'] },
      { winner: 0, points: 0 },
      { winner: 1, points: 40, cards: ['SO', 'E8', 'G8', 'S8'] },
      { winner: 1, points: 0 },
      ...evenTricks([0, 0, 20, 20]).slice(4),
    ];
    expect(score(finished(tricks)).details.loser).toBe(0);
  });

  it('gleich viele Trümpfe: wer den höchsten Trumpf in seinen Stichen hat, verliert', () => {
    const tricks: T[] = [
      { winner: 0, points: 40, cards: ['GO', 'E7', 'G7', 'S7'] },
      { winner: 0, points: 0 },
      { winner: 1, points: 40, cards: ['EO', 'E8', 'G8', 'S8'] },
      { winner: 1, points: 0 },
      ...evenTricks([0, 0, 20, 20]).slice(4),
    ];
    expect(score(finished(tricks)).details.loser).toBe(1);
  });

  it('Herz-Trümpfe zählen mit: Herz-Sau ist niedriger als jeder Unter', () => {
    const tricks: T[] = [
      { winner: 0, points: 40, cards: ['HA', 'E7', 'G7', 'S7'] },
      { winner: 0, points: 0 },
      { winner: 1, points: 40, cards: ['SU', 'E8', 'G8', 'S8'] },
      { winner: 1, points: 0 },
      ...evenTricks([0, 0, 20, 20]).slice(4),
    ];
    expect(score(finished(tricks)).details.loser).toBe(1);
  });

  it('Annahme 20: ohne Trümpfe in den Stichen verliert, wer den späteren Stich gemacht hat', () => {
    const tricks: T[] = [
      { winner: 1, points: 40, cards: ['EA', 'E7', 'E8', 'E9'] },
      { winner: 0, points: 40, cards: ['GA', 'G7', 'G8', 'G9'] },
      { winner: 2, points: 20 },
      { winner: 3, points: 20 },
    ];
    expect(score(finished(tricks)).details.loser).toBe(0);
  });

  it('eine Jungfrau verdoppelt, was der Verlierer zahlt', () => {
    const tricks: T[] = [
      { winner: 0, points: 50 },
      { winner: 0, points: 0 },
      { winner: 0, points: 0 },
      { winner: 1, points: 40 },
      { winner: 1, points: 0 },
      { winner: 2, points: 30 },
      { winner: 2, points: 0 },
      { winner: 2, points: 0 },
    ];
    const { result, details } = score(finished(tricks));
    expect(details.jungfrauen).toEqual([3]);
    expect(result.factors).toEqual([{ reason: 'jungfrau', factor: 2 }]);
    expect(result.payments).toEqual([-60, 20, 20, 20]);
  });

  it('zwei Jungfrauen vervierfachen', () => {
    const tricks: T[] = [
      { winner: 0, points: 70 },
      { winner: 0, points: 0 },
      { winner: 0, points: 0 },
      { winner: 0, points: 0 },
      { winner: 2, points: 50 },
      { winner: 2, points: 0 },
      { winner: 2, points: 0 },
      { winner: 2, points: 0 },
    ];
    const { result, details } = score(finished(tricks));
    expect(details.jungfrauen).toEqual([1, 3]);
    expect(result.factors).toHaveLength(2);
    expect(result.payments).toEqual([-120, 40, 40, 40]);
  });

  it('Jungfrau abgeschaltet: kein Faktor', () => {
    const tricks: T[] = [
      { winner: 0, points: 70 },
      { winner: 2, points: 50 },
    ];
    const { result, details } = score(finished(tricks, rules({ jungfrau: false })));
    expect(details.jungfrauen).toEqual([]);
    expect(result.factors).toEqual([]);
    expect(result.payments).toEqual([-30, 10, 10, 10]);
  });

  it('Durchmarsch mit genau 91 Augen: der Spieler gewinnt und bekommt von jedem', () => {
    const tricks: T[] = [
      { winner: 2, points: 91 },
      { winner: 0, points: 29 },
    ];
    const { result, details } = score(finished(tricks));
    expect(details.durchmarsch).toBe(2);
    expect(details.loser).toBeNull();
    // Beim Durchmarsch zählen Jungfrauen nicht (Annahme 11), obwohl 1 und 3 keinen Stich haben.
    expect(details.jungfrauen).toEqual([]);
    expect(result.factors).toEqual([]);
    expect(result.outcome!.winners).toEqual([2]);
    expect(result.payments).toEqual([-10, -10, 30, -10]);
  });

  it('90 Augen sind kein Durchmarsch: der Spieler verliert', () => {
    const tricks: T[] = [
      { winner: 2, points: 90 },
      { winner: 0, points: 20 },
      { winner: 1, points: 10 },
      { winner: 3, points: 0 },
    ];
    const { result, details } = score(finished(tricks));
    expect(details.durchmarsch).toBeNull();
    expect(details.loser).toBe(2);
    expect(result.payments).toEqual([10, 10, -30, 10]);
  });

  it('Durchmarsch abgeschaltet: auch mit 91 Augen verliert man', () => {
    const tricks: T[] = [
      { winner: 2, points: 91 },
      { winner: 0, points: 29 },
      { winner: 1, points: 0 },
      { winner: 3, points: 0 },
    ];
    const { result, details } = score(finished(tricks, rules({ durchmarsch: false })));
    expect(details.durchmarsch).toBeNull();
    expect(details.loser).toBe(2);
    expect(result.payments).toEqual([10, 10, -30, 10]);
  });

  it('beide Unteroptionen aus: nur der Verlierer zahlt den einfachen Tarif', () => {
    const tricks: T[] = [
      { winner: 2, points: 100 },
      { winner: 0, points: 20 },
    ];
    const r = rules({ durchmarsch: false, jungfrau: false });
    const { result, details } = score(finished(tricks, r));
    expect(details).toMatchObject({ loser: 2, durchmarsch: null, jungfrauen: [] });
    expect(result.factors).toEqual([]);
    expect(result.payments).toEqual([10, 10, -30, 10]);
  });
});

describe('Ramsch: zufällige Spiele', () => {
  it('jedes Spiel beginnt mit „alle weiter“ und endet mit Zahlungssumme 0', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed);
      let state = dealHand(RAMSCH, seed % 4, seed);
      for (let step = 0; state.phase !== 'finished'; step++) {
        if (step > 100) throw new Error('endet nicht');
        const seat = state.turn;
        const action =
          state.phase === 'bidding'
            ? { type: 'bid' as const, seat, call: legalCalls(state, seat)[0]! }
            : { type: 'play' as const, seat, card: pick(legalCards(state, seat), rng) };
        const r = applyAction(state, action);
        if (!r.ok) throw new Error(`Seed ${seed}: ${r.error}`);
        state = r.state;
      }
      expect(state.contract).toEqual({ kind: 'ramsch' });
      expect(state.tricks).toHaveLength(8);
      const result = state.result!;
      expect(result.kind).toBe('played');
      expect(result.payments.reduce((a, b) => a + b, 0)).toBe(0);
      expect(result.outcome!.losers.length + result.outcome!.winners.length).toBe(4);
    }
  });
});
