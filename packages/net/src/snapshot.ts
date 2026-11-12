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
  isSeed,
  replay,
  MAX_LOGS,
  type HandLog,
  parseRuleOptions,
  tableViewFor,
} from '@schafkopf/core';

/** Erhöhen, sobald sich `HostSnapshot`, `TableState`, `HandState` oder `RuleSet` ändern. */
/** 2: zweistufige Ansage (K1) hat `HandState` verändert. */
/** 3: Lobby-Funktionen (N4): `watching`, `spectatorsWelcome`. */
/** 4: Tischregeln erweitert (K2): `RuleSet.laufende`, `sie`, `davonlaufen`. */
/** 5: Spielprotokoll (K7): `TableState.logs`, `history`. */
/**
 * 6: Umbau für Sonderspiele (K3a): `TableState.pot`, `HandState.carry`, `HandLog.carry`,
 * `HandResult` in Stufen.
 */
/** 7: Ramsch (K3b): `RuleSet.allPassed` einstellbar, `tariff.ramsch`, `ramsch`. */
/** 8: Stock (K3c): `tariff.stock`; `TableState.pot` kann jetzt gefüllt sein. */
/** 9: Muss (K3d): `Auction.forced` in `HandState`. */
/** 10: Kontra und Re (K4): `RuleSet.kontra`, `HandState.doubling`. */
/**
 * 11: Hochzeit (K5): `HandState.prelude`, Phase `prelude`, `Auction.yielded`/`failed`,
 * `RuleSet.laufende.hochzeit`.
 */
export const HOST_SNAPSHOT_VERSION = 11;

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
  // Prüft auch `allPassed` gegen die bekannten Regeln (`ALL_PASSED_RULES`).
  if (!parseRuleOptions(rules)) return null;
  const last = players - 1;

  const { seats, balances, pot, dealer, handNo, hand, logs, history } = table;
  if (!Array.isArray(seats) || seats.length !== players) return null;
  for (const s of seats) {
    if (s === null) continue;
    if (!isObj(s) || typeof s.name !== 'string' || typeof s.connected !== 'boolean') return null;
    if (s.kind !== 'human' && s.kind !== 'bot') return null;
  }
  if (!Array.isArray(balances) || balances.length !== players) return null;
  if (!balances.every((b) => isInt(b, Number.MIN_SAFE_INTEGER))) return null;
  if (!isInt(pot, 0)) return null;
  if ((balances as number[]).reduce((a, b) => a + b, 0) + pot !== 0) return null;
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
    if (!isCarry(hand.carry)) return null;
    if (!isDoubling(hand.doubling, last)) return null;
  }

  if (
    !checkLogs(logs, history, hand as Obj | null, rules as unknown as TableState['rules'], handNo)
  ) {
    return null;
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

/** Protokolle und Verlauf: Form prüfen, dann das laufende Spiel wirklich nachspielen. */
function checkLogs(
  logs: unknown,
  history: unknown,
  hand: Obj | null,
  rules: TableState['rules'],
  handNo: number,
): boolean {
  if (!Array.isArray(logs) || !Array.isArray(history)) return false;
  if (logs.length > MAX_LOGS || history.length > handNo) return false;
  for (const log of logs) {
    if (!isObj(log) || !isInt(log.handNo, 1, handNo) || !isSeed(log.seed)) return false;
    if (!isInt(log.dealer, 0, rules.players - 1) || !Array.isArray(log.actions)) return false;
    if (!isObj(log.rules) || !hasKeys(log.rules, DEFAULT_RULES)) return false;
    if (!parseRuleOptions(log.rules)) return false;
    if (!isCarry(log.carry)) return false;
  }
  for (const entry of history) {
    if (!isObj(entry) || !isInt(entry.handNo, 1, handNo) || !isInt(entry.dealer, 0, 7))
      return false;
    const result = entry.result;
    if (!isObj(result) || !Array.isArray(result.payments)) return false;
    if (
      !('outcome' in result) ||
      !Array.isArray(result.factors) ||
      !isInt(result.potDelta, Number.MIN_SAFE_INTEGER)
    )
      return false;
  }
  if (hand === null) return logs.length === 0;
  // Das letzte Protokoll muss zum laufenden Spiel führen – sonst ist der Stand widersprüchlich.
  const last = logs.at(-1) as HandLog | undefined;
  if (!last || last.handNo !== handNo) return false;
  try {
    const state = replay(last);
    return JSON.stringify(state) === JSON.stringify(hand);
  } catch {
    return false;
  }
}

/** Kontra und Re: je ein Sitz oder `null`; Re nur nach Kontra. */
function isDoubling(value: unknown, last: number): boolean {
  if (!isObj(value)) return false;
  const { kontra, re } = value;
  const seatOrNull = (s: unknown) => s === null || isInt(s, 0, last);
  return seatOrNull(kontra) && seatOrNull(re) && (re === null || kontra !== null);
}

/** Übertrag vom Tisch: Pott ≥ 0, Faktor ≥ 1. */
function isCarry(value: unknown): boolean {
  return isObj(value) && isInt(value.pot, 0) && isInt(value.factor, 1, 64);
}

const emptyTable: Record<keyof TableState, null> = {
  rules: null,
  seats: null,
  balances: null,
  pot: null,
  dealer: null,
  handNo: null,
  hand: null,
  logs: null,
  history: null,
};
