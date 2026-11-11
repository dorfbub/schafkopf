import { describe, expect, it } from 'vitest';
import {
  type Bot,
  type Card,
  type HandState,
  type HandView,
  type PlayerAction,
  type RuleSet,
  type Seat,
  DEFAULT_RULES,
  applyAction,
  dealHand,
  handViewFor,
  isTrump,
  orderFor,
  pointsOf,
} from '@schafkopf/core';
import { createHeuristicBot, createRandomBot, rateContract } from '../src';
import { playHand } from './simulate';

/** Spiel mit festen Händen; `dealer` bestimmt, wer anspielt (Sitz nach dem Geber). */
function fixedHand(hands: Card[][], dealer: Seat): HandState {
  const state = dealHand(DEFAULT_RULES, dealer, 1);
  return { ...state, hands: hands.map((h) => [...h]), initialHands: hands.map((h) => [...h]) };
}

function act(state: HandState, seat: Seat, action: PlayerAction): HandState {
  const result = applyAction(state, { ...action, seat });
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

/** Ein Spieler sagt „Ich würde“, die anderen „weiter“, dann nennt er `contract`. */
function declare(state: HandState, declarer: Seat, contract: HandState['contract']): HandState {
  let s = state;
  for (let i = 0; i < 4; i++) {
    const seat = s.turn;
    s = act(s, seat, { type: 'bid', call: { type: seat === declarer ? 'interest' : 'pass' } });
  }
  return act(s, declarer, { type: 'bid', call: { type: 'declare', contract: contract! } });
}

const play = (state: HandState, card: Card) => act(state, state.turn, { type: 'play', card });

const decideFor = (state: HandState, seed = 1) =>
  createHeuristicBot(seed).decide(handViewFor(state, state.turn));

// Herz-Solo von Sitz 0; Sitz 1 und 2 sind in Gras frei.
const SOLO_HANDS: Card[][] = [
  ['GO', 'HO', 'SO', 'EU', 'GU', 'GA', 'G10', 'G9'],
  ['EO', 'H7', 'S7', 'S8', 'E7', 'E8', 'E9', 'SK'],
  ['SA', 'S10', 'EA', 'E10', 'HU', 'H8', 'S9', 'EK'],
  ['GK', 'G8', 'G7', 'HA', 'H10', 'HK', 'H9', 'SU'],
];

// Sitz 0 spielt ein Sauspiel auf die Eichel-Sau (sie liegt bei Sitz 2); Sitz 1 spielt an.
const SAUSPIEL_HANDS: Card[][] = [
  ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'E9', 'HA'],
  ['E7', 'EK', 'GA', 'G10', 'S9', 'S8', 'HK', 'H7'],
  ['EA', 'E10', 'E8', 'GK', 'G9', 'G8', 'G7', 'SA'],
  ['HU', 'SU', 'H10', 'H9', 'H8', 'S10', 'SK', 'S7'],
];

