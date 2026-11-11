/**
 * Referenzspiele für den Umbau des Kerns (K3a): 500 Zufallsspiele mit festem Seed-Satz.
 * Die Ergebnisse vom Stand vor dem Umbau liegen in `reference-games.json`; der Test in
 * `reference.test.ts` spielt dieselben Spiele und vergleicht.
 *
 * Die Zufallsentscheidungen hängen an der Reihenfolge von `legalCalls`/`legalCards`.
 * Ändert sich diese, ist das eine Verhaltensänderung und der Vergleich schlägt zu Recht fehl.
 */

import {
  type Contract,
  type HandState,
  type Rng,
  type Seat,
  DEFAULT_RULES,
  applyAction,
  createRng,
  dealHand,
  legalCalls,
  legalCards,
} from '@schafkopf/core';

export const REFERENCE_GAMES = 500;

export interface ReferenceGame {
  seed: number;
  contract: Contract | null;
  declarer: Seat | null;
  partner: Seat | null;
  payments: number[];
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]!;
}

/** Spielt ein Spiel mit zufälligen, regelkonformen Zügen zu Ende. */
export function playReferenceGame(seed: number): HandState {
  // Eigener Zufall für die Züge, getrennt vom Seed der Mischung.
  const rng = createRng(seed * 7919 + 13);
  let state = dealHand(DEFAULT_RULES, seed % 4, seed);
  while (state.phase !== 'finished') {
    const seat = state.turn;
    const result =
      state.phase === 'bidding'
        ? (() => {
            const options = legalCalls(state, seat);
            // Passive Rufe stehen vorn, danach die niedrigsten aktiven. Etwa jeder zweite Ruf
            // ist aktiv, oft der niedrigste – so kommen Sauspiele, Zweikämpfe und Tout vor.
            const declare = options[0]!.type === 'declare';
            const active = declare || rng() < 0.5;
            const lowest = declare ? options[0]! : options[1];
            const call = !active
              ? options[0]!
              : lowest && rng() < 0.5
                ? lowest
                : pick(options, rng);
            return applyAction(state, { type: 'bid', seat, call });
          })()
        : applyAction(state, { type: 'play', seat, card: pick(legalCards(state, seat), rng) });
    if (!result.ok) throw new Error(`Seed ${seed}: ${result.error}`);
    state = result.state;
  }
  return state;
}

export function referenceGame(seed: number): ReferenceGame {
  const state = playReferenceGame(seed);
  return {
    seed,
    contract: state.contract,
    declarer: state.declarer,
    partner: state.partner,
    payments: state.result!.payments,
  };
}

export function referenceGames(): ReferenceGame[] {
  return Array.from({ length: REFERENCE_GAMES }, (_, i) => referenceGame(i + 1));
}
