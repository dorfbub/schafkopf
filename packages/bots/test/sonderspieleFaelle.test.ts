import { describe, expect, it } from 'vitest';
import {
  type Bot,
  type Card,
  type Contract,
  type ContractKind,
  type HandState,
  type PlayerAction,
  type RuleSet,
  type Seat,
  BID_ORDER,
  DEFAULT_RULES,
  MODES,
  SUITS,
  applyAction,
  createDeck,
  dealHand,
  handViewFor,
} from '@schafkopf/core';
import { createHeuristicBot, rateContract } from '../src';
import { durchmarschHand } from '../src/heuristicBot';
import { chooseWeddingGive, rateAcceptWedding, rateWedding } from '../src/hochzeit';
import { playHand } from './simulate';

/** Spiele je Prüfung „nie abgeschaltet“; lange Läufe mit `BOT_LONG=1`. */
const GAMES = process.env.BOT_LONG ? 1500 : 100;

/** Spiel mit festen Händen und Regeln; der Spieler links vom Geber beginnt. */
function fixedHand(rules: RuleSet, hands: Card[][], dealer: Seat): HandState {
  const state = dealHand(rules, dealer, 1);
  return { ...state, hands: hands.map((h) => [...h]), initialHands: hands.map((h) => [...h]) };
}

