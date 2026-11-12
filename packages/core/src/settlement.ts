/**
 * Abrechnung über mehrere Spiele (U4): Aufschlüsselung eines Spielwerts, der Stand nach jedem
 * Spiel des Abends und die Endabrechnung „wer zahlt wem“. Alles reine Funktionen auf
 * `HandResult`/`HandSummary` – ohne Zustand, ohne Karten.
 */

import type { HandSummary } from './log';
import type { Seat } from './hand';
import type { Factor, HandResult, ValuePart } from './scoring';

// ---------------------------------------------------------------------------------------------
// Aufschlüsselung eines Spiels

/** Eine Zeile der Aufschlüsselung: ein Bestandteil des Spielwerts. */
export interface BreakdownPart {
  label: ValuePart;
  amount: number;
}

/** Ein Spielwert, in seine Stufen zerlegt (Bestandteile → Faktoren → Pott). */
export interface Breakdown {
  /** Bestandteile des Spielwerts (Grundtarif, Schneider, …). */
  parts: BreakdownPart[];
  /** Summe der Bestandteile, vor den Faktoren. */
  value: number;
  /** Die Faktoren (Kontra, Re, Jungfrau, Bock) in Reihenfolge. */
  factors: Factor[];
  /** Produkt der Faktoren (1, wenn keine). */
  factor: number;
  /** `value × factor`: das zahlt jeder auf der größeren Seite. */
  amount: number;
  /** Änderung des Potts: > 0 eingezahlt, < 0 ausgezahlt. */
  potDelta: number;
}

/** Zerlegt das Ergebnis eines gespielten Spiels; `null`, wenn nicht gespielt wurde. */
export function breakdownOf(result: HandResult): Breakdown | null {
  const outcome = result.outcome;
  if (!outcome) return null;
  const parts = outcome.parts.map((p) => ({ label: p.label, amount: p.amount }));
  const value = parts.reduce((sum, p) => sum + p.amount, 0);
  const factor = result.factors.reduce((f, x) => f * x.factor, 1);
  return {
    parts,
    value,
    factors: result.factors.map((f) => ({ ...f })),
    factor,
    amount: value * factor,
    potDelta: result.potDelta,
  };
}

// ---------------------------------------------------------------------------------------------
// Tabelle des Abends

/** Eine Zeile der Abendtabelle: ein Spiel mit Zahlungen und dem Stand danach. */
export interface LedgerRow {
  summary: HandSummary;
  /** Betrag je Sitz in diesem Spiel. */
  payments: number[];
  /** Kontostand je Sitz nach diesem Spiel. */
  balances: number[];
  /** Pott nach diesem Spiel. */
  pot: number;
}

/** Die Spiele des Abends mit laufendem Stand, älteste zuerst. */
export function ledgerOf(history: readonly HandSummary[], players: number): LedgerRow[] {
  let balances = Array.from({ length: players }, () => 0);
  let pot = 0;
  return history.map((summary) => {
    const { payments, potDelta } = summary.result;
    balances = balances.map((b, seat) => b + (payments[seat] ?? 0));
    pot += potDelta;
    return { summary, payments: [...payments], balances: [...balances], pot };
  });
}

// ---------------------------------------------------------------------------------------------
// Endabrechnung

/** Eine Überweisung der Endabrechnung. */
export interface Transfer {
  from: Seat;
  to: Seat;
  /** Cent, immer > 0. */
  amount: number;
}

export interface FinalSettlement {
  /** Anteil des stehengebliebenen Potts, den jeder zurückbekommt (Annahme 13). */
  refunds: number[];
  /** Stand je Sitz nach der Rückzahlung; die Summe ist 0. */
  balances: number[];
  /** Die Überweisungen, so wenige wie möglich. */
  transfers: Transfer[];
}

/**
 * Verteilt den Pott zu gleichen Teilen. Bleiben Cent übrig, bekommen sie die mit dem niedrigsten
 * Stand – je einer, bei Gleichstand der niedrigere Sitz.
 */
