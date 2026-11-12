import { describe, expect, it } from 'vitest';
import { createRandomBot } from '@schafkopf/bots';
import {
  ClientSession,
  HostSession,
  type ClientMessage,
  type HostMessage,
  createLoopbackPair,
  parseHostSnapshot,
} from '../src';

/** Neue Mitspieler bestätigen (N6). Anna ist die Gastgeberin (`owner`). */

const OWNER = 'id-anna';

function hostOptions() {
  return {
    createBot: (seat: number) => createRandomBot(seat),
    seed: () => 1,
    schedule: () => {},
    owner: OWNER,
  };
}

function createHost(requireApproval = true) {
  const host = new HostSession({ ...hostOptions(), roomId: 'k7mqx2pdhn' });
  host.setRequireApproval(requireApproval);
  return host;
}

interface Guest {
  client: ClientSession;
  /** Alle Nachrichten, die beim Gast angekommen sind. */
  got: HostMessage[];
  /** Verbindung schließen (Tab zu oder Verbindung weg). */
  drop: () => void;
}

function join(host: HostSession, name: string, clientId: string): Guest {
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  const got: HostMessage[] = [];
  const client = new ClientSession(pair.client, { name, clientId, connectTimeoutMs: 0 });
  // Mithören, ohne den Client zu stören.
  const onMessage = pair.client.onMessage!;
  pair.client.onMessage = (m) => {
    got.push(m);
    onMessage(m);
  };
  // Die Begrüßung lief schon beim Verbinden; neu verbinden, damit auch sie mitgeschrieben wird.
  pair.client.close();
  pair.client.connect();
  return { client, got, drop: () => pair.client.close() };
}

function sendRaw(client: ClientSession, message: unknown) {
  (client as unknown as { transport: { send(m: ClientMessage): void } }).transport.send(
    message as ClientMessage,
  );
}

const names = (c: ClientSession) => c.getSnapshot().view!.seats.map((s) => s?.name ?? null);

/** Tisch mit der Gastgeberin Anna. */
function tableWithAnna(host = createHost()) {
  const anna = join(host, 'Anna', OWNER);
  return { host, anna };
}

