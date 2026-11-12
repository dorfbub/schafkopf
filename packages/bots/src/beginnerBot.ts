import {
  type Bot,
  type HandView,
  type PlayerAction,
  MODES,
  createRng,
  pick,
} from '@schafkopf/core';
import {
  createHeuristicBot,
  createMemory,
  heuristicCard,
  rateContract,
  updateMemory,
} from './heuristicBot';

/**
 * Anfänger (B2): spielt nach denselben Faustregeln wie der Heuristik-Bot, macht aber die
 * Fehler, die man am Anfang macht – immer regelgerecht:
 *
 *  - **Zählt nicht mit:** Er sieht nur den laufenden Stich, nicht, was vorher gefallen ist.
 *    Dadurch hält er Karten für hoch, die es nicht mehr sind, und übersieht Fehlfarben.
 *  - **Fehlgriffe:** Mit `mistakeRate` (Standard 40 %) legt er eine beliebige erlaubte Karte.
 *  - **Überreizt:** Ein knappes Sauspiel-Blatt (Marge ab −1,5) meldet er in der Hälfte der
 *    Fälle trotzdem an.
 */
export interface BeginnerBotOptions {
  mistakeRate?: number;
}

export function createBeginnerBot(seed: number, options: BeginnerBotOptions = {}): Bot {
  const mistakeRate = options.mistakeRate ?? 0.4;
  const heuristic = createHeuristicBot(seed);
  const rng = createRng([seed >>> 0, 0x2545f491, 0x1b873593, 0xcc9e2d51]);
  return {
    decide(view: HandView): PlayerAction {
      if (view.phase === 'bidding') return overbid(view, heuristic.decide(view), rng);
      if (view.phase !== 'playing') return heuristic.decide(view);
      const legal = view.legalCards;
      if (legal.length <= 1 || rng() < mistakeRate) return { type: 'play', card: pick(legal, rng) };
      // Gedächtnis nur aus dem laufenden Stich: der vorige Stich bleibt außen vor.
      const memory = createMemory();
      const forgetful: HandView = { ...view, lastTrick: null };
      updateMemory(memory, forgetful);
      return { type: 'play', card: heuristicCard(forgetful, memory, rng) };
    },
  };
}

const OVERBID_MARGIN = -1.5;
const OVERBID_RATE = 0.5;

function overbid(view: HandView, action: PlayerAction, rng: () => number): PlayerAction {
  if (action.type !== 'bid' || action.call.type !== 'pass') return action;
  if (view.auction.stage !== 'interest') return action;
  const interest = view.legalCalls.find((c) => c.type === 'interest');
  if (!interest) return action;
  const deckSize = view.handSizes.reduce((a, b) => a + b, 0);
  const suits = MODES.sauspiel.suitChoices?.(view.hand) ?? [];
  const best = Math.max(
    -10,
    ...suits.map((suit) => rateContract(view.hand, { kind: 'sauspiel', suit }, deckSize)),
  );
  if (best >= OVERBID_MARGIN && rng() < OVERBID_RATE) return { type: 'bid', call: interest };
  return action;
}
