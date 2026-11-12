/**
 * Der Host: hält als einziger den vollständigen Tischzustand, prüft jede Aktion
 * mit dem Kern und schickt jedem Mitspieler nur dessen Sicht. Läuft im Browser
 * des Spielers, der den Tisch eröffnet – es gibt keinen Server.
 */

import {
  parseRuleOptions,
  withRuleOptions,
  type Bot,
  type PlayerAction,
  type PlayerInfo,
  type RuleSet,
  type Seat,
  type TableState,
  applyTableAction,
  canDouble,
  createTable,
  handViewFor,
  isCard,
  startHand,
  tableViewFor,
  type Seed,
  type SeedInput,
} from '@schafkopf/core';
import {
  type AbsentSeat,
  type ClientMessage,
  type HostErrorCode,
  type HostMessage,
  type HostTransport,
  type LobbyInfo,
  PROTOCOL_VERSION,
} from './protocol';
import { HOST_SNAPSHOT_VERSION, type HostSnapshot } from './snapshot';

export interface HostOptions {
  rules?: RuleSet;
  /**
   * Erzeugt den Bot für einen freien Platz bzw. eine Vertretung. `rules` sind die Tischregeln
   * beim Erzeugen; daraus kommt die Spielstärke (`rules.botStrength`, B2).
   */
  createBot: (seat: Seat, rules: RuleSet) => Bot;
  botNames?: string[];
  /** Bedenkzeit der Bots in Millisekunden. */
  botDelayMs?: number;
  /** Quelle für den Misch-Seed. Standard: Web Crypto. */
  seed?: () => SeedInput;
  /** Zeitsteuerung; in Tests durch eine synchrone Variante ersetzbar. */
  schedule?: (fn: () => void, ms: number) => void;
  /** Raum-Code; wird nur in den Speicherstand übernommen (`exportSnapshot`). */
  roomId?: string | null;
  /**
   * Frist in Millisekunden, nach der ein Bot für einen getrennten Spieler zieht.
   * Standard 30 s.
   */
  standInDelayMs?: number;
  /** Uhr für die Restzeit bis zur Vertretung; in Tests ersetzbar. Standard: `Date.now`. */
  now?: () => number;
  /**
   * Kontra-Fenster (K4) in Millisekunden: So lange wartet ein Bot mindestens mit der ersten
   * Karte, solange ein Mensch noch Kontra oder Re sagen darf. Standard 3 s.
   */
  kontraWindowMs?: number;
  /**
   * `clientId` des Gastgebers, der über die Loopback-Verbindung selbst mitspielt. Er muss nie
   * zugelassen werden (N6), und sein Name steht in der Wartenachricht an neue Gäste.
   */
  owner?: string;
}

/** Eine offene Beitrittsanfrage (N6), wie der Gastgeber sie sieht. */
export interface JoinRequest {
  /** Kennung der Anfrage – nicht die `clientId`, die bleibt beim Host. */
  id: number;
  name: string;
}

export const DEFAULT_KONTRA_WINDOW_MS = 3_000;

export const DEFAULT_STAND_IN_DELAY_MS = 30_000;

/** Ein getrennter Spieler im laufenden Spiel (siehe `AbsentSeat`). */
interface Absence {
  /** Zeitpunkt (Host-Uhr), ab dem der Bot vertritt. */
  deadline: number;
  /** Unterscheidet Fristen: ein alter Zeitgeber nach Rückkehr und erneutem Trennen zählt nicht. */
  token: number;
  /** Der vertretende Bot; null, solange die Frist läuft. */
  standIn: Bot | null;
}

/** Höchstlänge eines Namens. */
const MAX_NAME_LENGTH = 24;

function cleanName(name: string): string {
  return name.trim().slice(0, MAX_NAME_LENGTH);
}

/**
 * - `new`: noch kein gültiges `hello`.
 * - `waiting`: Beitritt angefragt, der Gastgeber hat noch nicht zugestimmt (N6).
 * - `in`: am Tisch (spielt oder schaut zu), bekommt Sichten.
 * - `rejected`: vom Gastgeber abgewiesen.
 */
