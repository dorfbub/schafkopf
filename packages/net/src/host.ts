/**
 * Der Host: hält als einziger den vollständigen Tischzustand, prüft jede Aktion
 * mit dem Kern und schickt jedem Mitspieler nur dessen Sicht. Läuft im Browser
 * des Spielers, der den Tisch eröffnet – es gibt keinen Server.
 */

import {
  type Bot,
  type PlayerAction,
  type RuleSet,
  type Seat,
  type TableState,
  applyTableAction,
  createTable,
  handViewFor,
  isCard,
  startHand,
  tableViewFor,
} from '@schafkopf/core';
import {
  type ClientMessage,
  type HostErrorCode,
  type HostMessage,
  type HostTransport,
  PROTOCOL_VERSION,
} from './protocol';
import { HOST_SNAPSHOT_VERSION, type HostSnapshot } from './snapshot';

export interface HostOptions {
  rules?: RuleSet;
  /** Erzeugt den Bot für einen freien Platz. */
  createBot: (seat: Seat) => Bot;
  botNames?: string[];
  /** Bedenkzeit der Bots in Millisekunden. */
  botDelayMs?: number;
  /** Quelle für den Misch-Seed. Standard: Web Crypto. */
  seed?: () => number;
  /** Zeitsteuerung; in Tests durch eine synchrone Variante ersetzbar. */
  schedule?: (fn: () => void, ms: number) => void;
  /** Raum-Code; wird nur in den Speicherstand übernommen (`exportSnapshot`). */
  roomId?: string | null;
}

interface Peer {
  send: (message: HostMessage) => void;
  clientId: string | null;
  seat: Seat | null;
}

const DEFAULT_BOT_NAMES = ['Sepp', 'Resi', 'Xaver', 'Vroni'];

function cryptoSeed(): number {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0]!;
}

export class HostSession {
  private table: TableState;
  private readonly peers = new Map<string, Peer>();
  private readonly seatByClient = new Map<string, Seat>();
  private readonly bots = new Map<Seat, Bot>();
  private readonly transports: HostTransport[] = [];
  private readonly listeners = new Set<() => void>();
  private botPending = false;
  private closed = false;
  private discoverable = true;

  private readonly createBot: (seat: Seat) => Bot;
  private readonly botNames: string[];
  private readonly botDelayMs: number;
  private readonly seed: () => number;
  private readonly schedule: (fn: () => void, ms: number) => void;
  readonly roomId: string | null;

  constructor(options: HostOptions) {
    this.table = createTable(options.rules);
    this.roomId = options.roomId ?? null;
    this.createBot = options.createBot;
    this.botNames = options.botNames ?? DEFAULT_BOT_NAMES;
    this.botDelayMs = options.botDelayMs ?? 800;
    this.seed = options.seed ?? cryptoSeed;
    this.schedule = options.schedule ?? ((fn, ms) => void setTimeout(fn, ms));
  }

  /**
   * Setzt einen Tisch aus einem Speicherstand fort (vorher mit
   * `parseHostSnapshot` prüfen). Alle Menschen gelten als getrennt, bis sie sich
   * mit ihrer alten `clientId` wieder melden; die Bots werden neu erzeugt.
   */
  static restore(
    snapshot: HostSnapshot,
    options: Omit<HostOptions, 'rules' | 'roomId'>,
  ): HostSession {
    const host = new HostSession({
      ...options,
      rules: snapshot.table.rules,
      roomId: snapshot.roomId,
    });
    const seats = snapshot.table.seats.map((s) =>
      s?.kind === 'human' ? { ...s, connected: false } : s,
    );
    host.table = { ...snapshot.table, seats };
    for (const [clientId, seat] of snapshot.seatByClient) host.seatByClient.set(clientId, seat);
    for (const seat of snapshot.botSeats) host.bots.set(seat, host.createBot(seat));
    host.updateDiscovery();
    host.driveBots();
    return host;
  }

