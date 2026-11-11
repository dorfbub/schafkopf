/**
 * Die Mitspieler-Seite: meldet sich beim Host an, schickt eigene Aktionen und
 * hält die zuletzt empfangene Sicht. Die Oberfläche hängt sich per
 * `subscribe`/`getSnapshot` an (passt direkt auf Reacts `useSyncExternalStore`).
 */

import type { BidCall, Card, PlayerAction, Seat, TableView } from '@schafkopf/core';
import {
  type AbsentSeat,
  type ClientTransport,
  type HostErrorCode,
  type HostMessage,
  type LobbyInfo,
  PROTOCOL_VERSION,
} from './protocol';
import { defaultSetTimer } from './signaling';

/**
 * - `connecting`: Tisch wird gesucht (erster Aufbau oder „Erneut versuchen“).
 * - `connected`: Der Host hat uns begrüßt.
 * - `disconnected`: Verbindung verloren, der Transport sucht den Host wieder.
 * - `failed`: Innerhalb der Zeitüberschreitung kein (erneuter) Kontakt; `retry()` hilft.
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'failed';

/** Ein getrennter Spieler aus Sicht dieses Geräts (siehe `AbsentSeat`). */
export interface AbsentSeatInfo {
  seat: Seat;
  /** Ein Bot vertritt den Spieler gerade. */
  standIn: boolean;
  /** Zeitpunkt nach der Uhr dieses Geräts, ab dem der Bot vertritt; null, wenn er es schon tut. */
  standInAt: number | null;
}

export interface ClientSnapshot {
  status: ConnectionStatus;
  seat: Seat | null;
  view: TableView | null;
  lastError: HostErrorCode | null;
  /** Zuschauer und Beitrittsregel; null bis zur ersten Sicht. */
  lobby: LobbyInfo | null;
  /** Der Name, den dieser Mitspieler gerade führt. */
  name: string;
  /** Getrennte Mitspieler im laufenden Spiel. */
  absent: AbsentSeatInfo[];
}

export interface ClientOptions {
  name: string;
  clientId: string;
  /** Wie lange ohne Begrüßung durch den Host, bis `failed` gilt. Standard 45 s; 0 = nie. */
  connectTimeoutMs?: number;
  /** Zeitgeber mit Abbruchfunktion; in Tests synchron ersetzbar. */
  setTimer?: (fn: () => void, ms: number) => () => void;
  /** Uhr, um Restzeiten des Hosts in Zeitpunkte umzurechnen. Standard: `Date.now`. */
  now?: () => number;
}

export const DEFAULT_CONNECT_TIMEOUT_MS = 45_000;

export class ClientSession {
  private snapshot: ClientSnapshot = {
    status: 'connecting',
    seat: null,
    view: null,
    lastError: null,
    lobby: null,
    name: '',
    absent: [],
  };
  private readonly listeners = new Set<() => void>();
  private cancelTimeout: (() => void) | null = null;
  private closed = false;

  constructor(
    private readonly transport: ClientTransport,
    private readonly options: ClientOptions,
  ) {
    this.snapshot.name = options.name;
    transport.onOpen = () => {
      transport.send({
        t: 'hello',
        v: PROTOCOL_VERSION,
        clientId: options.clientId,
        name: this.snapshot.name,
      });
    };
    transport.onMessage = (message) => this.handle(message);
    transport.onClose = () => {
      if (this.closed) return;
      this.update({ status: 'disconnected' });
      this.startTimeout();
    };
    this.startTimeout();
    transport.connect();
  }

  /** Nach `failed` (oder jederzeit): Verbindung abbauen und neu suchen. */
  retry(): void {
    if (this.closed) return;
    this.transport.close();
    this.update({ status: 'connecting', lastError: null });
    this.startTimeout();
    this.transport.connect();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ClientSnapshot => this.snapshot;

  bid(call: BidCall): void {
    this.act({ type: 'bid', call });
  }

  play(card: Card): void {
    this.act({ type: 'play', card });
  }

  /** Freien Platz wählen oder wechseln; `null` = nur zuschauen. Nur in der Lobby. */
  takeSeat(seat: Seat | null): void {
    this.update({ lastError: null });
    this.transport.send({ t: 'seat', seat });
  }

  /** Eigenen Namen ändern (gilt auch nach einem Wiederverbinden). */
  rename(name: string): void {
    this.update({ name, lastError: null });
    this.transport.send({ t: 'rename', name });
  }

  act(action: PlayerAction): void {
    this.update({ lastError: null });
    this.transport.send({ t: 'action', action });
  }

  close(): void {
    this.closed = true;
    this.stopTimeout();
    this.transport.close();
    this.listeners.clear();
  }

  private startTimeout(): void {
    this.stopTimeout();
    const ms = this.options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    if (ms <= 0) return;
    const setTimer = this.options.setTimer ?? defaultSetTimer;
    this.cancelTimeout = setTimer(() => {
      this.cancelTimeout = null;
      if (this.closed || this.snapshot.status === 'connected') return;
      this.update({ status: 'failed' });
    }, ms);
  }

  private stopTimeout(): void {
    this.cancelTimeout?.();
    this.cancelTimeout = null;
  }

  private handle(message: HostMessage): void {
    switch (message.t) {
      case 'welcome':
        this.stopTimeout();
        this.update({ status: 'connected', seat: message.seat });
        break;
      case 'state':
        this.update({
          view: message.view,
          seat: message.view.you,
          lobby: message.lobby,
          absent: this.readAbsent(message.absent),
        });
        break;
      case 'error':
        this.update({ lastError: message.code });
        break;
    }
  }

  private readAbsent(absent: unknown): AbsentSeatInfo[] {
    if (!Array.isArray(absent)) return [];
    const now = (this.options.now ?? Date.now)();
    return absent.map((a: AbsentSeat) => ({
      seat: a.seat,
      standIn: a.standIn,
      standInAt: a.standInInMs === null ? null : now + a.standInInMs,
    }));
  }

  private update(patch: Partial<ClientSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
}
