import { describe, expect, it } from 'vitest';
import { createRandomBot } from '@schafkopf/bots';
import { type RuleOptions, canDouble, DEFAULT_RULES } from '@schafkopf/core';
import { ClientSession, HostSession, createLoopbackPair } from '../src';

const KONTRA = { ...DEFAULT_RULES, kontra: true };

/** Host mit synchroner Zeitsteuerung; merkt sich die verlangten Wartezeiten. */
function createHost(seed = 1, rules = KONTRA) {
  const queue: { fn: () => void; ms: number }[] = [];
  const host = new HostSession({
    rules,
    createBot: (seat) => createRandomBot(seed * 10 + seat),
    seed: () => seed,
    schedule: (fn, ms) => void queue.push({ fn, ms }),
    botDelayMs: 800,
    kontraWindowMs: 3000,
  });
  const flush = () => {
    while (queue.length > 0) queue.shift()!.fn();
  };
  return { host, queue, flush };
}

function join(host: HostSession, name: string) {
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  return new ClientSession(pair.client, { name, clientId: name });
}

/** Vier Menschen; Sitz 1 sagt als Einziger an und nennt sein erstes erlaubtes Spiel. */
function fourHumansPlaying() {
  const { host } = createHost(3);
  const clients = ['Anna', 'Bene', 'Cilli', 'Dori'].map((n) => join(host, n));
  host.start();
  const view = () => clients[0]!.getSnapshot().view!.hand!;
  // Geber ist Sitz 0: Sitz 1 sagt zuerst.
  clients[1]!.bid({ type: 'interest' });
  for (const seat of [2, 3, 0]) clients[seat]!.bid({ type: 'pass' });
  const declare = clients[1]!.getSnapshot().view!.hand!.legalCalls[0]!;
  clients[1]!.bid(declare);
  expect(view().phase).toBe('playing');
  return { host, clients, view };
}