describe('Heuristik-Bot: Ansage', () => {
  it('bewertet ein starkes Blatt als Solo, ein schwaches gar nicht', () => {
    const strong: Card[] = ['EO', 'GO', 'HO', 'SO', 'HA', 'H10', 'EA', 'GA'];
    expect(rateContract(strong, { kind: 'solo', suit: 'herz' })).toBeGreaterThanOrEqual(0);
    const weak: Card[] = ['H7', 'H8', 'E7', 'E8', 'G7', 'G9', 'S8', 'SK'];
    expect(rateContract(weak, { kind: 'sauspiel', suit: 'eichel' })).toBeLessThan(0);
    expect(rateContract(weak, { kind: 'solo', suit: 'herz' })).toBeLessThan(0);
  });

  it('sagt mit klarem Solo-Blatt „Ich würde“ und nennt dann ein Solo', () => {
    let state = fixedHand(SAUSPIEL_HANDS, 3); // Sitz 0 beginnt die Ansage
    const bot = createHeuristicBot(1);
    const first = bot.decide(handViewFor(state, 0));
    expect(first).toEqual({ type: 'bid', call: { type: 'interest' } });
    state = act(state, 0, first);
    for (const seat of [1, 2, 3]) state = act(state, seat, { type: 'bid', call: { type: 'pass' } });
    const named = bot.decide(handViewFor(state, 0));
    expect(named.type === 'bid' && named.call.type === 'declare' && named.call.contract.kind).toBe(
      'solo',
    );
  });

  it('sagt Tout nur mit einem Blatt, das sicher alle Stiche macht', () => {
    const sure: Card[] = ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HU', 'SU'];
    expect(rateContract(sure, { kind: 'solo', suit: 'herz', tout: true })).toBeGreaterThanOrEqual(
      0,
    );
    const good: Card[] = ['EO', 'GO', 'HO', 'SO', 'EU', 'HA', 'H10', 'EA'];
    expect(rateContract(good, { kind: 'solo', suit: 'herz' })).toBeGreaterThanOrEqual(0);
    expect(rateContract(good, { kind: 'solo', suit: 'herz', tout: true })).toBeLessThan(0);
  });

  it('gibt im Zweikampf ein Sauspiel gegen einen Wenz auf', () => {
    const hands: Card[][] = [
      ['EO', 'GO', 'SU', 'HA', 'H9', 'H8', 'G7', 'SA'],
      ['EU', 'GU', 'HU', 'EA', 'E10', 'EK', 'GA', 'G10'],
      ['HO', 'SO', 'H10', 'HK', 'H7', 'E9', 'E8', 'E7'],
      ['S7', 'GK', 'G9', 'G8', 'S10', 'SK', 'S9', 'S8'],
    ];
    let state = fixedHand(hands, 3);
    state = act(state, 0, { type: 'bid', call: { type: 'interest' } });
    state = act(state, 1, { type: 'bid', call: { type: 'interest' } });
    state = act(state, 2, { type: 'bid', call: { type: 'pass' } });
    state = act(state, 3, { type: 'bid', call: { type: 'pass' } });
    state = act(state, 1, { type: 'bid', call: { type: 'name', level: { kind: 'wenz' } } });
    expect(decideFor(state)).toEqual({ type: 'bid', call: { type: 'yield' } });
  });
});

describe('Heuristik-Bot: Kartenspiel', () => {
  it('sticht mit dem niedrigsten ausreichenden Trumpf', () => {
    let state = declare(fixedHand(SOLO_HANDS, 3), 0, { kind: 'solo', suit: 'herz' });
    state = play(state, 'GA');
    expect(decideFor(state)).toEqual({ type: 'play', card: 'H7' });
  });

  it('schmiert, wenn der Partner den Stich sicher hat', () => {
    let state = declare(fixedHand(SOLO_HANDS, 3), 0, { kind: 'solo', suit: 'herz' });
    state = play(state, 'GA');
    state = play(state, 'EO'); // höchster Trumpf, Sitz 1 ist Partner von Sitz 2
    const action = decideFor(state);
    if (action.type !== 'play') throw new Error('Karte erwartet');
    expect(pointsOf(action.card)).toBeGreaterThanOrEqual(10);
    expect(isTrump(action.card, orderFor({ kind: 'solo', suit: 'herz' }, 0))).toBe(false);
  });

  it('zieht als Solospieler Trumpf von oben', () => {
    const hands = SOLO_HANDS.map((h) => [...h]);
    hands[0] = ['EO', 'HO', 'SO', 'EU', 'GU', 'GA', 'G10', 'G9'];
    hands[1] = ['GO', 'H7', 'S7', 'S8', 'E7', 'E8', 'E9', 'SK'];
    const state = declare(fixedHand(hands, 3), 0, { kind: 'solo', suit: 'herz' });
    expect(decideFor(state)).toEqual({ type: 'play', card: 'EO' });
  });

  it('sucht als Gegenspieler im Sauspiel die Rufsau', () => {
    const state = declare(fixedHand(SAUSPIEL_HANDS, 0), 0, { kind: 'sauspiel', suit: 'eichel' });
    expect(state.turn).toBe(1);
    expect(decideFor(state)).toEqual({ type: 'play', card: 'E7' });
  });
});

