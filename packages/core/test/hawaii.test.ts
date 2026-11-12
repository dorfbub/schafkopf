import { describe, expect, it } from 'vitest';
import {
  type BidCall,
  type Card,
  type CompletedTrick,
  type Contract,
  type HandState,
  type RuleSet,
  DEFAULT_RULES,
  HAWAII_SWITCH_TRICK,
  MODES,
  allContracts,
  availableKinds,
  allLevels,
  applyAction,
  bidValue,
  dealHand,
  effectiveSuit,
  followable,
  legalCards,
  legalContracts,
  orderFor,
  parseRuleOptions,
  scoreHand,
  trickWinnerIndex,
  trumpSuitFor,
  trumpsChange,
} from '../src';

/** Gras-Trumpf in den Stichen 1–4, Herz-Trumpf in den Stichen 5–8. */
const HAWAII: Contract = { kind: 'hawaii', suit: 'gras', suit2: 'herz' };
const AN: RuleSet = { ...DEFAULT_RULES, contracts: [...DEFAULT_RULES.contracts, 'hawaii'] };
const ERSTE = orderFor(HAWAII, 0);
const ZWEITE = orderFor(HAWAII, HAWAII_SWITCH_TRICK);

describe('Hawaii-Habicht: Ordnung', () => {
  it('Stiche 1–4: vier Könige, dann die erste Farbe A 10 O U 9 8 7', () => {
    const expected = ['EK', 'GK', 'HK', 'SK', 'GA', 'G10', 'GO', 'GU', 'G9', 'G8', 'G7'];
    for (const trick of [0, 1, 2, 3]) expect(orderFor(HAWAII, trick).trumps).toEqual(expected);
  });

  it('Stiche 5–8: vier Könige, dann die zweite Farbe', () => {
    const expected = ['EK', 'GK', 'HK', 'SK', 'HA', 'H10', 'HO', 'HU', 'H9', 'H8', 'H7'];
    for (const trick of [4, 5, 6, 7]) expect(orderFor(HAWAII, trick).trumps).toEqual(expected);
  });

  it('Könige sind durchgehend die höchsten Trümpfe, in der Reihenfolge E G H S', () => {
    for (const order of [ERSTE, ZWEITE]) {
      expect(trickWinnerIndex(['SK', 'GA', 'HA', 'E7'], order)).toBe(0);
      expect(trickWinnerIndex(['SK', 'HK', 'GK', 'EK'], order)).toBe(3);
      expect(effectiveSuit('EK', order)).toBe('trump');
      expect(effectiveSuit('SK', order)).toBe('trump');
    }
  });

  it('nach dem vierten Stich ist die erste Farbe wieder gewöhnliche Farbe', () => {
    expect(effectiveSuit('GA', ERSTE)).toBe('trump');
    expect(effectiveSuit('GA', ZWEITE)).toBe('gras');
    expect(effectiveSuit('HA', ERSTE)).toBe('herz');
    expect(effectiveSuit('HA', ZWEITE)).toBe('trump');
    // Ober und Unter sind gewöhnliche Farbkarten bzw. Trümpfe ihrer Farbe
    expect(effectiveSuit('EO', ERSTE)).toBe('eichel');
    expect(effectiveSuit('GU', ERSTE)).toBe('trump');
  });

  it('Stichgewinner in Stich 4 nach der ersten, in Stich 5 nach der zweiten Farbe', () => {
    const stich = ['HA', 'G7', 'H10', 'E7'] as Card[];
    expect(trickWinnerIndex(stich, orderFor(HAWAII, 3))).toBe(1);
    expect(trickWinnerIndex(stich, orderFor(HAWAII, 4))).toBe(0);
  });

  it('Bedienpflicht in Stich 4 nach der ersten, in Stich 5 nach der zweiten Farbe', () => {
    const hand: Card[] = ['G7', 'H7', 'EA'];
    expect(followable(hand, ['GA'], orderFor(HAWAII, 3))).toEqual(['G7']);
    expect(followable(hand, ['HA'], orderFor(HAWAII, 3))).toEqual(['H7']);
    expect(followable(hand, ['EK'], orderFor(HAWAII, 3))).toEqual(['G7']);
    expect(followable(hand, ['GA'], orderFor(HAWAII, 4))).toEqual(['G7']);
    expect(followable(hand, ['HA'], orderFor(HAWAII, 4))).toEqual(['H7']);
    expect(followable(hand, ['EK'], orderFor(HAWAII, 4))).toEqual(['H7']);
  });

  it('gültige Trumpffarbe je Stich', () => {
    expect(trumpsChange(HAWAII)).toBe(true);
    expect(trumpsChange({ kind: 'farbwenz', suit: 'gras' })).toBe(false);
    expect(trumpSuitFor(HAWAII, 0)).toBe('gras');
    expect(trumpSuitFor(HAWAII, 3)).toBe('gras');
    expect(trumpSuitFor(HAWAII, 4)).toBe('herz');
    expect(trumpSuitFor(HAWAII, 7)).toBe('herz');
    expect(trumpSuitFor({ kind: 'solo', suit: 'eichel' }, 5)).toBe('eichel');
    expect(trumpSuitFor({ kind: 'sauspiel', suit: 'eichel' }, 0)).toBeNull();
    expect(trumpSuitFor({ kind: 'wenz' }, 0)).toBeNull();
  });
});

