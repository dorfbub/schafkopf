import { describe, expect, it } from 'vitest';
import { createRandomBot } from '@schafkopf/bots';
import { DEFAULT_RULES } from '@schafkopf/core';
import {
  ClientSession,
  HostSession,
  type ClientMessage,
  createLoopbackPair,
  parseHostSnapshot,
} from '../src';

function createHost() {
  const host = new HostSession({
    createBot: (seat) => createRandomBot(seat),
    seed: () => 1,
    schedule: () => {},
  });
  return host;
}

function join(host: HostSession, name: string, clientId = name) {
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  return new ClientSession(pair.client, { name, clientId });
}

/** Schickt eine beliebige (auch ungültige) Nachricht am Client vorbei. */
function sendRaw(client: ClientSession, message: unknown) {
  (client as unknown as { transport: { send(m: ClientMessage): void } }).transport.send(
    message as ClientMessage,
  );
}

const names = (c: ClientSession) => c.getSnapshot().view!.seats.map((s) => s?.name ?? null);

describe('Lobby: Platzwahl', () => {
  it('Gast wechselt auf einen freien Platz', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    const bene = join(host, 'Bene');
    bene.takeSeat(3);
    expect(bene.getSnapshot().seat).toBe(3);
    expect(names(anna)).toEqual(['Anna', null, null, 'Bene']);
    expect(host.getTable().seats[1]).toBeNull();
  });

  it('besetzter Platz wird abgelehnt, nichts ändert sich', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    const bene = join(host, 'Bene');
    bene.takeSeat(0);
    expect(bene.getSnapshot().lastError).toBe('seat_taken');
    expect(bene.getSnapshot().seat).toBe(1);
    expect(names(anna)).toEqual(['Anna', 'Bene', null, null]);
  });

  it.each([[7], [-1], [1.5], ['0'], [undefined]])('ungültiger Platz %j wird abgelehnt', (seat) => {
    const host = createHost();
    const anna = join(host, 'Anna');
    sendRaw(anna, { t: 'seat', seat });
    expect(anna.getSnapshot().lastError).toBe('bad_message');
    expect(anna.getSnapshot().seat).toBe(0);
  });

  it('im laufenden Spiel ist kein Platzwechsel möglich', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    host.start();
    anna.takeSeat(null);
    expect(anna.getSnapshot().lastError).toBe('wrong_phase');
    expect(anna.getSnapshot().seat).toBe(0);
  });

  it('Platz ohne vorheriges hello wird abgelehnt', () => {
    const host = createHost();
    const pair = createLoopbackPair();
    host.addTransport(pair.host);
    const got: unknown[] = [];
    pair.client.onMessage = (m) => got.push(m);
    pair.client.connect(); // onOpen ist nicht belegt: kein hello
    pair.client.send({ t: 'seat', seat: 0 });
    expect(got).toEqual([{ t: 'error', code: 'bad_message' }]);
    expect(host.getTable().seats).toEqual([null, null, null, null]);
  });
});

describe('Lobby: Zuschauer', () => {
  it('wer zuschauen will, bekommt auch nach dem Wiederverbinden keinen Platz', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    anna.takeSeat(null);
    expect(anna.getSnapshot()).toMatchObject({ seat: null, view: { you: null } });
    anna.close();
    const again = join(host, 'Anna');
    expect(again.getSnapshot().seat).toBeNull();
    again.takeSeat(2);
    expect(again.getSnapshot().seat).toBe(2);
  });

  it('bei vollem Tisch kommt man als Zuschauer ohne Hand dazu', () => {
    const host = createHost();
    for (const n of ['A', 'B', 'C', 'D']) join(host, n);
    const gast = join(host, 'Gast');
    host.start();
    const view = gast.getSnapshot().view!;
    expect(gast.getSnapshot().seat).toBeNull();
    expect(view.you).toBeNull();
    expect(view.hand?.hand).toEqual([]);
    expect(JSON.stringify(view)).not.toContain('"hand":["');
  });

  it('Zuschauer können nicht spielen', () => {
    const host = createHost();
    for (const n of ['A', 'B', 'C', 'D']) join(host, n);
    const gast = join(host, 'Gast');
    host.start();
    gast.bid({ type: 'pass' });
    expect(gast.getSnapshot().lastError).toBe('not_seated');
  });

  it('die Lobby kennt die Zuschauer; wer geht, verschwindet aus der Liste', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    const bene = join(host, 'Bene');
    bene.takeSeat(null);
    expect(anna.getSnapshot().lobby?.watchers).toEqual(['Bene']);
    bene.close();
    expect(anna.getSnapshot().lobby?.watchers).toEqual([]);
  });

  it('Vermittlung: bleibt offen, solange der Gastgeber Zuschauer willkommen heißt', () => {
    const host = createHost();
    const calls: boolean[] = [];
    const pair = createLoopbackPair();
    pair.host.setDiscoverable = (d) => void calls.push(d);
    host.addTransport(pair.host);
    for (const n of ['A', 'B', 'C', 'D']) join(host, n);
    expect(host.isDiscoverable()).toBe(false);
    host.setSpectatorsWelcome(true);
    expect(host.isDiscoverable()).toBe(true);
    host.start();
    expect(host.isDiscoverable()).toBe(true);
    host.setSpectatorsWelcome(false);
    expect(host.isDiscoverable()).toBe(false);
    expect(calls).toEqual([false, true, false]);
  });

  it('Speicherstand merkt Zuschauer-Wunsch und Offenhalten', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    anna.takeSeat(null);
    host.setSpectatorsWelcome(true);
    const raw = JSON.parse(JSON.stringify(host.exportSnapshot()));
    const snap = parseHostSnapshot(raw)!;
    expect(snap).not.toBeNull();
    const restored = HostSession.restore(snap, {
      createBot: (s) => createRandomBot(s),
      schedule: () => {},
    });
    expect(restored.isSpectatorsWelcome()).toBe(true);
    expect(join(restored, 'Anna').getSnapshot().seat).toBeNull();
    expect(parseHostSnapshot({ ...raw, watching: [1] })).toBeNull();
    expect(parseHostSnapshot({ ...raw, spectatorsWelcome: 'ja' })).toBeNull();
  });
});