describe('Heuristik-Bot: Regeltreue', () => {
  const variants: [string, RuleSet][] = [
    ['Standard', DEFAULT_RULES],
    ['nur Sauspiel und Solo', { ...DEFAULT_RULES, contracts: ['sauspiel', 'solo'] }],
    ['ohne Tout, ohne Davonlaufen', { ...DEFAULT_RULES, allowTout: false, davonlaufen: false }],
    ['nur Einzelspiele', { ...DEFAULT_RULES, contracts: ['bettel', 'geier', 'wenz', 'farbwenz'] }],
    ['kurzes Blatt', { ...DEFAULT_RULES, deck: 'kurz' }],
  ];

  it.each(variants)('liefert nie eine unerlaubte Aktion (%s)', (_name, rules) => {
    // Bots bleiben über alle Spiele dieselben Objekte – wie am echten Tisch.
    const heuristic = [0, 1, 2, 3].map((s) => createHeuristicBot(900 + s));
    const random = [0, 1, 2, 3].map((s) => createRandomBot(950 + s, 3));
    for (let i = 0; i < 400; i++) {
      // Sitzbelegung wechselt: mal nur Heuristik, mal gemischt.
      const bots = [0, 1, 2, 3].map((s) => ((i >> s) & 1 || i % 5 === 0 ? heuristic : random)[s]!);
      expect(() => playHand(bots, 20_000 + i, i % 4, rules)).not.toThrow();
    }
  });
});

describe('Heuristik-Bot gegen Zufalls-Bot', () => {
  /**
   * 1000 Spiele mit den Seeds 1–1000. Ein Heuristik-Bot sitzt mit drei Zufalls-Bots am
   * Tisch, sein Platz wandert jedes Spiel weiter. Unter Zufalls-Bots wäre der Schnitt 0 ct;
   * gemessen werden der Schnitt je Spiel und die Rechenzeit je Entscheidung.
   */
  it('gewinnt über 1000 Spiele deutlich und entscheidet schnell', () => {
    const heuristic = [0, 1, 2, 3].map((s) => createHeuristicBot(7 + s));
    const random = [0, 1, 2, 3].map((s) => createRandomBot(70 + s));
    let heuristicSum = 0;
    let randomSum = 0;
    let decisions = 0;
    let time = 0;
    const timed = (bot: Bot): Bot => ({
      decide(view: HandView) {
        const start = performance.now();
        const action = bot.decide(view);
        time += performance.now() - start;
        decisions++;
        return action;
      },
    });
    for (let i = 0; i < 1000; i++) {
      const seat = i % 4;
      const bots = [0, 1, 2, 3].map((s) => (s === seat ? timed(heuristic[s]!) : random[s]!));
      const { result } = playHand(bots, 1 + i, i % 4);
      result!.payments.forEach((p, s) => {
        if (s === seat) heuristicSum += p;
        else randomSum += p;
      });
    }
    const heuristicAvg = heuristicSum / 1000;
    const randomAvg = randomSum / 3000;
    // Gemessen (Stand B1): Heuristik ≈ +19,8 ct je Spiel, Zufall ≈ −6,6 ct.
    expect(heuristicAvg).toBeGreaterThan(12);
    expect(heuristicAvg - randomAvg).toBeGreaterThan(15);
    expect(time / decisions).toBeLessThan(50);
  });

  it('gewinnt auch zu zweit gegen zwei Zufalls-Bots', () => {
    const heuristic = [0, 1, 2, 3].map((s) => createHeuristicBot(7 + s));
    const random = [0, 1, 2, 3].map((s) => createRandomBot(70 + s));
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      const isHeuristic = (s: Seat) => s % 2 === i % 2;
      const bots = [0, 1, 2, 3].map((s) => (isHeuristic(s) ? heuristic : random)[s]!);
      const { result } = playHand(bots, 1 + i, i % 4);
      result!.payments.forEach((p, s) => {
        if (isHeuristic(s)) sum += p;
      });
    }
    // Gemessen (Stand B1): ≈ +9,8 ct je Spiel und Heuristik-Bot.
    expect(sum / 2000).toBeGreaterThan(5);
  });
});