describe('Kontra und Re über das Netz', () => {
  it('ein Gegenspieler sagt Kontra außerhalb der Reihe, der Spieler Re; alle sehen es', () => {
    const { host, clients, view } = fourHumansPlaying();
    const opponent = [0, 2, 3].find((s) => clients[s]!.getSnapshot().view!.hand!.canDouble)!;
    expect(opponent).toBeDefined();
    expect(clients[1]!.getSnapshot().view!.hand!.canDouble).toBe(false);
    clients[opponent]!.double();
    expect(clients[opponent]!.getSnapshot().lastError).toBeNull();
    for (const c of clients) expect(c.getSnapshot().view!.hand!.doubling.kontra).toBe(opponent);
    expect(clients[1]!.getSnapshot().view!.hand!.canDouble).toBe(true);
    clients[1]!.double();
    expect(view().doubling).toEqual({ kontra: opponent, re: 1 });
    // Im Protokoll steht beides.
    const actions = host.getTable().logs.at(-1)!.actions;
    expect(actions.filter((a) => a.type === 'double').map((a) => a.seat)).toEqual([opponent, 1]);
  });

  it('wer nicht darf, bekommt einen Fehler; der Zustand bleibt', () => {
    const { clients, view } = fourHumansPlaying();
    clients[1]!.double(); // Spieler vor Kontra
    expect(clients[1]!.getSnapshot().lastError).toBe('illegal_double');
    expect(view().doubling).toEqual({ kontra: null, re: null });
  });

  it('ohne Tischregel ist Kontra abgeschaltet', () => {
    const { host } = createHost(3, DEFAULT_RULES);
    const anna = join(host, 'Anna');
    host.start();
    anna.double();
    expect(anna.getSnapshot().lastError).toBe('wrong_phase');
  });

  it('der Gastgeber kann die Regel in der Lobby einschalten', () => {
    const { host } = createHost(3, DEFAULT_RULES);
    const anna = join(host, 'Anna');
    const options = { ...DEFAULT_RULES, kontra: true } as Partial<typeof DEFAULT_RULES>;
    delete options.players;
    delete options.deck;
    expect(host.setRules(options as RuleOptions)).toBe(true);
    expect(anna.getSnapshot().view!.rules.kontra).toBe(true);
    delete options.kontra;
    expect(host.setRules(options as RuleOptions)).toBe(false);
  });

  it('Kontra-Fenster: ein Bot wartet mit der ersten Karte, solange ein Mensch Kontra sagen darf', () => {
    // Suche einen Seed, bei dem ein Bot ausspielt und Anna (Sitz 0) Gegenspielerin ist.
    for (let seed = 1; seed < 200; seed++) {
      const { host, queue, flush } = createHost(seed);
      const anna = join(host, 'Anna');
      host.start();
      // Bots sagen an; Anna sagt immer „weiter“.
      for (let step = 0; step < 20; step++) {
        const hand = host.getTable().hand!;
        if (hand.phase !== 'bidding') break;
        if (hand.turn === 0) anna.bid({ type: 'pass' });
        else queue.shift()!.fn();
      }
      const hand = host.getTable().hand!;
      if (hand.phase !== 'playing' || hand.turn === 0 || !canDouble(hand, 0)) continue;
      expect(queue.map((q) => q.ms)).toEqual([3000]);
      anna.double();
      // Sofort neu geplant – ohne Fenster, denn Re darf nur ein Bot. Der alte Zeitgeber verfällt.
      expect(queue.map((q) => q.ms)).toEqual([3000, 800]);
      queue.shift()!.fn();
      expect(host.getTable().hand!.currentTrick.cards).toHaveLength(0);
      queue.shift()!.fn();
      expect(host.getTable().hand!.currentTrick.cards).toHaveLength(1);
      flush();
      expect(host.getTable().hand!.doubling.kontra).toBe(0);
      return;
    }
    throw new Error('kein passender Seed gefunden');
  });

  it('Re-Fenster: nach Kontra wartet der Bot neu, wenn ein Mensch Re sagen darf', () => {
    // Suche einen Seed: Bot spielt ein Sauspiel, Bene (Sitz 2) ist sein Mitspieler, der Bot auf
    // Sitz 1 kommt heraus, Anna (Sitz 0) ist Gegenspielerin.
    for (let seed = 1; seed < 500; seed++) {
      const { host, queue } = createHost(seed);
      const anna = join(host, 'Anna');
      const bene = join(host, 'Bene');
      host.moveSeat(1, 2);
      host.start();
      for (let step = 0; step < 20; step++) {
        const hand = host.getTable().hand!;
        if (hand.phase !== 'bidding') break;
        if (hand.turn === 0) anna.bid({ type: 'pass' });
        else if (hand.turn === 2) bene.bid({ type: 'pass' });
        else queue.shift()!.fn();
      }
      const hand = host.getTable().hand!;
      if (hand.phase !== 'playing' || hand.partner !== 2 || hand.declarer === 0) continue;
      expect(queue.map((q) => q.ms)).toEqual([3000]);
      anna.double();
      // Bene darf jetzt Re sagen: frisches Fenster, der alte Zeitgeber verfällt.
      expect(queue.map((q) => q.ms)).toEqual([3000, 3000]);
      queue.shift()!.fn();
      expect(host.getTable().hand!.currentTrick.cards).toHaveLength(0);
      bene.double();
      expect(host.getTable().hand!.doubling).toEqual({ kontra: 0, re: 2 });
      expect(queue.map((q) => q.ms)).toEqual([3000, 800]);
      queue.shift()!.fn();
      queue.shift()!.fn();
      expect(host.getTable().hand!.currentTrick.cards).toHaveLength(1);
      return;
    }
    throw new Error('kein passender Seed gefunden');
  });

  it('ohne Menschen, die Kontra sagen dürfen, ziehen Bots ohne Wartezeit', () => {
    const { host, queue } = createHost(1, DEFAULT_RULES);
    join(host, 'Anna');
    host.start();
    expect(queue.every((q) => q.ms === 800)).toBe(true);
  });
});
