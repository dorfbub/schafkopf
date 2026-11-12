import { describe, expect, it } from 'vitest';
import {
  type Bot,
  type BotStrength,
  type HandView,
  type PlayerAction,
  type RuleSet,
  BOT_STRENGTHS,
  DEFAULT_RULES,
  createRng,
  pick,
} from '@schafkopf/core';
import { createBotOfStrength } from '../src';
import { playHand } from './simulate';

/**
 * Wildfang: sagt jede Spielart an, die er darf (bevorzugt die seltenen), nimmt Hochzeiten an,
 * gibt beliebige erlaubte Karten zurück und sagt Kontra bzw. Re, wo es geht. So kommen die
 * Stufen in alle Lagen: Hochzeit-Vorspiel, Sonderspiele als Gegenspieler, gedoppelte Spiele.
 */
function createWildBot(seed: number): Bot {
  const rng = createRng(seed);
  return {
    decide(view: HandView): PlayerAction {
      if (view.canDouble && rng() < 0.5) return { type: 'double' };
      if (view.phase === 'prelude') {
        const accept = view.legalMoves.find((m) => m.type === 'accept');
        return { type: 'prelude', move: accept ?? pick(view.legalMoves, rng) };
      }
      if (view.phase === 'playing') return { type: 'play', card: pick(view.legalCards, rng) };
      const calls = view.legalCalls;
      if (view.auction.stage === 'interest') return { type: 'bid', call: pick(calls, rng) };
      const declares = calls.flatMap((c) => (c.type === 'declare' ? [c] : []));
      const wedding = declares.filter((c) => c.contract.kind.endsWith('ochzeit'));
      if (wedding.length > 0) return { type: 'bid', call: pick(wedding, rng) };
      const special = declares.filter((c) => c.contract.kind !== 'sauspiel');
      if (special.length > 0 && rng() < 0.8) return { type: 'bid', call: pick(special, rng) };
      const active = calls.filter((c) => c.type !== 'yield');
      return { type: 'bid', call: pick(active.length > 0 && rng() < 0.7 ? active : calls, rng) };
    },
  };
}

const ALL_KINDS: RuleSet['contracts'] = [
  ...DEFAULT_RULES.contracts,
  'hochzeit',
  'arabischeHochzeit',
  'eisenbahner',
];

const VARIANTS: [string, RuleSet][] = [
  ['Standard', DEFAULT_RULES],
  ['Ramsch mit Kontra', { ...DEFAULT_RULES, allPassed: 'ramsch', kontra: true }],
  ['Muss', { ...DEFAULT_RULES, allPassed: 'muss' }],
  ['Stock', { ...DEFAULT_RULES, allPassed: 'stock' }],
  ['Hausregeln und Kontra', { ...DEFAULT_RULES, contracts: ALL_KINDS, kontra: true }],
  ['ohne Davonlaufen, ohne Tout', { ...DEFAULT_RULES, davonlaufen: false, allowTout: false }],
  ['kurzes Blatt', { ...DEFAULT_RULES, deck: 'kurz', contracts: ALL_KINDS }],
];

/** „Stark“ hier mit kleinem Budget: Regeltreue hängt nicht vom Aufwand ab, die Laufzeit schon. */
const cheap = { playBudget: 1, minSamples: 1, bidBudget: 1, minBidSamples: 1 };

/** Großer Lauf: `BOTS_FULL=1 npx vitest run packages/bots`. */
const GAMES = process.env.BOTS_FULL ? 600 : 100;

function bot(strength: BotStrength, seed: number, rules: RuleSet): Bot {
  return createBotOfStrength(strength, seed, rules, cheap);
}

describe('Spielstärken: Regeltreue', () => {
  it.each(VARIANTS)(
    'keine Stufe liefert eine unerlaubte Aktion (%s)',
    { timeout: 120_000 },
    (_name, rules) => {
      // Feste Bot-Objekte je Sitz und Stufe – wie am echten Tisch über mehrere Spiele.
      const pool = BOT_STRENGTHS.map((strength) =>
        [0, 1, 2, 3].map((s) =>
          bot(strength, 300 + 10 * BOT_STRENGTHS.indexOf(strength) + s, rules),
        ),
      );
      const wild = [0, 1, 2, 3].map((s) => createWildBot(400 + s));
      const kinds = new Set<string>();
      let doubled = 0;
      for (let i = 0; i < GAMES; i++) {
        // Gerade Spiele: nur Stufen, jeder Sitz reihum mit jeder. Ungerade: zwei Wildfänge
        // (einer sagt an, der andere nimmt die Hochzeit an) neben zwei Stufen; jedes vierte
        // Spiel spielt ein Wildfang an und kann so vor der ersten Karte Kontra sagen.
        const bots = [0, 1, 2, 3].map((s) => {
          if (i % 2 === 1 && (s + i + (i % 4 === 3 ? 1 : 0)) % 4 < 2) return wild[s]!;
          return pool[(i + s) % 3]![s]!;
        });
        const end = playHand(bots, 50_000 + i, i % 4, rules);
        if (end.result?.kind === 'played') kinds.add(end.contract!.kind);
        if (end.doubling.kontra !== null) doubled++;
      }
      // Die Lagen kommen tatsächlich vor.
      if (rules.contracts.includes('hochzeit')) {
        // Mit Vorspiel gespielt: Hochzeit oder arabische Hochzeit.
        expect([...kinds].some((k) => k.endsWith('ochzeit'))).toBe(true);
      }
      if (rules.allPassed === 'ramsch') expect(kinds).toContain('ramsch');
      if (rules.kontra && rules.allPassed !== 'ramsch') expect(doubled).toBeGreaterThan(0);
    },
  );
});
