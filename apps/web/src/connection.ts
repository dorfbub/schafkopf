/**
 * Baut die Verbindung für einen Tisch auf. Wer einen Tisch eröffnet, ist Host
 * und zugleich Mitspieler (über eine Loopback-Verbindung zum eigenen Host);
 * alle anderen sind reine Mitspieler über WebRTC.
 */

import { createBotOfStrength } from '@schafkopf/bots';
import {
  ClientSession,
  type HostOptions,
  HostSession,
  type HostSnapshot,
  createLoopbackPair,
  parseHostSnapshot,
  isSignalingStrategy,
  parseRelayUrls,
  parseTurnConfig,
} from '@schafkopf/net';
import { createBroadcastClient, createBroadcastHost } from '@schafkopf/net/broadcast';
import {
  type TrysteroOptions,
  createTrysteroClient,
  createTrysteroHost,
} from '@schafkopf/net/trystero';
import { normalizeRoom, randomRoomId } from './roomCode';

export interface Connection {
  client: ClientSession;
  /** Nur gesetzt, wenn dieses Gerät den Tisch hostet. */
  host: HostSession | null;
  /** Tisch-Code für die Einladung; null bei einem rein lokalen Tisch. */
  roomId: string | null;
  close(): void;
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
const CLIENT_ID_KEY = 'schafkopf.clientId';

function clientId(): string {
  return remembered(
    () => sessionStorage,
    CLIENT_ID_KEY,
    () => crypto.randomUUID(),
  );
}

// ---------------------------------------------------------------------------
// Speicherstand des Gastgebers (N2)
//
// Der Host schreibt nach jeder Änderung seinen Zustand in den localStorage. Der
// Stand enthält alle Hände und verlässt das Gerät nie – er wird weder verschickt
// noch in die URL geschrieben. Lädt derselbe Tab neu (gleiche Kennung im
// sessionStorage), geht es ohne Rückfrage weiter: Die Gäste warten, und wer neu
// lädt, will weiterspielen. In einem anderen Tab oder nach einem Neustart des
// Browsers bietet die Startseite „Tisch fortsetzen“ an – dort könnte der Tisch
// längst vergessen sein. Ein Web Lock zeigt, ob ein anderer Tab den Tisch noch
// hostet; dann wird nichts fortgesetzt, sonst gäbe es zwei Hosts im selben Raum.
// ---------------------------------------------------------------------------

const SAVE_KEY = 'schafkopf.host';
/** Erhöhen, wenn sich die Hülle (`StoredTable`) ändert; der Inhalt hat eine eigene Version. */
const SAVE_VERSION = 1;
/** Ältere Stände gelten als vergessen und werden verworfen. */
const SAVE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const HOST_LOCK = 'schafkopf.host';

interface StoredTable {
  v: number;
  savedAt: number;
  /** `clientId` des Gastgebers – erkennt den eigenen Tab und den eigenen Platz. */
  owner: string;
  name: string;
  snapshot: HostSnapshot;
}

export interface SavedTable {
  snapshot: HostSnapshot;
  owner: string;
  name: string;
  savedAt: number;
  /** Derselbe Tab hat neu geladen. */
  sameTab: boolean;
}

function readStored(): StoredTable | null {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    return text ? (JSON.parse(text) as StoredTable) : null;
  } catch {
    return null;
  }
}

/** Liest und prüft den Speicherstand; Beschädigtes, Fremdes und Altes wird gelöscht. */
export function readSavedTable(now = Date.now()): SavedTable | null {
  let raw: unknown;
  try {
    const text = localStorage.getItem(SAVE_KEY);
    if (!text) return null;
    raw = JSON.parse(text);
  } catch {
    raw = null;
  }
  const saved = checkStored(raw, now);
  if (!saved) clearSavedTable();
  return saved;
}

function checkStored(raw: unknown, now: number): SavedTable | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { v, savedAt, owner, name, snapshot } = raw as Partial<Record<keyof StoredTable, unknown>>;
  if (v !== SAVE_VERSION || typeof owner !== 'string' || typeof name !== 'string') return null;
  if (typeof savedAt !== 'number' || savedAt > now || now - savedAt > SAVE_MAX_AGE_MS) return null;
  const parsed = parseHostSnapshot(snapshot);
  if (!parsed) return null;
  return { snapshot: parsed, owner, name, savedAt, sameTab: owner === clientId() };
}

/**
 * Wie `readSavedTable`, aber nur, wenn kein anderer Tab diesen Tisch gerade
 * hostet (Web Lock). Ohne Web Locks wird der Stand trotzdem angeboten.
 */
export async function findSavedTable(): Promise<SavedTable | null> {
  const saved = readSavedTable();
  if (!saved) return null;
  try {
    const state = await navigator.locks.query();
    if (state.held?.some((lock) => lock.name === HOST_LOCK)) return null;
  } catch {
    // keine Web Locks: anbieten
  }
  return saved;
}

export function clearSavedTable(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // nichts zu löschen
  }
}

/**
 * Speichert den Zustand des Hosts nach jeder Änderung. Hat inzwischen ein anderer
 * Tab einen eigenen Tisch eröffnet, hört dieser auf zu schreiben. Die Rückgabe
 * beendet das Speichern; mit `true` wird der Stand auch gelöscht („Tisch verlassen“).
 */
