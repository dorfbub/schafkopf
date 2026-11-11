/**
 * WebRTC-Transport über Trystero. Die Spieldaten laufen direkt von Browser zu
 * Browser; nur zum Finden der Gegenstellen (Signalisierung) werden öffentliche
 * Relays benutzt – Nostr, BitTorrent-Tracker oder MQTT-Broker, siehe
 * `signaling.ts`. Es gibt keinen eigenen Server.
 *
 * In einem Trystero-Raum sind alle Teilnehmer untereinander verbunden. Wir
 * nutzen davon nur die Sternform: Der Host begrüßt jeden neuen Teilnehmer
 * ("hi"), der Teilnehmer merkt sich daraufhin den Host und redet nur mit ihm.
 *
 * Öffentliche Relays drosseln schon bei wenigen Nachrichten. Deshalb ruht die
 * Vermittlung, sobald sie nicht gebraucht wird (`DiscoveryGate`): beim Host,
 * wenn alle Plätze verbunden sind, beim Gast, sobald er den Host gefunden hat.
 *
 * Bewusst getrennt exportiert (`@schafkopf/net/trystero`), damit Kern-Tests und
 * lokale Spiele die WebRTC-Abhängigkeit nicht laden müssen. Der gewählte Weg
 * wird erst beim Verbinden nachgeladen.
 */

import type { JoinRoomConfig, JsonValue, MessageAction, Room } from '@trystero-p2p/nostr';
import type { ClientMessage, ClientTransport, HostMessage, HostTransport } from './protocol';
import {
  DEFAULT_RELAYS,
  DEFAULT_STRATEGY,
  DiscoveryGate,
  type IceServerConfig,
  type SignalingStrategy,
} from './signaling';

/** Trennt unsere Räume von denen anderer Trystero-Apps. Nicht ändern – sonst finden sich alte und neue Versionen nicht. */
const APP_ID = 'schafkopf-app-p2p-v1';

export interface TrysteroOptions {
  /** Vermittlungsweg; Standard `DEFAULT_STRATEGY`. Host und Gäste müssen denselben nutzen. */
  strategy?: SignalingStrategy;
  /** Eigene Relay-Liste statt `DEFAULT_RELAYS[strategy]`. */
  relayUrls?: string[];
  /** Optionale TURN-Server für Spieler hinter strengen Routern/Firmennetzen. */
  turnConfig?: IceServerConfig[];
  /** Vermittlung ruhen lassen, wenn niemand mehr dazukommen muss. Standard: an. */
  pauseWhenIdle?: boolean;
  /** Wartezeit vor dem Pausieren in ms (siehe `DiscoveryGate`). */
  pauseDelayMs?: number;
  /** Diagnose-Ausgaben (z. B. `console.info` im Entwicklungsmodus). */
  log?: (message: string) => void;
}

interface StrategyModule {
  joinRoom: (config: JoinRoomConfig, roomId: string) => Room;
  getRelaySockets: () => Record<string, { close(): void } | undefined>;
  pauseRelayReconnection?: () => void;
  resumeRelayReconnection?: () => void;
}

const LOADERS: Record<SignalingStrategy, () => Promise<StrategyModule>> = {
  nostr: () => import('@trystero-p2p/nostr'),
  torrent: () => import('@trystero-p2p/torrent'),
  mqtt: () => import('@trystero-p2p/mqtt'),
};

interface Link {
  room: Room;
  gate: DiscoveryGate | null;
  hi: MessageAction;
  toHost: MessageAction;
  toClient: MessageAction;
}

