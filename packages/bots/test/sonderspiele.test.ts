import { describe, expect, it } from 'vitest';
import {
  type Card,
  type Contract,
  type ContractKind,
  type HandState,
  type RuleSet,
  type Seat,
  type Bot,
  type HandView,
  BID_ORDER,
  CLASSIC_CONTRACTS,
  DEFAULT_RULES,
  MODES,
  SUITS,
  dealHand,
  orderFor,
} from '@schafkopf/core';
import {
  ANSAGE_SCHWELLE,
  ansageWert,
  createHeuristicBot,
  createRandomBot,
  positionOf,
  rateContract,
} from '../src';
import { kontraStrength } from '../src/doubling';
import { rateAcceptWedding, weddingSize } from '../src/hochzeit';
import { playHand } from './simulate';

/**
 * B3: Heuristik-Bot in Sonderspielen und Hausregeln gegen Zufalls-Bots, je Variante mit festem
 * Seed-Satz und Schwelle (wie B1).
 *
 * Damit die Variante oft genug vorkommt, ohne dass CI lange rechnet, nimmt jeder Test aus den
 * Seeds 1, 2, 3, … die ersten, bei denen der Heuristik-Bot ein Blatt für die Variante bekommt
 * (das Geben hängt nur vom Seed ab – der Satz ist also fest). Gemessen wird dann
 *  - wie oft er die Variante ansagt und gewinnt,
 *  - sein Schnitt gegen die Zufalls-Bots und
 *  - derselbe Seed-Satz mit abgeschalteter Variante: Mit ihr muss er besser abschneiden.
 * Lange Läufe (zehnmal so viele Seeds) mit `BOT_LONG=1`, Zahlen ausgeben mit `BOT_REPORT=1`.
 */
const LONG = Boolean(process.env.BOT_LONG);
const COUNT = LONG ? 600 : 60;
const TIMEOUT = LONG ? 300_000 : 30_000;

/** Geber und Heuristik-Platz je Seed: Der Platz wandert relativ zum Geber über alle vier. */
const dealerOf = (seed: number): Seat => seed % 4;
const heuristicSeat = (seed: number): Seat => (seed + 1 + Math.floor(seed / 4)) % 4;
/** Für Hochzeiten zwei Heuristik-Bots gegenüber – Zufalls-Bots nehmen nie an. */
const partnerSeat = (seed: number): Seat => (heuristicSeat(seed) + 2) % 4;

/** Die ersten `count` Seeds ab 1, deren Blätter `fits` erfüllen. */
function seedsWhere(
  rules: RuleSet,
  count: number,
  fits: (hands: Card[][], seed: number) => boolean,
): number[] {
  const seeds: number[] = [];
  for (let seed = 1; seeds.length < count; seed++) {
    if (seed > 200_000) throw new Error('zu wenige passende Seeds');
    if (fits(dealHand(rules, dealerOf(seed), seed).hands, seed)) seeds.push(seed);
  }
  return seeds;
}

interface Tally {
  /** Schnitt je Spiel und Sitz in Cent. */
  heuristic: number;
  random: number;
  /** Spiele, die ein Heuristik-Bot mit einer der Spielarten angesagt hat, und Siege. */
  declared: number;
  declaredWon: number;
  /** Kontra/Re eines Heuristik-Bots und wie oft seine Partei gewann. */
  doubled: number;
  doubledWon: number;
  /** Ramsch: Plätze des Heuristik-Bots und davon verloren. */
  ramsch: number;
  ramschLost: number;
}

function run(
  rules: RuleSet,
  seeds: readonly number[],
  kinds: readonly ContractKind[],
  options: { pair?: boolean; randomMinTrumps?: number; heuristicPasses?: boolean } = {},
): Tally {
  const heuristic = [0, 1, 2, 3].map((s) => {
    const bot = createHeuristicBot(31 + s);
    if (!options.heuristicPasses) return bot;
    const passing: Bot = {
      decide: (view: HandView, r?: RuleSet) =>
        view.phase === 'bidding' ? { type: 'bid', call: view.legalCalls[0]! } : bot.decide(view, r),
    };
    return passing;
  });
  const random = [0, 1, 2, 3].map((s) => createRandomBot(310 + s, options.randomMinTrumps));
  const t: Tally = {
    heuristic: 0,
    random: 0,
    declared: 0,
    declaredWon: 0,
    doubled: 0,
    doubledWon: 0,
    ramsch: 0,
    ramschLost: 0,
  };
  let hSeats = 0;
  let rSeats = 0;
  for (const seed of seeds) {
    const isH = (s: Seat) =>
      s === heuristicSeat(seed) || (Boolean(options.pair) && s === partnerSeat(seed));
    const bots = [0, 1, 2, 3].map((s) => (isH(s) ? heuristic : random)[s]!);
    const end: HandState = playHand(bots, seed, dealerOf(seed), rules);
    const pay = end.result!.payments;
    pay.forEach((p, s) => {
      if (isH(s)) {
        t.heuristic += p;
        hSeats++;
      } else {
        t.random += p;
        rSeats++;
      }
    });
    const c = end.contract;
    if (!c || end.result!.kind !== 'played') continue;
    if (c.kind === 'ramsch') {
      for (const s of [0, 1, 2, 3].filter(isH)) {
        t.ramsch++;
        if (pay[s]! < 0) t.ramschLost++;
      }
      continue;
    }
    const declarer = end.declarer!;
    const won = pay[declarer]! > 0;
    if (kinds.includes(c.kind) && isH(declarer)) {
      t.declared++;
      if (won) t.declaredWon++;
    }
    const { kontra, re } = end.doubling;
    if (kontra !== null && isH(kontra)) {
      t.doubled++;
      if (!won) t.doubledWon++;
    }
    if (re !== null && isH(re)) {
      t.doubled++;
      if (won) t.doubledWon++;
    }
  }
  t.heuristic /= hSeats;
  t.random /= rSeats;
  return t;
}