function keepSaved(host: HostSession, owner: string, name: string): (clear: boolean) => void {
  let active = true;
  const save = () => {
    if (!active) return;
    const current = readStored();
    if (current && current.owner !== owner && current.savedAt > startedAt) {
      active = false; // ein anderer Tab hostet jetzt; seinen Stand nicht überschreiben
      return;
    }
    const stored: StoredTable = {
      v: SAVE_VERSION,
      savedAt: Date.now(),
      owner,
      name,
      snapshot: host.exportSnapshot(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(stored));
    } catch {
      // Speicher voll oder gesperrt: dann übersteht der Tisch ein Neuladen nicht
    }
  };
  const startedAt = Date.now();
  const unsubscribe = host.subscribe(save);
  save();

  let releaseLock: (() => void) | null = null;
  try {
    void navigator.locks
      .request(HOST_LOCK, () => new Promise<void>((resolve) => (releaseLock = resolve)))
      .catch(() => {});
  } catch {
    // keine Web Locks
  }

  return (clear) => {
    active = false;
    unsubscribe();
    releaseLock?.();
    if (clear && readStored()?.owner === owner) clearSavedTable();
  };
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

/**
 * Einstellungen nur für die Ende-zu-Ende-Tests (I2): ein Transport ohne Relays
 * (`?transport=broadcast`), verkürzte Zeiten (`?botDelay=`, `?standIn=`, `?kontraWindow=`,
 * in ms) und feste Karten (`?seed=`).
 * Gibt es nur in einem Build mit `VITE_E2E=1`; sonst entfernt der Build den Zweig samt Transport.
 */
const E2E = import.meta.env.VITE_E2E === '1';
const E2E_PARAMS = E2E ? new URLSearchParams(window.location.search) : null;
const USE_BROADCAST = E2E && E2E_PARAMS?.get('transport') === 'broadcast';

function e2eNumber(key: string): number | undefined {
  const text = E2E_PARAMS?.get(key);
  const n = text === null || text === undefined || text === '' ? NaN : Number(text);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Fester Seed für das erste Spiel (`?seed=`), danach fortlaufend – für Szenarien mit festen Karten. */
function e2eSeed(): (() => number) | undefined {
  let next = e2eNumber('seed');
  if (next === undefined) return undefined;
  return () => next!++;
}

/** Zeitbudget je Entscheidung für „Stark“; zusammen mit dem Rest bleibt es unter 300 ms. */
const STRONG_BOT_BUDGET_MS = 200;

function hostOptions(): Omit<HostOptions, 'rules' | 'roomId'> {
  return {
    ...(E2E
      ? {
          botDelayMs: e2eNumber('botDelay'),
          standInDelayMs: e2eNumber('standIn'),
          kontraWindowMs: e2eNumber('kontraWindow'),
          seed: e2eSeed(),
        }
      : {}),
    // Stärke aus den Tischregeln (B2). Die Uhr begrenzt die Suche von „Stark“ auf langsamen
    // Geräten; ohne sie bliebe es beim festen Rechenbudget.
    createBot: (seat, rules) =>
      createBotOfStrength(
        rules.botStrength,
        crypto.getRandomValues(new Uint32Array(1))[0]! + seat,
        rules,
        { now: () => performance.now(), budgetMs: STRONG_BOT_BUDGET_MS },
      ),
  };
}

export function openTable(name: string, online: boolean): Connection {
  const roomId = online ? randomRoomId() : null;
  return hostConnection(new HostSession({ ...hostOptions(), roomId }), name);
}

/** Setzt einen gespeicherten Tisch fort – gleicher Raum-Code, gleiche Plätze. */
export function resumeTable(saved: SavedTable): Connection {
  // Aus einem anderen Tab fortgesetzt: dessen Kennung übernehmen, damit der
  // Gastgeber seinen eigenen Platz und seine Hand zurückbekommt.
  if (!saved.sameTab) {
    try {
      sessionStorage.setItem(CLIENT_ID_KEY, saved.owner);
    } catch {
      // ohne sessionStorage sitzt der Gastgeber eben als Zuschauer am Tisch
    }
  }
  return hostConnection(HostSession.restore(saved.snapshot, hostOptions()), saved.name);
}

function hostConnection(host: HostSession, name: string): Connection {
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  const { roomId } = host;
  if (roomId) {
    host.addTransport(
      USE_BROADCAST ? createBroadcastHost(roomId) : createTrysteroHost(roomId, signalingOptions()),
    );
  }
  const id = clientId();
  const stopSaving = keepSaved(host, id, name);
  const client = new ClientSession(pair.client, { name, clientId: id });
  return {
    client,
    host,
    roomId,
    close() {
      stopSaving(true);
      client.close();
      host.close();
    },
  };
}

export function joinTable(name: string, roomId: string): Connection {
  const transport = USE_BROADCAST
    ? createBroadcastClient(roomId)
    : createTrysteroClient(roomId, signalingOptions());
  const client = new ClientSession(transport, { name, clientId: clientId() });
  return { client, host: null, roomId, close: () => client.close() };
}

const HASH_PREFIX = '#tisch=';

/** Tisch-Code aus dem Einladungslink (roh, ungeprüft); null ohne Link. */
export function roomFromUrl(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const room = normalizeRoom(hash.slice(HASH_PREFIX.length));
  return room || null;
}

export function inviteLink(roomId: string): string {
  // Die Suche (`?weg=…` im Entwicklungsmodus) mitnehmen, damit Gäste denselben Weg nutzen.
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}${HASH_PREFIX}${roomId}`;
}