  /**
   * Speicherstand für ein späteres `restore`. Enthält alle Hände – darf das
   * Gerät des Gastgebers nie verlassen.
   */
  exportSnapshot(): HostSnapshot {
    return {
      v: HOST_SNAPSHOT_VERSION,
      roomId: this.roomId,
      table: this.table,
      seatByClient: [...this.seatByClient],
      botSeats: [...this.bots.keys()],
    };
  }

  /** Voller Zustand – nur für den Host selbst (Tests, Debugging), nie versenden. */
  getTable(): TableState {
    return this.table;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addTransport(transport: HostTransport): void {
    const index = this.transports.push(transport) - 1;
    const key = (peerId: string) => `${index}:${peerId}`;
    transport.onMessage = (peerId, message) =>
      this.handleMessage(key(peerId), (m) => transport.send(peerId, m), message);
    transport.onLeave = (peerId) => this.handleLeave(key(peerId));
    transport.listen();
    if (!this.discoverable) transport.setDiscoverable?.(false);
  }

  /**
   * Muss noch jemand den Tisch finden können? Vor dem ersten Spiel, solange ein
   * Platz frei ist; danach nur, wenn ein Mensch die Verbindung verloren hat
   * (auch nach `restore`, wenn die Gäste den Tisch wiederfinden müssen).
   */
  isDiscoverable(): boolean {
    const { seats, hand } = this.table;
    const waiting = seats.some((s) => s?.kind === 'human' && !s.connected);
    return waiting || (!hand && seats.some((s) => s === null));
  }

  /** Startet das erste Spiel; freie Plätze werden mit Bots besetzt. */
  start(): boolean {
    if (this.table.hand) return false;
    const seats = this.table.seats.map((player, seat) => {
      if (player) return player;
      this.bots.set(seat, this.createBot(seat));
      const name = this.botNames[seat % this.botNames.length] ?? `Bot ${seat + 1}`;
      return { name: `${name} (Bot)`, kind: 'bot' as const, connected: true };
    });
    this.table = { ...this.table, seats };
    return this.deal();
  }

  /** Gibt das nächste Spiel, sobald das laufende abgerechnet ist. */
  nextHand(): boolean {
    if (!this.table.hand || this.table.hand.phase !== 'finished') return false;
    return this.deal();
  }

  close(): void {
    this.closed = true;
    for (const transport of this.transports) transport.close();
    this.peers.clear();
    this.listeners.clear();
  }

  private deal(): boolean {
    const result = startHand(this.table, this.seed());
    if (!result.ok) return false;
    this.table = result.table;
    this.changed();
    return true;
  }

  private handleMessage(
    peerKey: string,
    send: (message: HostMessage) => void,
    message: ClientMessage,
  ): void {
    if (this.closed) return;
    let peer = this.peers.get(peerKey);
    if (!peer) {
      peer = { send, clientId: null, seat: null };
      this.peers.set(peerKey, peer);
    }
    // Nachrichten kommen aus dem Netz: nichts ungeprüft übernehmen.
    if (typeof message !== 'object' || message === null) return this.reject(peer, 'bad_message');
    if (message.t === 'hello') return this.handleHello(peer, message);
    if (message.t === 'action') return this.handleAction(peer, message.action);
    this.reject(peer, 'bad_message');
  }

  private handleHello(peer: Peer, message: Extract<ClientMessage, { t: 'hello' }>): void {
    if (message.v !== PROTOCOL_VERSION) return this.reject(peer, 'version_mismatch');
    if (typeof message.clientId !== 'string' || typeof message.name !== 'string') {
      return this.reject(peer, 'bad_message');
    }
    const name = message.name.trim().slice(0, 24) || 'Gast';
    peer.clientId = message.clientId;

    let seat = this.seatByClient.get(message.clientId) ?? null;
    if (seat === null && !this.table.hand) {
      const free = this.table.seats.findIndex((s) => s === null);
      if (free >= 0) {
        seat = free;
        this.seatByClient.set(message.clientId, seat);
      }
    }
    peer.seat = seat;
    if (seat !== null) {
      const seats = [...this.table.seats];
      seats[seat] = { name, kind: 'human', connected: true };
      this.table = { ...this.table, seats };
    }
    peer.send({ t: 'welcome', v: PROTOCOL_VERSION, seat });
    this.changed();
  }

  private handleAction(peer: Peer, action: PlayerAction): void {
    if (peer.seat === null) return this.reject(peer, 'not_seated');
    if (!isWellFormed(action)) return this.reject(peer, 'bad_message');
    const error = this.apply(peer.seat, action);
    if (error) this.reject(peer, error);
  }

  private handleLeave(peerKey: string): void {
    const peer = this.peers.get(peerKey);
    if (!peer) return;
    this.peers.delete(peerKey);
    const seat = peer.seat;
    if (seat === null) return;
    // Hat sich derselbe Spieler inzwischen neu verbunden, bleibt der Platz besetzt.
    if ([...this.peers.values()].some((p) => p.seat === seat)) return;

    const seats = [...this.table.seats];
    if (this.table.hand) {
      // Im laufenden Spiel bleibt der Platz reserviert, bis der Spieler zurückkommt.
      const player = seats[seat];
      if (player) seats[seat] = { ...player, connected: false };
    } else {
      seats[seat] = null;
      if (peer.clientId) this.seatByClient.delete(peer.clientId);
    }
    this.table = { ...this.table, seats };
    this.changed();
  }

  private apply(seat: Seat, action: PlayerAction): HostErrorCode | null {
    const result = applyTableAction(this.table, { ...action, seat });
    if (!result.ok)
      return result.error === 'seats_open' || result.error === 'hand_running'
        ? 'bad_message'
        : result.error;
    this.table = result.table;
    this.changed();
    return null;
  }

  private reject(peer: Peer, code: HostErrorCode): void {
    peer.send({ t: 'error', code });
  }

  /** Nach jeder Zustandsänderung: Sichten verteilen, Beobachter wecken, Bots anstoßen. */
  private changed(): void {
    for (const peer of this.peers.values()) {
      if (peer.clientId === null) continue;
      peer.send({ t: 'state', view: tableViewFor(this.table, peer.seat) });
    }
    for (const listener of this.listeners) listener();
    this.updateDiscovery();
    this.driveBots();
  }

  private updateDiscovery(): void {
    const discoverable = this.isDiscoverable();
    if (discoverable === this.discoverable) return;
    this.discoverable = discoverable;
    for (const transport of this.transports) transport.setDiscoverable?.(discoverable);
  }

  private driveBots(): void {
    if (this.botPending || this.closed) return;
    const hand = this.table.hand;
    if (!hand || hand.phase === 'finished') return;
    const seat = hand.turn;
    const bot = this.bots.get(seat);
    if (!bot) return;

    this.botPending = true;
    this.schedule(() => {
      this.botPending = false;
      const current = this.table.hand;
      if (this.closed || !current || current.phase === 'finished' || current.turn !== seat) {
        return this.driveBots();
      }
      const view = handViewFor(current, seat);
      let error: HostErrorCode | null;
      try {
        error = this.apply(seat, bot.decide(view));
      } catch {
        error = 'bad_message';
      }
      if (error) {
        // Ein fehlerhafter Bot darf den Tisch nicht blockieren: irgendetwas Erlaubtes tun.
        const fallback: PlayerAction =
          current.phase === 'bidding'
            ? { type: 'bid', contract: null }
            : { type: 'play', card: view.legalCards[0]! };
        this.apply(seat, fallback);
      }
    }, this.botDelayMs);
  }
}

function isWellFormed(action: unknown): action is PlayerAction {
  if (typeof action !== 'object' || action === null) return false;
  const a = action as { type?: unknown; card?: unknown; contract?: unknown };
  if (a.type === 'play') return isCard(a.card);
  if (a.type === 'bid') {
    if (a.contract === null) return true;
    return (
      typeof a.contract === 'object' && typeof (a.contract as { kind?: unknown }).kind === 'string'
    );
  }
  return false;
}
