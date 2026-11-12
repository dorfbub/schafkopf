import { describe, expect, it } from 'vitest';
import { createHeuristicBot, createRandomBot } from '@schafkopf/bots';
import { type Bot, DEFAULT_RULES, type RuleSet, kindFitsPlayers } from '@schafkopf/core';
import { ClientSession, HostSession, createLoopbackPair, parseHostSnapshot } from '../src';

/** Kurze Karte und Dreier über den Host (K6, REGELN.md „Kurze Karte und Dreier“). */
const KURZ4: RuleSet = { ...DEFAULT_RULES, deck: 'kurz' };
const DREIER: RuleSet = { ...DEFAULT_RULES, players: 3, deck: 'kurz' };

function createHost(
  rules: RuleSet = DEFAULT_RULES,
  seed = 1,
  bot: (seed: number) => Bot = (s) => createRandomBot(s),
) {
  const queue: (() => void)[] = [];
  let next = seed;
  const host = new HostSession({
    rules,
    createBot: (seat) => bot(seed * 10 + seat),
    seed: () => next++,
    schedule: (fn) => void queue.push(fn),
  });
  const flush = () => {
    while (queue.length > 0) queue.shift()!();
  };
  return { host, flush };
}

function join(host: HostSession, name: string, clientId = name) {
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  return new ClientSession(pair.client, { name, clientId });
}

const names = (c: ClientSession) => c.getSnapshot().view!.seats.map((s) => s?.name ?? null);

/** Regeln, wie die Lobby sie schickt. */
const options = (rules: RuleSet) => structuredClone(rules);

describe('Lobby: Spielerzahl und Blatt', () => {
  it('der Gastgeber stellt auf drei Spieler mit kurzer Karte; alle sehen drei Plätze', () => {
    const { host } = createHost();
    const anna = join(host, 'Anna');
    const bene = join(host, 'Bene');
    expect(host.setRules(options(DREIER))).toBe(true);
    expect(names(bene)).toEqual(['Anna', 'Bene', null]);
    expect(anna.getSnapshot().view!.rules).toMatchObject({ players: 3, deck: 'kurz' });
    expect(host.getTable().balances).toEqual([0, 0, 0]);
  });

  it('wer auf dem wegfallenden vierten Platz sitzt, rückt auf einen freien Platz', () => {
    const { host } = createHost();
    const anna = join(host, 'Anna');
    const dora = join(host, 'Dora');
    expect(host.moveSeat(1, 3)).toBe(true);
    expect(names(anna)).toEqual(['Anna', null, null, 'Dora']);
    expect(host.setRules(options(DREIER))).toBe(true);
    expect(names(anna)).toEqual(['Anna', 'Dora', null]);
    expect(dora.getSnapshot().seat).toBe(1);
    expect(dora.getSnapshot().view!.you).toBe(1);
    // Zurück auf vier: alle bleiben sitzen, ein Platz kommt dazu.
    expect(host.setRules(options(DEFAULT_RULES))).toBe(true);
    expect(names(anna)).toEqual(['Anna', 'Dora', null, null]);
  });

  it('sitzen schon vier, geht es nicht auf drei; ungültige Besetzungen lehnt der Host ab', () => {
    const { host } = createHost();
    const anna = join(host, 'Anna');
    for (const n of ['Bene', 'Cilli', 'Dora']) join(host, n);
    expect(host.setRules(options(DREIER))).toBe(false);
    expect(names(anna)).toHaveLength(4);
    expect(host.setRules(options({ ...DREIER, deck: 'lang' }))).toBe(false);
    expect(host.setRules(options({ ...DREIER, players: 4 }))).toBe(true);
    expect(host.setRules(options({ ...DEFAULT_RULES, players: 5 }))).toBe(false);
    expect(host.getTable().rules).toMatchObject({ players: 4, deck: 'kurz' });
  });

  it('zu dritt lehnt der Host Muss ab', () => {
    const { host } = createHost();
    expect(host.setRules(options({ ...DREIER, allPassed: 'muss' }))).toBe(false);
    expect(host.getTable().rules.players).toBe(4);
  });

  it('ein Dreier-Tisch mit einem Menschen und zwei Bots: 8 Karten, Geber wandert über drei Plätze', () => {
    const { host, flush } = createHost(DREIER, 5);
    const anna = join(host, 'Anna');
    expect(host.start()).toBe(true);
    const view = anna.getSnapshot().view!;
    expect(view.seats.map((s) => s?.kind)).toEqual(['human', 'bot', 'bot']);
    expect(view.hand!.hand).toHaveLength(8);
    expect(view.hand!.handSizes).toEqual([8, 8, 8]);
    for (let handNo = 1; handNo <= 4; handNo++) {
      for (let step = 0; step < 100; step++) {
        flush();
        const hand = anna.getSnapshot().view!.hand!;
        if (hand.phase === 'finished') break;
        expect(hand.turn).toBe(0);
        if (hand.phase === 'bidding') anna.bid(hand.legalCalls[0]!);
        else anna.play(hand.legalCards[0]!);
      }
      expect(anna.getSnapshot().view!.hand!.phase).toBe('finished');
      expect(anna.getSnapshot().view!.dealer).toBe((handNo - 1) % 3);
      host.nextHand();
    }
  });

  it('ein Dreier-Tisch übersteht den Speicherstand; 3 mit langer Karte wird verworfen', () => {
    const { host, flush } = createHost(DREIER, 2);
    join(host, 'Anna');
    host.start();
    flush();
    const snap = JSON.parse(JSON.stringify(host.exportSnapshot()));
    const saved = parseHostSnapshot(snap);
    expect(saved?.table.seats).toHaveLength(3);
    expect(saved?.table.rules).toMatchObject({ players: 3, deck: 'kurz' });
    const broken = structuredClone(snap);
    broken.table.rules.deck = 'lang';
    expect(parseHostSnapshot(broken)).toBeNull();
  });
});