function act(state: HandState, seat: Seat, action: PlayerAction): HandState {
  const result = applyAction(state, { ...action, seat });
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

/** Ein Spieler sagt „Ich würde“, die anderen „weiter“, dann nennt er `contract`. */
function declare(state: HandState, declarer: Seat, contract: Contract): HandState {
  let s = state;
  for (let i = 0; i < 4; i++) {
    const seat = s.turn;
    s = act(s, seat, { type: 'bid', call: { type: seat === declarer ? 'interest' : 'pass' } });
  }
  return act(s, declarer, { type: 'bid', call: { type: 'declare', contract } });
}

const decide = (state: HandState, seat: Seat = state.turn, seed = 1) =>
  createHeuristicBot(seed).decide(handViewFor(state, seat), state.rules);

const rulesWith = (...kinds: ContractKind[]): RuleSet => ({
  ...DEFAULT_RULES,
  contracts: BID_ORDER.filter((k) => k === 'sauspiel' || kinds.includes(k)),
});

/** Verteilt die übrigen Karten in Blattreihenfolge auf die Sitze 1–3. */
function withRest(first: Card[]): Card[][] {
  const rest = createDeck('lang').filter((c) => !first.includes(c));
  return [first, rest.slice(0, 8), rest.slice(8, 16), rest.slice(16, 24)];
}

describe('B3: abgeschaltete Spielarten', () => {
  const BETTEL: Card[] = ['E7', 'E8', 'G7', 'G8', 'S7', 'S8', 'H7', 'H8'];

  it('sagt mit einem Bettel-Blatt nur „Ich würde“, wenn Bettel erlaubt ist', () => {
    const on = fixedHand(DEFAULT_RULES, withRest(BETTEL), 3);
    expect(decide(on)).toEqual({ type: 'bid', call: { type: 'interest' } });
    const off = fixedHand(rulesWith('solo'), withRest(BETTEL), 3);
    expect(decide(off)).toEqual({ type: 'bid', call: { type: 'pass' } });
  });

  it('ohne Regeln rechnet er mit den Standardregeln (keine Hausregeln)', () => {
    const hand: Card[] = ['EK', 'GK', 'HK', 'SK', 'GA', 'G10', 'G9', 'HA'];
    const state = fixedHand(rulesWith('hawaii'), withRest(hand), 3);
    const bot = createHeuristicBot(1);
    expect(bot.decide(handViewFor(state, 0))).toEqual({ type: 'bid', call: { type: 'pass' } });
    expect(bot.decide(handViewFor(state, 0), state.rules)).toEqual({
      type: 'bid',
      call: { type: 'interest' },
    });
  });

  /** Beste Bewertung unter den Spielen, die `rules` und die Bedingungen der Spielart erlauben. */
  function bestAllowed(hand: readonly Card[], rules: RuleSet): number {
    let best = -Infinity;
    for (const kind of rules.contracts) {
      const mode = MODES[kind];
      if (mode.eligible && !mode.eligible(hand)) continue;
      const suits = mode.suitChoices?.(hand) ?? SUITS;
      const contracts: Contract[] =
        mode.suitRole === 'none'
          ? [{ kind }]
          : suits.flatMap((suit) =>
              mode.suitCount === 2
                ? suits.filter((s2) => s2 !== suit).map((suit2) => ({ kind, suit, suit2 }))
                : [{ kind, suit }],
            );
      for (const c of contracts) best = Math.max(best, rateContract(hand, c));
    }
    return best;
  }

  it.each(BID_ORDER.filter((k) => k !== 'sauspiel'))(
    'sagt nie an, was abgeschaltet ist (ohne %s, alle anderen an)',
    (off) => {
      const rules: RuleSet = {
        ...DEFAULT_RULES,
        contracts: BID_ORDER.filter((k) => k !== off),
        kontra: true,
        allPassed: 'ramsch',
      };
      const bots = [0, 1, 2, 3].map((s) => createHeuristicBot(70 + s));
      let interest = 0;
      for (let seed = 1; seed <= GAMES; seed++) {
        const end = playHand(bots, seed, seed % 4, rules, (seat, action, state) => {
          if (action.type !== 'bid') return;
          const { call } = action;
          if (call.type === 'interest') {
            interest++;
            // „Ich würde“ nur mit einem erlaubten Spiel, für das das Blatt reicht.
            expect(bestAllowed(state.hands[seat]!, rules)).toBeGreaterThanOrEqual(0);
          }
          if (call.type === 'name') expect(rules.contracts).toContain(call.level.kind);
          if (call.type === 'declare') expect(rules.contracts).toContain(call.contract.kind);
        });
        expect(end.contract?.kind).not.toBe(off);
      }
      expect(interest).toBeGreaterThan(GAMES / 3);
    },
    process.env.BOT_LONG ? 600_000 : 30_000,
  );
});

describe('B3: Ansage der Hausregeln', () => {
  it('nennt den Hawaii-Habicht mit beiden Farben, die längere zuerst', () => {
    const hand: Card[] = ['EK', 'GK', 'HK', 'SK', 'GA', 'G10', 'G9', 'HA'];
    let state = fixedHand(rulesWith('hawaii'), withRest(hand), 3);
    state = act(state, 0, decide(state));
    for (const seat of [1, 2, 3]) state = act(state, seat, { type: 'bid', call: { type: 'pass' } });
    expect(decide(state)).toEqual({
      type: 'bid',
      call: { type: 'declare', contract: { kind: 'hawaii', suit: 'gras', suit2: 'herz' } },
    });
  });

  it('bewertet Eisenbahner nach Zehnern und Farbstichen', () => {
    expect(
      rateContract(['E10', 'G10', 'H10', 'S10', 'EA', 'EK', 'GA', 'S7'], { kind: 'eisenbahner' }),
    ).toBeGreaterThanOrEqual(0);
    expect(
      rateContract(['E10', 'H7', 'H8', 'S9', 'EK', 'E8', 'G7', 'S7'], { kind: 'eisenbahner' }),
    ).toBeLessThan(0);
  });

  it('sagt den Eisenbahner an, wenn er erlaubt ist', () => {
    const hand: Card[] = ['E10', 'G10', 'H10', 'S10', 'EA', 'EK', 'GA', 'GK'];
    let state = fixedHand(rulesWith('eisenbahner'), withRest(hand), 3);
    state = act(state, 0, decide(state));
    for (const seat of [1, 2, 3]) state = act(state, seat, { type: 'bid', call: { type: 'pass' } });
    const named = decide(state);
    expect(named.type === 'bid' && named.call.type === 'declare' && named.call.contract.kind).toBe(
      'eisenbahner',
    );
  });
});

describe('B3: Hochzeit und arabische Hochzeit', () => {
  it('sagt die Hochzeit mit zwei Sauen an, ohne nicht', () => {
    expect(rateWedding(['HO', 'EA', 'E9', 'GA', 'G7', 'S7', 'S8', 'S9'], 1)).toBeGreaterThanOrEqual(
      0,
    );
    expect(rateWedding(['HO', 'EK', 'E9', 'GA', 'G7', 'S7', 'S8', 'S9'], 1)).toBeLessThan(0);
    // Arabische Hochzeit: genau zwei Trümpfe.
    expect(
      rateWedding(['HO', 'H7', 'EA', 'E10', 'GA', 'G7', 'S7', 'S8'], 2),
    ).toBeGreaterThanOrEqual(0);
    expect(rateWedding(['HO', 'EA', 'E10', 'GA', 'G7', 'S7', 'S8', 'S9'], 2)).toBeLessThan(0);
  });

  it('nimmt mit starkem Trumpfblatt an, mit schwachem nicht', () => {
    expect(
      rateAcceptWedding(['EO', 'GO', 'HU', 'SU', 'HA', 'H9', 'SA', 'G7'], 1),
    ).toBeGreaterThanOrEqual(0);
    expect(rateAcceptWedding(['SU', 'H9', 'H8', 'SA', 'G7', 'G8', 'E9', 'S7'], 1)).toBeLessThan(0);
  });

  it('gibt die Karte zurück, mit der eine Farbe frei wird', () => {
    const hand: Card[] = ['EO', 'GO', 'HO', 'SU', 'HA', 'H9', 'S7', 'E8', 'EA'];
    const gives = [['S7'], ['E8'], ['EA']] as Card[][];
    expect(chooseWeddingGive(hand, gives)).toEqual(['S7']);
  });

  it('nimmt eine Hochzeit am Tisch an und spielt sie zu Ende', () => {
    const rules = rulesWith('hochzeit');
    const hands: Card[][] = [
      ['HO', 'EA', 'E9', 'GA', 'G7', 'S7', 'S8', 'S9'],
      ['EO', 'GO', 'SO', 'EU', 'GU', 'HA', 'H10', 'SA'],
      ['HU', 'SU', 'HK', 'H9', 'H8', 'H7', 'E10', 'EK'],
      ['E8', 'E7', 'G10', 'GK', 'G9', 'G8', 'S10', 'SK'],
    ];
    let state = declare(fixedHand(rules, hands, 3), 0, { kind: 'hochzeit' });
    expect(state.phase).toBe('prelude');
    expect(decide(state, 1)).toEqual({ type: 'prelude', move: { type: 'accept' } });
    const bots: Bot[] = [0, 1, 2, 3].map((s) => createHeuristicBot(s));
    for (let step = 0; state.phase !== 'finished'; step++) {
      if (step > 100) throw new Error('Spiel endet nicht');
      const seat = state.turn;
      state = act(state, seat, bots[seat]!.decide(handViewFor(state, seat), rules));
    }
    expect(state.partner).toBe(1);
  });
});

describe('B3: Kontra und Re', () => {
  // Sitz 2 spielt ein Sauspiel auf die Eichel-Sau, Sitz 1 kommt heraus und hat ein starkes Blatt.
  const HANDS: Card[][] = [
    ['EA', 'E10', 'EK', 'G10', 'GK', 'S10', 'SK', 'S9'],
    ['EO', 'GO', 'HO', 'EU', 'GU', 'HA', 'H10', 'SA'],
    ['SO', 'SU', 'HU', 'H9', 'H8', 'E7', 'G7', 'G8'],
    ['H7', 'HK', 'E9', 'E8', 'GA', 'G9', 'S8', 'S7'],
  ];
  const SAUSPIEL: Contract = { kind: 'sauspiel', suit: 'eichel' };

  it('sagt mit starkem Blatt Kontra, wenn Kontra am Tisch an ist, und spielt dann aus', () => {
    let state = declare(fixedHand({ ...DEFAULT_RULES, kontra: true }, HANDS, 0), 2, SAUSPIEL);
    expect(state.turn).toBe(1);
    const bot = createHeuristicBot(1);
    const first = bot.decide(handViewFor(state, 1), state.rules);
    expect(first).toEqual({ type: 'double' });
    state = act(state, 1, first);
    expect(bot.decide(handViewFor(state, 1), state.rules).type).toBe('play');
  });

  it('sagt kein Kontra, wenn es am Tisch aus ist', () => {
    const state = declare(fixedHand(DEFAULT_RULES, HANDS, 0), 2, SAUSPIEL);
    expect(decide(state).type).toBe('play');
  });

  it('sagt kein Kontra mit schwachem Blatt', () => {
    const hands = HANDS.map((h) => [...h]);
    [hands[1], hands[0]] = [hands[0]!, hands[1]!];
    // Sitz 0 hat jetzt das starke Blatt, Sitz 1 (heraus) das schwache.
    const state = declare(fixedHand({ ...DEFAULT_RULES, kontra: true }, hands, 0), 2, SAUSPIEL);
    expect(decide(state).type).toBe('play');
  });
});

describe('B3: Trümpfe je Stich (Hawaii-Habicht)', () => {
  it('zieht vor dem Wechsel zuerst mit den Trümpfen, die danach verfallen', () => {
    const hand: Card[] = ['GK', 'SK', 'GA', 'G7', 'G8', 'H9', 'HA', 'EA'];
    const contract: Contract = { kind: 'hawaii', suit: 'gras', suit2: 'herz' };
    const state = declare(fixedHand(rulesWith('hawaii'), withRest(hand), 3), 0, contract);
    expect(state.turn).toBe(0);
    // Eichel- und Herz-König sind draußen, der Gras-König ist nicht oben: kleiner Gras-Trumpf.
    expect(decide(state)).toEqual({ type: 'play', card: 'G7' });
  });
});

describe('B3: Ramsch', () => {
  const RAMSCH: RuleSet = { ...DEFAULT_RULES, allPassed: 'ramsch' };
  const passAll = (state: HandState) => {
    let s = state;
    for (let i = 0; i < 4; i++) s = act(s, s.turn, { type: 'bid', call: { type: 'pass' } });
    return s;
  };

  it('erkennt ein Durchmarsch-Blatt', () => {
    expect(durchmarschHand(['EO', 'GO', 'HO', 'SO', 'EU', 'HA', 'H10', 'EA'])).toBe(true);
    expect(durchmarschHand(['EO', 'GO', 'HO', 'SO', 'EU', 'HA', 'H10', 'E7'])).toBe(false);
    expect(durchmarschHand(['EO', 'HO', 'SO', 'EU', 'GU', 'HA', 'H10', 'EA'])).toBe(false);
  });

  it('spielt mit Durchmarsch-Blatt von oben, ohne Durchmarsch-Regel klein', () => {
    const hand: Card[] = ['EO', 'GO', 'HO', 'SO', 'EU', 'HA', 'H10', 'EA'];
    const on = passAll(fixedHand(RAMSCH, withRest(hand), 3));
    expect(decide(on)).toEqual({ type: 'play', card: 'EO' });
    const offRules: RuleSet = { ...RAMSCH, ramsch: { durchmarsch: false, jungfrau: true } };
    const off = passAll(fixedHand(offRules, withRest(hand), 3));
    expect(decide(off)).not.toEqual({ type: 'play', card: 'EO' });
  });

  it('nimmt einen Stich, wenn ein anderer sonst durchmarschiert', () => {
    // Sitz 1 hat die ersten beiden Stiche; Sitz 0 kommt heraus und kann den dritten sicher nehmen.
    const hands: Card[][] = [
      ['EO', 'S7', 'G7', 'E7', 'H7', 'S8'],
      ['GO', 'HO', 'SO', 'EU', 'GU', 'HU'],
      ['E8', 'E9', 'G8', 'G9', 'S9', 'SK'],
      ['EK', 'GK', 'HK', 'H8', 'H9', 'G10'],
    ];
    const start = fixedHand(RAMSCH, withRest(['EO', 'S7', 'G7', 'E7', 'H7', 'S8', 'EA', 'E10']), 3);
    const trick = (leader: Seat, cards: Card[]) => ({ leader, cards, winner: 1, points: 0 });
    const state: HandState = {
      ...passAll(start),
      hands,
      tricks: [trick(0, ['EA', 'GA', 'SA', 'HA']), trick(1, ['E10', 'S10', 'H10', 'SU'])],
      turn: 0,
      currentTrick: { leader: 0, cards: [] },
    };
    const bot = createHeuristicBot(3);
    // Erstes Spiel nach dem Geben: Der Bot sieht die Ansage und kennt damit das ganze Blatt.
    bot.decide(handViewFor(start, 0), RAMSCH);
    // Ohne Gefahr bliebe er mit dem Eichel-Ober nie vorn; so nimmt er den Stich.
    expect(bot.decide(handViewFor(state, 0), RAMSCH)).toEqual({ type: 'play', card: 'EO' });
    const calm = createHeuristicBot(3);
    calm.decide(handViewFor(start, 0), RAMSCH);
    const spread = { ...state, tricks: [{ ...state.tricks[0]!, winner: 2 }, state.tricks[1]!] };
    expect(calm.decide(handViewFor(spread, 0), RAMSCH)).not.toEqual({ type: 'play', card: 'EO' });
  });
});