describe('Neue Mitspieler bestätigen', () => {
  it('ist ausgeschaltet: jeder kommt sofort an den Tisch', () => {
    const host = createHost(false);
    join(host, 'Anna', OWNER);
    const bene = join(host, 'Bene', 'id-bene');
    expect(bene.client.getSnapshot().seat).toBe(1);
    expect(host.getJoinRequests()).toEqual([]);
    expect(bene.client.getSnapshot().lobby?.requireApproval).toBe(false);
  });

  it('die Gastgeberin selbst muss nie warten', () => {
    const { anna } = tableWithAnna();
    expect(anna.client.getSnapshot().seat).toBe(0);
    expect(anna.client.getSnapshot().admission).toBeNull();
    expect(anna.client.getSnapshot().lobby?.requireApproval).toBe(true);
  });

  it('ein Unbekannter wartet ohne Sicht, bis die Gastgeberin zulässt', () => {
    const { host, anna } = tableWithAnna();
    const bene = join(host, 'Bene', 'id-bene');

    const waiting = bene.client.getSnapshot();
    expect(waiting.admission).toBe('waiting');
    expect(waiting.hostName).toBe('Anna');
    expect(waiting.view).toBeNull();
    expect(waiting.status).toBe('connecting');
    // Kein `welcome`, keine `state` – nur die Wartenachricht.
    expect(bene.got.map((m) => m.t)).toEqual(['waiting']);
    expect(host.getJoinRequests()).toEqual([{ id: expect.any(Number), name: 'Bene' }]);
    // Am Tisch und in der Zuschauerliste taucht er nicht auf.
    expect(names(anna.client)).toEqual(['Anna', null, null, null]);
    expect(anna.client.getSnapshot().lobby?.watchers).toEqual([]);

    const [request] = host.getJoinRequests();
    expect(host.admitJoin(request!.id)).toBe(true);
    expect(bene.client.getSnapshot().admission).toBeNull();
    expect(bene.client.getSnapshot().status).toBe('connected');
    expect(bene.client.getSnapshot().seat).toBe(1);
    expect(names(anna.client)).toEqual(['Anna', 'Bene', null, null]);
    expect(host.getJoinRequests()).toEqual([]);
    // Dieselbe Anfrage geht kein zweites Mal.
    expect(host.admitJoin(request!.id)).toBe(false);
  });

  it('abgewiesen: der Gast erfährt es, bekommt nichts und fragt nicht erneut', () => {
    const { host, anna } = tableWithAnna();
    const bene = join(host, 'Bene', 'id-bene');
    const [request] = host.getJoinRequests();
    expect(host.rejectJoin(request!.id)).toBe(true);
    expect(bene.client.getSnapshot().admission).toBe('rejected');
    expect(bene.client.getSnapshot().view).toBeNull();
    expect(host.getJoinRequests()).toEqual([]);
    expect(names(anna.client)).toEqual(['Anna', null, null, null]);

    // Neu verbinden mit derselben Kennung: gleich wieder abgewiesen, keine neue Anfrage.
    bene.drop();
    const again = join(host, 'Bene', 'id-bene');
    expect(again.client.getSnapshot().admission).toBe('rejected');
    expect(again.got.map((m) => m.t)).toEqual(['rejected']);
    expect(host.getJoinRequests()).toEqual([]);
    expect(host.admitJoin(request!.id)).toBe(false);
  });

  it('wer schon am Tisch war, kommt ohne Rückfrage zurück', () => {
    const { host } = tableWithAnna();
    const bene = join(host, 'Bene', 'id-bene');
    host.admitJoin(host.getJoinRequests()[0]!.id);
    bene.client.takeSeat(3);

    // Verbindung weg – in der Lobby wird der Platz frei – und wieder da: kein Warten.
    bene.drop();
    const back = join(host, 'Bene', 'id-bene');
    expect(back.client.getSnapshot().admission).toBeNull();
    expect(back.got[0]?.t).toBe('welcome');
    expect(host.getJoinRequests()).toEqual([]);
  });

  it('wer vor dem Einschalten schon da war, gilt als bekannt', () => {
    const host = createHost(false);
    join(host, 'Anna', OWNER);
    const bene = join(host, 'Bene', 'id-bene');
    host.setRequireApproval(true);
    bene.drop();
    expect(join(host, 'Bene', 'id-bene').client.getSnapshot().seat).toBe(1);
    expect(join(host, 'Cilli', 'id-cilli').client.getSnapshot().admission).toBe('waiting');
  });

  it('im laufenden Spiel: ein getrennter Spieler findet seinen Platz ohne Rückfrage wieder', () => {
    const { host } = tableWithAnna();
    const bene = join(host, 'Bene', 'id-bene');
    host.admitJoin(host.getJoinRequests()[0]!.id);
    host.start();
    bene.drop();
    expect(host.getTable().seats[1]?.connected).toBe(false);
    const back = join(host, 'Bene', 'id-bene');
    expect(back.client.getSnapshot().seat).toBe(1);
    expect(back.client.getSnapshot().view?.hand?.hand).toHaveLength(8);
    expect(host.getTable().seats[1]?.connected).toBe(true);
  });

  it('im laufenden Spiel kommt ein Zugelassener als Zuschauer an den Tisch', () => {
    const { host, anna } = tableWithAnna();
    host.start();
    const cilli = join(host, 'Cilli', 'id-cilli');
    expect(cilli.client.getSnapshot().view).toBeNull();
    // Die Anfrage stört das Spiel nicht: die Gastgeberin hat weiter ihre Hand.
    expect(anna.client.getSnapshot().view?.hand?.hand).toHaveLength(8);
    host.admitJoin(host.getJoinRequests()[0]!.id);
    expect(cilli.client.getSnapshot().seat).toBeNull();
    expect(cilli.client.getSnapshot().view?.hand).not.toBeNull();
    expect(anna.client.getSnapshot().lobby?.watchers).toEqual(['Cilli']);
  });

  it('Spielaktionen, Platzwahl und Umbenennen vor der Zusage werden abgewiesen', () => {
    const { host, anna } = tableWithAnna();
    host.start();
    const before = JSON.stringify(host.getTable());
    const bene = join(host, 'Bene', 'id-bene');
    const hand = host.getTable().hand!;
    const card = hand.hands[hand.turn]![0]!;
    const attempts: unknown[] = [
      { t: 'action', action: { type: 'play', card } },
      { t: 'action', action: { type: 'bid', call: { type: 'pass' } } },
      { t: 'action', action: { type: 'double' } },
      { t: 'seat', seat: 1 },
      { t: 'seat', seat: null },
      { t: 'rename', name: 'Gastgeber' },
    ];
    for (const message of attempts) {
      bene.got.length = 0;
      sendRaw(bene.client, message);
      expect(bene.got).toEqual([{ t: 'error', code: 'not_admitted' }]);
    }
    expect(JSON.stringify(host.getTable())).toBe(before);
    expect(bene.client.getSnapshot().view).toBeNull();
    expect(host.getJoinRequests()).toEqual([{ id: expect.any(Number), name: 'Bene' }]);
    expect(anna.client.getSnapshot().lobby?.watchers).toEqual([]);
  });

  it('auch abgewiesene Gäste können nichts tun', () => {
    const { host } = tableWithAnna();
    const bene = join(host, 'Bene', 'id-bene');
    host.rejectJoin(host.getJoinRequests()[0]!.id);
    bene.got.length = 0;
    sendRaw(bene.client, { t: 'seat', seat: 1 });
    expect(bene.got).toEqual([{ t: 'error', code: 'not_admitted' }]);
    expect(host.getTable().seats[1]).toBeNull();
  });

  it('eine Verbindung kann ihre Kennung nicht wechseln', () => {
    const { host } = tableWithAnna();
    const bene = join(host, 'Bene', 'id-bene');
    bene.got.length = 0;
    sendRaw(bene.client, { t: 'hello', v: 18, clientId: OWNER, name: 'Anna' });
    expect(bene.got).toEqual([{ t: 'error', code: 'bad_message' }]);
    expect(host.getJoinRequests()).toHaveLength(1);
  });

  it('ungültige Befehle des Gastgebers ändern nichts', () => {
    const { host } = tableWithAnna();
    join(host, 'Bene', 'id-bene');
    for (const id of [0, -1, 99, '1', null, Number.NaN]) {
      expect(host.admitJoin(id as number)).toBe(false);
      expect(host.rejectJoin(id as number)).toBe(false);
    }
    expect(host.getJoinRequests()).toHaveLength(1);
  });

  it('geht ein Wartender, verfällt seine Anfrage', () => {
    const { host } = tableWithAnna();
    const bene = join(host, 'Bene', 'id-bene');
    const requests = host.getJoinRequests();
    expect(requests).toHaveLength(1);
    bene.drop();
    expect(host.getJoinRequests()).toEqual([]);
    expect(host.admitJoin(requests[0]!.id)).toBe(false);
  });

  it('die Liste der Anfragen bleibt dieselbe, solange sich nichts ändert', () => {
    const { host, anna } = tableWithAnna();
    join(host, 'Bene', 'id-bene');
    const first = host.getJoinRequests();
    anna.client.rename('Anni');
    expect(host.getJoinRequests()).toBe(first);
    join(host, 'Cilli', 'id-cilli');
    expect(host.getJoinRequests().map((r) => r.name)).toEqual(['Bene', 'Cilli']);
  });

  it('Ausschalten lässt alle Wartenden herein', () => {
    const { host } = tableWithAnna();
    const bene = join(host, 'Bene', 'id-bene');
    const cilli = join(host, 'Cilli', 'id-cilli');
    host.setRequireApproval(false);
    expect(bene.client.getSnapshot().seat).toBe(1);
    expect(cilli.client.getSnapshot().seat).toBe(2);
    expect(host.getJoinRequests()).toEqual([]);
  });

  it('nach dem Neuladen des Gastgebers: Einstellung und Bekannte bleiben, Wartende fragen neu', () => {
    const { host } = tableWithAnna();
    join(host, 'Bene', 'id-bene');
    host.admitJoin(host.getJoinRequests()[0]!.id);
    const cilli = join(host, 'Cilli', 'id-cilli');
    expect(host.getJoinRequests()).toHaveLength(1);

    const snapshot = parseHostSnapshot(JSON.parse(JSON.stringify(host.exportSnapshot())));
    expect(snapshot).not.toBeNull();
    host.close();
    expect(cilli.client.getSnapshot().admission).toBeNull(); // Verbindung weg

    const restored = HostSession.restore(snapshot!, hostOptions());
    expect(restored.isApprovalRequired()).toBe(true);
    expect(restored.getJoinRequests()).toEqual([]);
    const anna = join(restored, 'Anna', OWNER);
    const beneBack = join(restored, 'Bene', 'id-bene');
    expect(beneBack.client.getSnapshot().admission).toBeNull();
    expect(beneBack.client.getSnapshot().seat).toBe(1);

    // Die wartende Cilli meldet sich wieder und steht erneut in der Liste.
    const cilliBack = join(restored, 'Cilli', 'id-cilli');
    expect(cilliBack.client.getSnapshot().admission).toBe('waiting');
    expect(cilliBack.client.getSnapshot().hostName).toBe('Anna');
    expect(restored.getJoinRequests().map((r) => r.name)).toEqual(['Cilli']);
    restored.admitJoin(restored.getJoinRequests()[0]!.id);
    expect(cilliBack.client.getSnapshot().seat).toBe(2);
    expect(names(anna.client)).toEqual(['Anna', 'Bene', 'Cilli', null]);
  });
});
