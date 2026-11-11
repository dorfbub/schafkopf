import { describe, expect, it } from 'vitest';
import { createRandomBot } from '@schafkopf/bots';
import { replay } from '@schafkopf/core';
import {
  ClientSession,
  DEFAULT_STAND_IN_DELAY_MS,
  HostSession,
  createLoopbackPair,
  parseHostSnapshot,
} from '../src';

const BOT_DELAY = 800;

function setup() {
  let now = 0;
  let order = 0;
  const tasks: { at: number; order: number; fn: () => void }[] = [];
  const advance = (ms: number) => {
    const until = now + ms;
    for (;;) {
      tasks.sort((a, b) => a.at - b.at || a.order - b.order);
      const next = tasks[0];
      if (!next || next.at > until) break;
      tasks.shift();
      now = next.at;
      next.fn();
    }
    now = until;
  };
  let seedNo = 0;
  const host = new HostSession({
    createBot: (seat) => createRandomBot(seat + 100),
    seed: () => ++seedNo,
    schedule: (fn, ms) => void tasks.push({ at: now + ms, order: order++, fn }),
    now: () => now,
    botDelayMs: BOT_DELAY,
  });
  const join = (name: string) => {
    const pair = createLoopbackPair();
    host.addTransport(pair.host);
    return new ClientSession(pair.client, {
      name,
      clientId: `id-${name}`,
      now: () => now,
      connectTimeoutMs: 0,
    });
  };
  return { host, join, advance };
}

describe('Spielprotokoll im Netz', () => {
  it('replay stimmt mit dem echten Ablauf überein – auch mit Bot-Vertretung', () => {
    const { host, join, advance } = setup();
    const anna = join('Anna');
    let bene = join('Bene');
    host.start();

    for (let game = 1; game <= 30; game++) {
      // In jedem dritten Spiel fällt Bene aus; ein Bot vertritt ihn.
      let dropped = false;
      for (let step = 0; step < 400; step++) {
        const hand = host.getTable().hand!;
        if (hand.phase === 'finished') break;
        if (game % 3 === 0 && !dropped && hand.bids.length >= 2) {
          bene.close();
          dropped = true;
        }
        const own = hand.turn === 0 ? anna : hand.turn === 1 && !dropped ? bene : null;
        if (own) {
          const view = own.getSnapshot().view!.hand!;
          if (view.phase === 'bidding') own.bid(view.legalCalls.at(-1)!);
          else own.play(view.legalCards[0]!);
        } else advance(DEFAULT_STAND_IN_DELAY_MS + BOT_DELAY);
      }
      const table = host.getTable();
      expect(table.hand!.phase).toBe('finished');
      expect(replay(table.logs.at(-1)!)).toEqual(table.hand);
      expect(table.history).toHaveLength(game);
      if (dropped) bene = join('Bene');
      host.nextHand();
    }
  });

  it('Mitspieler bekommen den Verlauf erst nach Spielende, ohne Karten', () => {
    const { host, join, advance } = setup();
    const anna = join('Anna');
    host.start();
    expect(anna.getSnapshot().view!.history).toEqual([]);
    for (let step = 0; step < 400 && host.getTable().hand!.phase !== 'finished'; step++) {
      const hand = host.getTable().hand!;
      if (hand.turn === 0) {
        const v = anna.getSnapshot().view!.hand!;
        if (v.phase === 'bidding') anna.bid(v.legalCalls[0]!);
        else anna.play(v.legalCards[0]!);
      } else advance(DEFAULT_STAND_IN_DELAY_MS + BOT_DELAY);
      if (host.getTable().hand!.phase !== 'finished') {
        expect(anna.getSnapshot().view!.history).toEqual([]);
        expect(JSON.stringify(anna.getSnapshot().view)).not.toContain('"actions"');
      }
    }
    const history = anna.getSnapshot().view!.history;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ handNo: 1, result: { payments: expect.any(Array) } });
    expect(JSON.stringify(history)).not.toMatch(/"[EGHS]-?[AKOUXZ789]/);
  });

  it('Speicherstand mit Protokollen lässt sich laden', () => {
    const { host, join, advance } = setup();
    const anna = join('Anna');
    host.start();
    for (let g = 0; g < 3; g++) {
      for (let step = 0; step < 400 && host.getTable().hand!.phase !== 'finished'; step++) {
        if (host.getTable().hand!.turn === 0) {
          const v = anna.getSnapshot().view!.hand!;
          if (v.phase === 'bidding') anna.bid(v.legalCalls[0]!);
          else anna.play(v.legalCards[0]!);
        } else advance(BOT_DELAY);
      }
      if (g < 2) host.nextHand();
    }
    const json = JSON.parse(JSON.stringify(host.exportSnapshot()));
    const parsed = parseHostSnapshot(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.table.logs).toHaveLength(3);
    expect(parsed!.table.history).toHaveLength(3);
    // Widerspruch zwischen Protokoll und laufendem Spiel wird verworfen.
    json.table.logs[2].actions.pop();
    expect(parseHostSnapshot(json)).toBeNull();
    // Alter Speicherstand ohne Protokolle auch.
    const old = JSON.parse(JSON.stringify(host.exportSnapshot()));
    delete old.table.logs;
    expect(parseHostSnapshot(old)).toBeNull();
  });
});
