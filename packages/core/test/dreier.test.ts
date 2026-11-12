import { describe, expect, it } from 'vitest';
import {
  type BidCall,
  type Card,
  type CompletedTrick,
  type Contract,
  type HandState,
  type RuleSet,
  ALL_PASSED,
  DEFAULT_RULES,
  TABLE_SETUPS,
  allContracts,
  applyAction,
  availableKinds,
  canDouble,
  createDeck,
  createRng,
  dealHand,
  legalCalls,
  legalCards,
  legalPreludeMoves,
  parseRuleOptions,
  pick,
  scoreHand,
} from '../src';

/** Kurze Karte zu viert („Kurzer“) und zu dritt („Dreier“), siehe REGELN.md, Annahmen 50–59. */
const KURZ4: RuleSet = { ...DEFAULT_RULES, deck: 'kurz' };
const DREIER: RuleSet = { ...DEFAULT_RULES, players: 3, deck: 'kurz' };

const PASS: BidCall = { type: 'pass' };
const WOULD: BidCall = { type: 'interest' };

/** Spiel mit festen Händen; Sitz 0 kommt heraus (Geber ist der letzte Sitz). */
function handWith(rules: RuleSet, hands: Card[][]): HandState {
  const state = dealHand(rules, rules.players - 1, 1);
  return { ...state, hands, initialHands: hands.map((h) => [...h]) };
}

function act(state: HandState, action: Parameters<typeof applyAction>[1]): HandState {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`${result.error}: ${JSON.stringify(action)}`);
  return result.state;
}

/** Sitz 0 sagt „Ich würde“, alle anderen „weiter“: Sitz 0 nennt sein Spiel. */
function declareStage(state: HandState): HandState {
  let s = act(state, { type: 'bid', seat: 0, call: WOULD });
  for (let seat = 1; seat < state.rules.players; seat++) {
    s = act(s, { type: 'bid', seat, call: PASS });
  }
  return s;
}

/** Sitz 0 sagt `contract` an, alle anderen „weiter“. */
function declare(state: HandState, contract: Contract): HandState {
  return act(declareStage(state), { type: 'bid', seat: 0, call: { type: 'declare', contract } });
}

/** Fertiges Spiel mit den gegebenen Stichen (Karten nur, wo sie zählen). */
function finished(
  rules: RuleSet,
  contract: Contract,
  initialHands: Card[][],
  tricks: { winner: number; points: number }[],
): HandState {
  const done: CompletedTrick[] = tricks.map((t) => ({ leader: 0, cards: [], ...t }));
  return {
    ...dealHand(rules, rules.players - 1, 7),
    phase: 'finished',
    contract,
    declarer: 0,
    partner: null,
    initialHands,
    hands: initialHands.map(() => []),
    tricks: done,
  };
}

/** Optionen eines Regelsatzes, wie sie die Lobby schickt. */
function options(rules: RuleSet): unknown {
  return structuredClone(rules);
}

describe('Besetzungen (Annahme 50)', () => {
  it('erlaubt sind 4/lang, 4/kurz und 3/kurz – lange Karte zu dritt nicht', () => {
    expect(TABLE_SETUPS).toEqual([
      { players: 4, deck: 'lang' },
      { players: 4, deck: 'kurz' },
      { players: 3, deck: 'kurz' },
    ]);
    expect(parseRuleOptions(options(KURZ4))).toMatchObject({ players: 4, deck: 'kurz' });
    expect(parseRuleOptions(options(DREIER))).toMatchObject({ players: 3, deck: 'kurz' });
    expect(parseRuleOptions(options({ ...DREIER, deck: 'lang' }))).toBeNull();
    expect(parseRuleOptions(options({ ...DEFAULT_RULES, players: 5 }))).toBeNull();
    expect(parseRuleOptions(options({ ...DEFAULT_RULES, players: 2, deck: 'kurz' }))).toBeNull();
    expect(parseRuleOptions(options({ ...DEFAULT_RULES, deck: 'mittel' as 'kurz' }))).toBeNull();
  });

  it('zu dritt kein Muss und mindestens ein Einzelspiel (Annahmen 51, 53)', () => {
    expect(parseRuleOptions(options({ ...DREIER, allPassed: 'muss' }))).toBeNull();
    expect(parseRuleOptions(options({ ...KURZ4, allPassed: 'muss' }))).not.toBeNull();
    const nurPartner: RuleSet = { ...DREIER, contracts: ['sauspiel', 'hochzeit'] };
    expect(parseRuleOptions(options(nurPartner))).toBeNull();
    expect(parseRuleOptions(options({ ...nurPartner, players: 4 }))).not.toBeNull();
    expect(parseRuleOptions(options({ ...DREIER, contracts: ['sauspiel', 'wenz'] }))).toEqual(
      expect.objectContaining({ contracts: ['sauspiel', 'wenz'] }),
    );
  });

  it('kurze Karte: 24 Karten ohne 7er und 8er, zu viert 6, zu dritt 8 je Spieler', () => {
    const kurz = createDeck('kurz');
    expect(kurz).toHaveLength(24);
    expect(kurz.some((c) => c.endsWith('7') || c.endsWith('8'))).toBe(false);
    for (const [rules, size] of [
      [KURZ4, 6],
      [DREIER, 8],
    ] as const) {
      const state = dealHand(rules, 0, 42);
      expect(state.hands).toHaveLength(rules.players);
      expect(state.hands.every((h) => h.length === size)).toBe(true);
      expect(new Set(state.hands.flat())).toEqual(new Set(kurz));
      expect(state.turn).toBe(1);
    }
  });
});