type PeerState = 'new' | 'waiting' | 'in' | 'rejected';

interface Peer {
  send: (message: HostMessage) => void;
  state: PeerState;
  clientId: string | null;
  seat: Seat | null;
  name: string;
}

/** Der vierte Name kommt nur vor, wenn kein Mensch am Tisch sitzt (vier Bots). */
const DEFAULT_BOT_NAMES = ['Saller Wolfe', 'Lengschwendtner Sepp', 'Ziegler Fritz', 'Weber Max'];

/** 128 Bit aus Web Crypto, siehe docs/ARCHITEKTUR.md „Mischen“. */
function cryptoSeed(): Seed {
  const w = globalThis.crypto.getRandomValues(new Uint32Array(4));
  return [w[0]!, w[1]!, w[2]!, w[3]!];
}

export class HostSession {
  private table: TableState;
  private readonly peers = new Map<string, Peer>();
  private readonly seatByClient = new Map<string, Seat>();
  private readonly bots = new Map<Seat, Bot>();
  /** Plätze, deren Spieler im laufenden Spiel getrennt ist. */
  private readonly absences = new Map<Seat, Absence>();
  private absenceToken = 0;
  private readonly transports: HostTransport[] = [];
  private readonly listeners = new Set<() => void>();
  /** Geplanter Bot-Zug: Kennung und Kontra/Re beim Planen (ändert es sich, wird neu geplant). */
  private botPending: { token: number; kontra: Seat | null; re: Seat | null } | null = null;
  private botToken = 0;
  private closed = false;
  private discoverable = true;
  /** Wer ausdrücklich zuschauen will: bekommt beim Beitritt keinen Platz zugeteilt. */
  private watching = new Set<string>();
  private spectatorsWelcome = false;
  /** Neue Mitspieler bestätigen (N6). */
  private requireApproval = false;
  /** `clientId`s, die schon einmal am Tisch waren: kommen ohne Rückfrage zurück. */
  private known = new Set<string>();
  /** Abgewiesene `clientId`s; nur bis zum Neuladen des Gastgebers. */
  private readonly rejected = new Set<string>();
  /** Offene Anfragen: `clientId` → Kennung der Anfrage. */
  private readonly requestIds = new Map<string, number>();
  private requestCounter = 0;
  /** Zuletzt gemeldete Anfragen; gleiche Referenz, solange sich nichts ändert. */
  private requests: JoinRequest[] = [];
  private readonly owner: string | null;

  private readonly makeBot: (seat: Seat, rules: RuleSet) => Bot;
  private readonly botNames: string[];
  private readonly botDelayMs: number;
  private readonly seed: () => SeedInput;
  private readonly schedule: (fn: () => void, ms: number) => void;
  private readonly standInDelayMs: number;
  private readonly now: () => number;
  private readonly kontraWindowMs: number;
  readonly roomId: string | null;

  constructor(options: HostOptions) {
    this.table = createTable(options.rules);
    this.roomId = options.roomId ?? null;
    this.makeBot = options.createBot;
    this.botNames = options.botNames ?? DEFAULT_BOT_NAMES;
    this.botDelayMs = options.botDelayMs ?? 800;
    this.seed = options.seed ?? cryptoSeed;
    this.schedule = options.schedule ?? ((fn, ms) => void setTimeout(fn, ms));
    this.standInDelayMs = options.standInDelayMs ?? DEFAULT_STAND_IN_DELAY_MS;
    this.now = options.now ?? Date.now;
    this.kontraWindowMs = options.kontraWindowMs ?? DEFAULT_KONTRA_WINDOW_MS;
    this.owner = options.owner ?? null;
  }

