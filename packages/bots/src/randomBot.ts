import {
  type BidCall,
  type Bot,
  type HandView,
  type PlayerAction,
  type Rng,
  MODES,
  createRng,
  type SeedInput,
  pick,
} from '@schafkopf/core';

/**
 * Einfachster Bot: spielt regelkonform, aber zufällig. Will nur ein Sauspiel spielen,
 * wenn er mindestens `minTrumps` Trümpfe hält und eine Sau rufen kann – sonst "weiter".
 * Im Zweikampf hält bzw. nennt er höchstens ein Sauspiel.
 * Dient als Platzhalter und als Vorlage für stärkere Bots.
 */
export function createRandomBot(seed: SeedInput, minTrumps = 5): Bot {
  const rng: Rng = createRng(seed);

  function wantsSauspiel(view: HandView): boolean {
    const trumps = MODES.sauspiel.trumps({ kind: 'sauspiel' }, 0);
    const trumpCount = view.hand.filter((c) => trumps.includes(c)).length;
    const callable = MODES.sauspiel.suitChoices?.(view.hand) ?? [];
    return trumpCount >= minTrumps && callable.length > 0;
  }

  function bid(view: HandView): BidCall {
    const calls = view.legalCalls;
    const find = (ok: (c: BidCall) => boolean) => calls.find(ok);
    const passive = calls[0]!;
    switch (view.auction.stage) {
      case 'interest':
        return (wantsSauspiel(view) && find((c) => c.type === 'interest')) || passive;
      case 'duel': {
        if (!wantsSauspiel(view)) return passive;
        const sauspiel = find((c) => c.type === 'name' && c.level.kind === 'sauspiel');
        const hold = view.auction.level?.kind === 'sauspiel' && find((c) => c.type === 'hold');
        return sauspiel || hold || passive;
      }
      case 'declare': {
        const sauspiele = calls.filter(
          (c) => c.type === 'declare' && c.contract.kind === 'sauspiel',
        );
        return pick(sauspiele.length > 0 ? sauspiele : calls, rng);
      }
    }
  }

  return {
    decide(view: HandView): PlayerAction {
      if (view.phase === 'bidding') return { type: 'bid', call: bid(view) };
      return { type: 'play', card: pick(view.legalCards, rng) };
    },
  };
}