describe('Spielarten zu dritt (Annahme 51)', () => {
  it('Sauspiel, Hochzeit und arabische Hochzeit sind nicht ansagbar, auch wenn eingeschaltet', () => {
    const rules: RuleSet = {
      ...DREIER,
      contracts: [
        'sauspiel',
        'arabischeHochzeit',
        'hochzeit',
        'bettel',
        'eisenbahner',
        'geier',
        'farbwenz',
        'wenz',
        'solo',
      ],
    };
    expect(availableKinds(rules)).toEqual([
      'bettel',
      'eisenbahner',
      'geier',
      'farbwenz',
      'wenz',
      'solo',
    ]);
    const kinds = new Set(allContracts(rules).map((c) => c.kind));
    expect(kinds.has('sauspiel') || kinds.has('hochzeit') || kinds.has('arabischeHochzeit')).toBe(
      false,
    );
    // Zu viert bleiben sie ansagbar.
    expect(availableKinds({ ...rules, players: 4 })).toContain('sauspiel');
  });

  it('wer allein „Ich würde“ sagt, kann nur Einzelspiele nennen – kein Ruf, keine Hochzeit', () => {
    // Sitz 0 hat genau einen Trumpf (Hochzeit) und könnte Eichel oder Gras rufen.
    const rules: RuleSet = { ...DREIER, contracts: ['sauspiel', 'hochzeit', 'wenz'] };
    const state = declareStage(
      handWith(rules, [
        ['EO', 'EK', 'E9', 'GK', 'G10', 'SA', 'S10', 'SK'],
        ['GO', 'HO', 'SO', 'EU', 'GU', 'HU', 'SU', 'HA'],
        ['H10', 'HK', 'H9', 'EA', 'E10', 'GA', 'G9', 'S9'],
      ]),
    );
    expect(legalCalls(state, 0)).toEqual([
      { type: 'declare', contract: { kind: 'wenz' } },
      { type: 'declare', contract: { kind: 'wenz', tout: true } },
    ]);
  });

  it('Zweikampf zu dritt: der Spätere muss überbieten, der Frühere hält', () => {
    const state = handWith(DREIER, [
      ['EU', 'GU', 'EA', 'E10', 'GA', 'G10', 'SA', 'S10'],
      ['EO', 'GO', 'HO', 'SO', 'HU', 'SU', 'HA', 'H10'],
      ['HK', 'H9', 'EK', 'E9', 'GK', 'G9', 'SK', 'S9'],
    ]);
    let s = act(state, { type: 'bid', seat: 0, call: WOULD });
    s = act(s, { type: 'bid', seat: 1, call: WOULD });
    s = act(s, { type: 'bid', seat: 2, call: PASS });
    expect(s.auction).toMatchObject({ stage: 'duel', holder: 0, challenger: 1 });
    s = act(s, { type: 'bid', seat: 1, call: { type: 'name', level: { kind: 'solo' } } });
    expect(s.turn).toBe(0);
    s = act(s, { type: 'bid', seat: 0, call: { type: 'yield' } });
    expect(s.auction).toMatchObject({ stage: 'declare', holder: 1 });
  });
});

