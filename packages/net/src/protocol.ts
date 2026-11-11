/**
 * Nachrichten zwischen Host und Mitspielern. Alles ist schlichtes JSON.
 * Bei inkompatiblen Änderungen `PROTOCOL_VERSION` erhöhen.
 */

import type { PlayerAction, Seat, TableView } from '@schafkopf/core';

/** 4: ausgefallene Mitspieler (N3): `absent` in der `state`-Nachricht. */
/** 5: Spielprotokoll (K7): `TableView.history` mit Zusammenfassungen fertiger Spiele. */
/**
 * 6: Umbau für Sonderspiele (K3a): `HandResult` in Stufen (`outcome`, `factors`, `potDelta`),
 * `TableView.pot`.
 */
/** 7: Ramsch (K3b): Spielart `ramsch` ohne Ansager, `RamschDetails`, `RuleSet.allPassed`/`ramsch`. */
/** 8: Stock (K3c): `tariff.stock`, `allPassed: 'stock'`, Pott in `TableView.pot` gefüllt. */
/** 9: Muss (K3d): `Auction.forced` in der Sicht, `allPassed: 'muss'`. */
/** 10: Kontra und Re (K4): Aktion `double`, `HandView.doubling`/`canDouble`, `RuleSet.kontra`. */
/** 11: Spielverlauf: `HandView.tricks` mit allen Stichen, erst nach Spielende. */
export const PROTOCOL_VERSION = 11;

export type ClientMessage =
  | {
      t: 'hello';
      v: number;
      /** Bleibt über Verbindungsabbrüche gleich; darüber findet man seinen Sitz wieder. */
      clientId: string;
      name: string;
    }
  | { t: 'action'; action: PlayerAction }
  /** Platz wählen oder tauschen (nur in der Lobby, nur ein freier Platz); `null` = zuschauen. */
  | { t: 'seat'; seat: Seat | null }
  /** Eigenen Namen ändern. */
  | { t: 'rename'; name: string };

export type HostErrorCode =
  | 'version_mismatch'
  | 'not_seated'
  | 'bad_message'
  | 'wrong_phase'
  | 'not_your_turn'
  | 'illegal_bid'
  | 'illegal_card'
  | 'illegal_double'
  | 'no_hand'
  | 'seat_taken';

/** Was die Lobby über die Sicht hinaus braucht: Zuschauer und Beitrittsregel. */
export interface LobbyInfo {
  /** Namen der verbundenen Zuschauer. */
  watchers: string[];
  /** Der Gastgeber lässt den Tisch für Zuschauer offen (Vermittlung ruht nie). */
  spectatorsWelcome: boolean;
}

/**
 * Ein Platz, dessen Spieler im laufenden Spiel die Verbindung verloren hat. Der
 * Platz bleibt ihm; nach einer Frist (oder auf Wunsch des Gastgebers sofort)
 * zieht ein Bot für ihn, bis er zurück ist.
 */
export interface AbsentSeat {
  seat: Seat;
  /** Ein Bot vertritt den Spieler gerade. */
  standIn: boolean;
  /**
   * Restzeit bis zur Vertretung in Millisekunden, gemessen beim Absenden;
   * `null`, wenn der Bot schon vertritt. Eine Restzeit statt eines Zeitpunkts,
   * weil die Uhren der Geräte nicht übereinstimmen.
   */
  standInInMs: number | null;
}

export type HostMessage =
  | { t: 'welcome'; v: number; seat: Seat | null }
  | { t: 'state'; view: TableView; lobby: LobbyInfo; absent: AbsentSeat[] }
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
