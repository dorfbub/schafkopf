import { describe, expect, it } from 'vitest';
import { createRandomBot } from '@schafkopf/bots';
import type { Seat } from '@schafkopf/core';
import {
  ClientSession,
  DEFAULT_STAND_IN_DELAY_MS,
  HostSession,
  type HostOptions,
  createLoopbackPair,
  parseHostSnapshot,
} from '../src';

const BOT_DELAY = 800;
const FRIST = DEFAULT_STAND_IN_DELAY_MS;

/**
 * Synchrone Uhr für Host und Mitspieler: `advance` lässt die Zeit laufen und
 * führt alles aus, was bis dahin fällig ist – in der Reihenfolge der Fälligkeit.
 */
function createClock() {
  let now = 0;
  let order = 0;
  const tasks: { at: number; order: number; fn: () => void }[] = [];
  const schedule = (fn: () => void, ms: number) => {
    tasks.push({ at: now + ms, order: order++, fn });
  };
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
  return { schedule, advance, now: () => now };
}

type Clock = ReturnType<typeof createClock>;

function hostOptions(clock: Clock, seed = 2): HostOptions {
  return {
    createBot: (seat) => createRandomBot(seed * 10 + seat),
    seed: () => seed,
    schedule: clock.schedule,
    now: clock.now,
    botDelayMs: BOT_DELAY,
  };
}

function join(host: HostSession, clock: Clock, name: string, clientId = name) {
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  return new ClientSession(pair.client, { name, clientId, now: clock.now, connectTimeoutMs: 0 });
}

/** Spielt für einen Menschen den ersten erlaubten Zug. */
function move(client: ClientSession): void {
  const hand = client.getSnapshot().view!.hand!;
  if (hand.phase === 'bidding') client.bid(hand.legalCalls[0]!);
  else client.play(hand.legalCards[0]!);
}

/** Anna (Gastgeberin, Sitz 0), Bene (Sitz 1) und zwei Bots; Geber ist Sitz 0, Bene beginnt. */
function table(clock = createClock()) {
  const host = new HostSession(hostOptions(clock));
  const anna = join(host, clock, 'Anna', 'id-anna');
  const bene = join(host, clock, 'Bene', 'id-bene');
  host.start();
  return { host, anna, bene, clock };
}

/** Wie viele Züge (Ansagen und Karten) hat ein Sitz in diesem Spiel schon gemacht? */
function movesOf(host: HostSession, seat: Seat): number {
  const hand = host.getTable().hand!;
  const players = hand.hands.length;
  const bids = hand.bids.filter((b) => b.seat === seat).length;
  const played = (t: { leader: Seat; cards: unknown[] }) =>
    t.cards.filter((_, i) => (t.leader + i) % players === seat).length;
  const cards = hand.tricks.reduce((n, t) => n + played(t), 0);
  return bids + cards + played(hand.currentTrick);
}

/** Lässt Anna mitspielen und die Bots ziehen, bis `seat` am Zug ist. */
function untilTurnOf(host: HostSession, anna: ClientSession, clock: Clock, seat: Seat) {
  for (let step = 0; step < 50; step++) {
    const hand = host.getTable().hand!;
    if (hand.phase === 'finished') throw new Error('Spiel vorbei');
    if (hand.turn === seat) return;
    if (hand.turn === 0) move(anna);
    else clock.advance(BOT_DELAY);
  }
  throw new Error(`Sitz ${seat} kommt nicht an die Reihe`);
}

