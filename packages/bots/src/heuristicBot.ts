import {
  type BidCall,
  type Bot,
  type Card,
  type CardOrder,
  type Contract,
  type ContractKind,
  type EffectiveSuit,
  type HandView,
  type PlayerAction,
  type Rng,
  type Seat,
  type Suit,
  type Trick,
  BID_ORDER,
  MODES,
  SUITS,
  bidValue,
  card,
  createDeck,
  createRng,
  effectiveSuit,
  orderFor,
  pointsOf,
  rankOf,
  strength,
  suitOf,
  trickWinnerIndex,
  tricksPlayed,
} from '@schafkopf/core';

/**
 * Heuristik-Bot: sagt nach Blattstärke an und spielt nach einfachen Faustregeln,
 * wie man sie am Wirtshaustisch lernt. Er sieht nur, was ein Mensch sieht (`HandView`),
 * und merkt sich dafür selbst, welche Karten schon gefallen sind und wer welche Farbe
 * nicht mehr hat. Eine Instanz gehört zu genau einem Sitz und überdauert mehrere Spiele.
 *
 * Aufbau:
 *  - `Memory`: gefallene Karten und erkannte Fehlfarben, wird bei jedem Aufruf aus
 *    `lastTrick` und `currentTrick` nachgeführt (zwischen zwei eigenen Zügen endet
 *    höchstens ein Stich – der, zu dem man selbst beigetragen hat).
 *  - Ansage: `rateContract` bewertet jedes mögliche Spiel mit einer Punktzahl abzüglich
 *    Schwelle („Marge“); gewünscht sind Spiele mit Marge ≥ 0. Daraus folgen alle drei
 *    Stufen der Ansage.
 *  - Kartenspiel: anspielen (`lead`), zugeben (`follow`) und Bettel (`bettelCard`) als
 *    getrennte Faustregel-Ketten. Parteien ergeben sich aus `declarer`, `partner` und der
 *    eigenen Rufsau.
 *
 * Zufall nur für Gleichstände, über den übergebenen Seed.
 */
export function createHeuristicBot(seed: number): Bot {
  const rng = createRng(seed);
  const memory = createMemory();
  return {
    decide(view: HandView): PlayerAction {
      updateMemory(memory, view);
      if (view.phase === 'bidding') return { type: 'bid', call: bid(view, rng) };
      return { type: 'play', card: play(view, memory, rng) };
    },
  };
}

// ---------------------------------------------------------------------------
// Gedächtnis

interface Memory {
  /** Alle Karten, die in diesem Spiel schon gefallen sind (auch eigene). */
  played: Set<Card>;
  /** Fehlfarben je Sitz (effektive Farbe, also auch 'trump'). */
  voids: Set<EffectiveSuit>[];
  /** Anzahl abgeschlossener Stiche beim letzten Aufruf. */
  tricksSeen: number;
  /** Kartenzahl des ganzen Blatts (32 oder 24). */
  deckSize: number;
}

function createMemory(): Memory {
  return { played: new Set(), voids: [], tricksSeen: 0, deckSize: 32 };
}

function resetMemory(memory: Memory, view: HandView): void {
  memory.played = new Set();
  memory.voids = view.handSizes.map(() => new Set());
  memory.tricksSeen = 0;
  memory.deckSize = view.handSizes.reduce((a, b) => a + b, 0);
}

function noteTrick(memory: Memory, trick: Trick, order: CardOrder, players: number): void {
  const lead = trick.cards[0];
  if (lead === undefined) return;
  const leadSuit = effectiveSuit(lead, order);
  trick.cards.forEach((c, i) => {
    memory.played.add(c);
    if (i > 0 && effectiveSuit(c, order) !== leadSuit) {
      memory.voids[(trick.leader + i) % players]!.add(leadSuit);
    }
  });
}