async function open(roomId: string, options: TrysteroOptions): Promise<Link> {
  const strategy = options.strategy ?? DEFAULT_STRATEGY;
  const mod = await LOADERS[strategy]();
  const log = options.log ?? (() => {});
  const room = mod.joinRoom(
    {
      appId: APP_ID,
      relayConfig: { urls: options.relayUrls ?? [...DEFAULT_RELAYS[strategy]] },
      // Kandidaten gebündelt mit dem SDP schicken: eine Nachricht statt fünf je
      // Signal. Genau diese Bursts haben Nostr-Relays gedrosselt.
      ...(strategy === 'nostr' ? { trickleIce: false } : {}),
      ...(options.turnConfig ? { turnConfig: options.turnConfig } : {}),
    },
    roomId,
  );
  const { pauseRelayReconnection: pause, resumeRelayReconnection: resume } = mod;
  const gate =
    options.pauseWhenIdle !== false && pause && resume
      ? new DiscoveryGate({
          pauseDelayMs: options.pauseDelayMs,
          pause: () => {
            // Wiederverbinden sperren und die Relay-Verbindungen schließen: Ohne
            // offene Verbindung verschickt Trystero keine Ankündigungen mehr.
            pause();
            for (const socket of Object.values(mod.getRelaySockets())) socket?.close();
            log('Vermittlung pausiert');
          },
          resume: () => {
            resume();
            log('Vermittlung fortgesetzt');
          },
        })
      : null;
  log(`Vermittlung über ${strategy}`);
  return {
    room,
    gate,
    hi: room.makeAction('hi'),
    toHost: room.makeAction('c2h'),
    toClient: room.makeAction('h2c'),
  };
}

function leave(link: Link | null): void {
  if (!link) return;
  link.gate?.dispose();
  void link.room.leave();
}

export function createTrysteroHost(roomId: string, options: TrysteroOptions = {}): HostTransport {
  let link: Link | null = null;
  let generation = 0;
  let discoverable = true;
  const transport: HostTransport = {
    onMessage: null,
    onLeave: null,
    listen() {
      const current = ++generation;
      void open(roomId, options).then((opened) => {
        if (current !== generation) return leave(opened);
        link = opened;
        opened.room.onPeerJoin = (peerId) => void opened.hi.send(1, { target: peerId });
        opened.room.onPeerLeave = (peerId) => transport.onLeave?.(peerId);
        opened.toHost.onMessage = (data, { peerId }) =>
          transport.onMessage?.(peerId, data as unknown as ClientMessage);
        opened.gate?.setNeeded(discoverable);
      });
    },
    send(peerId: string, message: HostMessage) {
      void link?.toClient.send(message as unknown as JsonValue, { target: peerId });
    },
    close() {
      generation++;
      leave(link);
      link = null;
    },
    setDiscoverable(value: boolean) {
      discoverable = value;
      link?.gate?.setNeeded(value);
    },
  };
  return transport;
}

export function createTrysteroClient(
  roomId: string,
  options: TrysteroOptions = {},
): ClientTransport {
  let link: Link | null = null;
  let generation = 0;
  let hostId: string | null = null;
  const transport: ClientTransport = {
    onOpen: null,
    onMessage: null,
    onClose: null,
    connect() {
      const current = ++generation;
      void open(roomId, options).then((opened) => {
        if (current !== generation) return leave(opened);
        link = opened;
        opened.hi.onMessage = (_data, { peerId }) => {
          hostId = peerId;
          // Den Host haben wir; weitere Vermittlung brauchen wir erst nach einem Abbruch.
          opened.gate?.setNeeded(false);
          transport.onOpen?.();
        };
        opened.toClient.onMessage = (data, { peerId }) => {
          if (peerId === hostId) transport.onMessage?.(data as unknown as HostMessage);
        };
        opened.room.onPeerLeave = (peerId) => {
          if (peerId !== hostId) return;
          hostId = null;
          opened.gate?.setNeeded(true);
          transport.onClose?.();
        };
      });
    },
    send(message: ClientMessage) {
      if (hostId) void link?.toHost.send(message as unknown as JsonValue, { target: hostId });
    },
    close() {
      generation++;
      leave(link);
      link = null;
      hostId = null;
    },
  };
  return transport;
}
