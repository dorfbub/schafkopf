import { describe, expect, it } from 'vitest';
import {
  type Action,
  type BidCall,
  type Card,
  type HandState,
  type PreludeMove,
  type RuleSet,
  DEFAULT_RULES,
  MODES,
  applyAction,
  bidValue,
  canDouble,
  dealHand,
  handViewFor,
  legalCalls,
  legalContracts,
  legalPreludeMoves,
  newHandLog,
  replay,
} from '../src';

const HOCHZEIT: RuleSet = { ...DEFAULT_RULES, contracts: [...DEFAULT_RULES.contracts, 'hochzeit'] };

// Sitz 0 hat genau einen Trumpf (Schellen-Unter) und alle drei Farb-Säue – ein Sauspiel kann er
// nicht rufen. Sitz 1 und 2 könnten ein Sauspiel auf die Eichel-Sau spielen.
const HANDS: Card[][] = [
  ['SU', 'EA', 'E10', 'EK', 'GA', 'G10', 'SA', 'S10'],
  ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'E9', 'G9'],
  ['HU', 'HA', 'H10', 'HK', 'E8', 'G8', 'S9', 'S8'],
  ['H9', 'H8', 'H7', 'E7', 'GK', 'G7', 'SK', 'S7'],
];

// Wie oben, aber Sitz 1 hat nur Trümpfe.
const ALL_TRUMPS: Card[][] = [
  HANDS[0]!,
  ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HU', 'HA'],
  ['H10', 'HK', 'E9', 'G9', 'E8', 'G8', 'S9', 'S8'],
  HANDS[3]!,
];

/** Feste Hände, Geber Sitz 3 – Sitz 0 sagt zuerst an. */
function deal(hands: Card[][] = HANDS, rules: RuleSet = HOCHZEIT): HandState {
  return { ...dealHand(rules, 3, 1), hands, initialHands: hands.map((h) => [...h]) };
}

function act(state: HandState, action: Action): HandState {
  const r = applyAction(state, action);
  if (!r.ok) throw new Error(`${JSON.stringify(action)}: ${r.error}`);
  return r.state;
}

const bid = (state: HandState, seat: number, call: BidCall) =>
  act(state, { type: 'bid', seat, call });
const move = (state: HandState, seat: number, m: PreludeMove) =>
  act(state, { type: 'prelude', seat, move: m });
const decline = (state: HandState, seat: number) => move(state, seat, { type: 'decline' });
const accept = (state: HandState, seat: number) => move(state, seat, { type: 'accept' });
const give = (state: HandState, seat: number, cards: Card[]) =>
  move(state, seat, { type: 'give', cards });

/** Nur Sitz 0 will spielen und sagt Hochzeit an. */
function declared(hands: Card[][] = HANDS, rules: RuleSet = HOCHZEIT): HandState {
  let s = bid(deal(hands, rules), 0, { type: 'interest' });
  for (const seat of [1, 2, 3]) s = bid(s, seat, { type: 'pass' });
  return bid(s, 0, { type: 'declare', contract: { kind: 'hochzeit' } });
}

/** Sitz 0 und 1 wollen spielen; 1 nennt Sauspiel, 0 hält mit der Hochzeit, 1 gibt auf. */
function displaced(): HandState {
  let s = bid(deal(), 0, { type: 'interest' });
  s = bid(s, 1, { type: 'interest' });
  s = bid(s, 2, { type: 'pass' });
  s = bid(s, 3, { type: 'pass' });
  s = bid(s, 1, { type: 'name', level: { kind: 'sauspiel' } });
  s = bid(s, 0, { type: 'hold' });
  s = bid(s, 1, { type: 'yield' });
  return bid(s, 0, { type: 'declare', contract: { kind: 'hochzeit' } });
}

/** Spielt mit der jeweils ersten erlaubten Karte zu Ende. */
function playOut(state: HandState): HandState {
  let s = state;
  while (s.phase === 'playing') {
    const view = handViewFor(s, s.turn);
    s = act(s, { type: 'play', seat: s.turn, card: view.legalCards[0]! });
  }
  return s;
}

