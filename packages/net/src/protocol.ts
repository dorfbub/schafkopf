/**
 * Nachrichten zwischen Host und Mitspielern. Alles ist schlichtes JSON.
 * Bei inkompatiblen Änderungen `PROTOCOL_VERSION` erhöhen.
 */

import type { PlayerAction, Seat, TableView } from '@schafkopf/core';

export const PROTOCOL_VERSION = 2;

export type ClientMessage =
  | {
      t: 'hello';
      v: number;
      /** Bleibt über Verbindungsabbrüche gleich; darüber findet man seinen Sitz wieder. */
      clientId: string;
      name: string;
    }
  | { t: 'action'; action: PlayerAction };

export type HostErrorCode =
  | 'version_mismatch'
  | 'not_seated'
  | 'bad_message'
  | 'wrong_phase'
  | 'not_your_turn'
  | 'illegal_bid'
  | 'illegal_card'
  | 'no_hand';

export type HostMessage =
  | { t: 'welcome'; v: number; seat: Seat | null }
  | { t: 'state'; view: TableView }
  | { t: 'error'; code: HostErrorCode };

/**
 * Transport aus Sicht des Hosts: viele Gegenstellen, jede mit einer `peerId`.
 * Implementierungen: `createLoopbackPair` (im selben Prozess) und Trystero/WebRTC.
 */
export interface HostTransport {
  onMessage: ((peerId: string, message: ClientMessage) => void) | null;
  onLeave: ((peerId: string) => void) | null;
  /** Beginnt, Verbindungen anzunehmen. Erst aufrufen, wenn die Handler gesetzt sind. */
  listen(): void;
  send(peerId: string, message: HostMessage): void;
  close(): void;
  /**
   * Optional: Ob neue Gegenstellen den Host noch finden müssen. Der Host meldet
   * `false`, sobald alle Plätze verbunden sind, und `true`, sobald ein Platz frei
   * wird oder ein Spieler die Verbindung verliert. WebRTC-Transporte lassen dann
   * die Vermittlung über öffentliche Relays ruhen.
   */
  setDiscoverable?(discoverable: boolean): void;
}

/** Transport aus Sicht eines Mitspielers: genau eine Gegenstelle, der Host. */
export interface ClientTransport {
  /** Verbindung zum Host steht (auch nach einem Wiederverbinden). */
  onOpen: (() => void) | null;
  onMessage: ((message: HostMessage) => void) | null;
  onClose: (() => void) | null;
  /** Beginnt den Verbindungsaufbau. Erst aufrufen, wenn die Handler gesetzt sind. */
  connect(): void;
  send(message: ClientMessage): void;
  close(): void;
}
