import { describe, expect, it } from 'vitest';
import { createRandomBot } from '@schafkopf/bots';
import {
  ClientSession,
  HOST_SNAPSHOT_VERSION,
  HostSession,
  type HostTransport,
  createLoopbackPair,
  parseHostSnapshot,
} from '../src';

function hostOptions(seed = 1) {
  const queue: (() => void)[] = [];
  return {
    options: {
      createBot: (seat: number) => createRandomBot(seed * 10 + seat),
      seed: () => seed,
      schedule: (fn: () => void) => void queue.push(fn),
    },
    flush: () => {
      while (queue.length > 0) queue.shift()!();
    },
  };
}

function join(host: HostSession, name: string, clientId = name) {
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  return new ClientSession(pair.client, { name, clientId });
}

/** Wie im Browser: als JSON gespeichert und wieder gelesen. */
function roundTrip(host: HostSession): unknown {
  return JSON.parse(JSON.stringify(host.exportSnapshot()));
}

/** Ein laufendes Spiel mit Anna (Gastgeberin), Bene und zwei Bots, mitten im ersten Stich. */
function runningTable() {
  const { options, flush } = hostOptions(3);
  const host = new HostSession({ ...options, roomId: 'k7m2xp' });
  const anna = join(host, 'Anna', 'id-anna');
  const bene = join(host, 'Bene', 'id-bene');
  host.start();
  // Die Menschen sagen an, was erlaubt ist, und spielen, bis der erste Stich angefangen ist.
  for (let step = 0; step < 50; step++) {
    flush();
    const hand = host.getTable().hand!;
    if (hand.phase === 'playing' && hand.currentTrick.cards.length > 0) break;
    const client = hand.turn === 0 ? anna : hand.turn === 1 ? bene : null;
    if (!client) continue;
    const own = client.getSnapshot().view!.hand!;
    // Die letzte erlaubte Ansage ist immer die aktive („Ich würde“, Spiel nennen) – so kommt ein Spiel zustande.
    if (own.phase === 'bidding') client.bid(own.legalCalls.at(-1)!);
    else client.play(own.legalCards[0]!);
  }
  const hand = host.getTable().hand!;
  expect(hand.phase).toBe('playing');
  expect(hand.currentTrick.cards.length).toBeGreaterThan(0);
  return { host, anna, bene, flush };
}