export function refundPot(balances: readonly number[], pot: number): number[] {
  const n = balances.length;
  const refunds = Array.from({ length: n }, () => (pot > 0 ? Math.floor(pot / n) : 0));
  let rest = pot > 0 ? pot - refunds.reduce((a, b) => a + b, 0) : 0;
  const order = balances.map((_, s) => s).sort((a, b) => balances[a]! - balances[b]! || a - b);
  for (const seat of order) {
    if (rest <= 0) break;
    refunds[seat]! += 1;
    rest--;
  }
  return refunds;
}

/**
 * Überweisungen, die alle Salden ausgleichen, mit der kleinstmöglichen Anzahl: Die Salden
 * werden in möglichst viele Gruppen mit Summe 0 zerlegt (eine Gruppe aus k Personen braucht
 * k − 1 Überweisungen). Exakt für bis zu 12 Beteiligte mit Saldo ≠ 0, darüber gierig.
 */
export function minimalTransfers(balances: readonly number[]): Transfer[] {
  const people = balances.map((amount, seat) => ({ seat, amount })).filter((p) => p.amount !== 0);
  const total = people.reduce((sum, p) => sum + p.amount, 0);
  if (total !== 0) throw new Error('Salden gleichen sich nicht aus');
  const groups = people.length <= 12 ? bestGroups(people) : [people];
  return groups.flatMap(settleGroup);
}

type Person = { seat: Seat; amount: number };

/** Zerlegung in die meisten Gruppen mit Summe 0 (Teilmengen-Rechnung über Bitmasken). */
function bestGroups(people: Person[]): Person[][] {
  const n = people.length;
  const full = (1 << n) - 1;
  const sum = new Array<number>(full + 1).fill(0);
  for (let mask = 1; mask <= full; mask++) {
    const low = Math.log2(mask & -mask);
    sum[mask] = sum[mask & (mask - 1)]! + people[low]!.amount;
  }
  // best[mask]: die meisten Nullsummen-Gruppen, in die sich `mask` zerlegen lässt (−∞ = geht nicht).
  const best = new Array<number>(full + 1).fill(-Infinity);
  const pick = new Array<number>(full + 1).fill(0);
  best[0] = 0;
  for (let mask = 1; mask <= full; mask++) {
    if (sum[mask] !== 0) continue;
    const low = mask & -mask; // die Gruppe mit dem niedrigsten Mitglied abtrennen
    for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
      if ((sub & low) === 0 || sum[sub] !== 0) continue;
      const score = best[mask ^ sub]! + 1;
      if (score > best[mask]!) {
        best[mask] = score;
        pick[mask] = sub;
      }
    }
  }
  const groups: Person[][] = [];
  for (let mask = full; mask > 0; mask ^= pick[mask]!) {
    const sub = pick[mask]!;
    groups.push(people.filter((_, i) => sub & (1 << i)));
  }
  return groups;
}

/** Eine Gruppe mit Summe 0 ausgleichen: immer größter Schuldner an größten Gläubiger. */
function settleGroup(group: Person[]): Transfer[] {
  const debtors = group.filter((p) => p.amount < 0).map((p) => ({ ...p }));
  const creditors = group.filter((p) => p.amount > 0).map((p) => ({ ...p }));
  const transfers: Transfer[] = [];
  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort((a, b) => a.amount - b.amount || a.seat - b.seat);
    creditors.sort((a, b) => b.amount - a.amount || a.seat - b.seat);
    const debtor = debtors[0]!;
    const creditor = creditors[0]!;
    const amount = Math.min(-debtor.amount, creditor.amount);
    transfers.push({ from: debtor.seat, to: creditor.seat, amount });
    debtor.amount += amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) debtors.shift();
    if (creditor.amount === 0) creditors.shift();
  }
  return transfers.sort((a, b) => b.amount - a.amount || a.from - b.from || a.to - b.to);
}

/**
 * Endabrechnung des Abends: der stehengebliebene Pott geht zu gleichen Teilen zurück
 * (Annahme 13), dann gleichen möglichst wenige Überweisungen die Stände aus.
 */
export function settleUp(balances: readonly number[], pot: number): FinalSettlement {
  const refunds = refundPot(balances, pot);
  const after = balances.map((b, seat) => b + refunds[seat]!);
  return { refunds, balances: after, transfers: minimalTransfers(after) };
}
