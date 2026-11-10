/**
 * Die Mitspieler-Seite: meldet sich beim Host an, schickt eigene Aktionen und
 * hält die zuletzt empfangene Sicht. Die Oberfläche hängt sich per
 * `subscribe`/`getSnapshot` an (passt direkt auf Reacts `useSyncExternalStore`).
 */

import type { Card, Contract, PlayerAction, Seat, TableView } from '@schafkopf/core';
import {
  type ClientTransport,
  type HostErrorCode,
  type HostMessage,
  PROTOCOL_VERSION,
} from './protocol';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface ClientSnapshot {
  status: ConnectionStatus;
  seat: Seat | null;
  view: TableView | null;
  lastError: HostErrorCode | null;
}

export interface ClientOptions {
  name: string;
  clientId: string;
}

export class ClientSession {
  private snapshot: ClientSnapshot = {
    status: 'connecting',
    seat: null,
    view: null,
    lastError: null,
  };
  private readonly listeners = new Set<() => void>();

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
    transport.onClose = () => this.update({ status: 'disconnected' });
    transport.connect();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ClientSnapshot => this.snapshot;

  bid(contract: Contract | null): void {
    this.act({ type: 'bid', contract });
  }

  play(card: Card): void {
    this.act({ type: 'play', card });
  }

  act(action: PlayerAction): void {
    this.update({ lastError: null });
    this.transport.send({ t: 'action', action });
  }

  close(): void {
    this.transport.close();
    this.listeners.clear();
  }

  private handle(message: HostMessage): void {
    switch (message.t) {
      case 'welcome':
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
