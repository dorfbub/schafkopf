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
  dealHand,
  handViewFor,
  legalCalls,
  legalContracts,
  legalPreludeMoves,
} from '../src';

const AN: RuleSet = {
  ...DEFAULT_RULES,
  contracts: [...DEFAULT_RULES.contracts, 'arabischeHochzeit', 'hochzeit'],
};

// Sitz 0 hat genau zwei Trümpfe (Schellen-Unter, Herz-Ass) und alle drei Farb-Säue, kann also
// kein Sauspiel rufen. Sitz 1 hat nur Trümpfe-freie Karten außer EO.
const HANDS: Card[][] = [
  ['SU', 'HA', 'EA', 'E10', 'GA', 'G10', 'SA', 'S10'],
  ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'E9', 'G9'],
  ['HU', 'H10', 'HK', 'EK', 'E8', 'G8', 'S9', 'S8'],
  ['H9', 'H8', 'H7', 'E7', 'GK', 'G7', 'SK', 'S7'],
];

function deal(hands: Card[][] = HANDS, rules: RuleSet = AN): HandState {
  return { ...dealHand(rules, 3, 1), hands, initialHands: hands.map((h) => [...h]) };
}
function act(state: HandState, action: Action): HandState {
  const r = applyAction(state, action);
  if (!r.ok) throw new Error(`${JSON.stringify(action)}: ${r.error}`);
  return r.state;
}
const bid = (s: HandState, seat: number, call: BidCall) => act(s, { type: 'bid', seat, call });
const move = (s: HandState, seat: number, m: PreludeMove) =>
  act(s, { type: 'prelude', seat, move: m });

function declared(hands: Card[][] = HANDS): HandState {
  let s = bid(deal(hands), 0, { type: 'interest' });
  for (const seat of [1, 2, 3]) s = bid(s, seat, { type: 'pass' });
  return bid(s, 0, { type: 'declare', contract: { kind: 'arabischeHochzeit' } });
}

describe('Arabische Hochzeit – Ansage', () => {
  it('ansagbar nur mit genau zwei Trümpfen', () => {
    const eligible = MODES.arabischeHochzeit.eligible!;
    expect(eligible(HANDS[0]!)).toBe(true);
    expect(eligible(['SU', 'EA', 'E10', 'EK', 'GA', 'G10', 'SA', 'S10'])).toBe(false); // einer
    expect(eligible(['SU', 'HA', 'EO', 'EK', 'GA', 'G10', 'SA', 'S10'])).toBe(false); // drei
    expect(eligible(['EA', 'E10', 'EK', 'E9', 'GA', 'G10', 'SA', 'S10'])).toBe(false); // keiner
  });

  it('wird nur mit der Tischregel angeboten', () => {
    let s = bid(deal(), 0, { type: 'interest' });
    for (const seat of [1, 2, 3]) s = bid(s, seat, { type: 'pass' });
    expect(legalContracts(s, 0)).toContainEqual({ kind: 'arabischeHochzeit' });
    expect(legalContracts(s, 0).some((c) => c.kind === 'hochzeit')).toBe(false);
    s = bid(deal(HANDS, DEFAULT_RULES), 0, { type: 'interest' });
    for (const seat of [1, 2, 3]) s = bid(s, seat, { type: 'pass' });
    expect(legalContracts(s, 0).some((c) => c.kind === 'arabischeHochzeit')).toBe(false);
  });

  it('Rang über dem Sauspiel, unter der Hochzeit; kein Tout', () => {
    const v = (kind: 'sauspiel' | 'arabischeHochzeit' | 'hochzeit') => bidValue({ kind });
    expect(v('arabischeHochzeit')).toBeGreaterThan(v('sauspiel'));
    expect(v('arabischeHochzeit')).toBeLessThan(v('hochzeit'));
    expect(MODES.arabischeHochzeit.canTout).toBe(false);
  });

  it('im Zweikampf kann die Hochzeit gegen die arabische Hochzeit halten', () => {
    const ONE: Card[] = ['SU', 'EA', 'E10', 'EK', 'GA', 'G10', 'SA', 'S10']; // Hochzeit
    const TWO: Card[] = ['EO', 'EU', 'E9', 'G9', 'H9', 'H8', 'H7', 'S9']; // arabisch
    const rest: Card[] = ['GO', 'HO', 'SO', 'GU', 'HU', 'HA', 'H10', 'HK'];
    const rest2: Card[] = ['E8', 'G8', 'S8', 'E7', 'GK', 'G7', 'SK', 'S7'];
    const run = (
      hands: Card[][],
      namer: number,
      other: number,
      kind: 'hochzeit' | 'arabischeHochzeit',
    ) => {
      let s = bid(deal(hands), 0, { type: 'interest' });
      s = bid(s, 1, { type: 'interest' });
      s = bid(s, 2, { type: 'pass' });
      s = bid(s, 3, { type: 'pass' });
      s = bid(s, namer, { type: 'name', level: { kind } });
      return { s, calls: legalCalls(s, other) };
    };
    // Sitz 1 nennt arabisch; Sitz 0 mit einem Trumpf kann mit der Hochzeit halten.
    const a = run([ONE, TWO, rest, rest2], 1, 0, 'arabischeHochzeit');
    expect(a.calls).toContainEqual({ type: 'hold' });
    // Nach „hold“ und „yield“ darf Sitz 0 seine Hochzeit ansagen.
    let t = bid(a.s, 0, { type: 'hold' });
    t = bid(t, 1, { type: 'yield' });
    expect(legalContracts(t, 0)).toContainEqual({ kind: 'hochzeit' });
  });
});

