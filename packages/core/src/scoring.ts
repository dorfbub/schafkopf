/**
 * Abrechnung eines fertig gespielten Spiels, in drei Stufen
 * (siehe docs/entwurf-sonderspiele.md, §6):
 *
 *  1. `Outcome` – wer hat gewonnen, was ist das Spiel wert (ohne Faktoren). Hängt als
 *     einzige Stufe an der Spielart: `MODES[kind].outcome` oder `partyOutcome`.
 *  2. `Factor`s – Verdopplungen von außen: Kontra/Re (K4), Bock vom Tisch (noch nicht gespielt).
 *  3. Zahlungen und Pott – für alle Spielarten dieselbe Formel.
 *
 * Tarif (siehe RuleSet.tariff): Grundtarif + Schneider + Schwarz + Laufende.
 * Tout: (Grundtarif + Laufende) × 2, ohne Schneider/Schwarz. Sie: Grundtarif × 4.
 * Bettel: nur Grundtarif.
 */

import { type Card, createDeck } from './cards';
import type { HandState, Seat } from './hand';
import { type Contract, MODES, laufendeTrumpsFor } from './modes';
import type { LaufendeKind } from './rules';

/** Bestandteile des Spielwerts, für die Anzeige (U4). */
export type ValuePart = 'grundtarif' | 'schneider' | 'schwarz' | 'laufende' | 'tout' | 'sie';

/** Einzelheiten eines Spiels „Spielerpartei gegen Rest“. */
export interface PartyDetails {
  type: 'party';
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
}

/** Stufe 1 – wer hat gewonnen und was ist das Spiel wert (ohne Faktoren). */
export interface Outcome {
  winners: Seat[];
  losers: Seat[];
  /**
   * Spielwert: Jeder auf der größeren Seite zahlt bzw. bekommt diesen Betrag, die kleinere
   * Seite teilt sich die Gegensumme (2:2 je `value`, 1:3 dreifach für den Einzelnen).
   */
  value: number;
  /** `value` aufgeschlüsselt; die Beträge ergeben zusammen `value`. */
  parts: { label: ValuePart; amount: number }[];
  /** Hat die Spielerpartei gewonnen? `null`, wenn es keine gibt (Ramsch). */
  declarerWon: boolean | null;
  details: PartyDetails;
}

/** Stufe 2 – ein Faktor auf den Spielwert. Die Reihenfolge ist egal. */
export interface Factor {
  reason: 'kontra' | 're' | 'jungfrau' | 'bock';
  factor: number;
}

/** Stufe 3 – Ergebnis eines Spiels mit Zahlungen und Pott. */
export interface HandResult {
  /** 'passed' = alle haben „weiter“ gesagt und es wurde nicht gespielt. */
  kind: 'passed' | 'played';
  /** `null` bei 'passed'. */
  outcome: Outcome | null;
  factors: Factor[];
  /** Saldo je Sitz. */
  payments: number[];
  /** Änderung des Potts (Stock). Immer gilt: Summe(payments) + potDelta = 0. */
  potDelta: number;
}

/** Ergebnis ohne Spiel und ohne Zahlungen (Zusammenwerfen). */
export function passedResult(players: number): HandResult {
  return {
    kind: 'passed',
    outcome: null,
    factors: [],
    payments: Array.from({ length: players }, () => 0),
    potDelta: 0,
  };
}

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