function updateMemory(memory: Memory, view: HandView): void {
  const completed = tricksPlayed(view);
  // Neues Spiel: Ansage läuft, oder es sind weniger Stiche gespielt als zuletzt gesehen.
  if (
    view.phase === 'bidding' ||
    completed < memory.tricksSeen ||
    memory.voids.length !== view.handSizes.length
  ) {
    resetMemory(memory, view);
    if (view.phase === 'bidding') return;
  }
  if (!view.contract) return;
  const players = view.handSizes.length;
  if (completed > memory.tricksSeen && view.lastTrick) {
    noteTrick(memory, view.lastTrick, orderFor(view.contract, completed - 1), players);
  }
  memory.tricksSeen = completed;
  noteTrick(memory, view.currentTrick, orderFor(view.contract, completed), players);
}

// ---------------------------------------------------------------------------
// Ansage

/**
 * Spielarten, die der Bot bewerten und spielen kann. Neue Spielarten (Hausregeln) sagt er
 * nicht selbst an; als Gegenspieler behandelt er sie mit den allgemeinen Faustregeln.
 */
const KNOWN_KINDS: readonly ContractKind[] = [
  'sauspiel',
  'bettel',
  'geier',
  'farbwenz',
  'wenz',
  'solo',
];

/** Alle Spiele, die mit diesem Blatt formal möglich wären (Tischregeln unbekannt). */
function candidateContracts(hand: readonly Card[]): Contract[] {
  const out: Contract[] = [];
  for (const kind of BID_ORDER) {
    if (!KNOWN_KINDS.includes(kind)) continue;
    const mode = MODES[kind];
    if (mode.eligible && !mode.eligible(hand)) continue;
    const suits = mode.suitRole === 'none' ? [undefined] : (mode.suitChoices?.(hand) ?? SUITS);
    for (const suit of suits) {
      const base: Contract = suit ? { kind, suit } : { kind };
      out.push(base);
      if (mode.canTout) out.push({ ...base, tout: true });
    }
  }
  return out;
}

const SIDE_ACE = 1.0;

/** Bonus für hohe Karten einer Nebenfarbe: Sau, Zehner neben der Sau. */
function sideStrength(hand: readonly Card[], order: CardOrder, suit: Suit): number {
  const cards = hand.filter((c) => effectiveSuit(c, order) === suit);
  const has = (rank: string) => cards.some((c) => rankOf(c) === rank);
  let s = 0;
  if (has('A')) s += SIDE_ACE;
  if (has('A') && has('10')) s += 0.5;
  return s;
}

/** Farbe mit Karten, die nicht Trumpf sind (im Sauspiel z. B. nicht Herz). */
function isSideSuit(order: CardOrder, suit: Suit): boolean {
  return order.rankOrder.some((r) => !order.trumps.includes(card(suit, r)));
}

function voidCount(hand: readonly Card[], order: CardOrder, skip?: Suit): number {
  return SUITS.filter(
    (suit) =>
      suit !== skip &&
      isSideSuit(order, suit) &&
      !hand.some((c) => effectiveSuit(c, order) === suit),
  ).length;
}

/** Wert eines Trumpfs nach seiner Position in der Trumpfreihe. */
function trumpWeights(order: CardOrder, weights: readonly number[], rest: number) {
  return (c: Card) => {
    const i = order.trumps.indexOf(c);
    return i < 0 ? 0 : (weights[i] ?? rest);
  };
}

/** Sichere Stiche in Wenz/Geier: Folgen von oben in den Nebenfarben. */
function topSequenceValue(hand: readonly Card[], order: CardOrder): number {
  let s = 0;
  for (const suit of SUITS) {
    const ranks = order.rankOrder.filter((r) => !order.trumps.includes(card(suit, r)));
    const mine = hand.filter((c) => effectiveSuit(c, order) === suit);
    const values = [1.5, 1.2, 1.0, 0.8, 0.6, 0.5, 0.5];
    let i = 0;
    while (i < ranks.length && mine.includes(card(suit, ranks[i]!))) {
      s += values[i] ?? 0.5;
      i++;
    }
    if (i > 0 && mine.length >= 4) s += 0.3 * (mine.length - 3);
    if (i === 0 && mine.some((c) => rankOf(c) === '10') && mine.length >= 2) s += 0.3;
  }
  return s;
}

