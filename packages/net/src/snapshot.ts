/**
 * Speicherstand des Hosts: alles, was `HostSession` braucht, um nach einem
 * Neuladen des Gastgebers weiterzumachen. Enthält den vollen Tischzustand samt
 * aller Hände – bleibt deshalb auf dem Gerät des Gastgebers und wird nie
 * verschickt (siehe `docs/ARCHITEKTUR.md`, „Tisch übersteht Neuladen“).
 *
 * Gelesen wird ein Speicherstand nur über `parseHostSnapshot`: Er kann
 * beschädigt sein oder von einer älteren Version der App stammen. Was nicht
 * eindeutig passt, wird verworfen – lieber ein neuer Tisch als ein kaputter.
 */

import {
  DEFAULT_RULES,
  type Seat,
  type TableState,
  dealHand,
  handViewFor,
  isCard,
  tableViewFor,
} from '@schafkopf/core';

/** Erhöhen, sobald sich `HostSnapshot`, `TableState`, `HandState` oder `RuleSet` ändern. */
/** 2: zweistufige Ansage (K1) hat `HandState` verändert. */
/** 3: Lobby-Funktionen (N4): `watching`, `spectatorsWelcome`. */
export const HOST_SNAPSHOT_VERSION = 3;

export interface HostSnapshot {
  v: number;
  /** Raum-Code, unter dem die Gäste den Tisch wiederfinden; null bei einem lokalen Tisch. */
  roomId: string | null;
  table: TableState;
  /** Platz-Zuordnung `clientId` → Sitz. */
  seatByClient: [clientId: string, seat: Seat][];
  /** Plätze, die ein Bot spielt; die Bots selbst werden beim Laden neu erzeugt. */
  botSeats: Seat[];
  /** `clientId`s, die ausdrücklich zuschauen wollen (bekommen keinen Platz zugeteilt). */
  watching: string[];
  /** Tisch bleibt für Zuschauer offen. */
  spectatorsWelcome: boolean;
}

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInt(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

/**
 * Hat der Wert jeden Schlüssel der Vorlage? Fängt Speicherstände älterer
 * Versionen ab, denen ein inzwischen neues Feld fehlt.
 */
function hasKeys(value: Obj, template: object): boolean {
  return Object.keys(template).every((key) => key in value);
}

function isCardRows(value: unknown, players: number): boolean {
  return (
    Array.isArray(value) &&
    value.length === players &&
    value.every((row) => Array.isArray(row) && row.every(isCard))
  );
}

/**
 * Prüft einen gelesenen Speicherstand. Gibt ihn typisiert zurück oder `null`,
 * wenn er beschädigt, unvollständig oder von einer anderen Version ist.
 */
export function parseHostSnapshot(raw: unknown): HostSnapshot | null {
  try {
    return check(raw);
  } catch {
    return null; // was beim Probelesen wirft, ist kein brauchbarer Stand
  }
}

function check(raw: unknown): HostSnapshot | null {
  if (!isObj(raw) || raw.v !== HOST_SNAPSHOT_VERSION) return null;
  const { roomId, table, seatByClient, botSeats, watching, spectatorsWelcome } = raw;
  if (roomId !== null && (typeof roomId !== 'string' || !/^[a-z0-9]{1,32}$/.test(roomId))) {
    return null;
  }
  if (!isObj(table) || !hasKeys(table, emptyTable)) return null;

  const rules = table.rules;
  if (!isObj(rules) || !hasKeys(rules, DEFAULT_RULES)) return null;
  const players = rules.players;
  if (!isInt(players, 2, 8)) return null;
  const last = players - 1;

  const { seats, balances, dealer, handNo, hand } = table;
  if (!Array.isArray(seats) || seats.length !== players) return null;
  for (const s of seats) {
    if (s === null) continue;
    if (!isObj(s) || typeof s.name !== 'string' || typeof s.connected !== 'boolean') return null;
    if (s.kind !== 'human' && s.kind !== 'bot') return null;
  }
  if (!Array.isArray(balances) || balances.length !== players) return null;
  if (!balances.every((b) => isInt(b, Number.MIN_SAFE_INTEGER))) return null;
  if ((balances as number[]).reduce((a, b) => a + b, 0) !== 0) return null;
  if (!isInt(dealer, 0, last) || !isInt(handNo, 0)) return null;

  if (hand !== null) {
    if (handNo < 1 || seats.some((s) => s === null)) return null;
    // Schlüssel mit einem frisch gegebenen Spiel vergleichen: so fällt jede
    // Änderung an `HandState` auf, auch wenn jemand die Version vergisst.
    const template = dealHand(rules as unknown as TableState['rules'], 0, 1);
    if (!isObj(hand) || !hasKeys(hand, template)) return null;
    if (typeof hand.phase !== 'string' || !isInt(hand.turn, 0, last)) return null;
    if (!isInt(hand.dealer, 0, last)) return null;
    if (!isCardRows(hand.hands, players) || !isCardRows(hand.initialHands, players)) return null;
    if (!Array.isArray(hand.bids) || !Array.isArray(hand.tricks)) return null;
  }

  if (!Array.isArray(seatByClient)) return null;
  const clients = new Set<string>();
  for (const entry of seatByClient) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [clientId, seat] = entry as unknown[];
    if (typeof clientId !== 'string' || clientId.length === 0 || clients.has(clientId)) return null;
    if (!isInt(seat, 0, last)) return null;
    const player = seats[seat] as Obj | null;
    if (player && player.kind !== 'human') return null;
    clients.add(clientId);
  }

  if (!Array.isArray(botSeats)) return null;
  for (const seat of botSeats) {
    if (!isInt(seat, 0, last) || (seats[seat] as Obj | null)?.kind !== 'bot') return null;
  }
  if (seats.some((s, i) => (s as Obj | null)?.kind === 'bot' && !botSeats.includes(i))) {
    return null;
  }

  if (!Array.isArray(watching) || !watching.every((id) => typeof id === 'string')) return null;
  if (typeof spectatorsWelcome !== 'boolean') return null;

  const snapshot = raw as unknown as HostSnapshot;
  // Probelesen: jede Sicht muss sich bauen lassen, sonst scheitert es erst mitten im Spiel.
  for (let seat = 0; seat < players; seat++) {
    tableViewFor(snapshot.table, seat);
    if (snapshot.table.hand) handViewFor(snapshot.table.hand, seat);
  }
  return snapshot;
}

const emptyTable: Record<keyof TableState, null> = {
  rules: null,
  seats: null,
  balances: null,
  dealer: null,
  handNo: null,
  hand: null,
};
