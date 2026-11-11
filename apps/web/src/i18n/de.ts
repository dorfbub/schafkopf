/**
 * Alle Texte der Oberfläche an einer Stelle. Weitere Sprachen (oder Bairisch)
 * lassen sich später als zweite Datei mit denselben Schlüsseln ergänzen.
 */

import type { BidCall, BidLevel, Contract, ContractKind, Rank, Suit } from '@schafkopf/core';
import type { HostErrorCode } from '@schafkopf/net';

export const SUIT_NAME: Record<Suit, string> = {
  eichel: 'Eichel',
  gras: 'Gras',
  herz: 'Herz',
  schellen: 'Schellen',
};

export const RANK_NAME: Record<Rank, string> = {
  A: 'Sau',
  '10': 'Zehner',
  K: 'König',
  O: 'Ober',
  U: 'Unter',
  '9': 'Neuner',
  '8': 'Achter',
  '7': 'Siebener',
};

export function contractLabel(contract: Contract): string {
  const suit = contract.suit ? SUIT_NAME[contract.suit] : '';
  const base = {
    sauspiel: `Sauspiel auf die ${suit}-Sau`,
    solo: `${suit}-Solo`,
    farbwenz: `${suit}-Farbwenz`,
    wenz: 'Wenz',
    geier: 'Geier',
    bettel: 'Bettel',
  }[contract.kind];
  return contract.tout ? `${base} Tout` : base;
}

export const ERROR_TEXT: Record<HostErrorCode, string> = {
  version_mismatch: 'Deine Version passt nicht zum Tisch. Bitte die Seite neu laden.',
  not_seated: 'Du sitzt nicht am Tisch und schaust nur zu.',
  bad_message: 'Das hat der Tisch nicht verstanden.',
  wrong_phase: 'Das geht gerade nicht.',
  not_your_turn: 'Du bist nicht an der Reihe.',
  illegal_bid: 'Diese Ansage ist nicht erlaubt.',
  illegal_card: 'Diese Karte darfst du nicht spielen.',
  no_hand: 'Es läuft gerade kein Spiel.',
  seat_taken: 'Dieser Platz ist schon besetzt.',
};

/** Verbindungsstatus für Gäste (Paket N1). */
export const CONNECT_TEXT = {
  searching: (room: string) => `Suche Tisch ${room} …`,
  searchingHint:
    'Der Tisch wird direkt beim Gastgeber gesucht. Das dauert meist nur ein paar Sekunden; der Gastgeber muss die Seite geöffnet haben.',
  failed: 'Tisch nicht gefunden',
  failedHint:
    'Ist der Tisch-Code richtig und hat der Gastgeber die Seite noch offen? In manchen Firmen- oder Hotelnetzen klappen direkte Verbindungen nicht.',
  retry: 'Erneut versuchen',
  cancel: 'Abbrechen',
  lost: 'Verbindung zum Gastgeber verloren. Suche Tisch …',
  lostFailed: 'Gastgeber nicht mehr erreichbar.',
};

/** Offener Tisch nach dem Neuladen des Gastgebers (Paket N2). */
export const RESUME_TEXT = {
  title: 'Offener Tisch',
  online: (room: string) => `Dein Tisch ${room} läuft noch.`,
  local: 'Dein Tisch gegen die Bots läuft noch.',
  progress: (handNo: number, minutes: number) =>
    handNo === 0
      ? `Noch in der Lobby, zuletzt vor ${minutes} min.`
      : `${handNo}. Spiel, zuletzt vor ${minutes} min. Kontostände und Karten bleiben erhalten.`,
  resume: 'Tisch fortsetzen',
  discard: 'Verwerfen',
};

/** Cent-Betrag als Euro, mit Vorzeichen: 150 → "+1,50 €". */
export function money(cents: number): string {
  const sign = cents > 0 ? '+' : cents < 0 ? '−' : '';
  return `${sign}${(Math.abs(cents) / 100).toFixed(2).replace('.', ',')} €`;
}

/** Texte der Grundbausteine (src/ui/kit). */
export const UI_TEXT = {
  seatTurn: 'am Zug',
  seatDealer: 'Geber',
  seatDealerShort: 'G',
  seatDisconnected: 'getrennt',
};

/** Name einer Spielart ohne Farbe, für den Ansage-Dialog. */
export const KIND_NAME: Record<ContractKind, string> = {
  sauspiel: 'Sauspiel',
  solo: 'Solo',
  wenz: 'Wenz',
  farbwenz: 'Farbwenz',
  geier: 'Geier',
  bettel: 'Bettel',
};

/** Spielart ohne Farbe, wie sie im Zweikampf genannt wird. */
export function levelLabel(level: BidLevel): string {
  return level.tout ? `${KIND_NAME[level.kind]} Tout` : KIND_NAME[level.kind];
}

/** Was ein Spieler in der Ansage laut sagt. */
export function callLabel(call: BidCall): string {
  switch (call.type) {
    case 'pass':
      return 'weiter';
    case 'interest':
      return 'Ich würde';
    case 'name':
      return levelLabel(call.level);
    case 'hold':
      return 'ich auch';
    case 'yield':
      return 'gut';
    case 'declare':
      return contractLabel(call.contract);
  }
}