/** Stufe 1 für alle Spiele „Spielerpartei gegen Rest“. */
export function partyOutcome(state: HandState): Outcome {
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
  const trumps = laufendeTrumpsFor(contract).filter((c) => deck.includes(c));
  const ober = deck.filter((c) => c.endsWith('O'));
  const unter = deck.filter((c) => c.endsWith('U'));
  const sie =
    rules.sie &&
    contract.kind === 'solo' &&
    state.initialHands[declarer]!.length === ober.length + unter.length &&
    [...ober, ...unter].every((c) => state.initialHands[declarer]!.includes(c));

  let won: boolean;
  let schneider = false;
  let schwarz = false;
  let laufende = 0;
  const base = rules.tariff[mode.tariff];
  const extra = rules.tariff.extra;
  let parts: Outcome['parts'] = [{ label: 'grundtarif', amount: base }];

  if (mode.goal === 'noTricks') {
    won = partyTricks.length === 0;
  } else {
    const run = countLaufende(trumps, state.initialHands, party);
    const threshold = mode.hasLaufende ? rules.laufende[contract.kind as LaufendeKind] : null;
    if (threshold !== null && run >= threshold) laufende = run;

    if (sie) {
      won = true;
      laufende = 0;
      parts.push({ label: 'sie', amount: base * 3 });
    } else if (contract.tout) {
      won = partyTricks.length === totalTricks;
      if (laufende > 0) parts.push({ label: 'laufende', amount: laufende * extra });
      const single = parts.reduce((sum, p) => sum + p.amount, 0);
      parts.push({ label: 'tout', amount: single });
    } else {
      won = partyPoints >= 61;
      const loserTricks = won ? totalTricks - partyTricks.length : partyTricks.length;
      schwarz = loserTricks === 0;
      // Schneider frei: Gegner ab 30 Augen, Spielerpartei ab 31.
      schneider = schwarz || (won ? 120 - partyPoints < 30 : partyPoints < 31);
      if (schneider) parts.push({ label: 'schneider', amount: extra });
      if (schwarz) parts.push({ label: 'schwarz', amount: extra });
      if (laufende > 0) parts.push({ label: 'laufende', amount: laufende * extra });
    }
  }
  parts = parts.filter((p) => p.amount !== 0 || p.label === 'grundtarif');

  const opponents = Array.from({ length: players }, (_, s) => s).filter((s) => !inParty(s));
  return {
    winners: won ? party : opponents,
    losers: won ? opponents : party,
    value: parts.reduce((sum, p) => sum + p.amount, 0),
    parts,
    declarerWon: won,
    details: {
      type: 'party',
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
    },
  };
}

/** Stufe 1: die Auswertung der Spielart, sonst die Partei-Abrechnung. */
export function outcomeOf(state: HandState): Outcome {
  if (!state.contract) throw new Error('Abrechnung ohne Ansage');
  return MODES[state.contract.kind].outcome?.(state) ?? partyOutcome(state);
}

/**
 * Stufe 2: Faktoren von außen – Kontra und Re je ×2 (K4) und der Übertrag vom Tisch (Bock,
 * sonst 1). Sie wirken auf den Spielwert, nicht auf den Pott (Annahme 12).
 */
export function factorsFor(state: HandState): Factor[] {
  const factors: Factor[] = [];
  if (state.doubling.kontra !== null) factors.push({ reason: 'kontra', factor: 2 });
  if (state.doubling.re !== null) factors.push({ reason: 're', factor: 2 });
  if (state.carry.factor !== 1) factors.push({ reason: 'bock', factor: state.carry.factor });
  return factors;
}

/**
 * Stufe 3: Zahlungen. Jeder auf der größeren Seite zahlt bzw. bekommt `value × Faktoren`,
 * die kleinere Seite teilt sich die Gegensumme – bei 2:2, 1:3 und 3:1 dieselbe Formel.
 * Gewinnt die Spielerpartei, bekommt sie den Pott zu gleichen Teilen.
 */
export function settleOutcome(
  outcome: Outcome,
  factors: readonly Factor[],
  players: number,
  pot: number,
): Pick<HandResult, 'payments' | 'potDelta'> {
  const { winners, losers } = outcome;
  const amount = factors.reduce((v, f) => v * f.factor, outcome.value);
  const larger = Math.max(winners.length, losers.length);
  const total = amount * larger;
  const potWon = outcome.declarerWon === true && pot > 0 ? pot : 0;
  const payments = Array.from({ length: players }, (_, s) => {
    // `|| 0` macht aus −0 (Spielwert 0) eine schlichte 0.
    if (winners.includes(s)) return (total + potWon) / winners.length || 0;
    if (losers.includes(s)) return -total / losers.length || 0;
    return 0;
  });
  return { payments, potDelta: potWon > 0 ? -potWon : 0 };
}

/** Rechnet ein fertig gespieltes Spiel ab: alle drei Stufen. */
export function scoreHand(state: HandState): HandResult {
  const outcome = outcomeOf(state);
  const factors = factorsFor(state);
  return {
    kind: 'played',
    outcome,
    factors,
    ...settleOutcome(outcome, factors, state.rules.players, state.carry.pot),
  };
}