  /**
   * Setzt einen Tisch aus einem Speicherstand fort (vorher mit
   * `parseHostSnapshot` prüfen). Alle Menschen gelten als getrennt, bis sie sich
   * mit ihrer alten `clientId` wieder melden; die Bots werden neu erzeugt.
   * Läuft ein Spiel, beginnt für jeden die Frist bis zur Vertretung von vorn –
   * auch für Plätze, die vor dem Neuladen schon ein Bot vertreten hat.
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
    host.watching = new Set(snapshot.watching);
    host.spectatorsWelcome = snapshot.spectatorsWelcome;
    host.requireApproval = snapshot.requireApproval;
    host.known = new Set([...snapshot.known, ...host.seatByClient.keys(), ...host.watching]);
    if (host.table.hand) {
      host.table.seats.forEach((s, seat) => {
        if (s?.kind === 'human') host.markAbsent(seat);
      });
    }
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
      watching: [...this.watching],
      spectatorsWelcome: this.spectatorsWelcome,
      requireApproval: this.requireApproval,
      known: [...this.known],
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
   * Lässt der Gastgeber den Tisch für Zuschauer offen (`setSpectatorsWelcome`),
   * bleibt die Vermittlung immer an.
   */
  isDiscoverable(): boolean {
    const { seats, hand } = this.table;
    const waiting = seats.some((s) => s?.kind === 'human' && !s.connected);
    return this.spectatorsWelcome || waiting || (!hand && seats.some((s) => s === null));
  }

  /** Bleibt der Tisch für Zuschauer offen? Standard: nein. */
  isSpectatorsWelcome(): boolean {
    return this.spectatorsWelcome;
  }

  /**
   * Hält die Vermittlung offen, damit auch bei vollem Tisch (oder laufendem Spiel)
   * noch jemand als Zuschauer dazukommen kann. Kostet Relay-Nachrichten, daher
   * nur auf Wunsch des Gastgebers.
   */
  setSpectatorsWelcome(welcome: boolean): void {
    if (this.spectatorsWelcome === welcome) return;
    this.spectatorsWelcome = welcome;
    this.changed();
  }

  /** Lässt der Gastgeber Unbekannte erst nach einer Zusage an den Tisch? Standard: nein. */
  isApprovalRequired(): boolean {
    return this.requireApproval;
  }

  /**
   * Gastgeber-Befehl: Neue Mitspieler bestätigen (N6). Wer schon einmal am Tisch war, kommt
   * weiter ohne Rückfrage zurück. Ausschalten lässt alle offenen Anfragen herein.
   */
  setRequireApproval(on: boolean): void {
    if (typeof on !== 'boolean' || this.requireApproval === on) return;
    this.requireApproval = on;
    if (!on) for (const clientId of [...this.requestIds.keys()]) this.admitClient(clientId);
    this.changed();
  }

  /** Offene Beitrittsanfragen in der Reihenfolge ihres Eingangs (für die Anzeige beim Gastgeber). */
  getJoinRequests = (): JoinRequest[] => this.requests;

  /** Gastgeber-Befehl: lässt die Anfrage `id` zu. `false`, wenn es sie nicht (mehr) gibt. */
  admitJoin(id: number): boolean {
    const clientId = this.clientOfRequest(id);
    if (clientId === null) return false;
    this.admitClient(clientId);
    this.changed();
    return true;
  }

  /**
   * Gastgeber-Befehl: weist die Anfrage `id` ab. Der Gast erfährt es und kommt mit derselben
   * `clientId` nicht wieder in die Warteschlange, bis der Gastgeber neu lädt.
   */
  rejectJoin(id: number): boolean {
    const clientId = this.clientOfRequest(id);
    if (clientId === null) return false;
    this.requestIds.delete(clientId);
    this.rejected.add(clientId);
    for (const peer of this.peers.values()) {
      if (peer.clientId !== clientId || peer.state !== 'waiting') continue;
      peer.state = 'rejected';
      peer.send({ t: 'rejected' });
    }
    this.changed();
    return true;
  }

  private clientOfRequest(id: unknown): string | null {
    for (const [clientId, requestId] of this.requestIds) if (requestId === id) return clientId;
    return null;
  }

  /** Lässt alle wartenden Verbindungen dieser `clientId` an den Tisch (ohne `changed`). */
  private admitClient(clientId: string): void {
    this.requestIds.delete(clientId);
    this.known.add(clientId);
    for (const peer of this.peers.values()) {
      if (peer.clientId === clientId && peer.state === 'waiting') this.seatPeer(peer, peer.name);
    }
  }

