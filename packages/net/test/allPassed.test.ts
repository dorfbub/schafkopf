import { describe, expect, it } from 'vitest';
import { createHeuristicBot } from '@schafkopf/bots';
import {
  type AllPassedRule,
  type Bot,
  type HandView,
  type PlayerAction,
  DEFAULT_RULES,
} from '@schafkopf/core';
import { HostSession, parseHostSnapshot } from '../src';

/**
 * Bot, der in Stufe 1 der Ansage immer „weiter“ sagt – so beginnt jedes Spiel mit „alle
 * weiter“ – und sonst wie der Heuristik-Bot spielt. Merkt sich jede Aktion, die nicht in
 * der Sicht erlaubt war; der Host würde sie sonst still durch einen Notfallzug ersetzen.
 */
function passingBot(seed: number, illegal: string[]): Bot {
  const inner = createHeuristicBot(seed);
  return {
    decide(view: HandView): PlayerAction {
      const action: PlayerAction =
        view.phase === 'bidding' && view.auction.stage === 'interest'
          ? { type: 'bid', call: { type: 'pass' } }
          : inner.decide(view);
      const ok =
        action.type === 'play'
          ? view.legalCards.includes(action.card)
          : view.legalCalls.some((c) => JSON.stringify(c) === JSON.stringify(action.call));
      if (!ok) illegal.push(JSON.stringify(action));
      return action;
    },
  };
}

/** Host mit vier Bots und synchroner Zeitsteuerung. */
function botTable(allPassed: AllPassedRule, seed: number) {
  const queue: (() => void)[] = [];
  const illegal: string[] = [];
  let n = seed;
  const options = {
    rules: { ...DEFAULT_RULES, allPassed },
    createBot: (seat: number) => passingBot(seed * 10 + seat, illegal),
    seed: () => n++,
    schedule: (fn: () => void) => void queue.push(fn),
  };
  const host = new HostSession(options);
  const flush = () => {
    for (let i = 0; queue.length > 0; i++) {
      if (i > 10_000) throw new Error('Host kommt nicht zur Ruhe');
      queue.shift()!();
    }
  };
  return { host, flush, illegal, options };
}

describe('Host mit vier Bots: jedes Spiel beginnt mit „alle weiter“', () => {
  it('Ramsch: Spiele laufen durch, Bots spielen regelgerecht, Kontosumme bleibt 0', () => {
    for (const seed of [1, 2, 3]) {
      const { host, flush, illegal } = botTable('ramsch', seed);
      expect(host.start()).toBe(true);
      for (let hand = 1; hand <= 12; hand++) {
        flush();
        const table = host.getTable();
        expect(table.hand!.phase).toBe('finished');
        expect(table.hand!.contract).toEqual({ kind: 'ramsch' });
        expect(table.hand!.declarer).toBeNull();
        expect(table.balances.reduce((a, b) => a + b, 0) + table.pot).toBe(0);
        if (hand < 12) expect(host.nextHand()).toBe(true);
      }
      expect(host.getTable().history).toHaveLength(12);
      expect(illegal).toEqual([]);
    }
  });

  it('Ramsch: ein Speicherstand mitten im Spiel wird wiederhergestellt und läuft zu Ende', () => {
    const { host, illegal, options } = botTable('ramsch', 7);
    const queue: (() => void)[] = [];
    const stepping = new HostSession({ ...options, schedule: (fn) => void queue.push(fn) });
    stepping.start();
    // Nur bis in den dritten Stich spielen.
    while (queue.length > 0 && (stepping.getTable().hand?.tricks.length ?? 0) < 3) {
      queue.shift()!();
    }
    const snapshot = parseHostSnapshot(JSON.parse(JSON.stringify(stepping.exportSnapshot())));
    expect(snapshot).not.toBeNull();
    expect(snapshot!.table.hand!.contract).toEqual({ kind: 'ramsch' });
    expect(snapshot!.table.hand!.phase).toBe('playing');
    const restored = HostSession.restore(snapshot!, { ...options, schedule: (fn) => fn() });
    expect(restored.getTable().hand!.phase).toBe('finished');
    expect(illegal).toEqual([]);
    host.close();
  });
});