/** Spielzustand mitten im Spiel: `done` Stiche sind fertig, Sitz 0 kommt heraus. */
function midGame(done: number, hands: Card[][]): HandState {
  const tricks: CompletedTrick[] = Array.from({ length: done }, () => ({
    leader: 0,
    cards: [],
    winner: 0,
    points: 0,
  }));
  return {
    ...dealHand(AN, 3, 1),
    phase: 'playing',
    contract: HAWAII,
    declarer: 0,
    hands,
    tricks,
    turn: 0,
    currentTrick: { leader: 0, cards: [] },
  };
}

function play(state: HandState, card: Card): HandState {
  const result = applyAction(state, { type: 'play', seat: state.turn, card });
  if (!result.ok) throw new Error(`${result.error}: ${card}`);
  return result.state;
}

describe('Hawaii-Habicht: Trumpfwechsel im Spiel', () => {
  const HANDS: Card[][] = [
    ['G7', 'EA'],
    ['GA', 'HA'],
    ['H7', 'E7'],
    ['SK', 'E8'],
  ];

  it('Stich 4: Gras ist Trumpf, der Schellen-König muss zugeben und sticht', () => {
    let state = play(midGame(3, HANDS), 'G7');
    expect(legalCards(state, 1)).toEqual(['GA']);
    state = play(state, 'GA');
    expect(legalCards(state, 2)).toEqual(['H7', 'E7']);
    state = play(state, 'H7');
    expect(legalCards(state, 3)).toEqual(['SK']);
    state = play(state, 'SK');
    expect(state.tricks[3]!.winner).toBe(3);
  });

  it('Stich 5: Gras ist gewöhnliche Farbe, der Herz-Siebener sticht', () => {
    let state = play(midGame(4, HANDS), 'G7');
    expect(legalCards(state, 1)).toEqual(['GA']);
    state = play(state, 'GA');
    state = play(state, 'H7');
    expect(legalCards(state, 3)).toEqual(['SK', 'E8']);
    state = play(state, 'E8');
    expect(state.tricks[4]!.winner).toBe(2);
  });
});

/** Kommt zur Stufe 3 mit Sitz 0 als einzigem Interessenten. */
function toDeclare(): HandState {
  let state = dealHand(AN, 3, 5);
  for (const call of [
    { type: 'interest' },
    { type: 'pass' },
    { type: 'pass' },
    { type: 'pass' },
  ] as BidCall[]) {
    const result = applyAction(state, { type: 'bid', seat: state.turn, call });
    if (!result.ok) throw new Error(result.error);
    state = result.state;
  }
  expect(state.auction.stage).toBe('declare');
  return state;
}