  /** Name des Gastgebers für die Wartenachricht; leer, wenn er gerade nicht da ist. */
  private ownerName(): string {
    if (this.owner === null) return '';
    const seat = this.seatByClient.get(this.owner);
    const player = seat === undefined ? null : this.table.seats[seat];
    if (player) return player.name;
    for (const peer of this.peers.values()) {
      if (peer.clientId === this.owner && peer.state === 'in') return peer.name;
    }
    return '';
  }

  /** Baut die Liste der Anfragen neu; die Referenz bleibt, solange sich nichts ändert. */
  private refreshRequests(): void {
    const names = new Map<string, string>();
    for (const peer of this.peers.values()) {
      if (peer.state === 'waiting' && peer.clientId !== null) names.set(peer.clientId, peer.name);
    }
    const next = [...this.requestIds]
      .filter(([clientId]) => names.has(clientId))
      .map(([clientId, id]) => ({ id, name: names.get(clientId)! }));
    const same =
      next.length === this.requests.length &&
      next.every((r, i) => r.id === this.requests[i]!.id && r.name === this.requests[i]!.name);
    if (!same) this.requests = next;
  }

  /**
   * Gastgeber-Befehl (nur in der Lobby, vor Spielbeginn): ändert die Tischregeln.
   * Unpassende Werte werden abgewiesen (`false`), der Tisch bleibt dann unverändert.
   */
  setRules(options: unknown): boolean {
    if (this.table.hand) return false;
    const parsed = parseRuleOptions(options);
    if (!parsed) return false;
    if (parsed.players !== this.table.seats.length && !this.resizeSeats(parsed.players)) {
      return false;
    }
    this.table = { ...this.table, rules: withRuleOptions(this.table.rules, parsed) };
    this.changed();
    return true;
  }

  /**
   * Neue Spielerzahl in der Lobby (K6, Annahme 50): Wer auf einem wegfallenden Platz sitzt,
   * rückt auf den ersten freien Platz. Sitzen mehr Spieler als Plätze bleiben, geht es nicht.
   * Vor dem ersten Spiel sind alle Stände 0 – sie werden nur in der Länge angepasst.
   */
  private resizeSeats(players: number): boolean {
    const old = this.table.seats;
    if (old.filter((s) => s !== null).length > players) return false;
    const seats = Array.from({ length: players }, (_, i): PlayerInfo | null => old[i] ?? null);
    for (let from = players; from < old.length; from++) {
      const player = old[from];
      if (!player) continue;
      const to = seats.indexOf(null);
      seats[to] = player;
      const clientId = this.clientAt(from);
      if (clientId) this.assign(clientId, to);
    }
    this.table = {
      ...this.table,
      seats,
      balances: Array.from({ length: players }, () => 0),
      dealer: this.table.dealer % players,
    };
    return true;
  }

  /**
   * Gastgeber-Befehl (nur in der Lobby): setzt den Spieler von `from` auf Platz
   * `to`; ist dieser besetzt, tauschen beide. Gibt `false` zurück, wenn das nicht geht.
   */
  moveSeat(from: Seat, to: Seat): boolean {
    if (this.table.hand || !this.isSeat(from) || !this.isSeat(to) || from === to) return false;
    const seats = [...this.table.seats];
    if (!seats[from]) return false;
    [seats[from], seats[to]] = [seats[to]!, seats[from]!];
    // `seats[to]` kann null gewesen sein – dann ist `from` jetzt frei.
    const clientFrom = this.clientAt(from);
    const clientTo = this.clientAt(to);
    if (clientFrom) this.assign(clientFrom, to);
    if (clientTo) this.assign(clientTo, from);
    this.table = { ...this.table, seats };
    this.changed();
    return true;
  }

