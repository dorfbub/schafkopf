import { describe, expect, it } from 'vitest';
import {
  type Card,
  type BidCall,
  type Contract,
  type ContractKind,
  type HandState,
  type RuleSet,
  DEFAULT_RULES,
  applyAction,
  createRng,
  dealHand,
  handViewFor,
  legalCards,
  legalCalls,
  legalContracts,
  pick,
  sameContract,
} from '../src';

/** Baut einen Spielzustand mit festen Händen (Sitz 0 kommt raus, Geber ist Sitz 3). */
function handWith(hands: Card[][], rules: RuleSet = DEFAULT_RULES): HandState {
  const state = dealHand(rules, 3, 1);
  return { ...state, hands, initialHands: hands.map((h) => [...h]) };
}

/** Spielt eine Folge von Ansage-Rufen; immer für den Sitz, der gerade dran ist. */
function callAll(state: HandState, calls: BidCall[]): HandState {
  let current = state;
  for (const call of calls) {
    const result = applyAction(current, { type: 'bid', seat: current.turn, call });
    if (!result.ok) throw new Error(`${result.error}: ${JSON.stringify(call)}`);
    current = result.state;
  }
  return current;
}

const PASS: BidCall = { type: 'pass' };
const WOULD: BidCall = { type: 'interest' };
const HOLD: BidCall = { type: 'hold' };
const YIELD: BidCall = { type: 'yield' };
const name = (kind: ContractKind, tout = false): BidCall => ({
  type: 'name',
  level: tout ? { kind, tout } : { kind },
});
const declare = (contract: Contract): BidCall => ({ type: 'declare', contract });

