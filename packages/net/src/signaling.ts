/**
 * Vermittlung (Signalisierung) für den WebRTC-Aufbau – alles, was ohne echtes
 * Netz auskommt und deshalb hier getestet werden kann: Wege und Relay-Listen,
 * Prüfen von Einstellungen aus Umgebungsvariablen und die `DiscoveryGate`, die
 * die Vermittlung ruhen lässt, solange niemand mehr dazukommen muss.
 */

/** Über welches öffentliche Netz sich Host und Gäste finden. */
export type SignalingStrategy = 'nostr' | 'torrent' | 'mqtt';

export const SIGNALING_STRATEGIES: readonly SignalingStrategy[] = ['nostr', 'torrent', 'mqtt'];

/** Standardweg; Begründung und Messwerte in `docs/ARCHITEKTUR.md` („Verbindungsaufbau“). */
export const DEFAULT_STRATEGY: SignalingStrategy = 'nostr';

/**
 * Geprüfte Relays je Weg (Stand November 2026). Kriterien: erreichbar, stellen
 * ephemere Events (Kind 20000–29999) zu, drosseln den Aufbau-Burst nicht,
 * kurze Laufzeit von Deutschland aus. Trysteros eigene Standardliste enthielt
 * tote (`nostr.robosats.org`) und drosselnde (`relay.layer.systems`) Relays.
 */
export const DEFAULT_RELAYS: Record<SignalingStrategy, readonly string[]> = {
  nostr: [
    'wss://nostr.chaima.info',
    'wss://relay.nostr.dev.br',
    'wss://relay.snort.social',
    'wss://relay.piazza.today',
  ],
  torrent: ['wss://tracker.webtorrent.dev', 'wss://tracker.openwebtorrent.com'],
  mqtt: ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'],
};

export function isSignalingStrategy(value: unknown): value is SignalingStrategy {
  return typeof value === 'string' && (SIGNALING_STRATEGIES as readonly string[]).includes(value);
}

/**
 * Liest eine Relay-Liste („wss://a, wss://b“ oder durch Leerzeichen getrennt).
 * Nur `wss://` ist erlaubt – die Seite läuft über https. Leere oder ungültige
 * Eingabe ergibt `null` (dann gilt die Standardliste).
 */
export function parseRelayUrls(text: string | undefined | null): string[] | null {
  if (!text) return null;
  const urls = text
    .split(/[\s,]+/)
    .map((u) => u.trim())
    .filter((u) => /^wss:\/\/[^\s/]+/.test(u));
  return urls.length > 0 ? [...new Set(urls)] : null;
}

/** Ein TURN-/STUN-Server im Format von `RTCIceServer`. */
export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * Liest TURN-Server aus JSON (Umgebungsvariable `VITE_TURN_CONFIG`). Ein
 * einzelnes Objekt oder eine Liste; ungültige Einträge werden verworfen.
 */
export function parseTurnConfig(json: string | undefined | null): IceServerConfig[] | null {
  if (!json || !json.trim()) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const list = Array.isArray(raw) ? raw : [raw];
  const servers = list.flatMap((entry): IceServerConfig[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { urls, username, credential } = entry as Record<string, unknown>;
    const urlList = (Array.isArray(urls) ? urls : [urls]).filter(
      (u): u is string => typeof u === 'string' && /^(turns?|stun):/i.test(u),
    );
    if (urlList.length === 0) return [];
    return [
      {
        urls: urlList.length === 1 ? urlList[0]! : urlList,
        ...(typeof username === 'string' ? { username } : {}),
        ...(typeof credential === 'string' ? { credential } : {}),
      },
    ];
  });
  return servers.length > 0 ? servers : null;
}

export interface DiscoveryGateOptions {
  /** Vermittlung anhalten (Relay-Verbindungen schließen). */
  pause: () => void;
  /** Vermittlung wieder aufnehmen. */
  resume: () => void;
  /**
   * Wartezeit, bevor wirklich pausiert wird: Laufende Aushandlungen (ICE)
   * sollen noch fertig werden, und kurzes Flattern löst nichts aus.
   */
  pauseDelayMs?: number;
  /** Zeitgeber, der eine Abbruchfunktion liefert; in Tests synchron ersetzbar. */
  setTimer?: (fn: () => void, ms: number) => () => void;
}

export const DEFAULT_PAUSE_DELAY_MS = 5000;

export const defaultSetTimer = (fn: () => void, ms: number): (() => void) => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};

/**
 * Entscheidet, wann die Vermittlung laufen muss. Öffentliche Relays drosseln
 * schon bei wenigen Nachrichten pro Minute; deshalb wird sie angehalten, sobald
 * niemand mehr dazukommen muss, und sofort fortgesetzt, wenn doch.
 *
 * Startzustand: Vermittlung läuft (`needed = true`).
 */
export class DiscoveryGate {
  private needed = true;
  private paused = false;
  private cancelPending: (() => void) | null = null;
  private readonly pauseDelayMs: number;
  private readonly setTimer: (fn: () => void, ms: number) => () => void;

  constructor(private readonly options: DiscoveryGateOptions) {
    this.pauseDelayMs = options.pauseDelayMs ?? DEFAULT_PAUSE_DELAY_MS;
    this.setTimer = options.setTimer ?? defaultSetTimer;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  setNeeded(needed: boolean): void {
    if (needed === this.needed) return;
    this.needed = needed;
    if (needed) {
      this.cancel();
      if (this.paused) {
        this.paused = false;
        this.options.resume();
      }
      return;
    }
    this.cancel();
    this.cancelPending = this.setTimer(() => {
      this.cancelPending = null;
      if (this.needed || this.paused) return;
      this.paused = true;
      this.options.pause();
    }, this.pauseDelayMs);
  }

  /** Beim Verlassen: nichts mehr planen; war pausiert, wieder freigeben. */
  dispose(): void {
    this.cancel();
    this.needed = true;
    if (this.paused) {
      this.paused = false;
      this.options.resume();
    }
  }

  private cancel(): void {
    this.cancelPending?.();
    this.cancelPending = null;
  }
}