describe('Ausgefallene Mitspieler', () => {
  it('Trennen → Frist → Bot zieht → Wiederverbinden → Mensch zieht', () => {
    const { host, anna, bene, clock } = table();
    expect(host.getTable().hand!.turn).toBe(1);

    bene.close();
    expect(host.getTable().seats[1]).toMatchObject({ name: 'Bene', connected: false });
    expect(anna.getSnapshot().absent).toEqual([{ seat: 1, standIn: false, standInAt: FRIST }]);

    // Vor Ablauf der Frist wartet der Tisch.
    clock.advance(FRIST - 1);
    expect(movesOf(host, 1)).toBe(0);
    expect(host.getTable().hand!.turn).toBe(1);

    // Frist abgelaufen: Der Bot vertritt, alle sehen es, und er zieht nach seiner Bedenkzeit.
    clock.advance(1);
    expect(anna.getSnapshot().absent).toEqual([{ seat: 1, standIn: true, standInAt: null }]);
    clock.advance(BOT_DELAY);
    expect(movesOf(host, 1)).toBe(1);
    // Der Platz gehört weiter Bene.
    expect(host.getTable().seats[1]).toMatchObject({ name: 'Bene', kind: 'human' });

    // Der Bot spielt weiter, solange Bene fehlt.
    untilTurnOf(host, anna, clock, 1);
    clock.advance(BOT_DELAY);
    expect(movesOf(host, 1)).toBe(2);

    // Bene kommt zurück: Die Vertretung endet, er sieht seine Karten und zieht selbst.
    const back = join(host, clock, 'Bene', 'id-bene');
    expect(back.getSnapshot().seat).toBe(1);
    expect(back.getSnapshot().absent).toEqual([]);
    expect(host.getTable().seats[1]).toMatchObject({ connected: true });
    untilTurnOf(host, anna, clock, 1);
    clock.advance(FRIST * 2);
    expect(movesOf(host, 1)).toBe(2); // kein Bot zieht mehr für ihn
    move(back);
    expect(back.getSnapshot().lastError).toBeNull();
    expect(movesOf(host, 1)).toBe(3);
  });

  it('wer zurückkommt, während der Bot schon überlegt, zieht selbst', () => {
    const { host, anna, bene, clock } = table();
    bene.close();
    clock.advance(FRIST); // Vertretung beginnt, Bot überlegt für den ersten Zug
    const back = join(host, clock, 'Bene', 'id-bene');
    clock.advance(BOT_DELAY);
    expect(movesOf(host, 1)).toBe(0);
    expect(host.getTable().hand!.turn).toBe(1);
    move(back);
    expect(movesOf(host, 1)).toBe(1);
    expect(anna.getSnapshot().absent).toEqual([]);
  });

  it('eine alte Frist zählt nicht, wenn jemand zurückkommt und erneut geht', () => {
    const { host, bene, clock } = table();
    bene.close();
    clock.advance(FRIST / 2);
    join(host, clock, 'Bene', 'id-bene').close();
    clock.advance(FRIST / 2); // die erste Frist wäre jetzt um
    expect(host.getAbsentSeats()).toEqual([{ seat: 1, standIn: false, standInInMs: FRIST / 2 }]);
    clock.advance(FRIST / 2);
    expect(host.getAbsentSeats()).toEqual([{ seat: 1, standIn: true, standInInMs: null }]);
  });

  it('der Gastgeber lässt sofort einen Bot übernehmen', () => {
    const { host, anna, bene, clock } = table();
    expect(host.standInNow(1)).toBe(false); // Bene ist ja da

    bene.close();
    expect(host.standInNow(1)).toBe(true);
    expect(host.standInNow(1)).toBe(false); // schon vertreten
    expect(anna.getSnapshot().absent).toEqual([{ seat: 1, standIn: true, standInAt: null }]);
    clock.advance(BOT_DELAY);
    expect(movesOf(host, 1)).toBe(1);

    // Auch so übernimmt Bene bei Rückkehr wieder.
    const back = join(host, clock, 'Bene', 'id-bene');
    untilTurnOf(host, anna, clock, 1);
    clock.advance(BOT_DELAY);
    expect(movesOf(host, 1)).toBe(1);
    move(back);
    expect(movesOf(host, 1)).toBe(2);
  });

  it('der Gastgeber nimmt einen verschwundenen Spieler vom Platz, der Bot bleibt', () => {
    const { host, anna, bene, clock } = table();
    expect(host.replaceWithBot(1)).toBe(false); // nur getrennte Spieler

    bene.close();
    expect(host.replaceWithBot(1)).toBe(true);
    expect(host.getTable().seats[1]).toMatchObject({ kind: 'bot', connected: true });
    expect(anna.getSnapshot().absent).toEqual([]);
    clock.advance(BOT_DELAY);
    expect(movesOf(host, 1)).toBe(1);

    // Kommt Bene doch zurück, schaut er zu; der Bot spielt weiter.
    const back = join(host, clock, 'Bene', 'id-bene');
    expect(back.getSnapshot().seat).toBeNull();
    untilTurnOf(host, anna, clock, 1);
    clock.advance(BOT_DELAY);
    expect(movesOf(host, 1)).toBe(2);

    // Auch der Speicherstand kennt den Bot.
    const snapshot = parseHostSnapshot(JSON.parse(JSON.stringify(host.exportSnapshot())));
    expect(snapshot?.botSeats).toContain(1);
    expect(snapshot?.seatByClient.map(([id]) => id)).toEqual(['id-anna']);
  });

  it('nach dem Neuladen des Gastgebers beginnt die Frist für alle Gäste von vorn', () => {
    const { host, bene, clock } = table();
    bene.close();
    clock.advance(FRIST); // Bene wird schon vertreten …
    expect(host.getAbsentSeats()[0]?.standIn).toBe(true);

    const raw = JSON.parse(JSON.stringify(host.exportSnapshot()));
    host.close();
    clock.advance(5 * 60_000); // … der Gastgeber lädt erst Minuten später neu.

    const restored = HostSession.restore(parseHostSnapshot(raw)!, hostOptions(clock));
    expect(restored.getAbsentSeats()).toEqual([
      { seat: 0, standIn: false, standInInMs: FRIST },
      { seat: 1, standIn: false, standInInMs: FRIST },
    ]);

    // Die Gastgeberin ist sofort wieder da, Bene noch nicht.
    const anna = join(restored, clock, 'Anna', 'id-anna');
    expect(anna.getSnapshot().absent).toEqual([
      { seat: 1, standIn: false, standInAt: clock.now() + FRIST },
    ]);

    // Die Frist läuft nicht sofort ab: Bene ist am Zug, und niemand zieht für ihn.
    clock.advance(FRIST - 1);
    expect(movesOf(restored, 1)).toBe(0);

    // Bene kommt rechtzeitig zurück und zieht selbst.
    const back = join(restored, clock, 'Bene', 'id-bene');
    clock.advance(FRIST);
    expect(movesOf(restored, 1)).toBe(0);
    move(back);
    expect(movesOf(restored, 1)).toBe(1);
  });

  it('nach dem Neuladen vertritt ein Bot, wenn der Gast nicht zurückkommt', () => {
    const { host, clock } = table();
    const raw = JSON.parse(JSON.stringify(host.exportSnapshot()));
    host.close();
    const restored = HostSession.restore(parseHostSnapshot(raw)!, hostOptions(clock));
    join(restored, clock, 'Anna', 'id-anna');
    clock.advance(FRIST + BOT_DELAY);
    expect(movesOf(restored, 1)).toBe(1);
    expect(restored.getAbsentSeats()).toEqual([{ seat: 1, standIn: true, standInInMs: null }]);
  });

  it('die Frist ist einstellbar', () => {
    const clock = createClock();
    const host = new HostSession({ ...hostOptions(clock), standInDelayMs: 5_000 });
    join(host, clock, 'Anna', 'id-anna');
    const bene = join(host, clock, 'Bene', 'id-bene');
    host.start();
    bene.close();
    clock.advance(5_000 + BOT_DELAY);
    expect(movesOf(host, 1)).toBe(1);
  });

  it('in der Lobby wird ein getrennter Platz frei statt vertreten', () => {
    const clock = createClock();
    const host = new HostSession(hostOptions(clock));
    join(host, clock, 'Anna', 'id-anna');
    join(host, clock, 'Bene', 'id-bene').close();
    expect(host.getTable().seats[1]).toBeNull();
    expect(host.getAbsentSeats()).toEqual([]);
  });
});
