/**
 * Ramsch (docs/REGELN.md, „Varianten“): jeder für sich, wer die meisten Augen hat, verliert.
 * Stufe 1 der Abrechnung (`Outcome`); die Jungfrauen sind Faktoren und kommen in Stufe 2
 * (`factorsFor` in `scoring.ts`) dazu.
 */

import type { Card } from './cards';
import type { HandState, Seat } from './hand';
import { orderFor } from './modes';
import type { Outcome, RamschDetails } from './scoring';

/** Ab so vielen Augen gewinnt ein Spieler den Ramsch allein (Durchmarsch). */
export const DURCHMARSCH_POINTS = 91;

export function ramschOutcome(state: HandState): Outcome {
  const { rules, tricks } = state;
  if (!state.contract) throw new Error('Abrechnung ohne Spielart');
  const seats = Array.from({ length: rules.players }, (_, s) => s);
  // Die Trümpfe im Ramsch wechseln nicht; Stich 0 genügt.
  const trumps = orderFor(state.contract, 0).trumps;
  const wonBy = (seat: Seat) => tricks.filter((t) => t.winner === seat);
  const points = seats.map((s) => wonBy(s).reduce((sum, t) => sum + t.points, 0));
  const trickCount = seats.map((s) => wonBy(s).length);
  const base = rules.tariff.ramsch;
  const parts: Outcome['parts'] = [{ label: 'grundtarif', amount: base }];

  const durchmarsch = rules.ramsch.durchmarsch
    ? seats.find((s) => points[s]! >= DURCHMARSCH_POINTS)
    : undefined;
  if (durchmarsch !== undefined) {
    const details: RamschDetails = {
      type: 'ramsch',
      points,
      tricks: trickCount,
      loser: null,
      durchmarsch,
      // Beim Durchmarsch zählen Jungfrauen nicht (Annahme 11).
      jungfrauen: [],
    };
    return {
      winners: [durchmarsch],
      losers: seats.filter((s) => s !== durchmarsch),
      value: base,
      parts,
      declarerWon: null,
      details,
    };
  }

  // Annahme 10 und 20: Augen, dann Stiche, dann Zahl der Trümpfe in den Stichen, dann der
  // höchste Trumpf, zuletzt der spätere Stich. Der „Größte“ nach diesem Vergleich verliert.
  const trumpsIn = (seat: Seat): Card[] =>
    wonBy(seat)
      .flatMap((t) => t.cards)
      .filter((c) => trumps.includes(c));
  const highest = (seat: Seat): number => {
    const own = trumpsIn(seat).map((c) => trumps.indexOf(c));
    // Höherer Wert = höherer Trumpf; ohne Trumpf ganz unten.
    return own.length === 0 ? -1 : trumps.length - Math.min(...own);
  };
  const lastTrick = (seat: Seat): number => tricks.map((t) => t.winner).lastIndexOf(seat);
  const keys = (seat: Seat): number[] => [
    points[seat]!,
    trickCount[seat]!,
    trumpsIn(seat).length,
    highest(seat),
    lastTrick(seat),
  ];
  const keyOf = seats.map(keys);
  const loser = seats.reduce((worst, seat) => {
    const diff = keyOf[seat]!.map((v, i) => v - keyOf[worst]![i]!).find((d) => d !== 0) ?? 0;
    return diff > 0 ? seat : worst;
  });

  const details: RamschDetails = {
    type: 'ramsch',
    points,
    tricks: trickCount,
    loser,
    durchmarsch: null,
    jungfrauen: rules.ramsch.jungfrau ? seats.filter((s) => trickCount[s] === 0) : [],
  };
  return {
    winners: seats.filter((s) => s !== loser),
    losers: [loser],
    value: base,
    parts,
    declarerWon: null,
    details,
  };
}