describe('Speicherstand des Hosts', () => {
  it('ein Gast mit alter clientId bekommt nach dem Laden seinen Platz und dieselbe Hand', () => {
    const { host, bene } = runningTable();
    const before = bene.getSnapshot().view!;
    const saved = roundTrip(host);
    host.close(); // Gastgeber lädt neu: alter Host weg

    const snapshot = parseHostSnapshot(saved);
    expect(snapshot).not.toBeNull();
    const { options } = hostOptions(3);
    const restored = HostSession.restore(snapshot!, options);
    expect(restored.roomId).toBe('k7m2xp');
    expect(restored.getTable().seats.map((s) => s?.connected)).toEqual([false, false, true, true]);

    const back = join(restored, 'Bene', 'id-bene');
    const view = back.getSnapshot().view!;
    expect(back.getSnapshot().seat).toBe(1);
    expect(view.hand!.hand).toEqual(before.hand!.hand);
    expect(view.balances).toEqual(before.balances);
    expect(view.handNo).toBe(before.handNo);
  });

  it('nach dem Laden geht das Spiel mit Gastgeber und Bots weiter', () => {
    const { host, anna } = runningTable();
    const cardsBefore = anna.getSnapshot().view!.hand!.hand;
    const { options, flush } = hostOptions(3);
    const restored = HostSession.restore(parseHostSnapshot(roundTrip(host))!, options);
    host.close();

    const annaBack = join(restored, 'Anna', 'id-anna');
    const beneBack = join(restored, 'Bene', 'id-bene');
    expect(annaBack.getSnapshot().view!.hand!.hand).toEqual(cardsBefore);
    for (let step = 0; step < 200; step++) {
      flush();
      const hand = restored.getTable().hand!;
      if (hand.phase === 'finished') break;
      const client = hand.turn === 0 ? annaBack : hand.turn === 1 ? beneBack : null;
      if (!client) throw new Error('Bots haben nach dem Laden nicht gezogen');
      const own = client.getSnapshot().view!.hand!;
      if (own.phase === 'bidding')
        client.bid(own.legalCalls[0]!); // passiv: weiter / aufgeben
      else client.play(own.legalCards[0]!);
    }
    expect(restored.getTable().hand!.phase).toBe('finished');
    expect(restored.getTable().balances.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('nach dem Laden sucht der Host wieder nach seinen Gästen', () => {
    const { host } = runningTable();
    const { options } = hostOptions(3);
    const restored = HostSession.restore(parseHostSnapshot(roundTrip(host))!, options);
    const calls: boolean[] = [];
    const transport: HostTransport = {
      onMessage: null,
      onLeave: null,
      listen: () => {},
      send: () => {},
      close: () => {},
      setDiscoverable: (value) => void calls.push(value),
    };
    restored.addTransport(transport);
    expect(restored.isDiscoverable()).toBe(true);
    expect(calls).not.toContain(false);
  });

  it('ein Tisch aus der Lobby lässt sich fortsetzen', () => {
    const { options } = hostOptions();
    const host = new HostSession({ ...options, roomId: null });
    join(host, 'Anna', 'id-anna');
    join(host, 'Bene', 'id-bene');
    const restored = HostSession.restore(parseHostSnapshot(roundTrip(host))!, options);
    expect(restored.roomId).toBeNull();
    const bene = join(restored, 'Bene', 'id-bene');
    expect(bene.getSnapshot().seat).toBe(1);
    const neu = join(restored, 'Cilli', 'id-cilli');
    expect(neu.getSnapshot().seat).toBe(2);
  });

  describe('beschädigte oder fremde Stände werden verworfen', () => {
    const good = () => roundTrip(runningTable().host) as Record<string, unknown>;
    const table = (s: Record<string, unknown>) => s.table as Record<string, unknown>;
    const hand = (s: Record<string, unknown>) => table(s).hand as Record<string, unknown>;

    const cases: [string, (s: Record<string, unknown>) => unknown][] = [
      ['kein Objekt', () => 'kaputt'],
      ['null', () => null],
      ['andere Version', (s) => ({ ...s, v: HOST_SNAPSHOT_VERSION + 1 })],
      ['ohne Version', (s) => ({ ...s, v: undefined })],
      ['Tisch fehlt', (s) => ({ ...s, table: undefined })],
      ['Raum-Code mit Sonderzeichen', (s) => ({ ...s, roomId: '<script>' })],
      ['falsche Zahl an Plätzen', (s) => ({ ...s, table: { ...table(s), seats: [null] } })],
      [
        'Kontostände ergeben nicht null',
        (s) => ({ ...s, table: { ...table(s), balances: [10, 0, 0, 0] } }),
      ],
      [
        'Kontostände und Pott ergeben nicht null',
        (s) => ({ ...s, table: { ...table(s), pot: 10 } }),
      ],
      [
        'Pott negativ',
        (s) => ({ ...s, table: { ...table(s), pot: -10, balances: [10, 0, 0, 0] } }),
      ],
      ['Pott fehlt (ältere Version)', (s) => ({ ...s, table: { ...table(s), pot: undefined } })],
      [
        'unbekannte Regel für „alle weiter“',
        (s) => ({
          ...s,
          table: { ...table(s), rules: { ...(table(s).rules as object), allPassed: 'toString' } },
        }),
      ],
      [
        'Übertrag im Spiel kaputt',
        (s) => ({
          ...s,
          table: { ...table(s), hand: { ...hand(s), carry: { pot: -1, factor: 1 } } },
        }),
      ],
      [
        'Re ohne Kontra',
        (s) => ({
          ...s,
          table: { ...table(s), hand: { ...hand(s), doubling: { kontra: null, re: 0 } } },
        }),
      ],
      [
        'Kontra durch unbekannten Platz',
        (s) => ({
          ...s,
          table: { ...table(s), hand: { ...hand(s), doubling: { kontra: 7, re: null } } },
        }),
      ],
      [
        'Regel Kontra fehlt (ältere Version)',
        (s) => {
          const rules = { ...(table(s).rules as Record<string, unknown>) };
          delete rules.kontra;
          return { ...s, table: { ...table(s), rules } };
        },
      ],
      ['Geber außerhalb', (s) => ({ ...s, table: { ...table(s), dealer: 9 } })],
      [
        'unbekannte Karte',
        (s) => ({
          ...s,
          table: { ...table(s), hand: { ...hand(s), hands: [['XX'], [], [], []] } },
        }),
      ],
      [
        'Spiel aus älterer Version (Feld fehlt)',
        (s) => {
          const rest = { ...hand(s) };
          delete rest.result;
          return { ...s, table: { ...table(s), hand: rest } };
        },
      ],
      ['Regeln fehlen', (s) => ({ ...s, table: { ...table(s), rules: {} } })],
      ['Platz-Zuordnung kaputt', (s) => ({ ...s, seatByClient: [['id-anna', 7]] })],
      ['Platz-Zuordnung auf Bot', (s) => ({ ...s, seatByClient: [['id-anna', 2]] })],
      ['Bot-Platz ohne Bot', (s) => ({ ...s, botSeats: [0] })],
      ['Bot ohne Bot-Platz', (s) => ({ ...s, botSeats: [] })],
    ];

    it('der unveränderte Stand ist gültig', () => {
      expect(parseHostSnapshot(good())).not.toBeNull();
    });

    it('ein Pott zählt zur Kontosumme: Summe(balances) + pot = 0', () => {
      const s = good();
      const t = table(s);
      const balances = (t.balances as number[]).map((b, i) => (i === 0 ? b - 40 : b));
      expect(parseHostSnapshot({ ...s, table: { ...t, balances, pot: 40 } })).not.toBeNull();
    });

    it.each(cases)('%s', (_name, damage) => {
      expect(parseHostSnapshot(damage(good()))).toBeNull();
    });

    it('abgeschnittenes JSON führt nicht zu einem Absturz', () => {
      const text = JSON.stringify(good());
      for (const length of [0, 1, 20, text.length / 2, text.length - 1]) {
        let raw: unknown;
        try {
          raw = JSON.parse(text.slice(0, length));
        } catch {
          raw = undefined;
        }
        expect(parseHostSnapshot(raw)).toBeNull();
      }
    });
  });
});