describe('Lobby: Umbenennen', () => {
  it('Name ändert sich am Platz und bleibt nach dem Wiederverbinden', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    const bene = join(host, 'Bene');
    anna.rename('  Annerl ');
    expect(names(bene)).toEqual(['Annerl', 'Bene', null, null]);
    host.start(); // im Spiel bleibt der Platz samt Namen reserviert
    anna.close();
    const again = join(host, 'Anna', 'Anna');
    expect(again.getSnapshot().seat).toBe(0);
    expect(names(again)[0]).toBe('Annerl');
  });

  it('Name wird gekürzt; Zuschauer können sich umbenennen', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    const bene = join(host, 'Bene');
    bene.takeSeat(null);
    bene.rename('x'.repeat(60));
    expect(anna.getSnapshot().lobby?.watchers).toEqual(['x'.repeat(24)]);
  });

  it.each([[''], ['   '], [42], [null], [undefined]])(
    'ungültiger Name %j wird abgelehnt',
    (name) => {
      const host = createHost();
      const anna = join(host, 'Anna');
      sendRaw(anna, { t: 'rename', name });
      expect(anna.getSnapshot().lastError).toBe('bad_message');
      expect(names(anna)[0]).toBe('Anna');
    },
  );
});

describe('Lobby: Befehle des Gastgebers', () => {
  it('Platz umsetzen auf einen freien Platz', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    expect(host.moveSeat(0, 2)).toBe(true);
    expect(anna.getSnapshot().seat).toBe(2);
    expect(names(anna)).toEqual([null, null, 'Anna', null]);
  });

  it('Platz umsetzen tauscht zwei Spieler', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    const bene = join(host, 'Bene');
    expect(host.moveSeat(0, 1)).toBe(true);
    expect(anna.getSnapshot().seat).toBe(1);
    expect(bene.getSnapshot().seat).toBe(0);
    expect(names(anna)).toEqual(['Bene', 'Anna', null, null]);
    // Der Tausch gilt auch für die Platz-Zuordnung (Wiederverbinden).
    anna.close();
    expect(join(host, 'Anna').getSnapshot().seat).toBe(1);
  });

  it('ungültiges Umsetzen wird abgelehnt', () => {
    const host = createHost();
    join(host, 'Anna');
    expect(host.moveSeat(1, 2)).toBe(false); // Start ist leer
    expect(host.moveSeat(0, 0)).toBe(false);
    expect(host.moveSeat(0, 9)).toBe(false);
    expect(host.moveSeat(-1, 0)).toBe(false);
    host.start();
    expect(host.moveSeat(0, 1)).toBe(false); // im Spiel
  });

  it('Vom-Platz-Nehmen macht zum Zuschauer, der sich wieder setzen darf', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    const bene = join(host, 'Bene');
    expect(host.unseat(1)).toBe(true);
    expect(bene.getSnapshot()).toMatchObject({ seat: null, view: { you: null } });
    expect(names(anna)).toEqual(['Anna', null, null, null]);
    expect(anna.getSnapshot().lobby?.watchers).toEqual(['Bene']);
    bene.takeSeat(1);
    expect(bene.getSnapshot().seat).toBe(1);
  });

  it('ungültiges Vom-Platz-Nehmen wird abgelehnt', () => {
    const host = createHost();
    join(host, 'Anna');
    expect(host.unseat(2)).toBe(false); // frei
    expect(host.unseat(9)).toBe(false);
    host.start();
    expect(host.unseat(0)).toBe(false);
    expect(host.unseat(1)).toBe(false); // Bot, im Spiel
  });
});

