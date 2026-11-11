import { describe, expect, it } from 'vitest';
import { createRandomBot } from '@schafkopf/bots';
import {
  ClientSession,
  DEFAULT_RELAYS,
  DiscoveryGate,
  type HostTransport,
  HostSession,
  SIGNALING_STRATEGIES,
  createLoopbackPair,
  isSignalingStrategy,
  parseRelayUrls,
  parseTurnConfig,
} from '../src';

/** Zeitgeber zum Hand-Weiterschalten: kein echtes Warten, Abbrechen wird beachtet. */
function manualTimers() {
  let now = 0;
  const pending: { at: number; fn: () => void; cancelled: boolean }[] = [];
  const setTimer = (fn: () => void, ms: number) => {
    const entry = { at: now + ms, fn, cancelled: false };
    pending.push(entry);
    return () => void (entry.cancelled = true);
  };
  const advance = (ms: number) => {
    now += ms;
    for (const entry of [...pending].sort((a, b) => a.at - b.at)) {
      if (entry.at > now || entry.cancelled) continue;
      entry.cancelled = true;
      entry.fn();
    }
  };
  return { setTimer, advance };
}

function gateWithLog(pauseDelayMs = 1000) {
  const timers = manualTimers();
  const log: string[] = [];
  const gate = new DiscoveryGate({
    pause: () => log.push('pause'),
    resume: () => log.push('resume'),
    pauseDelayMs,
    setTimer: timers.setTimer,
  });
  return { gate, log, advance: timers.advance };
}

describe('DiscoveryGate', () => {
  it('pausiert erst nach der Wartezeit', () => {
    const { gate, log, advance } = gateWithLog();
    gate.setNeeded(false);
    advance(999);
    expect(log).toEqual([]);
    advance(1);
    expect(log).toEqual(['pause']);
    expect(gate.isPaused).toBe(true);
  });

  it('kurzes Flattern löst nichts aus', () => {
    const { gate, log, advance } = gateWithLog();
    gate.setNeeded(false);
    advance(500);
    gate.setNeeded(true);
    advance(5000);
    expect(log).toEqual([]);
  });

  it('nimmt sofort wieder auf, wenn jemand dazukommen muss', () => {
    const { gate, log, advance } = gateWithLog();
    gate.setNeeded(false);
    advance(1000);
    gate.setNeeded(true);
    expect(log).toEqual(['pause', 'resume']);
    expect(gate.isPaused).toBe(false);
  });

  it('wiederholte Meldungen ändern nichts', () => {
    const { gate, log, advance } = gateWithLog();
    gate.setNeeded(true);
    gate.setNeeded(false);
    gate.setNeeded(false);
    advance(1000);
    advance(1000);
    expect(log).toEqual(['pause']);
  });

  it('gibt beim Verlassen eine Pause wieder frei und plant nichts mehr', () => {
    const { gate, log, advance } = gateWithLog();
    gate.setNeeded(false);
    advance(1000);
    gate.dispose();
    expect(log).toEqual(['pause', 'resume']);

    const second = gateWithLog();
    second.gate.setNeeded(false);
    second.gate.dispose();
    second.advance(5000);
    expect(second.log).toEqual([]);
  });
});

