/**
 * Abrechnung eines fertig gespielten Spiels.
 *
 * Tarif (siehe RuleSet.tariff): Grundtarif + Schneider + Schwarz + Laufende.
 * Tout: (Grundtarif + Laufende) × 2, ohne Schneider/Schwarz. Sie: Grundtarif × 4.
 * Bettel: nur Grundtarif.
 */

import { type Card, createDeck } from './cards';
import type { HandState, Seat } from './hand';
import { type Contract, MODES } from './modes';

export type HandResult =
  | {
      /** Alle haben "weiter" gesagt. */
      kind: 'passed';
      payments: number[];
    }
  | {
      kind: 'played';
      contract: Contract;
      declarer: Seat;
      /** Spielerpartei (Ansager, im Sauspiel plus Mitspieler). */
      party: Seat[];
      partyPoints: number;
      partyTricks: number;
      /** Hat die Spielerpartei gewonnen? */
      won: boolean;
      schneider: boolean;
      schwarz: boolean;
      laufende: number;
      sie: boolean;
      /** Spielwert: Betrag, der zwischen je einem Gegenspieler und der Spielerpartei fließt. */
      value: number;
      /** Saldo je Sitz; Summe ist immer 0. */
      payments: number[];
    };

export function partyOf(state: Pick<HandState, 'declarer' | 'partner'>): Seat[] {
  if (state.declarer === null) return [];
  return state.partner === null || state.partner === state.declarer
    ? [state.declarer]
    : [state.declarer, state.partner];
}

/**
 * Laufende: Anzahl der höchsten Trümpfe in ununterbrochener Folge, die eine
 * Partei komplett hält – egal ob Spieler- oder Gegenpartei.
 */
export function countLaufende(
  trumps: readonly Card[],
  initialHands: readonly (readonly Card[])[],
  party: readonly Seat[],
): number {
  const inParty = (c: Card) => party.some((seat) => initialHands[seat]!.includes(c));
  if (trumps.length === 0) return 0;
  const side = inParty(trumps[0]!);
  let count = 0;
  for (const trump of trumps) {
    if (inParty(trump) !== side) break;
    count++;
  }
  return count;
}

export function scoreHand(state: HandState): HandResult {
  const { contract, declarer, rules } = state;
  if (!contract || declarer === null) throw new Error('Abrechnung ohne Ansage');
  const mode = MODES[contract.kind];
  const players = rules.players;
  const party = partyOf(state);
  const inParty = (seat: Seat) => party.includes(seat);

  const partyTricks = state.tricks.filter((t) => inParty(t.winner));
  const partyPoints = partyTricks.reduce((sum, t) => sum + t.points, 0);
  const totalTricks = state.tricks.length;

  const deck = createDeck(rules.deck);
  const trumps = mode.trumps(contract).filter((c) => deck.includes(c));
  const ober = deck.filter((c) => c.endsWith('O'));
  const unter = deck.filter((c) => c.endsWith('U'));
  const sie =
    contract.kind === 'solo' &&
    state.initialHands[declarer]!.length === ober.length + unter.length &&
    [...ober, ...unter].every((c) => state.initialHands[declarer]!.includes(c));

  let won: boolean;
  let schneider = false;
  let schwarz = false;
  let laufende = 0;
  const base = mode.alone ? rules.tariff.solo : rules.tariff.sauspiel;
  let value = base;

  if (mode.goal === 'noTricks') {
    won = partyTricks.length === 0;
  } else {
    const run = countLaufende(trumps, state.initialHands, party);
    if (mode.minLaufende !== null && run >= mode.minLaufende) laufende = run;

    if (sie) {
      won = true;
      laufende = 0;
      value = base * 4;
    } else if (contract.tout) {
      won = partyTricks.length === totalTricks;
      value = (base + laufende * rules.tariff.extra) * 2;
    } else {
      won = partyPoints >= 61;
      const loserTricks = won ? totalTricks - partyTricks.length : partyTricks.length;
      schwarz = loserTricks === 0;
      // Schneider frei: Gegner ab 30 Augen, Spielerpartei ab 31.
      schneider = schwarz || (won ? 120 - partyPoints < 30 : partyPoints < 31);
      value += (schneider ? 1 : 0) * rules.tariff.extra;
      value += (schwarz ? 1 : 0) * rules.tariff.extra;
      value += laufende * rules.tariff.extra;
    }
  }

  // Jeder Gegenspieler zahlt oder bekommt `value`; die Spielerpartei teilt sich die
  // Gegensumme (Sauspiel: je `value`, Einzelspiel: dreifach für den Ansager).
  const sign = won ? 1 : -1;
  const opponents = players - party.length;
  const payments = Array.from({ length: players }, (_, s) =>
    inParty(s) ? (sign * value * opponents) / party.length : -sign * value,
  );

  return {
    kind: 'played',
    contract,
    declarer,
    party,
    partyPoints,
    partyTricks: partyTricks.length,
    won,
    schneider,
    schwarz,
    laufende,
    sie,
    value,
    payments,
  };
}