describe('Hochzeit – Ansage', () => {
  it('ansagbar nur mit genau einem Trumpf', () => {
    const eligible = MODES.hochzeit.eligible!;
    expect(eligible(HANDS[0]!)).toBe(true);
    expect(eligible(HANDS[2]!)).toBe(false); // vier Trümpfe
    expect(eligible(['EA', 'E10', 'EK', 'E9', 'GA', 'G10', 'SA', 'S10'])).toBe(false); // keiner
    expect(eligible(['SU', 'HA', 'EK', 'E9', 'GA', 'G10', 'SA', 'S10'])).toBe(false); // zwei

    const s = bid(
      bid(bid(bid(deal(), 0, { type: 'pass' }), 1, { type: 'pass' }), 2, { type: 'pass' }),
      3,
      { type: 'interest' },
    );
    // Sitz 3 spielt allein weiter; die Hochzeit darf er mit drei Trümpfen nicht nennen.
    expect(legalContracts(s, 3).some((c) => c.kind === 'hochzeit')).toBe(false);
  });

  it('mit einem Trumpf und ohne rufbare Sau: Hochzeit statt Sauspiel', () => {
    let s = bid(deal(), 0, { type: 'interest' });
    for (const seat of [1, 2, 3]) s = bid(s, seat, { type: 'pass' });
    expect(legalContracts(s, 0)).toContainEqual({ kind: 'hochzeit' });
    expect(legalContracts(s, 0).some((c) => c.kind === 'sauspiel')).toBe(false);
    // Ohne die Tischregel gibt es keine Hochzeit.
    s = bid(deal(HANDS, DEFAULT_RULES), 0, { type: 'interest' });
    for (const seat of [1, 2, 3]) s = bid(s, seat, { type: 'pass' });
    expect(legalContracts(s, 0).some((c) => c.kind === 'hochzeit')).toBe(false);
  });

  it('Rang über dem Sauspiel, unter dem Bettel; kein Tout', () => {
    expect(bidValue({ kind: 'hochzeit' })).toBeGreaterThan(bidValue({ kind: 'sauspiel' }));
    expect(bidValue({ kind: 'hochzeit' })).toBeLessThan(bidValue({ kind: 'bettel' }));
    expect(MODES.hochzeit.canTout).toBe(false);
  });

  it('im Zweikampf hält die Hochzeit gegen ein Sauspiel', () => {
    let s = bid(deal(), 0, { type: 'interest' });
    s = bid(s, 1, { type: 'interest' });
    s = bid(s, 2, { type: 'pass' });
    s = bid(s, 3, { type: 'pass' });
    // Sitz 1 nennt Sauspiel (Hochzeit dürfte er nur nennen, weil er Höheres spielen könnte).
    const names = legalCalls(s, 1).flatMap((c) => (c.type === 'name' ? [c.level.kind] : []));
    expect(names).toContain('sauspiel');
    s = bid(s, 1, { type: 'name', level: { kind: 'sauspiel' } });
    expect(legalCalls(s, 0)).toEqual([{ type: 'yield' }, { type: 'hold' }]);
    s = bid(s, 0, { type: 'hold' });
    s = bid(s, 1, { type: 'yield' });
    expect(s.auction).toMatchObject({ stage: 'declare', holder: 0, yielded: [1] });
  });
});