function report(name: string, t: Tally, off?: Tally): void {
  if (!process.env.BOT_REPORT) return;
  const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(0) : '–') + ' %';
  console.log(
    `${name}: Heuristik ${t.heuristic.toFixed(1)} ct (ohne Variante ${off?.heuristic.toFixed(1) ?? '–'}), ` +
      `Zufall ${t.random.toFixed(1)} ct, angesagt ${t.declared} (gewonnen ${pct(t.declaredWon, t.declared)}), ` +
      `Kontra/Re ${t.doubled} (gewonnen ${pct(t.doubledWon, t.doubled)}), ` +
      `Ramsch ${t.ramsch} (verloren ${pct(t.ramschLost, t.ramsch)})`,
  );
}

/** Standardregeln plus die Spielarten der Variante. */
const withKinds = (...kinds: ContractKind[]): RuleSet => ({
  ...DEFAULT_RULES,
  contracts: BID_ORDER.filter((k) => DEFAULT_RULES.contracts.includes(k) || kinds.includes(k)),
});

/** Beste Bewertung des Blatts für eine Spielart (alle Farben bzw. Farbpaare, ohne Tout). */
function bestRating(hand: readonly Card[], kind: ContractKind): number {
  const mode = MODES[kind];
  const contracts: Contract[] =
    mode.suitRole === 'none'
      ? [{ kind }]
      : SUITS.flatMap((suit) =>
          mode.suitCount === 2
            ? SUITS.filter((s2) => s2 !== suit).map((suit2) => ({ kind, suit, suit2 }))
            : [{ kind, suit }],
        );
  return Math.max(...contracts.map((c) => rateContract(hand, c)));
}

/** Bester Wert laut Ansage-Tabelle (B4) für eine Spielart; außerhalb der Tabelle −∞. */
function bestValue(hand: readonly Card[], kind: ContractKind, position: number): number {
  const mode = MODES[kind];
  if (mode.eligible && !mode.eligible(hand)) return -Infinity;
  const contracts: Contract[] =
    mode.suitRole === 'none' ? [{ kind }] : SUITS.map((suit) => ({ kind, suit }));
  return Math.max(
    ...contracts.map((c) => ansageWert(hand, c, DEFAULT_RULES, position) ?? -Infinity),
  );
}

/**
 * Passt das Blatt zur Variante, und ist sie dort die beste Wahl? Ein Blatt, mit dem der Bot ohnehin
 * ein Solo spielt, zeigt nichts über die Variante.
 */
function fitsKind(hand: readonly Card[], kind: ContractKind): boolean {
  if (bestRating(hand, kind) < 0) return false;
  return CLASSIC_CONTRACTS.filter((k) => k !== 'sauspiel' && k !== 'bettel').every(
    (k) => bestRating(hand, k) < 0,
  );
}

