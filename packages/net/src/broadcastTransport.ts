/**
 * Transport über `BroadcastChannel`: Host und Gäste in verschiedenen Tabs
 * desselben Browsers, ganz ohne Netz und öffentliche Relays. Nur für Tests
 * und die Entwicklung gedacht (Ende-zu-Ende-Tests, Paket I2) – im
 * ausgelieferten Standard wird er nie ausgewählt.
 *
 * Ablauf: Der Host kündigt sich an ("up"); Gäste melden sich mit "hello", der
 * Host antwortet mit "hi" (sein Gegenstück zum Trystero-Begrüßen). Danach
 * laufen Nachrichten gezielt per `to`. Weil ein geschlossener Tab keine
 * Abschiedsnachricht schicken kann, erkennt man das Weggehen über Web Locks:
 * Jede Seite hält ein Schloss mit ihrer eigenen Kennung; wird es frei, ist sie
 * weg (Tab geschlossen, Neuladen, `close()`).
 *
 * Alle Nachrichten gehen durch die JSON-Rundreise des Kanals (structured clone).
 */

import type { ClientMessage, ClientTransport, HostMessage, HostTransport } from './protocol';

const PREFIX = 'schafkopf.bc.';

type Packet =
  | { kind: 'up'; host: string }
  | { kind: 'hello'; from: string }
  | { kind: 'hi'; host: string; to: string }
  | { kind: 'toHost'; from: string; message: ClientMessage }
  | { kind: 'toClient'; to: string; host: string; message: HostMessage };

function newId(): string {
  return crypto.randomUUID();
}

/** Hält ein Schloss, bis die Funktion aufgerufen wird oder die Seite verschwindet. */
function holdLock(name: string): () => void {
  let release: () => void = () => {};
  try {
    void navigator.locks
      .request(name, () => new Promise<void>((resolve) => (release = resolve)))
      .catch(() => {});
  } catch {
    // ohne Web Locks wird das Weggehen nicht bemerkt
  }
  return () => release();
}

/** Ruft `then`, sobald das Schloss frei wird, also sein Halter weg ist. */
function whenGone(name: string, then: () => void): void {
  try {
    void navigator.locks.request(name, then).catch(() => {});
  } catch {
    // siehe holdLock
  }
}

export function createBroadcastHost(roomId: string): HostTransport {
  const id = newId();
  let channel: BroadcastChannel | null = null;
  let releaseLock: (() => void) | null = null;
  const peers = new Set<string>();
  const transport: HostTransport = {
    onMessage: null,
    onLeave: null,
    listen() {
      if (channel) return;
      const current = new BroadcastChannel(PREFIX + roomId);
      channel = current;
      releaseLock = holdLock(`${PREFIX}${roomId}.host.${id}`);
      current.onmessage = (event: MessageEvent<Packet>) => {
        const packet = event.data;
        if (packet.kind === 'hello') {
          const peer = packet.from;
          if (!peers.has(peer)) {
            peers.add(peer);
            whenGone(`${PREFIX}${roomId}.peer.${peer}`, () => {
              if (peers.delete(peer)) transport.onLeave?.(peer);
            });
          }
          current.postMessage({ kind: 'hi', host: id, to: peer } satisfies Packet);
        } else if (packet.kind === 'toHost' && peers.has(packet.from)) {
          transport.onMessage?.(packet.from, packet.message);
        }
      };
      current.postMessage({ kind: 'up', host: id } satisfies Packet);
    },
    send(peerId, message) {
      if (peers.has(peerId)) {
        channel?.postMessage({ kind: 'toClient', to: peerId, host: id, message } satisfies Packet);
      }
    },
    close() {
      releaseLock?.();
      releaseLock = null;
      channel?.close();
      channel = null;
      peers.clear();
    },
  };
  return transport;
}

export function createBroadcastClient(roomId: string): ClientTransport {
  const id = newId();
  let channel: BroadcastChannel | null = null;
  let releaseLock: (() => void) | null = null;
  let hostId: string | null = null;
  const transport: ClientTransport = {
    onOpen: null,
    onMessage: null,
    onClose: null,
    connect() {
      if (channel) return;
      const current = new BroadcastChannel(PREFIX + roomId);
      channel = current;
      releaseLock = holdLock(`${PREFIX}${roomId}.peer.${id}`);
      const hello = () => current.postMessage({ kind: 'hello', from: id } satisfies Packet);
      current.onmessage = (event: MessageEvent<Packet>) => {
        const packet = event.data;
        if (packet.kind === 'up') {
          if (hostId !== packet.host) hello();
        } else if (packet.kind === 'hi' && packet.to === id) {
          if (hostId === packet.host) return;
          const host = packet.host;
          hostId = host;
          whenGone(`${PREFIX}${roomId}.host.${host}`, () => {
            if (hostId !== host) return;
            hostId = null;
            transport.onClose?.();
          });
          transport.onOpen?.();
        } else if (packet.kind === 'toClient' && packet.to === id && packet.host === hostId) {
          transport.onMessage?.(packet.message);
        }
      };
      hello();
    },
    send(message) {
      if (hostId) channel?.postMessage({ kind: 'toHost', from: id, message } satisfies Packet);
    },
    close() {
      releaseLock?.();
      releaseLock = null;
      channel?.close();
      channel = null;
      hostId = null;
    },
  };
  return transport;
}