describe('Hochzeit – Vorspiel', () => {
  it('nach der Ansage wird reihum ab links vom Hochzeiter gefragt', () => {
    const s = declared();
    expect(s.phase).toBe('prelude');
    expect(s.contract).toEqual({ kind: 'hochzeit' });
    expect(s.declarer).toBe(0);
    expect(s.prelude).toEqual({ step: 'offer', asking: [1, 2, 3], partner: null, log: [] });
    expect(s.turn).toBe(1);
    expect(legalPreludeMoves(s, 1)).toEqual([{ type: 'decline' }, { type: 'accept' }]);
    expect(legalPreludeMoves(s, 2)).toEqual([]);
    expect(legalPreludeMoves(s, 0)).toEqual([]);
    // Kein Kontra, solange das Vorspiel läuft.
    expect(canDouble({ ...s, rules: { ...s.rules, kontra: true } }, 2)).toBe(false);
  });

  it('der Erste, der annimmt, bekommt den Trumpf und gibt eine Karte zurück', () => {
    let s = accept(declared(), 1);
    expect(s.phase).toBe('prelude');
    expect(s.prelude).toMatchObject({ step: 'exchange', partner: 1, asking: [] });
    expect(s.partner).toBe(1);
    expect(s.turn).toBe(1);
    expect(s.hands[0]).not.toContain('SU');
    expect(s.hands[1]).toContain('SU');
    expect(s.hands[1]).toHaveLength(9);
    // Zurück nur Karten, die kein Trumpf sind.
    expect(legalPreludeMoves(s, 1)).toEqual([
      { type: 'give', cards: ['E9'] },
      { type: 'give', cards: ['G9'] },
    ]);

    s = give(s, 1, ['G9']);
    expect(s.phase).toBe('playing');
    expect(s.prelude).toBeNull();
    expect(s.declarer).toBe(0);
    expect(s.partner).toBe(1);
    expect(s.hands[0]).toContain('G9');
    expect(s.hands[0]).toHaveLength(8);
    expect(s.hands[1]).toHaveLength(8);
    // Laufende zählen nach dem Tausch (Annahme 15).
    expect(s.initialHands[1]).toContain('SU');
    expect(s.initialHands[0]).toContain('G9');
    // Herauskommen wie immer links vom Geber (Annahme 30).
    expect(s.turn).toBe(0);
    // Der Partner ist sofort für alle bekannt.
    expect(handViewFor(s, 2).partner).toBe(1);
    expect(handViewFor(s, 3).partner).toBe(1);
  });

  it('lehnt der Erste ab, wird der Nächste gefragt; danach keiner mehr', () => {
    let s = decline(declared(), 1);
    expect(s.turn).toBe(2);
    expect(s.prelude).toMatchObject({ asking: [2, 3], log: [{ seat: 1, move: 'decline' }] });
    s = accept(s, 2);
    expect(s.partner).toBe(2);
    expect(s.turn).toBe(2);
    expect(legalPreludeMoves(s, 3)).toEqual([]);
  });

  it('die Rückgabe muss ein Nicht-Trumpf sein, wenn er einen hat', () => {
    const s = accept(declared(), 1);
    expect(
      applyAction(s, { type: 'prelude', seat: 1, move: { type: 'give', cards: ['SU'] } }),
    ).toEqual({ ok: false, error: 'illegal_move' });
    expect(
      applyAction(s, { type: 'prelude', seat: 1, move: { type: 'give', cards: ['EO'] } }),
    ).toEqual({ ok: false, error: 'illegal_move' });
    // Falsche Anzahl, fremde Karte, falscher Zug.
    for (const m of [
      { type: 'give', cards: [] },
      { type: 'give', cards: ['E9', 'G9'] },
      { type: 'give', cards: ['E8'] },
      { type: 'accept' },
    ] as PreludeMove[]) {
      expect(applyAction(s, { type: 'prelude', seat: 1, move: m })).toEqual({
        ok: false,
        error: 'illegal_move',
      });
    }
  });

  it('hat er nur Trümpfe, darf er einen Trumpf zurückgeben', () => {
    let s = accept(declared(ALL_TRUMPS), 1);
    expect(legalPreludeMoves(s, 1)).toHaveLength(9);
    s = give(s, 1, ['HA']);
    expect(s.phase).toBe('playing');
    expect(s.hands[0]).toContain('HA');
  });

  it('Züge außerhalb der Reihe oder der Phase werden abgelehnt', () => {
    const s = declared();
    expect(applyAction(s, { type: 'prelude', seat: 2, move: { type: 'accept' } })).toEqual({
      ok: false,
      error: 'not_your_turn',
    });
    expect(applyAction(s, { type: 'play', seat: 1, card: 'EO' })).toEqual({
      ok: false,
      error: 'wrong_phase',
    });
    expect(applyAction(deal(), { type: 'prelude', seat: 0, move: { type: 'decline' } })).toEqual({
      ok: false,
      error: 'wrong_phase',
    });
  });

  it('die Sichten der beiden Unbeteiligten verraten die getauschten Karten nicht', () => {
    const offered = declared();
    const exchange = accept(offered, 1);
    const viaE9 = give(exchange, 1, ['E9']);
    const viaG9 = give(exchange, 1, ['G9']);
    for (const seat of [2, 3]) {
      // Gleich, egal welche Karte zurückging.
      expect(handViewFor(viaE9, seat)).toEqual(handViewFor(viaG9, seat));
      // Vor und nach dem Tausch gleich bis auf Phase, Zug, Kartenzahl und Vorspiel.
      const strip = (s: HandState) => {
        const { phase, turn, handSizes, prelude, partner, legalCards, ...rest } = handViewFor(
          s,
          seat,
        );
        void [phase, turn, handSizes, prelude, partner, legalCards];
        return rest;
      };
      expect(strip(exchange)).toEqual(strip(offered));
      expect(strip(viaE9)).toEqual(strip(exchange));
      // Das Vorspiel enthält keine Karten.
      expect(JSON.stringify(handViewFor(exchange, seat).prelude)).not.toMatch(/"[EGHS][AKOU0-9]/);
    }
    // Die Beteiligten sehen ihre eigenen Hände.
    expect(handViewFor(viaG9, 0).hand).toContain('G9');
    expect(handViewFor(exchange, 1).hand).toContain('SU');
  });
});

describe('Hochzeit – keiner nimmt an', () => {
  it('der verdrängte Sauspieler darf jetzt doch spielen', () => {
    let s = displaced();
    s = decline(decline(decline(s, 1), 2), 3);
    expect(s.phase).toBe('bidding');
    expect(s.contract).toBeNull();
    expect(s.declarer).toBeNull();
    expect(s.prelude).toBeNull();
    expect(s.auction).toMatchObject({ stage: 'declare', holder: 1, failed: ['hochzeit'] });
    expect(s.turn).toBe(1);
    expect(legalCalls(s, 0)).toEqual([]);
    expect(legalContracts(s, 1)).toContainEqual({ kind: 'sauspiel', suit: 'eichel' });
    expect(legalContracts(s, 1).some((c) => c.kind === 'hochzeit')).toBe(false);
    s = bid(s, 1, { type: 'declare', contract: { kind: 'sauspiel', suit: 'eichel' } });
    expect(s.phase).toBe('playing');
    expect(s.declarer).toBe(1);
    expect(s.partner).toBe(0); // Sitz 0 hat die Eichel-Sau
  });

  it('mehrere Nachrücker tragen es im Zweikampf aus (Annahme 16)', () => {
    let s = bid(deal(), 0, { type: 'interest' });
    s = bid(s, 1, { type: 'interest' });
    s = bid(s, 2, { type: 'interest' });
    s = bid(s, 3, { type: 'pass' });
    s = bid(s, 1, { type: 'name', level: { kind: 'sauspiel' } });
    s = bid(s, 0, { type: 'hold' });
    s = bid(s, 1, { type: 'yield' });
    // Sitz 2 müsste höher als Sauspiel gehen und gibt gleich auf.
    s = bid(s, 2, { type: 'yield' });
    s = bid(s, 0, { type: 'declare', contract: { kind: 'hochzeit' } });
    s = decline(decline(decline(s, 1), 2), 3);
    // Neu ohne Mindest-Spielart: Sitz 1 hält, Sitz 2 fordert.
    expect(s.auction).toMatchObject({
      stage: 'duel',
      holder: 1,
      challenger: 2,
      level: null,
      yielded: [],
    });
    expect(s.turn).toBe(2);
    s = bid(s, 2, { type: 'name', level: { kind: 'sauspiel' } });
    s = bid(s, 1, { type: 'hold' });
    s = bid(s, 2, { type: 'yield' });
    expect(s.auction).toMatchObject({ stage: 'declare', holder: 1 });
  });

  it('niemand hat aufgegeben: Zusammenwerfen', () => {
    const s = decline(decline(decline(declared(), 1), 2), 3);
    expect(s.phase).toBe('finished');
    expect(s.result).toMatchObject({ kind: 'passed', payments: [0, 0, 0, 0], potDelta: 0 });
  });

  it('niemand hat aufgegeben: Ramsch, wenn der Tisch es so will', () => {
    const s = decline(
      decline(decline(declared(HANDS, { ...HOCHZEIT, allPassed: 'ramsch' }), 1), 2),
      3,
    );
    expect(s.phase).toBe('playing');
    expect(s.contract).toEqual({ kind: 'ramsch' });
    expect(s.declarer).toBeNull();
    expect(s.partner).toBeNull();
  });

  it('niemand hat aufgegeben: Muss – der Besitzer des Eichel-Obers muss spielen', () => {
    const s = decline(
      decline(decline(declared(HANDS, { ...HOCHZEIT, allPassed: 'muss' }), 1), 2),
      3,
    );
    expect(s.phase).toBe('bidding');
    expect(s.auction).toMatchObject({ stage: 'declare', holder: 1, forced: true });
  });

  it('wer nur die Hochzeit hätte spielen können, rückt nicht nach', () => {
    // Sitz 1 hat auch genau einen Trumpf und keine rufbare Sau – ein zweiter Hochzeiter.
    const hands: Card[][] = [
      ['SU', 'SA', 'S10', 'SK', 'E9', 'E8', 'E7', 'G8'],
      ['HU', 'EA', 'E10', 'EK', 'GA', 'G10', 'GK', 'G9'],
      ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HA', 'H10'],
      ['HK', 'H9', 'H8', 'H7', 'S9', 'S8', 'S7', 'G7'],
    ];
    expect(MODES.sauspiel.suitChoices!(hands[1]!)).toEqual([]);
    // Nur Sauspiel und Hochzeit am Tisch – sonst hätte jedes Blatt formal noch ein Spiel.
    const rules: RuleSet = { ...HOCHZEIT, contracts: ['sauspiel', 'hochzeit'] };
    let s = bid(deal(hands, rules), 0, { type: 'interest' });
    s = bid(s, 1, { type: 'interest' });
    s = bid(s, 2, { type: 'pass' });
    s = bid(s, 3, { type: 'pass' });
    s = bid(s, 1, { type: 'name', level: { kind: 'hochzeit' } });
    s = bid(s, 0, { type: 'hold' }); // Gleichstand: der Frühere behält (Annahme 28)
    s = bid(s, 1, { type: 'yield' });
    s = bid(s, 0, { type: 'declare', contract: { kind: 'hochzeit' } });
    s = decline(decline(decline(s, 1), 2), 3);
    expect(s.phase).toBe('finished');
    expect(s.result?.kind).toBe('passed');
  });
});

describe('Hochzeit – Spiel und Abrechnung', () => {
  it('wird wie ein Sauspiel abgerechnet, Laufende nach dem Tausch', () => {
    const s = playOut(give(accept(declared(), 1), 1, ['E9']));
    expect(s.phase).toBe('finished');
    const outcome = s.result!.outcome!;
    expect(outcome.details).toMatchObject({ type: 'party', party: [0, 1], declarer: 0 });
    // Ober und vier Unter ohne den Herz-Unter: sechs Laufende bei der Spielerpartei.
    expect(outcome.details.type === 'party' && outcome.details.laufende).toBe(6);
    expect(outcome.parts[0]).toEqual({ label: 'grundtarif', amount: 10 });
    expect(s.result!.payments.reduce((a, b) => a + b, 0)).toBe(0);
    // 2:2 wie im Sauspiel: jeder bekommt bzw. zahlt den Spielwert einmal.
    expect(s.result!.payments[0]).toBe(s.result!.payments[1]);
    expect(s.result!.payments[2]).toBe(-s.result!.payments[0]!);
  });

  it('die Schwelle für Laufende ist eigens einstellbar', () => {
    const rules = { ...HOCHZEIT, laufende: { ...HOCHZEIT.laufende, hochzeit: 7 } };
    const s = playOut(give(accept(declared(HANDS, rules), 1), 1, ['E9']));
    const details = s.result!.outcome!.details;
    expect(details.type === 'party' && details.laufende).toBe(0);
  });

  it('Kontra ist erst nach dem Tausch möglich', () => {
    const rules = { ...HOCHZEIT, kontra: true };
    const exchange = accept(declared(HANDS, rules), 1);
    expect(canDouble(exchange, 2)).toBe(false);
    const playing = give(exchange, 1, ['E9']);
    expect(canDouble(playing, 2)).toBe(true);
    expect(canDouble(playing, 1)).toBe(false);
  });

  it('das Spielprotokoll spielt die Hochzeit samt Tausch nach', () => {
    // Ersten Seed suchen, bei dem Sitz 0 genau einen Trumpf hat.
    const seed = Array.from({ length: 500 }, (_, i) => i + 1).find((n) =>
      MODES.hochzeit.eligible!(dealHand(HOCHZEIT, 3, n).hands[0]!),
    )!;
    const log = newHandLog(1, HOCHZEIT, 3, seed);
    let state = dealHand(HOCHZEIT, 3, seed);
    const run = (action: Action) => {
      state = act(state, action);
      log.actions.push(action);
    };
    run({ type: 'bid', seat: 0, call: { type: 'interest' } });
    for (const seat of [1, 2, 3]) run({ type: 'bid', seat, call: { type: 'pass' } });
    run({ type: 'bid', seat: 0, call: { type: 'declare', contract: { kind: 'hochzeit' } } });
    run({ type: 'prelude', seat: 1, move: { type: 'decline' } });
    run({ type: 'prelude', seat: 2, move: { type: 'accept' } });
    run({ type: 'prelude', seat: 2, move: legalPreludeMoves(state, 2)[0]! });
    expect(state.phase).toBe('playing');
    expect(replay(log)).toEqual(state);
  });
});