/** Bettel ist nur sicher, wenn in jeder Farbe die k-t-niedrigste Karte niedrig genug ist. */
function bettelSafe(hand: readonly Card[], order: CardOrder, deckSize: number): boolean {
  const ranksLowFirst = [...order.rankOrder].reverse().filter((r) => {
    if (deckSize < 32) return r !== '7' && r !== '8';
    return true;
  });
  for (const suit of SUITS) {
    const mine = hand
      .filter((c) => suitOf(c) === suit)
      .map((c) => ranksLowFirst.indexOf(rankOf(c)))
      .sort((a, b) => a - b);
    if (mine.some((idx, k) => idx > 2 * k)) return false;
  }
  return true;
}

/** Tout nur, wenn das Blatt praktisch sicher alle Stiche macht. */
function toutSafe(hand: readonly Card[], contract: Contract, order: CardOrder): boolean {
  const mine = (c: Card) => hand.includes(c);
  const allTrump = hand.every((c) => order.trumps.includes(c));
  if (contract.kind === 'wenz' || contract.kind === 'geier') {
    if (!order.trumps.every(mine)) return false;
    // Jede Nebenkarte muss Teil einer Folge von oben sein.
    return SUITS.every((suit) => {
      const own = hand.filter((c) => suitOf(c) === suit && !order.trumps.includes(c));
      const ranks = order.rankOrder.filter((r) => !order.trumps.includes(card(suit, r)));
      return own.every((c) => ranks.indexOf(rankOf(c)) < own.length);
    });
  }
  return allTrump && order.trumps.slice(0, 4).every(mine);
}

/**
 * Bewertung eines Spiels für dieses Blatt: Punktzahl minus Schwelle. Ab 0 wird es angesagt.
 * Die Gewichte sind von Hand gesetzt und über Simulationen grob abgestimmt.
 */
export function rateContract(hand: readonly Card[], contract: Contract, deckSize = 32): number {
  // Bewertet wird das Blatt vor dem ersten Stich.
  const order = orderFor(contract, 0);
  const trumps = hand.filter((c) => order.trumps.includes(c));
  const t = trumps.length;
  const sides = SUITS.filter((s) => isSideSuit(order, s));
  const sideSum = (skip?: Suit) =>
    sides.filter((s) => s !== skip).reduce((sum, s) => sum + sideStrength(hand, order, s), 0);

  if (contract.tout) {
    const base = rateContract(hand, { kind: contract.kind, suit: contract.suit }, deckSize);
    return base >= 0 && toutSafe(hand, contract, order) ? base + 1 : -10;
  }

  switch (contract.kind) {
    case 'sauspiel': {
      const w = trumpWeights(order, [1.8, 1.6, 1.5, 1.4, 1.2, 1.2, 1.1, 1.1, 1.1, 1.0], 0.8);
      const called = hand.filter((c) => effectiveSuit(c, order) === contract.suit);
      const score =
        trumps.reduce((s, c) => s + w(c), 0) +
        sideSum(contract.suit) +
        0.5 * voidCount(hand, order, contract.suit) -
        0.2 * (called.length - 1) -
        (called.some((c) => rankOf(c) === '10') ? 0.2 : 0);
      return t < 4 ? -10 : score - 5.2;
    }
    case 'solo': {
      const w = trumpWeights(order, [2.3, 2.1, 2.0, 1.9, 1.6, 1.5, 1.4, 1.4, 1.3, 1.2], 1.0);
      const score = trumps.reduce((s, c) => s + w(c), 0) + sideSum() + 0.6 * voidCount(hand, order);
      return t < 6 ? -10 : score - 10.8;
    }
    case 'farbwenz': {
      const w = trumpWeights(order, [2.2, 2.0, 1.7, 1.5, 1.3, 1.2, 1.0], 0.9);
      const score = trumps.reduce((s, c) => s + w(c), 0) + sideSum() + 0.6 * voidCount(hand, order);
      return t < 6 ? -10 : score - 10.8;
    }
    case 'wenz':
    case 'geier': {
      const w = trumpWeights(order, [2.5, 2.2, 1.8, 1.6], 0);
      const score =
        trumps.reduce((s, c) => s + w(c), 0) +
        topSequenceValue(hand, order) +
        0.4 * voidCount(hand, order);
      const top = hand.includes(order.trumps[0]!);
      return t < 2 || (t === 2 && !top) ? -10 : score - 8.3;
    }
    case 'bettel':
      return bettelSafe(hand, order, deckSize) ? 0.5 : -10;
  }
}