describe('B3: Heuristik-Bot gegen Zufalls-Bots je Variante', () => {
  const variants: [string, ContractKind, { pair?: boolean }, number][] = [
    // Name, Spielart, Sitze, Schwelle für den Schnitt des Heuristik-Bots (ct je Spiel)
    ['Eisenbahner', 'eisenbahner', {}, 100],
    ['Hawaii-Habicht', 'hawaii', {}, 100],
    ['Hochzeit', 'hochzeit', { pair: true }, 12],
    ['Arabische Hochzeit', 'arabischeHochzeit', { pair: true }, 12],
  ];

  it.each(variants)(
    '%s: sagt an, gewinnt und schneidet besser ab als ohne',
    (name, kind, opts, min) => {
      const rules = withKinds(kind);
      // Hochzeit: Der zweite Heuristik-Bot hat ein Blatt, mit dem er annimmt.
      const n = weddingSize(kind);
      const seeds = seedsWhere(
        rules,
        COUNT,
        (hands, seed) =>
          fitsKind(hands[heuristicSeat(seed)]!, kind) &&
          (n === 0 || rateAcceptWedding(hands[partnerSeat(seed)]!, n) >= 0),
      );
      const on = run(rules, seeds, [kind], opts);
      const off = run(DEFAULT_RULES, seeds, [kind], opts);
      report(name, on, off);
      expect(on.declared).toBeGreaterThanOrEqual(COUNT * 0.5);
      expect(on.declaredWon / on.declared).toBeGreaterThan(0.7);
      expect(on.heuristic).toBeGreaterThan(min);
      expect(on.heuristic).toBeGreaterThan(off.heuristic);
    },
    TIMEOUT,
  );

  it(
    'Ramsch: verliert selten und bleibt im Plus',
    () => {
      // Alle sagen „weiter“: Zufalls-Bots mit weniger als fünf Trümpfen, der Heuristik-Bot ohne
      // Spiel, das sich laut Ansage-Tabelle lohnt.
      const rules: RuleSet = { ...DEFAULT_RULES, allPassed: 'ramsch' };
      const trumps = orderFor({ kind: 'sauspiel', suit: 'eichel' }, 0).trumps;
      const seeds = seedsWhere(rules, COUNT * 2, (hands, seed) =>
        hands.every((hand, s) =>
          s === heuristicSeat(seed)
            ? CLASSIC_CONTRACTS.every(
                (kind) =>
                  bestValue(hand, kind, positionOf(s, dealerOf(seed), 4)) <=
                  ANSAGE_SCHWELLE * DEFAULT_RULES.tariff.sauspiel,
              )
            : hand.filter((c) => trumps.includes(c)).length < 5,
        ),
      );
      const t = run(rules, seeds, []);
      report('Ramsch', t);
      expect(t.ramsch).toBe(seeds.length);
      // Unter vier Zufalls-Bots verliert jeder in gut einem Viertel der Ramsche.
      expect(t.ramschLost / t.ramsch).toBeLessThan(0.18);
      expect(t.heuristic).toBeGreaterThan(5);
    },
    TIMEOUT,
  );

  it(
    'Kontra: sagt es mit starkem Blatt und gewinnt damit mehr als ohne',
    () => {
      // Der Heuristik-Bot kommt heraus (nur dann ist er vor der ersten Karte am Zug) und hat ein
      // Blatt für Kontra gegen ein Sauspiel; die Zufalls-Bots spielen schon ab drei Trümpfen. Damit
      // er nicht selbst spielt, sagt er in diesem Test immer „weiter“.
      const rules: RuleSet = { ...DEFAULT_RULES, kontra: true };
      const seeds = seedsWhere(rules, COUNT, (hands, seed) => {
        const seat = (dealerOf(seed) + 1) % 4;
        return (
          seat === heuristicSeat(seed) &&
          kontraStrength(hands[seat]!, { kind: 'sauspiel', suit: 'eichel' }) >= 0
        );
      });
      const on = run(rules, seeds, [], { randomMinTrumps: 3, heuristicPasses: true });
      const off = run(DEFAULT_RULES, seeds, [], { randomMinTrumps: 3, heuristicPasses: true });
      report('Kontra', on, off);
      expect(on.doubled).toBeGreaterThanOrEqual(COUNT * 0.1);
      expect(on.doubledWon / on.doubled).toBeGreaterThan(0.6);
      expect(on.heuristic).toBeGreaterThan(off.heuristic);
    },
    TIMEOUT,
  );
});

describe('B3: Entscheidungszeit', () => {
  it('bleibt mit allen Spielarten, Kontra und Ramsch weit unter 50 ms', () => {
    const rules: RuleSet = {
      ...DEFAULT_RULES,
      contracts: [...BID_ORDER],
      kontra: true,
      allPassed: 'ramsch',
    };
    const bots = [0, 1, 2, 3].map((s) => createHeuristicBot(90 + s));
    let time = 0;
    let slowest = 0;
    let decisions = 0;
    const timed = bots.map((bot): Bot => ({
      decide(view: HandView, r?: RuleSet) {
        const start = performance.now();
        const action = bot.decide(view, r);
        const took = performance.now() - start;
        time += took;
        slowest = Math.max(slowest, took);
        decisions++;
        return action;
      },
    }));
    for (let seed = 1; seed <= COUNT * 2; seed++) playHand(timed, seed, seed % 4, rules);
    if (process.env.BOT_REPORT) {
      console.log(
        `Schnitt ${(time / decisions).toFixed(3)} ms, langsamste ${slowest.toFixed(1)} ms`,
      );
    }
    expect(time / decisions).toBeLessThan(50);
    expect(slowest).toBeLessThan(50);
  });
});