describe('Lobby: Tischregeln', () => {
  const custom = () => ({
    ...JSON.parse(JSON.stringify(DEFAULT_RULES)),
    allowTout: false,
    tariff: { sauspiel: 20, solo: 60, extra: 5, ramsch: 10, stock: 10 },
  });

  it('Gastgeber ändert die Regeln, Gäste sehen sie in ihrer Sicht', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    expect(host.setRules(custom())).toBe(true);
    const rules = anna.getSnapshot().view!.rules;
    expect(rules.allowTout).toBe(false);
    expect(rules.tariff).toEqual({ sauspiel: 20, solo: 60, extra: 5, ramsch: 10, stock: 10 });
  });

  it('ungültige Regeln werden abgewiesen, nichts ändert sich', () => {
    const host = createHost();
    const bad = custom();
    bad.tariff.extra = -5;
    expect(host.setRules(bad)).toBe(false);
    expect(host.getTable().rules).toEqual(DEFAULT_RULES);
  });

  it('nach Spielbeginn sind die Regeln fest', () => {
    const host = createHost();
    join(host, 'Anna');
    host.start();
    expect(host.setRules(custom())).toBe(false);
    expect(host.getTable().rules).toEqual(DEFAULT_RULES);
  });

  it('die Regeln überstehen den Speicherstand', () => {
    const host = createHost();
    host.setRules(custom());
    const saved = parseHostSnapshot(JSON.parse(JSON.stringify(host.exportSnapshot())));
    expect(saved?.table.rules.tariff.solo).toBe(60);
  });

  it('Spielstärke der Bots: gilt für alle Bots am Tisch und übersteht den Speicherstand', () => {
    const made: [number, string][] = [];
    const host = new HostSession({
      createBot: (seat, rules) => {
        made.push([seat, rules.botStrength]);
        return createRandomBot(seat);
      },
      seed: () => 1,
      schedule: () => {},
    });
    const anna = join(host, 'Anna');
    expect(anna.getSnapshot().view!.rules.botStrength).toBe('normal');
    expect(host.setRules({ ...custom(), botStrength: 'stark' })).toBe(true);
    expect(anna.getSnapshot().view!.rules.botStrength).toBe('stark');
    host.start();
    expect(made).toEqual([
      [1, 'stark'],
      [2, 'stark'],
      [3, 'stark'],
    ]);
    // Nach dem Neuladen entstehen die Bots wieder in derselben Stärke.
    const saved = parseHostSnapshot(JSON.parse(JSON.stringify(host.exportSnapshot())))!;
    expect(saved.table.rules.botStrength).toBe('stark');
    made.length = 0;
    HostSession.restore(saved, {
      createBot: (seat, rules) => {
        made.push([seat, rules.botStrength]);
        return createRandomBot(seat);
      },
      seed: () => 1,
      schedule: () => {},
    });
    expect(made.map(([, strength]) => strength)).toEqual(['stark', 'stark', 'stark']);
  });

  it.each([['meister'], [''], [null], [undefined], [2]])(
    'unbekannte Spielstärke %j wird abgewiesen',
    (botStrength) => {
      const host = createHost();
      expect(host.setRules({ ...custom(), botStrength })).toBe(false);
      expect(host.getTable().rules.botStrength).toBe('normal');
    },
  );

  it('Kartenbild (U9): der Gastgeber wählt für alle, Gäste sehen es, der Speicherstand behält es', () => {
    const host = createHost();
    const anna = join(host, 'Anna');
    expect(anna.getSnapshot().view!.rules.cardSet).toBe('bayerisch');
    expect(host.setRules({ ...custom(), cardSet: 'salzburger' })).toBe(true);
    expect(anna.getSnapshot().view!.rules.cardSet).toBe('salzburger');
    const saved = parseHostSnapshot(JSON.parse(JSON.stringify(host.exportSnapshot())))!;
    expect(saved.table.rules.cardSet).toBe('salzburger');
    const restored = HostSession.restore(saved, {
      createBot: (seat) => createRandomBot(seat),
      seed: () => 1,
      schedule: () => {},
    });
    expect(restored.getTable().rules.cardSet).toBe('salzburger');
  });

  it.each([[''], ['Salzburger'], ['../ruecken'], ['<img>'], [null], [undefined], [3]])(
    'Kartenbild mit ungültiger Kennung %j wird abgewiesen',
    (cardSet) => {
      const host = createHost();
      expect(host.setRules({ ...custom(), cardSet })).toBe(false);
      expect(host.getTable().rules.cardSet).toBe('bayerisch');
    },
  );

  it('ein Speicherstand mit ungültiger Kartenbild-Kennung wird verworfen', () => {
    const snap = JSON.parse(JSON.stringify(createHost().exportSnapshot()));
    snap.table.rules.cardSet = 'Nicht Gültig';
    expect(parseHostSnapshot(snap)).toBeNull();
  });

  it('ein Speicherstand mit ungültigen Regeln wird verworfen', () => {
    const snap = JSON.parse(JSON.stringify(createHost().exportSnapshot()));
    snap.table.rules.laufende.wenz = 99;
    expect(parseHostSnapshot(snap)).toBeNull();
  });
});