  /** Gastgeber-Befehl (nur in der Lobby): nimmt einen Spieler vom Platz; er schaut dann zu. */
  unseat(seat: Seat): boolean {
    if (this.table.hand || !this.isSeat(seat) || !this.table.seats[seat]) return false;
    const clientId = this.clientAt(seat);
    const seats = [...this.table.seats];
    seats[seat] = null;
    this.table = { ...this.table, seats };
    if (clientId) {
      this.seatByClient.delete(clientId);
      this.watching.add(clientId);
      this.syncPeers(clientId, null);
    }
    this.changed();
    return true;
  }

  /** Getrennte Spieler im laufenden Spiel, mit Restzeit bis zur Vertretung. */
  getAbsentSeats(): AbsentSeat[] {
    const now = this.now();
    return [...this.absences].map(([seat, absence]) => ({
      seat,
      standIn: absence.standIn !== null,
      standInInMs: absence.standIn ? null : Math.max(0, absence.deadline - now),
    }));
  }

  /**
   * Gastgeber-Befehl: Ein Bot vertritt den getrennten Spieler auf `seat` sofort,
   * ohne das Ende der Frist abzuwarten. Kommt der Spieler zurück, spielt er weiter.
   */
  standInNow(seat: Seat): boolean {
    const absence = this.isSeat(seat) ? this.absences.get(seat) : undefined;
    if (!absence || absence.standIn) return false;
    this.activateStandIn(seat, absence);
    return true;
  }

  /**
   * Gastgeber-Befehl (im laufenden Spiel): nimmt einen getrennten Spieler
   * dauerhaft vom Platz. Ein Bot übernimmt Platz und Kontostand; kommt der
   * Spieler doch zurück, schaut er zu.
   */
  replaceWithBot(seat: Seat): boolean {
    if (!this.table.hand || !this.isSeat(seat)) return false;
    const absence = this.absences.get(seat);
    if (!absence) return false;
    this.absences.delete(seat);
    this.bots.set(seat, absence.standIn ?? this.createBot(seat));
    const clientId = this.clientAt(seat);
    if (clientId) {
      this.seatByClient.delete(clientId);
      this.watching.add(clientId);
    }
    const seats = [...this.table.seats];
    seats[seat] = { name: this.botName(seat), kind: 'bot', connected: true };
    this.table = { ...this.table, seats };
    this.changed();
    return true;
  }

  /** Startet die Frist bis zur Vertretung für einen getrennten Spieler. */
  private markAbsent(seat: Seat): void {
    const token = ++this.absenceToken;
    this.absences.set(seat, { deadline: this.now() + this.standInDelayMs, token, standIn: null });
    this.schedule(() => {
      const absence = this.absences.get(seat);
      if (this.closed || !absence || absence.token !== token || absence.standIn) return;
      this.activateStandIn(seat, absence);
    }, this.standInDelayMs);
  }

  private activateStandIn(seat: Seat, absence: Absence): void {
    this.absences.set(seat, { ...absence, standIn: this.createBot(seat) });
    this.changed();
  }

  /** Bot in der eingestellten Stärke; die Regeln ändern sich nur in der Lobby, vor den Bots. */
  private createBot(seat: Seat): Bot {
    return this.makeBot(seat, this.table.rules);
  }

  private botName(seat: Seat): string {
    // Menschen am Tisch verbrauchen keinen Namen: bei einem Menschen heißen die Bots
    // der Reihe nach die ersten drei Namen.
    let humansBefore = 0;
    for (const s of this.seatByClient.values()) if (s < seat) humansBefore++;
    const index = seat - humansBefore;
    const name = this.botNames[index % this.botNames.length] ?? `Bot ${seat + 1}`;
    return `${name} (Bot)`;
  }

  /** Wer zieht für diesen Platz automatisch: ein fester Bot oder die Vertretung. */
  private botFor(seat: Seat): Bot | null {
    return this.bots.get(seat) ?? this.absences.get(seat)?.standIn ?? null;
  }

  private isSeat(seat: unknown): seat is Seat {
    return (
      Number.isInteger(seat) && (seat as number) >= 0 && (seat as number) < this.table.seats.length
    );
  }

