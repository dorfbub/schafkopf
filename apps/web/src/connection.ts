/**
 * Baut die Verbindung für einen Tisch auf. Wer einen Tisch eröffnet, ist Host
 * und zugleich Mitspieler (über eine Loopback-Verbindung zum eigenen Host);
 * alle anderen sind reine Mitspieler über WebRTC.
 */

import { createRandomBot } from '@schafkopf/bots';
import { ClientSession, HostSession, createLoopbackPair } from '@schafkopf/net';
import { createTrysteroClient, createTrysteroHost } from '@schafkopf/net/trystero';

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

export function openTable(name: string, online: boolean): Connection {
  const host = new HostSession({
    createBot: (seat) => createRandomBot(crypto.getRandomValues(new Uint32Array(1))[0]! + seat),
  });
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  const roomId = online ? randomRoomId() : null;
  if (roomId) host.addTransport(createTrysteroHost(roomId));
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
  const client = new ClientSession(createTrysteroClient(roomId), { name, clientId: clientId() });
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
  return `${window.location.origin}${window.location.pathname}${HASH_PREFIX}${roomId}`;
}
