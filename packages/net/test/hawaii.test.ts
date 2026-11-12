import { describe, expect, it } from 'vitest';
import { createHeuristicBot } from '@schafkopf/bots';
import {
  type Bot,
  type Contract,
  type HandView,
  type PlayerAction,
  type RuleSet,
  DEFAULT_RULES,
  orderFor,
  trickWinnerIndex,
} from '@schafkopf/core';
import { ClientSession, HostSession, createLoopbackPair, parseHostSnapshot } from '../src';

const HAWAII_RULES: RuleSet = {
  ...DEFAULT_RULES,
  contracts: [...DEFAULT_RULES.contracts, 'hawaii'],
};

/**
 * Bot, der in der Ansage jede Gelegenheit zum Hawaii-Habicht nutzt (das Blatt ist egal; die
 * Farben wählt er nach dem Zufall des Seeds) und sonst wie der Heuristik-Bot spielt. Merkt sich
 * jede Aktion, die nicht in der Sicht erlaubt war.
 */
function hawaiiBot(seed: number, illegal: string[], tout: boolean): Bot {
  const inner = createHeuristicBot(seed);
  let n = seed;
  return {
    decide(view: HandView): PlayerAction {
      const declares = view.legalCalls.filter(
        (c) => c.type === 'declare' && c.contract.kind === 'hawaii' && !!c.contract.tout === tout,
      );
      const named = view.legalCalls.find(
        (c) => c.type === 'name' && c.level.kind === 'hawaii' && !!c.level.tout === tout,
      );
      const interest = view.legalCalls.find((c) => c.type === 'interest');
      const hold = view.legalCalls.find((c) => c.type === 'hold');
      const call = declares[n++ % Math.max(1, declares.length)] ?? named ?? hold ?? interest;
      const action: PlayerAction =
        view.phase === 'bidding' && call ? { type: 'bid', call } : inner.decide(view);
      const ok =
        action.type === 'play'
          ? view.legalCards.includes(action.card)
          : action.type === 'bid'
            ? view.legalCalls.some((c) => JSON.stringify(c) === JSON.stringify(action.call))
            : view.canDouble;
      if (!ok) illegal.push(JSON.stringify(action));
      return action;
    },
  };
}

describe('Host mit vier Bots und Hawaii-Habicht', () => {
  it.each([false, true])('Zufallsspiele (Tout: %s) laufen regelgerecht durch', (tout) => {
    let hawaii = 0;
    const suits = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5]) {
      const queue: (() => void)[] = [];
      const illegal: string[] = [];
      let n = seed * 100;
      const host = new HostSession({
        rules: HAWAII_RULES,
        createBot: (s: number) => hawaiiBot(seed * 10 + s, illegal, tout),
        seed: () => n++,
        schedule: (fn: () => void) => void queue.push(fn),
      });
      expect(host.start()).toBe(true);
      for (let hand = 1; hand <= 15; hand++) {
        for (let i = 0; queue.length > 0; i++) {
          if (i > 10_000) throw new Error('Host kommt nicht zur Ruhe');
          queue.shift()!();
        }
        const table = host.getTable();
        const state = table.hand!;
        expect(state.phase).toBe('finished');
        const contract = state.contract;
        if (contract?.kind === 'hawaii') {
          hawaii++;
          suits.add(`${contract.suit}/${contract.suit2}`);
          expect(contract.suit).not.toBe(contract.suit2);
          // Jeder Stich ist nach der Ordnung seines Index entschieden.
          state.tricks.forEach((t, i) => {
            const winner = (t.leader + trickWinnerIndex(t.cards, orderFor(contract, i))) % 4;
            expect(t.winner).toBe(winner);
          });
        }
        expect(table.balances.reduce((a, b) => a + b, 0) + table.pot).toBe(0);
        if (hand < 15) expect(host.nextHand()).toBe(true);
      }
      expect(illegal).toEqual([]);
    }
    expect(hawaii).toBeGreaterThan(30);
    expect(suits.size).toBeGreaterThan(6);
  });
});

function join(host: HostSession, name: string) {
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  return new ClientSession(pair.client, { name, clientId: name });
}

describe('Hawaii-Habicht über das Netz', () => {
  it('der Host prüft die zweite Farbe; alle sehen beide Farben', () => {
    const queue: (() => void)[] = [];
    const host = new HostSession({
      rules: HAWAII_RULES,
      createBot: (s) => createHeuristicBot(s),
      seed: () => 42,
      schedule: (fn) => void queue.push(fn),
    });
    const clients = ['Anna', 'Bene', 'Cilli', 'Dori'].map((n) => join(host, n));
    host.start();
    // Geber ist Sitz 0, Sitz 1 sagt zuerst an.
    clients[1]!.bid({ type: 'interest' });
    for (const seat of [2, 3, 0]) clients[seat]!.bid({ type: 'pass' });

    const bad: unknown[] = [
      { kind: 'hawaii', suit: 'gras', suit2: 'gras' },
      { kind: 'hawaii', suit: 'gras' },
      { kind: 'hawaii', suit: 'gras', suit2: 'blau' },
      { kind: 'hawaii', suit: 'gras', suit2: { x: 1 } },
      { kind: 'solo', suit: 'gras', suit2: 'herz' },
    ];
    for (const contract of bad) {
      clients[1]!.bid({ type: 'declare', contract: contract as Contract });
      expect(clients[1]!.getSnapshot().lastError).toBe('illegal_bid');
    }

    const hawaii: Contract = { kind: 'hawaii', suit: 'eichel', suit2: 'schellen' };
    clients[1]!.bid({ type: 'declare', contract: hawaii });
    expect(clients[1]!.getSnapshot().lastError).toBeNull();
    for (const c of clients) {
      const view = c.getSnapshot().view!.hand!;
      expect(view.phase).toBe('playing');
      expect(view.contract).toEqual(hawaii);
    }

    // Der Speicherstand übersteht die zweite Farbe.
    const saved = parseHostSnapshot(JSON.parse(JSON.stringify(host.exportSnapshot())));
    expect(saved?.table.hand?.contract).toEqual(hawaii);
  });
});