describe('Abrechnung zu dritt (Annahme 52)', () => {
  const HANDS: Card[][] = [
    ['EO', 'GO', 'EA', 'E10', 'GA', 'G10', 'SA', 'S10'],
    ['HO', 'SO', 'EU', 'GU', 'HU', 'SU', 'HA', 'H10'],
    ['HK', 'H9', 'EK', 'E9', 'GK', 'G9', 'SK', 'S9'],
  ];

  it('der Spieler bekommt den Spielwert von jedem der zwei Gegner', () => {
    // Herz-Solo, 2 Laufende (unter der Schwelle 3), 80 Augen: Grundtarif 50.
    const won = finished(DREIER, { kind: 'solo', suit: 'herz' }, HANDS, [
      { winner: 0, points: 80 },
      { winner: 1, points: 40 },
      ...Array.from({ length: 6 }, () => ({ winner: 0, points: 0 })),
    ]);
    const result = scoreHand(won);
    expect(result.outcome!.value).toBe(50);
    expect(result.payments).toEqual([100, -50, -50]);
  });

  it('verliert er, zahlt er jedem der zwei; Schneider gilt wie zu viert', () => {
    const lost = finished(DREIER, { kind: 'wenz' }, HANDS, [
      { winner: 0, points: 29 },
      { winner: 2, points: 91 },
      ...Array.from({ length: 6 }, () => ({ winner: 1, points: 0 })),
    ]);
    const result = scoreHand(lost);
    // Wenz ohne Laufende für Sitz 0 (Eichel-Unter bei Sitz 1 → Gegner haben 4 Laufende).
    expect(result.outcome!.parts.map((p) => p.label)).toEqual([
      'grundtarif',
      'schneider',
      'laufende',
    ]);
    expect(result.outcome!.value).toBe(50 + 10 + 4 * 10);
    expect(result.payments).toEqual([-200, 100, 100]);
  });

  it('Sie zu dritt: alle vier Ober und Unter im Solo zählen vierfach', () => {
    const sie: Card[][] = [
      ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HU', 'SU'],
      ['EA', 'E10', 'GA', 'G10', 'SA', 'S10', 'HA', 'H10'],
      ['HK', 'H9', 'EK', 'E9', 'GK', 'G9', 'SK', 'S9'],
    ];
    const state = finished(DREIER, { kind: 'solo', suit: 'eichel' }, sie, [
      ...Array.from({ length: 8 }, (_, i) => ({ winner: 0, points: i === 0 ? 120 : 0 })),
    ]);
    const result = scoreHand(state);
    expect(result.outcome!.details).toMatchObject({ sie: true });
    expect(result.payments).toEqual([400, -200, -200]);
  });

  it('Kontra dürfen beide Gegenspieler sagen, Re der Spieler', () => {
    const rules: RuleSet = { ...DREIER, kontra: true };
    const state = declare(handWith(rules, HANDS), { kind: 'solo', suit: 'eichel' });
    expect([0, 1, 2].map((s) => canDouble(state, s))).toEqual([false, true, true]);
    const after = act(state, { type: 'double', seat: 2 });
    expect([0, 1, 2].map((s) => canDouble(after, s))).toEqual([true, false, false]);
  });
});

describe('Alle „weiter“ zu dritt (Annahme 53)', () => {
  const allPass = (rules: RuleSet) => {
    let s = dealHand(rules, 2, 5);
    for (let seat = 0; seat < 3; seat++) s = act(s, { type: 'bid', seat, call: PASS });
    return s;
  };

  it('Zusammenwerfen und Stock wie zu viert, der Pott hat drei Einsätze', () => {
    expect(allPass(DREIER).result).toMatchObject({ kind: 'passed', payments: [0, 0, 0] });
    const stock = allPass({ ...DREIER, allPassed: 'stock' });
    expect(stock.result).toMatchObject({ payments: [-10, -10, -10], potDelta: 30 });
  });

  it('Ramsch zu dritt: der Verlierer zahlt an jeden der zwei anderen', () => {
    let s = allPass({
      ...DREIER,
      allPassed: 'ramsch',
      ramsch: { durchmarsch: false, jungfrau: false },
    });
    expect(s.phase).toBe('playing');
    const rng = createRng(3);
    while (s.phase !== 'finished')
      s = act(s, { type: 'play', seat: s.turn, card: pick(legalCards(s, s.turn), rng) });
    expect(s.tricks).toHaveLength(8);
    const details = s.result!.outcome!.details;
    if (details.type !== 'ramsch') throw new Error('kein Ramsch');
    const loser = details.loser!;
    expect(s.result!.payments[loser]).toBe(-20);
    expect(s.result!.payments.filter((p) => p === 10)).toHaveLength(2);
  });

  it('Muss wird zu dritt zum Zusammenwerfen (Schutz für fremde Regelsätze)', () => {
    const state = dealHand({ ...DREIER, allPassed: 'muss' }, 2, 5);
    expect(ALL_PASSED.muss(state)).toEqual({ type: 'fallback', rule: 'zusammenwerfen' });
  });
});