describe('Einstellungen für die Vermittlung', () => {
  it('kennt die drei Wege und hat für jeden eine Relay-Liste', () => {
    for (const strategy of SIGNALING_STRATEGIES) {
      expect(isSignalingStrategy(strategy)).toBe(true);
      expect(DEFAULT_RELAYS[strategy].length).toBeGreaterThan(0);
      for (const url of DEFAULT_RELAYS[strategy]) expect(url).toMatch(/^wss:\/\//);
    }
    expect(isSignalingStrategy('firebase')).toBe(false);
    expect(isSignalingStrategy(undefined)).toBe(false);
  });

  it('liest Relay-Listen und verwirft Unsicheres', () => {
    expect(parseRelayUrls('wss://a.example, wss://b.example  wss://a.example')).toEqual([
      'wss://a.example',
      'wss://b.example',
    ]);
    expect(parseRelayUrls('ws://unsicher.example, https://x.example')).toBeNull();
    expect(parseRelayUrls('')).toBeNull();
    expect(parseRelayUrls(undefined)).toBeNull();
  });

  it('liest TURN-Server aus JSON', () => {
    expect(
      parseTurnConfig('{"urls":"turn:turn.example.org:3478","username":"u","credential":"p"}'),
    ).toEqual([{ urls: 'turn:turn.example.org:3478', username: 'u', credential: 'p' }]);
    expect(
      parseTurnConfig('[{"urls":["turns:a.example:443","https://nein"]},{"urls":"http://x"}]'),
    ).toEqual([{ urls: 'turns:a.example:443' }]);
    expect(parseTurnConfig('kein json')).toBeNull();
    expect(parseTurnConfig('')).toBeNull();
    expect(parseTurnConfig('[]')).toBeNull();
  });
});

/** Host mit synchronen Bots und einem Beobachter für `setDiscoverable`. */
function hostWithProbe() {
  const queue: (() => void)[] = [];
  const host = new HostSession({
    createBot: (seat) => createRandomBot(seat + 1),
    seed: () => 7,
    schedule: (fn) => void queue.push(fn),
  });
  const calls: boolean[] = [];
  const probe: HostTransport = {
    onMessage: null,
    onLeave: null,
    listen() {},
    send() {},
    close() {},
    setDiscoverable: (value) => void calls.push(value),
  };
  host.addTransport(probe);
  const join = (name: string) => {
    const pair = createLoopbackPair();
    host.addTransport(pair.host);
    const client = new ClientSession(pair.client, { name, clientId: name });
    return { client, pair };
  };
  return { host, calls, join };
}

describe('Host meldet, ob der Tisch noch gefunden werden muss', () => {
  it('in der Lobby, solange Plätze frei sind', () => {
    const { host, calls, join } = hostWithProbe();
    join('Anna');
    join('Bene');
    join('Cilli');
    expect(host.isDiscoverable()).toBe(true);
    expect(calls).toEqual([]);
    join('Done');
    expect(host.isDiscoverable()).toBe(false);
    expect(calls).toEqual([false]);
  });

  it('wird ein Platz in der Lobby frei, muss der Tisch wieder auffindbar sein', () => {
    const { calls, join } = hostWithProbe();
    join('Anna');
    join('Bene');
    join('Cilli');
    const done = join('Done');
    done.client.close();
    expect(calls).toEqual([false, true]);
  });

  it('nach dem Start mit Bots nicht mehr – bis ein Mensch die Verbindung verliert', () => {
    const { host, calls, join } = hostWithProbe();
    join('Anna');
    const bene = join('Bene');
    host.start();
    expect(calls).toEqual([false]);

    bene.client.close();
    expect(host.isDiscoverable()).toBe(true);
    expect(calls).toEqual([false, true]);

    // Bene kommt mit derselben clientId zurück und sitzt wieder.
    const back = join('Bene');
    expect(back.client.getSnapshot().seat).toBe(1);
    expect(calls).toEqual([false, true, false]);
  });

  it('ein später angemeldeter Transport erfährt den aktuellen Stand', () => {
    const { host, join } = hostWithProbe();
    join('Anna');
    host.start();
    const calls: boolean[] = [];
    host.addTransport({
      onMessage: null,
      onLeave: null,
      listen() {},
      send() {},
      close() {},
      setDiscoverable: (value) => void calls.push(value),
    });
    expect(calls).toEqual([false]);
  });
});

describe('Verbindungsstatus des Gasts', () => {
  /** Ein Gast, dessen Transport erst auf Kommando öffnet – wie WebRTC, das noch sucht. */
  function slowGuest(timeoutMs = 45_000) {
    const queue: (() => void)[] = [];
    const host = new HostSession({
      createBot: (seat) => createRandomBot(seat),
      seed: () => 3,
      schedule: (fn) => void queue.push(fn),
    });
    const pair = createLoopbackPair();
    host.addTransport(pair.host);
    const realConnect = pair.client.connect.bind(pair.client);
    let reachable = false;
    let connects = 0;
    pair.client.connect = () => {
      connects++;
      if (reachable) realConnect();
    };
    const timers = manualTimers();
    const client = new ClientSession(pair.client, {
      name: 'Gast',
      clientId: 'gast',
      connectTimeoutMs: timeoutMs,
      setTimer: timers.setTimer,
    });
    return {
      client,
      pair,
      advance: timers.advance,
      connects: () => connects,
      becomeReachable: () => {
        reachable = true;
      },
      openNow: () => {
        reachable = true;
        realConnect();
      },
    };
  }

  it('sucht zuerst und ist nach der Zeitüberschreitung fehlgeschlagen', () => {
    const guest = slowGuest();
    expect(guest.client.getSnapshot().status).toBe('connecting');
    guest.advance(44_999);
    expect(guest.client.getSnapshot().status).toBe('connecting');
    guest.advance(1);
    expect(guest.client.getSnapshot().status).toBe('failed');
  });

  it('wer rechtzeitig begrüßt wird, ist verbunden und bleibt es', () => {
    const guest = slowGuest();
    guest.advance(10_000);
    guest.openNow();
    expect(guest.client.getSnapshot()).toMatchObject({ status: 'connected', seat: 0 });
    guest.advance(60_000);
    expect(guest.client.getSnapshot().status).toBe('connected');
  });

  it('„Erneut versuchen“ baut neu auf und startet die Frist von vorn', () => {
    const guest = slowGuest();
    guest.advance(45_000);
    expect(guest.client.getSnapshot().status).toBe('failed');

    guest.client.retry();
    expect(guest.connects()).toBe(2);
    expect(guest.client.getSnapshot().status).toBe('connecting');
    guest.advance(44_000);
    expect(guest.client.getSnapshot().status).toBe('connecting');

    guest.becomeReachable();
    guest.client.retry();
    expect(guest.client.getSnapshot()).toMatchObject({ status: 'connected', seat: 0 });
  });

  it('eine späte Begrüßung nach dem Fehlschlag zählt trotzdem', () => {
    const guest = slowGuest();
    guest.advance(45_000);
    guest.openNow();
    expect(guest.client.getSnapshot().status).toBe('connected');
  });

  it('Verbindungsverlust: erst „getrennt“, ohne Rückkehr dann „fehlgeschlagen“', () => {
    const guest = slowGuest();
    guest.openNow();
    guest.pair.host.close();
    expect(guest.client.getSnapshot().status).toBe('disconnected');
    guest.advance(45_000);
    expect(guest.client.getSnapshot().status).toBe('failed');
  });

  it('Zeitüberschreitung 0 schaltet die Frist ab', () => {
    const guest = slowGuest(0);
    guest.advance(10 * 60_000);
    expect(guest.client.getSnapshot().status).toBe('connecting');
  });
});