  private clientAt(seat: Seat): string | null {
    for (const [clientId, s] of this.seatByClient) if (s === seat) return clientId;
    return null;
  }

  /** Ordnet einen Mitspieler einem Platz zu und merkt es sich (Peers und Platz-Zuordnung). */
  private assign(clientId: string, seat: Seat): void {
    this.seatByClient.set(clientId, seat);
    this.watching.delete(clientId);
    this.syncPeers(clientId, seat);
  }

  private syncPeers(clientId: string, seat: Seat | null): void {
    for (const peer of this.peers.values()) if (peer.clientId === clientId) peer.seat = seat;
  }

  /** Namen der Zuschauer, die gerade verbunden sind. */
  private watcherNames(): string[] {
    const seen = new Map<string, string>();
    for (const peer of this.peers.values()) {
      if (peer.state === 'in' && peer.clientId !== null && peer.seat === null) {
        seen.set(peer.clientId, peer.name);
      }
    }
    return [...seen.values()];
  }

  /** Startet das erste Spiel; freie Plätze werden mit Bots besetzt. */
  start(): boolean {
    if (this.table.hand) return false;
    const seats = this.table.seats.map((player, seat) => {
      if (player) return player;
      this.bots.set(seat, this.createBot(seat));
      return { name: this.botName(seat), kind: 'bot' as const, connected: true };
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
      peer = { send, state: 'new', clientId: null, seat: null, name: 'Gast' };
      this.peers.set(peerKey, peer);
    }
    // Nachrichten kommen aus dem Netz: nichts ungeprüft übernehmen.
    if (typeof message !== 'object' || message === null) return this.reject(peer, 'bad_message');
    if (message.t === 'hello') return this.handleHello(peer, message);
    // Vor der Zusage des Gastgebers (oder nach der Abweisung) zählt nichts anderes (N6).
    if (peer.state === 'waiting' || peer.state === 'rejected') {
      return this.reject(peer, 'not_admitted');
    }
    if (message.t === 'action') return this.handleAction(peer, message.action);
    if (message.t === 'seat') return this.handleSeat(peer, message.seat);
    if (message.t === 'rename') return this.handleRename(peer, message.name);
    this.reject(peer, 'bad_message');
  }

  private handleHello(peer: Peer, message: Extract<ClientMessage, { t: 'hello' }>): void {
    if (message.v !== PROTOCOL_VERSION) return this.reject(peer, 'version_mismatch');
    if (typeof message.clientId !== 'string' || typeof message.name !== 'string') {
      return this.reject(peer, 'bad_message');
    }
    if (message.clientId.length === 0 || message.clientId.length > 64) {
      return this.reject(peer, 'bad_message');
    }
    const { clientId } = message;
    const name = cleanName(message.name) || 'Gast';
    // Eine Verbindung bleibt bei ihrer ersten Kennung.
    if (peer.clientId !== null && peer.clientId !== clientId) {
      return this.reject(peer, 'bad_message');
    }
    peer.clientId = clientId;
    peer.name = name;

    if (this.rejected.has(clientId)) {
      peer.state = 'rejected';
      peer.send({ t: 'rejected' });
      return;
    }
    const known = clientId === this.owner || this.known.has(clientId);
    if (this.requireApproval && !known) {
      peer.state = 'waiting';
      if (!this.requestIds.has(clientId)) this.requestIds.set(clientId, ++this.requestCounter);
      peer.send({ t: 'waiting', host: this.ownerName() });
      this.changed(); // für den Gastgeber: neue Anfrage
      return;
    }
    this.known.add(clientId);
    this.seatPeer(peer, name);
    this.changed();
  }

  /** Nimmt eine Verbindung an den Tisch: Platz zuteilen oder wiederfinden, begrüßen. */
  private seatPeer(peer: Peer, requestedName: string): void {
    const clientId = peer.clientId!;
    let name = requestedName;
    peer.state = 'in';
    let seat = this.seatByClient.get(clientId) ?? null;
    if (seat === null && !this.table.hand && !this.watching.has(clientId)) {
      const free = this.table.seats.findIndex((s) => s === null);
      if (free >= 0) seat = free;
    }
    if (seat !== null) {
      // Wer schon einen Platz hat, behält dort den Namen (ein Umbenennen überlebt das Neuladen).
      const existing = this.table.seats[seat];
      if (existing) name = existing.name;
      this.assign(clientId, seat);
      // Zurück am Platz: Die Vertretung endet, ab dem nächsten Zug spielt wieder der Mensch.
      this.absences.delete(seat);
      const seats = [...this.table.seats];
      seats[seat] = { name, kind: 'human', connected: true };
      this.table = { ...this.table, seats };
    }
    peer.name = name;
    peer.seat = seat;
    peer.send({ t: 'welcome', v: PROTOCOL_VERSION, seat });
  }

  /** Gast wählt einen freien Platz oder (`null`) schaut nur zu. Nur in der Lobby. */
  private handleSeat(peer: Peer, seat: unknown): void {
    if (peer.clientId === null) return this.reject(peer, 'bad_message');
    if (seat !== null && !this.isSeat(seat)) return this.reject(peer, 'bad_message');
    if (this.table.hand) return this.reject(peer, 'wrong_phase');
    if (seat === peer.seat) return;
    const seats = [...this.table.seats];
    if (seat !== null) {
      if (seats[seat]) return this.reject(peer, 'seat_taken');
      seats[seat] = { name: peer.name, kind: 'human', connected: true };
    }
    if (peer.seat !== null) seats[peer.seat] = null;
    this.table = { ...this.table, seats };
    if (seat === null) {
      this.seatByClient.delete(peer.clientId);
      this.watching.add(peer.clientId);
      this.syncPeers(peer.clientId, null);
    } else {
      this.assign(peer.clientId, seat);
    }
    this.changed();
  }

  private handleRename(peer: Peer, raw: unknown): void {
    if (peer.clientId === null || typeof raw !== 'string') return this.reject(peer, 'bad_message');
    const name = cleanName(raw);
    if (!name) return this.reject(peer, 'bad_message');
    for (const other of this.peers.values()) {
      if (other.clientId === peer.clientId) other.name = name;
    }
    const seat = peer.seat;
    const player = seat === null ? null : this.table.seats[seat];
    if (seat !== null && player) {
      const seats = [...this.table.seats];
      seats[seat] = { ...player, name };
      this.table = { ...this.table, seats };
    }
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
    if (peer.state === 'waiting') {
      // Geht die letzte wartende Verbindung, verfällt die Anfrage.
      const clientId = peer.clientId!;
      const still = [...this.peers.values()].some(
        (p) => p.clientId === clientId && p.state === 'waiting',
      );
      if (!still) this.requestIds.delete(clientId);
      this.changed();
      return;
    }
    if (peer.state !== 'in') return;
    const seat = peer.seat;
    if (seat === null) {
      if (peer.clientId) this.changed(); // die Zuschauerliste hat sich geändert
      return;
    }
    // Hat sich derselbe Spieler inzwischen neu verbunden, bleibt der Platz besetzt.
    if ([...this.peers.values()].some((p) => p.seat === seat)) return;

    const seats = [...this.table.seats];
    if (this.table.hand) {
      // Im laufenden Spiel bleibt der Platz reserviert, bis der Spieler zurückkommt.
      const player = seats[seat];
      if (player) seats[seat] = { ...player, connected: false };
      this.markAbsent(seat);
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
    let lobby: LobbyInfo | undefined;
    let absent: AbsentSeat[] | undefined;
    this.refreshRequests();
    for (const peer of this.peers.values()) {
      if (peer.state !== 'in') continue;
      peer.send({
        t: 'state',
        view: tableViewFor(this.table, peer.seat),
        lobby: (lobby ??= {
          watchers: this.watcherNames(),
          spectatorsWelcome: this.spectatorsWelcome,
          requireApproval: this.requireApproval,
        }),
        absent: (absent ??= this.getAbsentSeats()),
      });
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
    if (this.closed) return;
    const hand = this.table.hand;
    if (this.botPending) {
      // Kontra oder Re während der Wartezeit: neu planen – ohne Fenster oder mit frischem für Re.
      // Der alte Zeitgeber verfällt (Kennung passt nicht mehr).
      const same =
        !hand ||
        (hand.doubling.kontra === this.botPending.kontra &&
          hand.doubling.re === this.botPending.re);
      if (same) return;
      this.botPending = null;
    }
    if (!hand || hand.phase === 'finished') return;
    const seat = hand.turn;
    const bot = this.botFor(seat);
    if (!bot) return;

    // Darf ein Mensch noch Kontra oder Re sagen, bekommt er Zeit dafür, bevor die erste Karte
    // fällt (Kontra-Fenster).
    const { kontra, re } = hand.doubling;
    const delay = this.humanMayDouble()
      ? Math.max(this.botDelayMs, this.kontraWindowMs)
      : this.botDelayMs;
    const token = ++this.botToken;
    this.botPending = { token, kontra, re };
    this.schedule(() => {
      if (this.botPending?.token !== token) return; // überholt durch eine neue Planung
      this.botPending = null;
      const current = this.table.hand;
      if (
        this.closed ||
        !current ||
        current.phase === 'finished' ||
        current.turn !== seat ||
        this.botFor(seat) !== bot // Spieler ist zurück und zieht selbst
      ) {
        return this.driveBots();
      }
      const view = handViewFor(current, seat);
      let error: HostErrorCode | null;
      try {
        error = this.apply(seat, bot.decide(view, current.rules));
      } catch {
        error = 'bad_message';
      }
      if (error) {
        // Ein fehlerhafter Bot darf den Tisch nicht blockieren: irgendetwas Erlaubtes tun.
        const fallback: PlayerAction =
          current.phase === 'bidding'
            ? { type: 'bid', call: view.legalCalls[0]! }
            : current.phase === 'prelude'
              ? { type: 'prelude', move: view.legalMoves[0]! }
              : { type: 'play', card: view.legalCards[0]! };
        this.apply(seat, fallback);
      }
    }, delay);
  }

  /** Darf ein Mensch (kein Bot, keine Vertretung) im laufenden Spiel gerade Kontra oder Re sagen? */
  private humanMayDouble(): boolean {
    const hand = this.table.hand;
    if (!hand) return false;
    return this.table.seats.some(
      (player, seat) => player?.kind === 'human' && !this.botFor(seat) && canDouble(hand, seat),
    );
  }
}

function isWellFormed(action: unknown): action is PlayerAction {
  if (typeof action !== 'object' || action === null) return false;
  const a = action as { type?: unknown; card?: unknown; call?: unknown };
  if (a.type === 'play') return isCard(a.card);
  if (a.type === 'double') return true;
  if (a.type === 'bid') return isWellFormedCall(a.call);
  if (a.type === 'prelude') return isWellFormedMove((action as { move?: unknown }).move);
  return false;
}

/** Nur die Form eines Vorspiel-Zugs – ob er erlaubt ist, entscheidet der Kern. */
function isWellFormedMove(move: unknown): boolean {
  if (typeof move !== 'object' || move === null) return false;
  const m = move as { type?: unknown; cards?: unknown };
  if (m.type === 'accept' || m.type === 'decline') return true;
  return (
    m.type === 'give' && Array.isArray(m.cards) && m.cards.length <= 8 && m.cards.every(isCard)
  );
}

const hasKind = (x: unknown): boolean =>
  typeof x === 'object' && x !== null && typeof (x as { kind?: unknown }).kind === 'string';

/** Nur die Form – ob der Ruf erlaubt ist, entscheidet der Kern. */
function isWellFormedCall(call: unknown): boolean {
  if (typeof call !== 'object' || call === null) return false;
  const c = call as { type?: unknown; level?: unknown; contract?: unknown };
  switch (c.type) {
    case 'pass':
    case 'interest':
    case 'hold':
    case 'yield':
      return true;
    case 'name':
      return hasKind(c.level);
    case 'declare':
      return hasKind(c.contract);
    default:
      return false;
  }
}
