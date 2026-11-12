import {
  type Card,
  type CardOrder,
  type Contract,
  type EffectiveSuit,
  type HandView,
  type RuleSet,
  type Seat,
  MODES,
  card,
  createDeck,
  effectiveSuit,
  orderFor,
  pointsOf,
  strength,
  trickWinnerIndex,
  tricksPlayed,
} from '@schafkopf/core';
import type { TutorInput } from './types';

export type Side = 'friend' | 'foe' | 'unknown';

/**
 * Die Lage aus Sicht des Fragenden – nur aus Sicht, Tischregeln und gesehenen Stichen abgeleitet.
 * Grundlage der Faustregeln.
 */
export interface Lage {
  view: HandView;
  rules: RuleSet;
  me: Seat;
  players: number;
  hand: readonly Card[];
  contract: Contract | null;
  /** Ordnung des laufenden Stichs (nur im Kartenspiel). */
  order: CardOrder | null;
  /** Sind alle Stiche bekannt? Sonst sind `played`, `voids`, `ledSuits` lückenhaft. */
  historyComplete: boolean;
  /** Gefallene Karten (fertige Stiche und laufender Stich). */
  played: Set<Card>;
  /** Karten, die man weder hat noch hat fallen sehen. */
  unseen: Card[];
  /** Erkannte Fehlfarben je Sitz (aus der Bedienpflicht). */
  voids: Set<EffectiveSuit>[];
  /** Farben, die in fertigen Stichen schon angespielt wurden. */
  ledSuits: Set<EffectiveSuit>;
  /** Gehört man selbst zur Spielerpartei? */
  declarerSide: boolean;
  sideOf(seat: Seat): Side;
  trickCards: readonly Card[];
  leading: boolean;
  leadSuit: EffectiveSuit | null;
  winnerSeat: Seat | null;
  winningCard: Card | null;
  trickPoints: number;
  /** Sitze, die in diesem Stich nach einem selbst noch spielen. */
  laterSeats: Seat[];
  /** Rufsau im Sauspiel (auch wenn gefallen), sonst `null`. */
  calledAce: Card | null;
  isTrump(c: Card): boolean;
  eff(c: Card): EffectiveSuit;
  str(c: Card): number;
  /** Höchste noch nicht gefallene Karte ihrer Farbe (bei den anderen keine höhere)? */
  isTopOfSuit(c: Card): boolean;
  /** Würde `c` den laufenden Stich jetzt gewinnen? */
  wins(c: Card): boolean;
  /** Könnte keiner der (möglichen) Gegner nach mir `best` noch schlagen? */
  safeAgainstLater(best: Card): boolean;
}

export function buildLage({ view, rules, seat, history }: TutorInput): Lage {
  const players = view.handSizes.length;
  const contract = view.contract;
  const done = tricksPlayed(view);
  const historyComplete = history.length === done;
  const tricks = historyComplete ? history : view.lastTrick ? [view.lastTrick] : [];
  const firstIndex = historyComplete ? 0 : done - tricks.length;
  const order = contract ? orderFor(contract, done) : null;
  const deck = createDeck(rules.deck);

  const played = new Set<Card>();
  const voids = view.handSizes.map(() => new Set<EffectiveSuit>());
  const ledSuits = new Set<EffectiveSuit>();
  const note = (t: { leader: Seat; cards: readonly Card[] }, index: number, completed: boolean) => {
    if (!contract) return;
    const o = orderFor(contract, index);
    const lead = t.cards[0];
    if (lead === undefined) return;
    const leadSuit = effectiveSuit(lead, o);
    if (completed) ledSuits.add(leadSuit);
    t.cards.forEach((c, i) => {
      played.add(c);
      if (i > 0 && effectiveSuit(c, o) !== leadSuit) voids[(t.leader + i) % players]!.add(leadSuit);
    });
  };
  tricks.forEach((t, i) => note(t, firstIndex + i, true));
  note(view.currentTrick, done, false);
  const unseen = deck.filter((c) => !played.has(c) && !view.hand.includes(c));

  const isTrump = (c: Card) => order !== null && order.trumps.includes(c);
  const eff = (c: Card): EffectiveSuit => (order ? effectiveSuit(c, order) : 'trump');
  const str = (c: Card) => (order ? strength(c, order) : 0);

  const declarer = view.declarer;
  const parties = contract ? MODES[contract.kind].parties : 'everyone';
  const partner = view.partner;
  const declarerSide = seat === declarer || partner === seat;
  const sideOf = (s: Seat): Side => {
    if (s === seat) return 'friend';
    if (parties === 'everyone' || declarer === null) return 'foe';
    const sDecl =
      s === declarer ? true : parties === 'alone' ? false : partner !== null ? s === partner : null;
    if (sDecl === null) return 'unknown';
    return sDecl === declarerSide ? 'friend' : 'foe';
  };

  const trickCards = view.currentTrick.cards;
  const leading = trickCards.length === 0;
  const leadSuit = !leading && trickCards[0] ? eff(trickCards[0]) : null;
  const winIdx = !leading && order ? trickWinnerIndex(trickCards, order) : -1;
  const winnerSeat = winIdx >= 0 ? (view.currentTrick.leader + winIdx) % players : null;
  const winningCard = winIdx >= 0 ? trickCards[winIdx]! : null;
  const trickPoints = trickCards.reduce((s, c) => s + pointsOf(c), 0);
  const later = players - trickCards.length - 1;
  const laterSeats = Array.from({ length: Math.max(0, later) }, (_, i) => (seat + 1 + i) % players);

  const calledAce =
    contract && parties === 'calledAce' && contract.suit ? card(contract.suit, 'A') : null;

  const isTopOfSuit = (c: Card) => {
    const suit = eff(c);
    return !unseen.some((u) => eff(u) === suit && str(u) > str(c));
  };
  const wins = (c: Card) =>
    order !== null && trickWinnerIndex([...trickCards, c], order) === trickCards.length;

  /** Wie im Heuristik-Bot: höhere Karte der Farbe oder (bei möglicher Fehlfarbe) ein Trumpf. */
  const canBeat = (s: Seat, best: Card, suit: EffectiveSuit) => {
    const higherInSuit = unseen.some(
      (u) => eff(u) === suit && eff(best) === suit && str(u) > str(best),
    );
    if (!voids[s]!.has(suit) && higherInSuit) return true;
    if (suit === 'trump' || voids[s]!.has('trump')) return false;
    const left = unseen.filter((u) => eff(u) === suit).length;
    if (!voids[s]!.has(suit) && left >= 3) return false;
    return unseen.some((u) => isTrump(u) && (!isTrump(best) || str(u) > str(best)));
  };
  const safeAgainstLater = (best: Card) => {
    const suit = leadSuit ?? eff(best);
    return laterSeats.filter((s) => sideOf(s) !== 'friend').every((s) => !canBeat(s, best, suit));
  };

  return {
    view,
    rules,
    me: seat,
    players,
    hand: view.hand,
    contract,
    order,
    historyComplete,
    played,
    unseen,
    voids,
    ledSuits,
    declarerSide,
    sideOf,
    trickCards,
    leading,
    leadSuit,
    winnerSeat,
    winningCard,
    trickPoints,
    laterSeats,
    calledAce,
    isTrump,
    eff,
    str,
    isTopOfSuit,
    wins,
    safeAgainstLater,
  };
}