interface Rated {
  contract: Contract;
  margin: number;
}

function bestOf(rated: readonly Rated[]): Rated | undefined {
  return [...rated].sort(
    (a, b) => bidValue(b.contract) - bidValue(a.contract) || b.margin - a.margin,
  )[0];
}

function bid(view: HandView, rng: Rng): BidCall {
  const calls = view.legalCalls;
  const passive = calls[0]!;
  const deckSize = view.handSizes.reduce((a, b) => a + b, 0);
  const rated = candidateContracts(view.hand).map((contract) => ({
    contract,
    margin: rateContract(view.hand, contract, deckSize),
  }));
  const wanted = rated.filter((r) => r.margin >= 0);
  const current = view.auction.level ? bidValue(view.auction.level) : 0;

  switch (view.auction.stage) {
    case 'interest':
      return (wanted.length > 0 && calls.find((c) => c.type === 'interest')) || passive;
    case 'duel': {
      if (view.turn === view.auction.holder) {
        const hold = wanted.some((r) => bidValue(r.contract) >= current);
        return (hold && calls.find((c) => c.type === 'hold')) || passive;
      }
      // Forderer: die niedrigste gewünschte Spielart nennen, die überbietet.
      const levels = wanted
        .map((r) => r.contract)
        .filter((c) => bidValue(c) > current)
        .sort((a, b) => bidValue(a) - bidValue(b));
      for (const level of levels) {
        const call = calls.find((c) => c.type === 'name' && bidValue(c.level) === bidValue(level));
        if (call) return call;
      }
      return passive;
    }
    case 'declare': {
      const legal = calls.flatMap((c) => (c.type === 'declare' ? [c.contract] : []));
      const legalRated = rated.filter((r) =>
        legal.some(
          (l) =>
            l.kind === r.contract.kind &&
            l.suit === r.contract.suit &&
            Boolean(l.tout) === Boolean(r.contract.tout),
        ),
      );
      const pickWanted = bestOf(legalRated.filter((r) => r.margin >= 0));
      const fallback = [...legalRated].sort((a, b) => b.margin - a.margin)[0];
      const chosen = pickWanted ?? fallback;
      if (chosen) return { type: 'declare', contract: chosen.contract };
      return calls[Math.floor(rng() * calls.length)]!;
    }
  }
}

// ---------------------------------------------------------------------------
// Kartenspiel

type Side = 'friend' | 'foe' | 'unknown';

interface Ctx {
  view: HandView;
  memory: Memory;
  rng: Rng;
  me: Seat;
  players: number;
  contract: Contract;
  order: CardOrder;
  /** Eigene Partei ist die Spielerpartei. */
  declarerSide: boolean;
  /** Noch nicht gesehene Karten (bei anderen auf der Hand). */
  unseen: Card[];
  sideOf(seat: Seat): Side;
}

function makeCtx(view: HandView, memory: Memory, rng: Rng): Ctx {
  const contract = view.contract!;
  const order = orderFor(contract, tricksPlayed(view));
  const players = view.handSizes.length;
  const me = view.turn;
  const deck = createDeck(memory.deckSize < 32 ? 'kurz' : 'lang');
  const unseen = deck.filter((c) => !view.hand.includes(c) && !memory.played.has(c));
  const declarer = view.declarer!;
  const alone = MODES[contract.kind].parties === 'alone';
  const partner = view.partner;
  const declarerSide = me === declarer || partner === me;

  function sideOf(seat: Seat): Side {
    if (seat === me) return 'friend';
    const seatDeclSide =
      seat === declarer ? true : alone ? false : partner !== null ? seat === partner : null;
    if (seatDeclSide === null) {
      // Sauspiel, Mitspieler noch verdeckt: aus Sicht des Ansagers ist jeder unbekannt,
      // aus Sicht eines Gegenspielers ist einer der beiden anderen sein Partner.
      return 'unknown';
    }
    return seatDeclSide === declarerSide ? 'friend' : 'foe';
  }

  return { view, memory, rng, me, players, contract, order, declarerSide, unseen, sideOf };
}

