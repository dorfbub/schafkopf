/**
 * Die Mitspieler-Seite: meldet sich beim Host an, schickt eigene Aktionen und
 * hält die zuletzt empfangene Sicht. Die Oberfläche hängt sich per
 * `subscribe`/`getSnapshot` an (passt direkt auf Reacts `useSyncExternalStore`).
 */

import type { BidCall, Card, PlayerAction, Seat, TableView } from '@schafkopf/core';
import {
  type ClientTransport,
  type HostErrorCode,
  type HostMessage,
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

export interface ClientSnapshot {
  status: ConnectionStatus;
  seat: Seat | null;
  view: TableView | null;
  lastError: HostErrorCode | null;
}

export interface ClientOptions {
  name: string;
  clientId: string;
  /** Wie lange ohne Begrüßung durch den Host, bis `failed` gilt. Standard 45 s; 0 = nie. */
  connectTimeoutMs?: number;
  /** Zeitgeber mit Abbruchfunktion; in Tests synchron ersetzbar. */
  setTimer?: (fn: () => void, ms: number) => () => void;
}

export const DEFAULT_CONNECT_TIMEOUT_MS = 45_000;

export class ClientSession {
  private snapshot: ClientSnapshot = {
    status: 'connecting',
    seat: null,
    view: null,
    lastError: null,
  };
  private readonly listeners = new Set<() => void>();
  private cancelTimeout: (() => void) | null = null;
  private closed = false;

  constructor(
    private readonly transport: ClientTransport,
    private readonly options: ClientOptions,
  ) {
    transport.onOpen = () => {
      transport.send({
        t: 'hello',
        v: PROTOCOL_VERSION,
        clientId: options.clientId,
        name: options.name,
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
        this.update({ view: message.view, seat: message.view.you });
        break;
      case 'error':
        this.update({ lastError: message.code });
        break;
    }
  }

  private update(patch: Partial<ClientSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
}
