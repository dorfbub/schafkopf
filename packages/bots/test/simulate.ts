import {
  type Bot,
  type HandState,
  type PlayerAction,
  type RuleSet,
  type Seat,
  DEFAULT_RULES,
  applyAction,
  dealHand,
  handViewFor,
} from '@schafkopf/core';

/** Prüft jede Aktion eines Bots; meldet unerlaubte Aktionen statt sie zu verschlucken. */
export type ActionHook = (seat: Seat, action: PlayerAction, state: HandState) => void;

/**
 * Spielt ein komplettes Spiel mit den gegebenen Bots (Index = Sitz) und gibt den
 * Endzustand zurück. Wirft, sobald ein Bot eine unerlaubte Aktion liefert.
 */
export function playHand(
  bots: readonly Bot[],
  seed: number,
  dealer: Seat,
  rules: RuleSet = DEFAULT_RULES,
  hook?: ActionHook,
): HandState {
  let state = dealHand(rules, dealer, seed);
  for (let step = 0; state.phase !== 'finished'; step++) {
    if (step > 200) throw new Error('Spiel endet nicht');
    const seat = state.turn;
    const action = bots[seat]!.decide(handViewFor(state, seat), rules);
    hook?.(seat, action, state);
    const result = applyAction(state, { ...action, seat });
    if (!result.ok) {
      throw new Error(
        `Unerlaubte Aktion von Sitz ${seat} (Seed ${seed}): ${JSON.stringify(action)} – ${result.error}`,
      );
    }
    state = result.state;
  }
  return state;
}