describe('Kurze Karte (Annahmen 54–58)', () => {
  it('Laufende zählen über die Trümpfe des kurzen Blatts', () => {
    // Wenz zu viert mit kurzer Karte: Sitz 0 hat Eichel- und Gras-Unter → 2 Laufende.
    const hands: Card[][] = [
      ['EU', 'GU', 'EA', 'E10', 'GA', 'G10'],
      ['HU', 'SA', 'S10', 'SK', 'S9', 'EK'],
      ['SU', 'HA', 'H10', 'HK', 'H9', 'E9'],
      ['EO', 'GO', 'HO', 'SO', 'GK', 'G9'],
    ];
    const state = finished(KURZ4, { kind: 'wenz' }, hands, [
      { winner: 0, points: 70 },
      { winner: 1, points: 50 },
      ...Array.from({ length: 4 }, () => ({ winner: 0, points: 0 })),
    ]);
    const result = scoreHand(state);
    expect(result.outcome!.details).toMatchObject({ laufende: 2, won: true, schneider: false });
    expect(result.outcome!.value).toBe(50 + 20);
    expect(result.payments).toEqual([210, -70, -70, -70]);
  });

  it('kurz zu viert gibt es keine Sie – auch vier Ober und zwei Unter sind ein gewöhnliches Solo', () => {
    const hands: Card[][] = [
      ['EO', 'GO', 'HO', 'SO', 'EU', 'GU'],
      ['HU', 'SA', 'S10', 'SK', 'S9', 'EK'],
      ['SU', 'HA', 'H10', 'HK', 'H9', 'E9'],
      ['EA', 'E10', 'GA', 'G10', 'GK', 'G9'],
    ];
    const state = finished(KURZ4, { kind: 'solo', suit: 'herz' }, hands, [
      ...Array.from({ length: 6 }, (_, i) => ({ winner: 0, points: i === 0 ? 120 : 0 })),
    ]);
    const result = scoreHand(state);
    expect(result.outcome!.details).toMatchObject({ sie: false, schwarz: true, laufende: 6 });
  });

  it('Davonlaufen geht mit kurzer Karte ab drei Karten der Ruffarbe', () => {
    // Sitz 0 ruft die Gras-Sau; Sitz 2 hat Gras-Sau, -Zehner und -König.
    const hands: Card[][] = [
      ['EO', 'GO', 'HA', 'G9', 'EA', 'SA'],
      ['HO', 'SO', 'EU', 'E10', 'EK', 'E9'],
      ['GA', 'G10', 'GK', 'S10', 'SK', 'S9'],
      ['GU', 'HU', 'SU', 'H10', 'HK', 'H9'],
    ];
    const gras: Contract = { kind: 'sauspiel', suit: 'gras' };
    // Sitz 2 kommt heraus (Geber Sitz 1) und darf mit dem Gras-Zehner davonlaufen.
    let state: HandState = {
      ...dealHand(KURZ4, 1, 1),
      hands,
      initialHands: hands.map((h) => [...h]),
    };
    state = act(state, { type: 'bid', seat: 2, call: PASS });
    state = act(state, { type: 'bid', seat: 3, call: PASS });
    state = act(state, { type: 'bid', seat: 0, call: WOULD });
    state = act(state, { type: 'bid', seat: 1, call: PASS });
    state = act(state, { type: 'bid', seat: 0, call: { type: 'declare', contract: gras } });
    expect(state.turn).toBe(2);
    expect(legalCards(state, 2)).toContain('G10');
    // Bei langer Karte wären es zu wenige.
    const lang = { ...state, rules: DEFAULT_RULES };
    expect(legalCards(lang, 2)).not.toContain('G10');
    // Ohne Davonlaufen nur mit der Sau.
    const ohne = { ...state, rules: { ...KURZ4, davonlaufen: false } };
    expect(legalCards(ohne, 2)).not.toContain('G10');
  });

  it('Hochzeit mit kurzer Karte zu viert: Tausch wie bei langer Karte', () => {
    const rules: RuleSet = { ...KURZ4, contracts: [...KURZ4.contracts, 'hochzeit'] };
    const hands: Card[][] = [
      ['EO', 'EA', 'E10', 'GA', 'G10', 'SA'],
      ['GO', 'HO', 'SO', 'EU', 'GU', 'EK'],
      ['HU', 'SU', 'HA', 'H10', 'HK', 'H9'],
      ['E9', 'GK', 'G9', 'S10', 'SK', 'S9'],
    ];
    let state = declare(handWith(rules, hands), { kind: 'hochzeit' });
    expect(state.phase).toBe('prelude');
    state = act(state, { type: 'prelude', seat: 1, move: { type: 'accept' } });
    expect(state.hands[1]).toHaveLength(7);
    state = act(state, { type: 'prelude', seat: 1, move: { type: 'give', cards: ['EK'] } });
    expect(state.phase).toBe('playing');
    expect(state.partner).toBe(1);
    expect(state.hands.every((h) => h.length === 6)).toBe(true);
    expect(state.hands[0]).toContain('EK');
  });
});

