/**
 * Baut die Verbindung für einen Tisch auf. Wer einen Tisch eröffnet, ist Host
 * und zugleich Mitspieler (über eine Loopback-Verbindung zum eigenen Host);
 * alle anderen sind reine Mitspieler über WebRTC.
 */

import { createRandomBot } from '@schafkopf/bots';
import {
  ClientSession,
  HostSession,
  createLoopbackPair,
  isSignalingStrategy,
  parseRelayUrls,
  parseTurnConfig,
} from '@schafkopf/net';
import {
  type TrysteroOptions,
  createTrysteroClient,
  createTrysteroHost,
} from '@schafkopf/net/trystero';

export interface Connection {
  client: ClientSession;
  /** Nur gesetzt, wenn dieses Gerät den Tisch hostet. */
  host: HostSession | null;
  /** Tisch-Code für die Einladung; null bei einem rein lokalen Tisch. */
  roomId: string | null;
  close(): void;
}

const ROOM_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function randomRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ROOM_ALPHABET[b % ROOM_ALPHABET.length]).join('');
}

function remembered(storage: () => Storage, key: string, create: () => string): string {
  try {
    const existing = storage().getItem(key);
    if (existing) return existing;
    const value = create();
    storage().setItem(key, value);
    return value;
  } catch {
    return create(); // Speicher gesperrt (z. B. privates Fenster)
  }
}

/**
 * Kennung dieses Browser-Tabs. Übersteht ein Neuladen (so findet man seinen
 * Platz wieder), ist aber pro Tab verschieden – zwei Tabs sind zwei Spieler.
 */
function clientId(): string {
  return remembered(
    () => sessionStorage,
    'schafkopf.clientId',
    () => crypto.randomUUID(),
  );
}

export function loadName(): string {
  try {
    return localStorage.getItem('schafkopf.name') ?? '';
  } catch {
    return '';
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem('schafkopf.name', name);
  } catch {
    // ohne Speicher wird der Name eben nicht gemerkt
  }
}

/**
 * Vermittlungsweg, Relays und TURN aus den Umgebungsvariablen beim Bauen
 * (`VITE_SIGNALING`, `VITE_SIGNALING_URLS`, `VITE_TURN_CONFIG`). Im
 * Entwicklungsmodus lässt sich der Weg zum Vergleichen per `?weg=torrent`
 * umschalten; Host und Gast brauchen dann beide denselben Parameter.
 */
export function signalingOptions(): TrysteroOptions {
  const env = import.meta.env;
  const override = env.DEV ? new URLSearchParams(window.location.search).get('weg') : null;
  const options: TrysteroOptions = {};
  if (isSignalingStrategy(override)) {
    options.strategy = override;
  } else {
    if (isSignalingStrategy(env.VITE_SIGNALING)) options.strategy = env.VITE_SIGNALING;
    const urls = parseRelayUrls(env.VITE_SIGNALING_URLS);
    if (urls) options.relayUrls = urls;
  }
  const turn = parseTurnConfig(env.VITE_TURN_CONFIG);
  if (turn) options.turnConfig = turn;
  if (env.DEV) options.log = (message) => console.info(`[Verbindung] ${message}`);
  return options;
}

export function openTable(name: string, online: boolean): Connection {
  const host = new HostSession({
    createBot: (seat) => createRandomBot(crypto.getRandomValues(new Uint32Array(1))[0]! + seat),
  });
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  const roomId = online ? randomRoomId() : null;
  if (roomId) host.addTransport(createTrysteroHost(roomId, signalingOptions()));
  const client = new ClientSession(pair.client, { name, clientId: clientId() });
  return {
    client,
    host,
    roomId,
    close() {
      client.close();
      host.close();
    },
  };
}

export function joinTable(name: string, roomId: string): Connection {
  const client = new ClientSession(createTrysteroClient(roomId, signalingOptions()), {
    name,
    clientId: clientId(),
  });
  return { client, host: null, roomId, close: () => client.close() };
}

const HASH_PREFIX = '#tisch=';

export function roomFromUrl(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const room = normalizeRoom(hash.slice(HASH_PREFIX.length));
  return room || null;
}

export function normalizeRoom(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function inviteLink(roomId: string): string {
  // Die Suche (`?weg=…` im Entwicklungsmodus) mitnehmen, damit Gäste denselben Weg nutzen.
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}${HASH_PREFIX}${roomId}`;
}