describe('Hawaii-Habicht: Ansage', () => {
  it('beide Farben müssen verschieden sein', () => {
    const hawaii = allContracts(AN).filter((c) => c.kind === 'hawaii');
    // 4 × 3 Paare, jeweils mit und ohne Tout
    expect(hawaii).toHaveLength(24);
    expect(hawaii.every((c) => c.suit && c.suit2 && c.suit !== c.suit2)).toBe(true);
    const state = toDeclare();
    expect(legalContracts(state, 0).filter((c) => c.kind === 'hawaii')).toHaveLength(24);
    const same = applyAction(state, {
      type: 'bid',
      seat: 0,
      call: { type: 'declare', contract: { kind: 'hawaii', suit: 'gras', suit2: 'gras' } },
    });
    expect(same).toEqual({ ok: false, error: 'illegal_bid' });
    const one = applyAction(state, {
      type: 'bid',
      seat: 0,
      call: { type: 'declare', contract: { kind: 'hawaii', suit: 'gras' } },
    });
    expect(one).toEqual({ ok: false, error: 'illegal_bid' });
  });

  it('die Ansage trägt beide Farben, fremde Felder fallen weg', () => {
    const contract = { ...HAWAII, extra: 'x' } as Contract;
    const result = applyAction(toDeclare(), {
      type: 'bid',
      seat: 0,
      call: { type: 'declare', contract },
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.state.contract).toEqual(HAWAII);
    expect(result.state.phase).toBe('playing');
  });

  it('suit2 gilt nur beim Hawaii-Habicht', () => {
    const result = applyAction(toDeclare(), {
      type: 'bid',
      seat: 0,
      call: { type: 'declare', contract: { kind: 'farbwenz', suit: 'gras', suit2: 'herz' } },
    });
    expect(result).toEqual({ ok: false, error: 'illegal_bid' });
  });

  it('steht zwischen Geier und Farbwenz', () => {
    expect(bidValue({ kind: 'geier' })).toBeLessThan(bidValue({ kind: 'hawaii' }));
    expect(bidValue({ kind: 'hawaii' })).toBeLessThan(bidValue({ kind: 'farbwenz' }));
    const levels = allLevels(AN).map((l) => l.kind);
    expect(levels.indexOf('hawaii')).toBeGreaterThan(levels.indexOf('geier'));
    expect(levels.indexOf('hawaii')).toBeLessThan(levels.indexOf('farbwenz'));
  });

  it('Tout schlägt jedes Spiel ohne Tout, aber keinen höheren Tout', () => {
    expect(bidValue({ kind: 'hawaii', tout: true })).toBeGreaterThan(bidValue({ kind: 'solo' }));
    expect(bidValue({ kind: 'hawaii', tout: true })).toBeGreaterThan(
      bidValue({ kind: 'geier', tout: true }),
    );
    expect(bidValue({ kind: 'hawaii', tout: true })).toBeLessThan(
      bidValue({ kind: 'farbwenz', tout: true }),
    );
  });

  it('ist standardmäßig nicht ansagbar; Tout nur, wenn erlaubt', () => {
    expect(DEFAULT_RULES.contracts).not.toContain('hawaii');
    expect(allContracts(DEFAULT_RULES).some((c) => c.kind === 'hawaii')).toBe(false);
    const ohneTout = allContracts({ ...AN, allowTout: false }).filter((c) => c.kind === 'hawaii');
    expect(ohneTout).toHaveLength(12);
    expect(ohneTout.some((c) => c.tout)).toBe(false);
  });

  it('Tischregeln mit Hawaii-Habicht und Schwelle werden angenommen', () => {
    expect(parseRuleOptions({ ...AN, contracts: ['hawaii', 'sauspiel'] })?.contracts).toEqual([
      'sauspiel',
      'hawaii',
    ]);
    expect(DEFAULT_RULES.laufende.hawaii).toBe(2);
    expect(parseRuleOptions({ ...AN, laufende: { ...AN.laufende, hawaii: 9 } })).toBeNull();
  });

  it('ist ein Einzelspiel mit zwei Farben, Tout, Laufenden und Solo-Tarif', () => {
    const m = MODES.hawaii;
    expect([m.suitRole, m.suitCount, m.parties, m.tariff, m.canTout, m.hasLaufende]).toEqual([
      'trump',
      2,
      'alone',
      'solo',
      true,
      true,
    ]);
  });
});

function finished(contract: Contract, initialHands: Card[][], points = 80, tricks = 4): HandState {
  const list: CompletedTrick[] = Array.from({ length: 8 }, (_, i) => ({
    leader: 0,
    cards: [],
    winner: i < tricks ? 0 : 1,
    points: i === 0 ? points : i === tricks ? 120 - points : 0,
  }));
  return {
    ...dealHand(AN, 3, 7),
    phase: 'finished',
    contract,
    declarer: 0,
    partner: null,
    initialHands,
    hands: [[], [], [], []],
    tricks: list,
  };
}

function value(state: HandState) {
  const r = scoreHand(state);
  if (r.kind !== 'played') throw new Error('nicht gespielt');
  const d = r.outcome!.details;
  if (d.type !== 'party') throw new Error('kein Parteispiel');
  return { ...d, value: r.outcome!.value, payments: r.payments };
}

/** Alle Könige und dazu die höchsten Trümpfe beider Farben beim Spieler. */
const ALLE: Card[][] = [
  ['EK', 'GK', 'HK', 'SK', 'GA', 'G10', 'HA', 'H10'],
  ['EA', 'E10', 'EO', 'EU', 'E9', 'E8', 'E7', 'GO'],
  ['SA', 'S10', 'SO', 'SU', 'S9', 'S8', 'S7', 'GU'],
  ['HO', 'HU', 'H9', 'H8', 'H7', 'G9', 'G8', 'G7'],
];
const ZWEI: Card[][] = [
  ['EK', 'GK', 'GA', 'G10', 'HA', 'H10', 'EA', 'SA'],
  ['HK', 'SK', 'E10', 'EO', 'EU', 'E9', 'E8', 'E7'],
  ['S10', 'SO', 'SU', 'S9', 'S8', 'S7', 'GO', 'GU'],
  ['HO', 'HU', 'H9', 'H8', 'H7', 'G9', 'G8', 'G7'],
];
const EINE: Card[][] = [
  ['EK', 'HK', 'GA', 'G10', 'HA', 'H10', 'EA', 'SA'],
  ['GK', 'SK', 'E10', 'EO', 'EU', 'E9', 'E8', 'E7'],
  ['S10', 'SO', 'SU', 'S9', 'S8', 'S7', 'GO', 'GU'],
  ['HO', 'HU', 'H9', 'H8', 'H7', 'G9', 'G8', 'G7'],
];

describe('Hawaii-Habicht: Abrechnung', () => {
  it('Gewinn zum Einzelspiel-Tarif', () => {
    const r = value(finished(HAWAII, EINE));
    expect(r.won).toBe(true);
    expect(r.laufende).toBe(0);
    expect(r.payments).toEqual([150, -50, -50, -50]);
  });

  it('Laufende zählen nur über die Könige, ab zwei', () => {
    expect(value(finished(HAWAII, ZWEI)).laufende).toBe(2);
    expect(value(finished(HAWAII, ZWEI)).value).toBe(70);
    expect(value(finished(HAWAII, EINE)).laufende).toBe(0);
  });

  it('Laufende zählen höchstens vier, auch mit den höchsten Farb-Trümpfen dazu', () => {
    expect(value(finished(HAWAII, ALLE)).laufende).toBe(4);
    // Grundtarif und vier Laufende; Gras- und Herz-Sau zählen nicht mit
    expect(value(finished(HAWAII, ALLE)).value).toBe(50 + 40);
  });

  it('Tout gewonnen: alle Stiche, Tout-Aufschlag', () => {
    const tout = value(finished({ ...HAWAII, tout: true }, ALLE, 120, 8));
    expect(tout.won).toBe(true);
    expect(tout.value).toBe((50 + 40) * 2);
  });

  it('Tout verloren: ein verlorener Stich genügt', () => {
    const r = value(finished({ ...HAWAII, tout: true }, ALLE, 110, 7));
    expect(r.won).toBe(false);
    expect(r.payments[0]).toBeLessThan(0);
  });
});

describe('Hawaii-Habicht und Besetzung (Annahme 58)', () => {
  it('ist mit langer Karte zu viert und zu dritt mit kurzer Karte ansagbar, mit kurzer Karte zu viert nicht', () => {
    const contracts = [...DEFAULT_RULES.contracts, 'hawaii' as const];
    expect(availableKinds({ contracts, players: 4, deck: 'lang' })).toContain('hawaii');
    expect(availableKinds({ contracts, players: 3, deck: 'kurz' })).toContain('hawaii');
    expect(availableKinds({ contracts, players: 4, deck: 'kurz' })).not.toContain('hawaii');
  });
});