describe('Zufallsspiele mit kurzer Karte', () => {
  const ALL: RuleSet['contracts'] = [
    'sauspiel',
    'arabischeHochzeit',
    'hochzeit',
    'bettel',
    'eisenbahner',
    'geier',
    'farbwenz',
    'wenz',
    'solo',
  ];
  const cases: [string, RuleSet, number][] = [
    ['kurz zu viert', { ...KURZ4, contracts: ALL, kontra: true, allPassed: 'muss' }, 6],
    ['kurz zu viert, Ramsch', { ...KURZ4, allPassed: 'ramsch' }, 6],
    ['zu dritt', { ...DREIER, contracts: ALL, kontra: true, allPassed: 'ramsch' }, 8],
    ['zu dritt, Stock', { ...DREIER, allPassed: 'stock' }, 8],
  ];

  for (const [label, rules, tricks] of cases) {
    it(`${label}: regelkonform bis zur Abrechnung`, () => {
      expect(parseRuleOptions(options(rules))).not.toBeNull();
      for (let seed = 1; seed <= 200; seed++) {
        const rng = createRng(seed);
        let state = dealHand(rules, seed % rules.players, seed);
        while (state.phase !== 'finished') {
          const seat = state.turn;
          if (state.phase === 'bidding') {
            const calls = legalCalls(state, seat);
            expect(calls.length).toBeGreaterThan(0);
            const call = rng() < 0.4 || calls[0]!.type === 'declare' ? pick(calls, rng) : calls[0]!;
            state = act(state, { type: 'bid', seat, call });
          } else if (state.phase === 'prelude') {
            const moves = legalPreludeMoves(state, seat);
            state = act(state, { type: 'prelude', seat, move: pick(moves, rng) });
          } else {
            if (rng() < 0.1) {
              const doubler = [0, 1, 2, 3].find((s) => s < rules.players && canDouble(state, s));
              if (doubler !== undefined) state = act(state, { type: 'double', seat: doubler });
            }
            state = act(state, { type: 'play', seat, card: pick(legalCards(state, seat), rng) });
          }
        }
        const result = state.result!;
        expect(result.payments).toHaveLength(rules.players);
        expect(result.payments.reduce((a, b) => a + b, 0) + result.potDelta).toBe(0);
        if (result.kind === 'played') {
          expect(state.tricks).toHaveLength(tricks);
          expect(state.tricks.reduce((sum, t) => sum + t.points, 0)).toBe(120);
          if (rules.players === 3) {
            expect(['sauspiel', 'hochzeit', 'arabischeHochzeit']).not.toContain(
              state.contract!.kind,
            );
          }
        }
      }
    });
  }
});