describe('Zufallsspiele über den Host mit Heuristik-Bots', () => {
  const ALL: RuleSet['contracts'] = [...DEFAULT_RULES.contracts, 'hochzeit', 'arabischeHochzeit'];
  const cases: [string, RuleSet][] = [
    ['lang zu viert', DEFAULT_RULES],
    ['lang zu viert, alle Spielarten, Kontra', { ...DEFAULT_RULES, contracts: ALL, kontra: true }],
    ['kurz zu viert', { ...KURZ4, contracts: ALL, kontra: true }],
    ['kurz zu viert, Muss', { ...KURZ4, allPassed: 'muss' }],
    ['zu dritt', { ...DREIER, kontra: true }],
    ['zu dritt, Ramsch', { ...DREIER, allPassed: 'ramsch' }],
    ['zu dritt, Stock', { ...DREIER, allPassed: 'stock' }],
  ];

  for (const [label, rules] of cases) {
    it(`${label}: viele Spiele laufen regelkonform durch`, () => {
      const { host, flush } = createHost(rules, 11, createHeuristicBot);
      expect(host.start()).toBe(true);
      const size = rules.deck === 'kurz' ? 24 / rules.players : 8;
      let played = 0;
      for (let n = 0; n < 60; n++) {
        flush();
        const table = host.getTable();
        const hand = table.hand!;
        expect(hand.phase, `Spiel ${n + 1}`).toBe('finished');
        expect(table.seats).toHaveLength(rules.players);
        expect(hand.initialHands.every((h) => h.length === size)).toBe(true);
        expect(table.balances.reduce((a, b) => a + b, 0) + table.pot).toBe(0);
        if (hand.result!.kind === 'played') {
          played++;
          expect(hand.tricks).toHaveLength(size);
          expect(hand.tricks.reduce((s, t) => s + t.points, 0)).toBe(120);
          expect(kindFitsPlayers(hand.contract!.kind, rules.players)).toBe(true);
        }
        expect(host.nextHand()).toBe(true);
      }
      // Die Bots spielen auch mit kurzer Karte und zu dritt tatsächlich Spiele.
      expect(played).toBeGreaterThan(10);
    });
  }
});
