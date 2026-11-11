import { describe, expect, it } from 'vitest';
import { createRandomBot } from '@schafkopf/bots';
import { ClientSession, HostSession, createLoopbackPair } from '../src';

/** Host mit synchroner Zeitsteuerung: Bots ziehen sofort, Tests bleiben deterministisch. */
function createHost(seed = 1) {
  const queue: (() => void)[] = [];
  const host = new HostSession({
    createBot: (seat) => createRandomBot(seed * 10 + seat),
    seed: () => seed,
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

describe('Host und Mitspieler', () => {
  it('Mitspieler bekommen der Reihe nach einen Platz', () => {
    const { host } = createHost();
    const anna = join(host, 'Anna');
    const bene = join(host, 'Bene');
    expect(anna.getSnapshot()).toMatchObject({ status: 'connected', seat: 0 });
    expect(bene.getSnapshot()).toMatchObject({ status: 'connected', seat: 1 });
    expect(anna.getSnapshot().view?.seats.map((s) => s?.name ?? null)).toEqual([
      'Anna',
      'Bene',
      null,
      null,
    ]);
  });

  it('freie Plätze werden beim Start mit Bots besetzt', () => {
    const { host } = createHost();
    const anna = join(host, 'Anna');
    expect(host.start()).toBe(true);
    const view = anna.getSnapshot().view!;
    expect(view.seats.map((s) => s?.kind)).toEqual(['human', 'bot', 'bot', 'bot']);
    expect(view.hand?.hand).toHaveLength(8);
  });

  it('niemand bekommt fremde Karten zu sehen', () => {
    const { host } = createHost();
    const anna = join(host, 'Anna');
    const bene = join(host, 'Bene');
    host.start();
    const sent = JSON.stringify(anna.getSnapshot().view);
    for (const card of bene.getSnapshot().view!.hand!.hand) {
      expect(sent).not.toContain(`"${card}"`);
    }
  });

  it('ein ganzes Spiel mit einem Menschen und drei Bots läuft durch', () => {
    const { host, flush } = createHost(5);
    const anna = join(host, 'Anna');
    host.start();
    for (let step = 0; step < 100; step++) {
      flush();
      const hand = anna.getSnapshot().view!.hand!;
      if (hand.phase === 'finished') break;
      if (hand.turn !== 0) throw new Error('Bots haben nicht gezogen');
      if (hand.phase === 'bidding') anna.bid(hand.legalCalls[0]!);
      else anna.play(hand.legalCards[0]!);
    }
    const view = anna.getSnapshot().view!;
    expect(view.hand?.phase).toBe('finished');
    expect(view.balances.reduce((a, b) => a + b, 0)).toBe(0);

    expect(host.nextHand()).toBe(true);
    expect(anna.getSnapshot().view).toMatchObject({ handNo: 2, dealer: 1 });
  });

  it('unerlaubte Aktionen werden mit einem Fehler beantwortet', () => {
    const { host } = createHost();
    const anna = join(host, 'Anna');
    const bene = join(host, 'Bene');
    host.start();
    // Geber ist Sitz 0, also sagt Sitz 1 (Bene) zuerst an.
    anna.bid({ type: 'pass' });
    expect(anna.getSnapshot().lastError).toBe('not_your_turn');
    bene.play('EA');
    expect(bene.getSnapshot().lastError).toBe('wrong_phase');
  });

  it('wer die Verbindung verliert, findet über die clientId seinen Platz wieder', () => {
    const { host } = createHost();
    const anna = join(host, 'Anna', 'id-anna');
    join(host, 'Bene', 'id-bene');
    host.start();
    const cards = anna.getSnapshot().view!.hand!.hand;

    anna.close();
    expect(host.getTable().seats[0]).toMatchObject({ name: 'Anna', connected: false });

    const back = join(host, 'Anna', 'id-anna');
    expect(back.getSnapshot().seat).toBe(0);
    expect(back.getSnapshot().view!.hand!.hand).toEqual(cards);
    expect(host.getTable().seats[0]).toMatchObject({ connected: true });
  });

  it('wer nach Spielbeginn dazukommt, schaut zu', () => {
    const { host } = createHost();
    join(host, 'Anna');
    host.start();
    const spaet = join(host, 'Spät');
    expect(spaet.getSnapshot().seat).toBeNull();
    expect(spaet.getSnapshot().view!.hand!.hand).toEqual([]);
  });
});
