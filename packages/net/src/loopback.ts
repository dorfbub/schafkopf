import type { ClientMessage, ClientTransport, HostMessage, HostTransport } from './protocol';

let counter = 0;

/**
 * Verbindet einen Client direkt im selben Prozess mit dem Host – ohne Netz.
 * Damit benutzt der Spieler am Host-Gerät exakt denselben Weg wie alle anderen,
 * und Tests kommen ohne WebRTC aus. Nachrichten werden synchron zugestellt.
 *
 * Reihenfolge: erst `host.addTransport(pair.host)`, dann den Client verbinden.
 */
export function createLoopbackPair(): { host: HostTransport; client: ClientTransport } {
  const peerId = `local-${++counter}`;
  let open = false;

  // JSON-Rundreise, damit sich Loopback wie ein echtes Netz verhält (keine geteilten Objekte).
  const copy = <T>(message: T): T => JSON.parse(JSON.stringify(message)) as T;

  const host: HostTransport = {
    onMessage: null,
    onLeave: null,
    listen() {},
    send(target: string, message: HostMessage) {
      if (open && target === peerId) client.onMessage?.(copy(message));
    },
    close() {
      if (!open) return;
      open = false;
      client.onClose?.();
    },
  };

  const client: ClientTransport = {
    onOpen: null,
    onMessage: null,
    onClose: null,
    connect() {
      open = true;
      client.onOpen?.();
    },
    send(message: ClientMessage) {
      if (open) host.onMessage?.(peerId, copy(message));
    },
    close() {
      if (!open) return;
      open = false;
      host.onLeave?.(peerId);
    },
  };

  return { host, client };
}
