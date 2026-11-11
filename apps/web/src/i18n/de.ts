/**
 * Alle Texte der Oberfläche an einer Stelle. Weitere Sprachen (oder Bairisch)
 * lassen sich später als zweite Datei mit denselben Schlüsseln ergänzen.
 */

import type { Contract, ContractKind, Rank, Suit } from '@schafkopf/core';
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
  bidToBeat: (label: string) => `Zu überbieten: ${label}`,
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
