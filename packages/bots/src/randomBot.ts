import {
  type Bot,
  type HandView,
  type PlayerAction,
  type Rng,
  MODES,
  createRng,
  pick,
} from '@schafkopf/core';

/**
 * Einfachster Bot: spielt regelkonform, aber zufällig. Sagt nur ein Sauspiel an,
 * wenn er mindestens `minTrumps` Trümpfe hält – sonst "weiter".
 * Dient als Platzhalter und als Vorlage für stärkere Bots.
 */
export function createRandomBot(seed: number, minTrumps = 5): Bot {
  const rng: Rng = createRng(seed);
  return {
    decide(view: HandView): PlayerAction {
      if (view.phase === 'bidding') {
        const sauspiele = view.legalContracts.filter((c) => c.kind === 'sauspiel');
        const trumps = MODES.sauspiel.trumps({ kind: 'sauspiel' });
        const trumpCount = view.hand.filter((c) => trumps.includes(c)).length;
        if (sauspiele.length > 0 && trumpCount >= minTrumps) {
          return { type: 'bid', contract: pick(sauspiele, rng) };
        }
        return { type: 'bid', contract: null };
      }
      return { type: 'play', card: pick(view.legalCards, rng) };
    },
  };
}
