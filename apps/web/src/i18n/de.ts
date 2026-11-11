/**
 * Alle Texte der Oberfläche an einer Stelle. Weitere Sprachen (oder Bairisch)
 * lassen sich später als zweite Datei mit denselben Schlüsseln ergänzen.
 */

import type { Contract, Rank, Suit } from '@schafkopf/core';
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