function play(view: HandView, memory: Memory, rng: Rng): Card {
  const legal = view.legalCards;
  if (legal.length === 1) return legal[0]!;
  const ctx = makeCtx(view, memory, rng);
  if (ctx.contract.kind === 'bettel') return bettelCard(ctx, legal);
  return view.currentTrick.cards.length === 0 ? lead(ctx, legal) : follow(ctx, legal);
}

const isTrump = (ctx: Ctx, c: Card) => ctx.order.trumps.includes(c);
const eff = (ctx: Ctx, c: Card) => effectiveSuit(c, ctx.order);
const str = (ctx: Ctx, c: Card) => strength(c, ctx.order);

/** Wie teuer es ist, einen Trumpf herzugeben (hohe Trümpfe sind Stiche wert). */
function trumpCost(ctx: Ctx, c: Card): number {
  const i = ctx.order.trumps.indexOf(c);
  if (i < 0) return 0;
  if (i < 4) return 8;
  if (i < 8) return 4;
  return 1;
}

function minBy<T>(items: readonly T[], score: (t: T) => number): T {
  let best: T = items[0]!;
  let bestScore = score(best);
  for (const item of items.slice(1)) {
    const s = score(item);
    if (s < bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return best;
}

function maxBy<T>(items: readonly T[], score: (t: T) => number): T {
  return minBy(items, (t) => -score(t));
}

/** Höchste noch nicht gefallene Karte dieser effektiven Farbe bei den anderen? */
function isTopOfSuit(ctx: Ctx, c: Card): boolean {
  const suit = eff(ctx, c);
  return !ctx.unseen.some((u) => eff(ctx, u) === suit && str(ctx, u) > str(ctx, c));
}

/**
 * Könnte `seat` den Stich noch gegen `best` (aktuell höchste Karte) gewinnen?
 * Berücksichtigt erkannte Fehlfarben; bei Farbe mit wenig Restkarten wird mit
 * Fehlfarbe (und damit Einstechen) gerechnet.
 */
function canBeat(ctx: Ctx, seat: Seat, best: Card, leadSuit: EffectiveSuit): boolean {
  const voids = ctx.memory.voids[seat]!;
  const higherInLead = ctx.unseen.some(
    (u) => eff(ctx, u) === leadSuit && eff(ctx, best) === leadSuit && str(ctx, u) > str(ctx, best),
  );
  if (!voids.has(leadSuit) && higherInLead) return true;
  if (leadSuit === 'trump' || voids.has('trump')) return false;
  const leadLeft = ctx.unseen.filter((u) => eff(ctx, u) === leadSuit).length;
  const mayBeVoid = voids.has(leadSuit) || leadLeft < 3;
  if (!mayBeVoid) return false;
  return ctx.unseen.some(
    (u) => isTrump(ctx, u) && (!isTrump(ctx, best) || str(ctx, u) > str(ctx, best)),
  );
}

/** Sitze, die in diesem Stich nach mir noch spielen. */
function laterSeats(ctx: Ctx): Seat[] {
  const n = ctx.players - ctx.view.currentTrick.cards.length - 1;
  return Array.from({ length: n }, (_, i) => (ctx.me + 1 + i) % ctx.players);
}

/** Wäre `best` sicher gegen alle (möglichen) Gegner, die nach mir kommen? */
function safeAgainstLater(ctx: Ctx, best: Card, leadSuit: EffectiveSuit): boolean {
  return laterSeats(ctx)
    .filter((s) => ctx.sideOf(s) !== 'friend')
    .every((s) => !canBeat(ctx, s, best, leadSuit));
}

/** Rufsau-Farbe im Sauspiel schon angespielt (oder die Sau gefallen)? */
function calledSuitSearched(ctx: Ctx): boolean {
  if (ctx.contract.kind !== 'sauspiel') return true;
  return ctx.memory.played.has(card(ctx.contract.suit!, 'A'));
}

/** Billigste Karte zum Abwerfen: wenig Augen, keine Trümpfe, keine sicheren Stiche. */
function cheapest(ctx: Ctx, cards: readonly Card[]): Card {
  const hand = ctx.view.hand;
  return minBy(cards, (c) => {
    const suitLen = hand.filter((h) => eff(ctx, h) === eff(ctx, c)).length;
    return (
      pointsOf(c) +
      (isTrump(ctx, c) ? 6 + trumpCost(ctx, c) : 0) +
      (!isTrump(ctx, c) && isTopOfSuit(ctx, c) ? 5 : 0) +
      suitLen * 0.1 +
      ctx.rng() * 0.01
    );
  });
}

/** Karte zum Schmieren: viele Augen, aber keine hohen Trümpfe. */
function richest(ctx: Ctx, cards: readonly Card[]): Card {
  return maxBy(cards, (c) => pointsOf(c) - 2 * trumpCost(ctx, c) + ctx.rng() * 0.01);
}

function lead(ctx: Ctx, legal: readonly Card[]): Card {
  const { contract } = ctx;
  const trumps = legal.filter((c) => isTrump(ctx, c));
  const sideCards = legal.filter((c) => !isTrump(ctx, c));
  const unseenTrumps = ctx.unseen.filter((c) => isTrump(ctx, c));
  const foes = Array.from({ length: ctx.players }, (_, s) => s).filter(
    (s) => ctx.sideOf(s) === 'foe',
  );

  // Sichere Sau/Farbkarte: höchste ihrer Farbe, kein Gegner sticht ein.
  const sureSide = sideCards.filter(
    (c) =>
      isTopOfSuit(ctx, c) &&
      (unseenTrumps.length === 0 ||
        (foes.every((s) => !ctx.memory.voids[s]!.has(eff(ctx, c))) &&
          ctx.unseen.filter((u) => eff(ctx, u) === eff(ctx, c)).length >= 3)),
  );

  if (ctx.declarerSide) {
    // Spieler: Trumpf ziehen, solange die Gegner noch welche haben können.
    if (trumps.length > 0 && unseenTrumps.length > 0) {
      const top = maxBy(trumps, (c) => str(ctx, c));
      if (isTopOfSuit(ctx, top)) return top;
      // Allein von oben ziehen; im Sauspiel klein anspielen, der Partner sticht mit.
      if (trumps.length >= 2 || sureSide.length === 0) {
        const alone = MODES[contract.kind].parties === 'alone';
        return alone ? top : minBy(trumps, (c) => str(ctx, c));
      }
    }
    // Sauen heimbringen.
    if (sureSide.length > 0) return maxBy(sureSide, (c) => pointsOf(c));
    // Mitspieler im Sauspiel suchen: Ruffarbe anspielen.
    if (contract.kind === 'sauspiel' && !calledSuitSearched(ctx)) {
      const called = sideCards.filter((c) => eff(ctx, c) === contract.suit);
      if (called.length > 0) return minBy(called, (c) => pointsOf(c));
    }
    if (trumps.length > 0 && unseenTrumps.length === 0 && sideCards.length === 0) {
      return maxBy(trumps, (c) => str(ctx, c));
    }
    return cheapest(ctx, legal);
  }

  // Gegenspieler im Sauspiel: Rufsau suchen.
  if (contract.kind === 'sauspiel' && !calledSuitSearched(ctx)) {
    const called = sideCards.filter((c) => eff(ctx, c) === contract.suit);
    if (called.length > 0) return minBy(called, (c) => pointsOf(c) + ctx.rng() * 0.01);
  }
  // Sauen heimbringen, solange die Farbe frisch ist.
  if (sureSide.length > 0) return maxBy(sureSide, (c) => pointsOf(c));
  // Sonst eine billige Farbkarte – bevorzugt in einer Farbe, die der Spieler noch hat.
  if (sideCards.length > 0) {
    const declarer = ctx.view.declarer!;
    const notVoid = sideCards.filter((c) => !ctx.memory.voids[declarer]!.has(eff(ctx, c)));
    const pool = notVoid.length > 0 ? notVoid : sideCards;
    return minBy(pool, (c) => pointsOf(c) + ctx.rng() * 0.01);
  }
  return minBy(trumps, (c) => str(ctx, c));
}

function follow(ctx: Ctx, legal: readonly Card[]): Card {
  const trick = ctx.view.currentTrick;
  const leadSuit = eff(ctx, trick.cards[0]!);
  const winIdx = trickWinnerIndex(trick.cards, ctx.order);
  const winner = (trick.leader + winIdx) % ctx.players;
  const best = trick.cards[winIdx]!;
  const trickPoints = trick.cards.reduce((s, c) => s + pointsOf(c), 0);
  const later = laterSeats(ctx);
  const last = later.length === 0;

  const wins = (c: Card) => trickWinnerIndex([...trick.cards, c], ctx.order) === trick.cards.length;
  const winners = legal.filter(wins);
  const sureWinners = winners.filter((c) => safeAgainstLater(ctx, c, leadSuit));
  const takeScore = (c: Card) => pointsOf(c) - 3 * trumpCost(ctx, c) - str(ctx, c) * 0.001;

  if (ctx.sideOf(winner) === 'friend') {
    if (safeAgainstLater(ctx, best, leadSuit)) {
      // Partner hat den Stich sicher: schmieren.
      return richest(ctx, legal);
    }
    // Unsicher: mit sicherem Stich übernehmen, wenn es sich lohnt.
    if (sureWinners.length > 0 && trickPoints >= 10) return maxBy(sureWinners, takeScore);
    return cheapest(ctx, legal);
  }

  // Gegner (oder Unbekannter) liegt vorn.
  if (sureWinners.length > 0) {
    const pick = maxBy(sureWinners, takeScore);
    const worthIt =
      last || trickPoints + pointsOf(pick) >= 4 || trumpCost(ctx, pick) <= 4 || ctx.declarerSide;
    if (worthIt) return pick;
  }
  if (winners.length > 0 && trickPoints >= 10) {
    // Nicht sicher, aber viel drin: mit dem höchsten Stecher versuchen.
    return maxBy(winners, (c) => str(ctx, c));
  }
  return cheapest(ctx, legal);
}

/** Bettel: Der Spieler will keinen Stich, die Gegner wollen ihm einen aufzwingen. */
function bettelCard(ctx: Ctx, legal: readonly Card[]): Card {
  const trick = ctx.view.currentTrick;
  const declarer = ctx.view.declarer!;
  const wins = (c: Card) => trickWinnerIndex([...trick.cards, c], ctx.order) === trick.cards.length;
  const high = (cards: readonly Card[]) => maxBy(cards, (c) => str(ctx, c) + ctx.rng() * 0.01);
  const low = (cards: readonly Card[]) => minBy(cards, (c) => str(ctx, c) + ctx.rng() * 0.01);

  if (ctx.me === declarer) {
    if (trick.cards.length === 0) return low(legal);
    const under = legal.filter((c) => !wins(c));
    return under.length > 0 ? high(under) : high(legal);
  }

  if (trick.cards.length === 0) {
    const notVoid = legal.filter((c) => !ctx.memory.voids[declarer]!.has(eff(ctx, c)));
    return low(notVoid.length > 0 ? notVoid : legal);
  }
  const offset = (declarer - trick.leader + ctx.players) % ctx.players;
  const declarerPlayed = offset < trick.cards.length;
  if (declarerPlayed) {
    const winIdx = trickWinnerIndex(trick.cards, ctx.order);
    if (winIdx === offset) {
      // Spieler liegt vorn: drunter bleiben, dabei hohe Karten loswerden.
      const under = legal.filter((c) => !wins(c));
      return under.length > 0 ? high(under) : low(legal);
    }
    return high(legal);
  }
  // Spieler kommt noch: niedrig bleiben, damit er schwer drunter kommt.
  return low(legal);
}
