import { describe, expect, it } from 'vitest';
import { createHeuristicBot } from '@schafkopf/bots';
import { type Bot, type HandView, type PlayerAction, DEFAULT_RULES } from '@schafkopf/core';
import { HostSession } from '../src';

/**
 * Bot, der in der Ansage jede Gelegenheit zum Eisenbahner nutzt (das Blatt ist egal) und sonst
 * wie der Heuristik-Bot spielt. Merkt sich jede Aktion, die nicht in der Sicht erlaubt war.
 */
function eisenbahnerBot(seed: number, illegal: string[], tout: boolean): Bot {
  const inner = createHeuristicBot(seed);
  return {
    decide(view: HandView): PlayerAction {
      const eis = view.legalCalls.find(
        (c) =>
          (c.type === 'declare' &&
            c.contract.kind === 'eisenbahner' &&
            !!c.contract.tout === tout) ||
          (c.type === 'name' && c.level.kind === 'eisenbahner' && !!c.level.tout === tout),
      );
      const interest = view.legalCalls.find((c) => c.type === 'interest');
      const hold = view.legalCalls.find((c) => c.type === 'hold');
      const call = eis ?? hold ?? interest;
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

describe('Host mit vier Bots und Eisenbahner', () => {
  it.each([false, true])('Zufallsspiele (Tout: %s) laufen durch, Kontosumme bleibt 0', (tout) => {
    let eisenbahner = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const queue: (() => void)[] = [];
      const illegal: string[] = [];
      let n = seed * 100;
      const host = new HostSession({
        rules: { ...DEFAULT_RULES, contracts: [...DEFAULT_RULES.contracts, 'eisenbahner'] },
        createBot: (s: number) => eisenbahnerBot(seed * 10 + s, illegal, tout),
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
        expect(table.hand!.phase).toBe('finished');
        if (table.hand!.contract?.kind === 'eisenbahner') eisenbahner++;
        expect(table.balances.reduce((a, b) => a + b, 0) + table.pot).toBe(0);
        if (hand < 15) expect(host.nextHand()).toBe(true);
      }
      expect(illegal).toEqual([]);
    }
    expect(eisenbahner).toBeGreaterThan(30);
  });
});