/** Texte des Spieltischs (src/ui/table). */
export const TABLE_TEXT = {
  brand: 'Schafkopf',
  leave: 'Verlassen',
  lastTrick: 'Letzter Stich',
  close: 'Schließen',
  handNo: (n: number) => `Spiel ${n}`,
  trickNo: (n: number, of: number) => `Stich ${n} von ${of}`,
  bidding: 'Ansage',
  finished: 'Spiel beendet',
  youBid: 'Ansage – du bist dran',
  othersBid: (name: string) => `Ansage – ${name} ist dran`,
  plays: 'spielt',
  seatFallback: (seat: number) => `Platz ${seat + 1}`,
  you: 'du',
  spectating: 'Du schaust zu',
  yourTurnBid: 'Du sagst an',
  yourTurnPlay: 'Du bist dran',
  waitingFor: (name: string) => `${name} ist dran`,
  tricks: (n: number) => (n === 1 ? '1 Stich' : `${n} Stiche`),
  cards: (n: number) => (n === 1 ? '1 Karte' : `${n} Karten`),
  markDeclarer: 'Spieler',
  markPartner: 'Mitspieler',
  pass: 'weiter',
  thinking: '…',
  trick: 'Stich',
  hand: 'Deine Karten',
  wonBy: (name: string, points: number) => `${name} sticht · ${points} Augen`,
  // Ansage-Dialog
  interestTitle: 'Würdest du spielen?',
  interestBody: 'Erst sagt jeder, ob er spielen würde. Wer mag, nennt danach sein Spiel.',
  interestYes: 'Ich würde',
  duelTitle: (name: string) => `Gegen ${name}: Was hast du?`,
  duelHint: (name: string) => `${name} war vorher dran und hat bei Gleichstand Vorrang.`,
  duelHintLevel: (name: string, level: string) => `${name} hält ${level} – du musst höher gehen.`,
  duelName: (label: string) => `„${label}“ sagen`,
  duelYield: 'Aufgeben',
  holdTitle: (name: string, level: string) => `${name} sagt: ${level}`,
  holdBody: (level: string) =>
    `Hast du ${level} oder Höheres? Bei Gleichstand hast du Vorrang, weil du vorher dran warst.`,
  holdYes: 'Ich auch',
  holdNo: 'Gut',
  bidTitle: 'Was spielst du?',
  bidKind: 'Spielart',
  bidSuitCalled: 'Auf welche Sau?',
  bidSuitTrump: 'Welche Farbe ist Trumpf?',
  bidTout: 'Tout',
  bidTouthint: 'alle Stiche',
  bidPass: 'Weiter',
  bidAnnounce: (label: string) => `${label} ansagen`,
  bidChoose: 'Spielart wählen',
  bidNothing: 'Mit diesem Blatt kannst du nichts ansagen.',
  bidStatus: (said: string[], open: string[]) =>
    [
      ...said,
      open.length ? `${open.join(' und ')} ${open.length > 1 ? 'kommen' : 'kommt'} noch` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  bidSaid: (name: string, what: string) => `${name}: ${what}`,
  bidMinimum: (label: string) => `Mindestens: ${label}`,
  // Ergebnis
  passedTitle: 'Alle weiter – es wird zusammengeworfen',
  resultTitle: (names: string, plural: boolean, won: boolean) =>
    `${names} ${plural ? 'haben' : 'hat'} ${won ? 'gewonnen' : 'verloren'}`,
  and: ' und ',
  points: 'Augen',
  pointsOf: (n: number) => `${n} von 120 Augen`,
  extras: {
    schneider: 'Schneider',
    schwarz: 'Schwarz',
    sie: 'Sie',
    laufende: (n: number) => `${n} Laufende`,
    tricks: (n: number) => (n === 1 ? '1 Stich' : `${n} Stiche`),
  },
  valuePerPlayer: 'je Gegenspieler',
  colPlayer: 'Spieler',
  colHand: 'Spiel',
  colBalance: 'Stand',
  nextHand: 'Nächstes Spiel',
  hostDeals: 'Der Gastgeber gibt das nächste Spiel.',
  // Ansagen für Bildschirmleser
  announceTurn: 'Du bist dran.',
  announceBid: 'Du bist mit der Ansage dran.',
};

/** Lobby (Paket N4). */
export const LOBBY_TEXT = {
  seats: 'Plätze',
  free: 'frei',
  you: '(du)',
  sitHere: 'Hier sitzen',
  watch: 'Nur zuschauen',
  watchers: 'Zuschauer',
  watching: 'Du schaust zu. Such dir einen freien Platz, wenn du mitspielen willst.',
  noFreeSeat: 'Alle Plätze sind besetzt.',
  rename: 'Dein Name',
  renameButton: 'Ändern',
  moveUp: 'Nach oben',
  moveDown: 'Nach unten',
  unseat: 'Vom Platz nehmen',
  settings: 'Einstellungen',
  spectators: 'Zuschauer zulassen',
  spectatorsHint:
    'Hält den Tisch auch bei voller Besetzung und im laufenden Spiel für neue Zuschauer offen. Das kostet etwas mehr Verbindungsverkehr über die öffentlichen Relays.',
  spectatorsHintLocal: 'Nur bei einem Tisch mit Einladungslink möglich.',
  guestWaits: 'Der Gastgeber startet das Spiel.',
} as const;