/** Kurzform: nur einer will (Sitz des ersten Spiels), alle anderen weiter. */
function bidAll(state: HandState, bids: (Contract | null)[]): HandState {
  const calls: BidCall[] = bids.map((c) => (c ? WOULD : PASS));
  const chosen = bids.find((c) => c !== null);
  if (chosen) calls.push(declare(chosen));
  return callAll(state, calls);
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
    const state = callAll(handWith(HANDS), [WOULD, PASS, PASS, PASS]);
    const sauspiele = legalContracts(state, 0).filter((c) => c.kind === 'sauspiel');
    // Sitz 0 hat Gras und Schellen, aber keine Eichel-Farbkarte.
    expect(sauspiele.map((c) => c.suit).sort()).toEqual(['gras', 'schellen']);
  });

  it('wer nicht an der Reihe ist, darf nichts sagen', () => {
    const state = handWith(HANDS);
    expect(legalCalls(state, 1)).toEqual([]);
    expect(applyAction(state, { type: 'bid', seat: 1, call: PASS })).toEqual({
      ok: false,
      error: 'not_your_turn',
    });
  });

  it('Stufe 1: reihum ab links vom Geber „Ich würde“ oder „weiter“', () => {
    const state = handWith(HANDS);
    expect(state.turn).toBe(0);
    expect(state.auction.stage).toBe('interest');
    expect(legalCalls(state, 0)).toEqual([PASS, WOULD]);
    expect(applyAction(state, { type: 'bid', seat: 0, call: HOLD })).toEqual({
      ok: false,
      error: 'illegal_bid',
    });
    expect(callAll(state, [PASS]).turn).toBe(1);
  });

  it('alle weiter: Spiel endet ohne Zahlung (zusammenwerfen)', () => {
    const state = callAll(handWith(HANDS), [PASS, PASS, PASS, PASS]);
    expect(state.phase).toBe('finished');
    expect(state.result).toEqual({ kind: 'passed', payments: [0, 0, 0, 0] });
  });

  it('will nur einer, nennt er gleich sein Spiel – jedes erlaubte', () => {
    const state = callAll(handWith(HANDS), [PASS, PASS, WOULD, PASS]);
    expect(state.auction.stage).toBe('declare');
    expect(state.turn).toBe(2);
    const options = legalContracts(state, 2);
    expect(options.some((c) => c.kind === 'sauspiel')).toBe(true);
    expect(options.some((c) => c.kind === 'solo' && c.tout)).toBe(true);
    const played = callAll(state, [declare({ kind: 'wenz' })]);
    expect(played.phase).toBe('playing');
    expect(played.contract).toEqual({ kind: 'wenz' });
    expect(played.declarer).toBe(2);
    expect(played.partner).toBeNull();
    // Herauskommen tut immer der Erste nach dem Geber.
    expect(played.turn).toBe(0);
  });

  it('nach „weiter“ kein Einstieg mehr: der Zweikampf läuft nur unter den Interessenten', () => {
    const state = callAll(handWith(HANDS), [WOULD, PASS, WOULD, PASS]);
    expect(state.auction).toMatchObject({ stage: 'duel', holder: 0, challenger: 2, waiting: [] });
    expect(state.turn).toBe(2);
    expect(legalCalls(state, 1)).toEqual([]);
  });

  it('Früherer behält bei Gleichstand: „ich auch“ hält die genannte Spielart', () => {
    let state = callAll(handWith(HANDS), [WOULD, PASS, WOULD, PASS, name('wenz')]);
    expect(state.turn).toBe(0);
    expect(legalCalls(state, 0)).toEqual([YIELD, HOLD]);
    state = callAll(state, [HOLD]);
    // Der Forderer muss jetzt höher gehen; Wenz noch einmal geht nicht.
    expect(state.turn).toBe(2);
    expect(legalCalls(state, 2)).not.toContainEqual(name('wenz'));
    expect(legalCalls(state, 2)).toContainEqual(name('solo'));
    state = callAll(state, [YIELD]);
    expect(state.auction.stage).toBe('declare');
    expect(state.turn).toBe(0);
    // Spielen muss er mindestens einen Wenz.
    const options = legalContracts(state, 0);
    expect(options.some((c) => !c.tout && (c.kind === 'sauspiel' || c.kind === 'geier'))).toBe(
      false,
    );
    expect(options).toContainEqual({ kind: 'wenz' });
    expect(options).toContainEqual({ kind: 'solo', suit: 'herz' });
    state = callAll(state, [declare({ kind: 'solo', suit: 'herz' })]);
    expect(state.declarer).toBe(0);
    expect(state.contract).toEqual({ kind: 'solo', suit: 'herz' });
  });

  it('Überbieten: der Forderer geht höher, der Haltende gibt auf', () => {
    const state = callAll(handWith(HANDS), [
      WOULD,
      PASS,
      WOULD,
      PASS,
      name('sauspiel'),
      HOLD,
      name('wenz'),
      YIELD,
    ]);
    expect(state.auction).toMatchObject({ stage: 'declare', holder: 2, level: { kind: 'wenz' } });
    expect(state.turn).toBe(2);
    expect(legalContracts(state, 2).some((c) => c.kind === 'sauspiel')).toBe(false);
    const played = callAll(state, [declare({ kind: 'wenz' })]);
    expect(played.declarer).toBe(2);
    expect(played.contract).toEqual({ kind: 'wenz' });
  });

  it('eine genannte Spielart muss höher sein als die zuletzt genannte', () => {
    const state = callAll(handWith(HANDS), [WOULD, PASS, WOULD, PASS, name('wenz'), HOLD]);
    expect(applyAction(state, { type: 'bid', seat: 2, call: name('geier') })).toEqual({
      ok: false,
      error: 'illegal_bid',
    });
    // Tout schlägt jede Spielart ohne Tout.
    expect(legalCalls(state, 2)).toContainEqual(name('geier', true));
  });

  it('Aufgeben: sagt der Haltende gleich „gut“, spielt der Forderer', () => {
    const state = callAll(handWith(HANDS), [WOULD, WOULD, PASS, PASS, name('sauspiel'), YIELD]);
    expect(state.auction).toMatchObject({ stage: 'declare', holder: 1 });
    expect(state.turn).toBe(1);
    const played = callAll(state, [declare({ kind: 'sauspiel', suit: 'schellen' })]);
    expect(played.declarer).toBe(1);
    expect(played.partner).toBe(3);
  });

  it('mit drei Interessenten tritt der Sieger gegen den nächsten an', () => {
    let state = callAll(handWith(HANDS), [WOULD, WOULD, WOULD, PASS]);
    expect(state.auction).toMatchObject({ holder: 0, challenger: 1, waiting: [2] });
    state = callAll(state, [name('sauspiel'), YIELD]);
    // Sitz 1 hält jetzt gegen Sitz 2, der über das Sauspiel gehen muss.
    expect(state.auction).toMatchObject({ holder: 1, challenger: 2, waiting: [] });
    expect(state.turn).toBe(2);
    expect(legalCalls(state, 2)).not.toContainEqual(name('sauspiel'));
    state = callAll(state, [name('geier'), HOLD, YIELD]);
    expect(state.auction).toMatchObject({ stage: 'declare', holder: 1, level: { kind: 'geier' } });
  });

  it('alles Gesagte sehen alle Mitspieler', () => {
    const state = callAll(handWith(HANDS), [WOULD, PASS, WOULD, PASS, name('wenz'), HOLD]);
    const view = handViewFor(state, 3);
    expect(view.bids.map((b) => b.call.type)).toEqual([
      'interest',
      'pass',
      'interest',
      'pass',
      'name',
      'hold',
    ]);
    expect(view.auction).toEqual(state.auction);
    expect(view.legalCalls).toEqual([]);
    expect(handViewFor(state, 2).legalCalls.length).toBeGreaterThan(1);
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
    const legal = legalCards(state, 2);
    expect(legal).toContain('GA');
    for (const c of ['G10', 'GK', 'G9'] as Card[]) expect(legal).not.toContain(c);
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

  it('Option davonlaufen aus: auch mit vier Karten nur mit der Sau anspielen', () => {
    const hands: Card[][] = [
      ['GO', 'HO', 'EU', 'HA', 'H10', 'G7', 'S7', 'E7'],
      ['SO', 'GU', 'HK', 'H9', 'EA', 'E10', 'G8', 'S8'],
      ['EO', 'SU', 'GA', 'G10', 'GK', 'G9', 'EK', 'S9'],
      ['HU', 'H8', 'H7', 'E9', 'E8', 'SA', 'S10', 'SK'],
    ];
    let state = bidAll(handWith(hands, { ...DEFAULT_RULES, davonlaufen: false }), [
      GRAS,
      null,
      null,
      null,
    ]);
    for (const c of ['GO', 'SO', 'EO', 'H7'] as Card[]) state = play(state, c);
    expect(state.turn).toBe(2);
    const legal = legalCards(state, 2);
    expect(legal).toContain('GA');
    for (const c of ['G10', 'GK', 'G9'] as Card[]) expect(legal).not.toContain(c);
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
          const options = legalCalls(state, seat);
          expect(options.length, `Seed ${seed}: kein erlaubter Ruf`).toBeGreaterThan(0);
          // Die passiven Rufe stehen vorn; etwa jeder dritte Ruf ist aktiv, damit
          // Zweikämpfe und alle Spielarten vorkommen.
          const call =
            rng() < 0.35 || options[0]!.type === 'declare' ? pick(options, rng) : options[0]!;
          const result = applyAction(state, { type: 'bid', seat, call });
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