describe('Arabische Hochzeit – Vorspiel', () => {
  it('beide Trümpfe gehen an den Annehmenden, zwei Karten kommen zurück', () => {
    let s = declared();
    expect(s.phase).toBe('prelude');
    expect(s.contract).toEqual({ kind: 'arabischeHochzeit' });
    s = move(s, 1, { type: 'accept' });
    expect(s.prelude).toMatchObject({ step: 'exchange', partner: 1 });
    expect(s.hands[0]).not.toContain('SU');
    expect(s.hands[0]).not.toContain('HA');
    expect(s.hands[0]).toHaveLength(6);
    expect(s.hands[1]).toEqual(expect.arrayContaining(['SU', 'HA']));
    expect(s.hands[1]).toHaveLength(10);
    // Zurück: zwei Nicht-Trümpfe (Sitz 1 hat zwei: E9, G9 – das ist die einzige Wahl).
    expect(legalPreludeMoves(s, 1)).toEqual([{ type: 'give', cards: ['E9', 'G9'] }]);
    s = move(s, 1, { type: 'give', cards: ['E9', 'G9'] });
    expect(s.phase).toBe('playing');
    expect(s.partner).toBe(1);
    expect(s.hands[0]).toEqual(expect.arrayContaining(['E9', 'G9']));
    expect(s.hands[0]).toHaveLength(8);
    expect(s.hands[1]).toHaveLength(8);
    // Eine Karte oder drei Karten sind nicht erlaubt.
    const x = move(declared(), 1, { type: 'accept' });
    for (const cards of [['E9'], ['E9', 'G9', 'EU']] as Card[][]) {
      expect(applyAction(x, { type: 'prelude', seat: 1, move: { type: 'give', cards } })).toEqual({
        ok: false,
        error: 'illegal_move',
      });
    }
  });

  it('mit mehr Auswahl: zwei beliebige Nicht-Trümpfe, Trümpfe nur im Notfall', () => {
    const hands: Card[][] = [HANDS[0]!, HANDS[2]!, HANDS[1]!, HANDS[3]!];
    const s = move(declared(hands), 1, { type: 'accept' });
    const gives = legalPreludeMoves(s, 1);
    expect(gives.length).toBeGreaterThan(1);
    for (const m of gives) {
      if (m.type !== 'give') throw new Error('nur give erwartet');
      expect(m.cards).toHaveLength(2);
      expect(m.cards).not.toContain('SU');
      expect(m.cards).not.toContain('HA');
    }
  });

  it('keiner nimmt an: das Spiel kommt nicht zustande', () => {
    let s = declared();
    for (const seat of [1, 2, 3]) s = move(s, seat, { type: 'decline' });
    expect(s.phase).not.toBe('prelude');
    expect(s.phase).not.toBe('playing');
  });

  it('die Unbeteiligten sehen die getauschten Karten nicht', () => {
    const exchange = move(declared(), 1, { type: 'accept' });
    const a = move(exchange, 1, { type: 'give', cards: ['E9', 'G9'] });
    for (const seat of [2, 3]) {
      const view = JSON.stringify(handViewFor(a, seat));
      for (const c of ['SU', 'HA', 'E9', 'G9']) {
        // Die Hand des Unbeteiligten enthält nur seine eigenen Karten.
        if (!HANDS[seat]!.includes(c as Card)) {
          expect(handViewFor(a, seat).hand).not.toContain(c);
        }
      }
      expect(view).not.toContain('"hands"');
    }
  });
});
