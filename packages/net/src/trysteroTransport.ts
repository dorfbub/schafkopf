/**
 * WebRTC-Transport über Trystero. Die Spieldaten laufen direkt von Browser zu
 * Browser; nur zum Finden der Gegenstellen (Signalisierung) werden öffentliche
 * Nostr-Relays benutzt. Es gibt keinen eigenen Server.
 *
 * In einem Trystero-Raum sind alle Teilnehmer untereinander verbunden. Wir
 * nutzen davon nur die Sternform: Der Host begrüßt jeden neuen Teilnehmer
 * ("hi"), der Teilnehmer merkt sich daraufhin den Host und redet nur mit ihm.
 *
 * Bewusst getrennt exportiert (`@schafkopf/net/trystero`), damit Kern-Tests und
 * lokale Spiele die WebRTC-Abhängigkeit nicht laden müssen.
 */

import { type JsonValue, type TurnServerConfig, joinRoom } from 'trystero';
import type { ClientMessage, ClientTransport, HostMessage, HostTransport } from './protocol';

/** Trennt unsere Räume von denen anderer Trystero-Apps. Nicht ändern – sonst finden sich alte und neue Versionen nicht. */
const APP_ID = 'schafkopf-app-p2p-v1';

export interface TrysteroOptions {
  /** Optionale TURN-Server für Spieler hinter strengen Routern/Firmennetzen. */
  turnConfig?: TurnServerConfig[];
}

function open(roomId: string, options: TrysteroOptions) {
  const room = joinRoom(
    { appId: APP_ID, ...(options.turnConfig ? { turnConfig: options.turnConfig } : {}) },
    roomId,
  );
  return {
    room,
    hi: room.makeAction('hi'),
    toHost: room.makeAction('c2h'),
    toClient: room.makeAction('h2c'),
  };
}

export function createTrysteroHost(roomId: string, options: TrysteroOptions = {}): HostTransport {
  let link: ReturnType<typeof open> | null = null;
  const transport: HostTransport = {
    onMessage: null,
    onLeave: null,
    listen() {
      link = open(roomId, options);
      link.room.onPeerJoin = (peerId) => void link?.hi.send(1, { target: peerId });
      link.room.onPeerLeave = (peerId) => transport.onLeave?.(peerId);
      link.toHost.onMessage = (data, { peerId }) =>
        transport.onMessage?.(peerId, data as unknown as ClientMessage);
    },
    send(peerId: string, message: HostMessage) {
      void link?.toClient.send(message as unknown as JsonValue, { target: peerId });
    },
    close() {
      void link?.room.leave();
      link = null;
    },
  };
  return transport;
}

export function createTrysteroClient(
  roomId: string,
  options: TrysteroOptions = {},
): ClientTransport {
  let link: ReturnType<typeof open> | null = null;
  let hostId: string | null = null;
  const transport: ClientTransport = {
    onOpen: null,
    onMessage: null,
    onClose: null,
    connect() {
      link = open(roomId, options);
      link.hi.onMessage = (_data, { peerId }) => {
        hostId = peerId;
        transport.onOpen?.();
      };
      link.toClient.onMessage = (data, { peerId }) => {
        if (peerId === hostId) transport.onMessage?.(data as unknown as HostMessage);
      };
      link.room.onPeerLeave = (peerId) => {
        if (peerId !== hostId) return;
        hostId = null;
        transport.onClose?.();
      };
    },
    send(message: ClientMessage) {
      if (hostId) void link?.toHost.send(message as unknown as JsonValue, { target: hostId });
    },
    close() {
      void link?.room.leave();
      link = null;
      hostId = null;
    },
  };
  return transport;
}
