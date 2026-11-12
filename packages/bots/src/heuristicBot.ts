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
  type RuleSet,
  type Seat,
  type Suit,
  type Trick,
  DEFAULT_RULES,
  MODES,
  SUITS,
  bidValue,
  card,
  createDeck,
  createRng,
  effectiveSuit,
  availableKinds,
  orderFor,
  pointsOf,
  rankOf,
  strength,
  suitOf,
  trickWinnerIndex,
  tricksPlayed,
  trumpsChange,
} from '@schafkopf/core';
import { wantsDouble } from './doubling';
import { rateWedding, weddingMove, weddingSize } from './hochzeit';

/**
 * Heuristik-Bot: sagt nach Blattstärke an und spielt nach einfachen Faustregeln,
 * wie man sie am Wirtshaustisch lernt. Er sieht nur, was ein Mensch sieht (`HandView` und die
 * Tischregeln), und merkt sich dafür selbst, welche Karten schon gefallen sind und wer welche
 * Farbe nicht mehr hat. Eine Instanz gehört zu genau einem Sitz und überdauert mehrere Spiele.
 *
 * Aufbau:
 *  - `Memory`: gefallene Karten und erkannte Fehlfarben, wird bei jedem Aufruf aus
 *    `lastTrick` und `currentTrick` nachgeführt (zwischen zwei eigenen Zügen endet
 *    höchstens ein Stich – der, zu dem man selbst beigetragen hat).
 *  - Ansage: `rateContract` bewertet jedes mögliche Spiel mit einer Punktzahl abzüglich
 *    Schwelle („Marge“); gewünscht sind Spiele mit Marge ≥ 0. Daraus folgen alle drei
 *    Stufen der Ansage. Bewertet werden nur Spielarten, die am Tisch erlaubt sind
 *    (`RuleSet.contracts`, Tout nur mit `allowTout`).
 *  - Hochzeit und arabische Hochzeit (annehmen, zurückgeben): `hochzeit.ts`.
 *  - Kontra und Re, wenn er am Zug ist und `canDouble` gilt: `doubling.ts`.
 *  - Kartenspiel: anspielen (`lead`), zugeben (`follow`) und Bettel (`bettelCard`) als
 *    getrennte Faustregel-Ketten. Parteien ergeben sich aus `declarer`, `partner` und der
 *    eigenen Rufsau. Ramsch (`ramschCard`) mit Blick auf Jungfrau und Durchmarsch.
 *  - Wechselnde Trümpfe (Hawaii-Habicht): Die Ordnung gilt je Stich; Trümpfe, die nach dem
 *    Wechsel keine mehr sind, gibt er lieber her als die, die bleiben (`trumpCost`).
 *
 * Zufall nur für Gleichstände, über den übergebenen Seed.
 */
export function createHeuristicBot(seed: number): Bot {
  const rng = createRng(seed);
  const memory = createMemory();
  return {
    decide(view: HandView, rules: RuleSet = DEFAULT_RULES): PlayerAction {
      updateMemory(memory, view);
      if (view.phase === 'bidding') return { type: 'bid', call: bid(view, rules, rng) };
      if (view.phase === 'prelude') return { type: 'prelude', move: weddingMove(view) };
      if (wantsDouble(view, rateContract)) return { type: 'double' };
      return { type: 'play', card: play(view, memory, rules, rng) };
    },
  };
}

// ---------------------------------------------------------------------------
// Gedächtnis

/** Gedächtnis des Heuristik-Bots; öffentlich nur für die Suche des starken Bots (B2). */
export interface Memory {
  /** Alle Karten, die in diesem Spiel schon gefallen sind (auch eigene). */
  played: Set<Card>;
  /**
   * Karten, die ein Sitz sicher nicht hat: alle Karten der angespielten Farbe, wenn er nicht
   * bedient hat. Als Karten statt als Farbe gemerkt, weil sich die Farben mitten im Spiel ändern
   * können (Hawaii-Habicht): Wer in Stich 2 nicht Trumpf bedient, hat danach trotzdem vielleicht
   * Trümpfe der zweiten Farbe. Fehlfarbe siehe `isVoid`.
   */
  absent: Set<Card>[];
  /** Anzahl abgeschlossener Stiche beim letzten Aufruf. */
  tricksSeen: number;
  /** Kartenzahl des ganzen Blatts (32 oder 24). */
  deckSize: number;
  /** Das ganze Blatt, einmal je Spiel gebaut. */
  deck: readonly Card[];
  /** Augen je Sitz aus den gesehenen Stichen (Ramsch: Durchmarsch erkennen). */
  pointsWon: number[];
  /** Ramsch: Spielt der Bot auf Durchmarsch? Vor seiner ersten Karte entschieden. */
  durchmarsch: boolean | null;
}

export function createMemory(): Memory {
  return {
    played: new Set(),
    absent: [],
    tricksSeen: 0,
    deckSize: 32,
    deck: createDeck('lang'),
    pointsWon: [],
    durchmarsch: null,
  };
}

function resetMemory(memory: Memory, view: HandView): void {
  memory.played = new Set();
  memory.absent = view.handSizes.map(() => new Set());
  memory.tricksSeen = 0;
  // Auch mitten im Spiel richtig (Vertretung): Karten auf der Hand plus alle gefallenen.
  memory.deckSize =
    view.handSizes.reduce((a, b) => a + b, 0) +
    tricksPlayed(view) * view.handSizes.length +
    view.currentTrick.cards.length;
  memory.deck = createDeck(memory.deckSize < 32 ? 'kurz' : 'lang');
  memory.pointsWon = view.handSizes.map(() => 0);
  memory.durchmarsch = null;
}

function noteTrick(memory: Memory, trick: Trick, order: CardOrder, players: number): void {
  const lead = trick.cards[0];
  if (lead === undefined) return;
  const leadSuit = effectiveSuit(lead, order);
  trick.cards.forEach((c, i) => {
    memory.played.add(c);
    if (i > 0 && effectiveSuit(c, order) !== leadSuit) {
      markVoid(memory, (trick.leader + i) % players, leadSuit, order);
    }
  });
}

/** Merkt sich: `seat` hat keine Karte der Farbe `suit` (nach der Ordnung `order`). */
export function markVoid(memory: Memory, seat: Seat, suit: EffectiveSuit, order: CardOrder): void {
  const absent = memory.absent[seat]!;
  for (const d of memory.deck) if (effectiveSuit(d, order) === suit) absent.add(d);
}

/** Hat `seat` sicher keine Karte der Farbe `suit` (nach der Ordnung `order`)? */
function isVoid(memory: Memory, seat: Seat, suit: EffectiveSuit, order: CardOrder): boolean {
  const absent = memory.absent[seat]!;
  if (absent.size === 0) return false;
  const cards = memory.deck.filter((c) => effectiveSuit(c, order) === suit);
  return cards.length > 0 && cards.every((c) => absent.has(c));
}

export function updateMemory(memory: Memory, view: HandView): void {
  const completed = tricksPlayed(view);
  // Neues Spiel: Ansage läuft, oder es sind weniger Stiche gespielt als zuletzt gesehen.
  if (
    view.phase === 'bidding' ||
    completed < memory.tricksSeen ||
    memory.absent.length !== view.handSizes.length
  ) {
    resetMemory(memory, view);
    if (view.phase === 'bidding') return;
  }
  if (!view.contract) return;
  const players = view.handSizes.length;
  if (completed > memory.tricksSeen && view.lastTrick) {
    noteTrick(memory, view.lastTrick, orderFor(view.contract, completed - 1), players);
    memory.pointsWon[view.lastTrick.winner] =
      (memory.pointsWon[view.lastTrick.winner] ?? 0) + view.lastTrick.points;
  }
  memory.tricksSeen = completed;
  noteTrick(memory, view.currentTrick, orderFor(view.contract, completed), players);
}

// ---------------------------------------------------------------------------
// Ansage

/**
 * Spielarten, die der Bot in dieser Runde ansagen darf: am Tisch erlaubt (`RuleSet.contracts`)
 * und nicht schon mit gescheitertem Vorspiel aus dem Rennen (Hochzeit, die keiner nahm).
 */
export function allowedKinds(rules: RuleSet, failed: readonly ContractKind[] = []): ContractKind[] {
  // `availableKinds` berücksichtigt auch Spielerzahl und Kartenzahl (K6, Annahme 59).
  return availableKinds(rules).filter((kind) => !failed.includes(kind));
}

/** Farben bzw. Farbpaare (Hawaii-Habicht: erste und zweite Trumpffarbe), die man nennen kann. */
function suitVariants(kind: ContractKind, hand: readonly Card[]): Contract[] {
  const mode = MODES[kind];
  if (mode.suitRole === 'none') return [{ kind }];
  const suits = mode.suitChoices?.(hand) ?? SUITS;
  if (mode.suitCount !== 2) return suits.map((suit) => ({ kind, suit }));
  return suits.flatMap((suit) =>
    suits.filter((suit2) => suit2 !== suit).map((suit2) => ({ kind, suit, suit2 })),
  );
}

/** Alle Spiele, die mit diesem Blatt nach den Tischregeln möglich wären. */
export function candidateContracts(
  hand: readonly Card[],
  rules: RuleSet,
  failed: readonly ContractKind[],
): Contract[] {
  const out: Contract[] = [];
  for (const kind of allowedKinds(rules, failed)) {
    const mode = MODES[kind];
    if (mode.eligible && !mode.eligible(hand)) continue;
    for (const base of suitVariants(kind, hand)) {
      out.push(base);
      if (mode.canTout && rules.allowTout) out.push({ ...base, tout: true });
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
export function bettelSafe(hand: readonly Card[], order: CardOrder, deckSize: number): boolean {
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
export function toutSafe(hand: readonly Card[], contract: Contract, order: CardOrder): boolean {
  const mine = (c: Card) => hand.includes(c);
  const allTrump = hand.every((c) => order.trumps.includes(c));
  if (contract.kind === 'wenz' || contract.kind === 'geier' || contract.kind === 'eisenbahner') {
    if (!order.trumps.every(mine)) return false;
    // Jede Nebenkarte muss Teil einer Folge von oben sein.
    return SUITS.every((suit) => {
      const own = hand.filter((c) => suitOf(c) === suit && !order.trumps.includes(c));
      const ranks = order.rankOrder.filter((r) => !order.trumps.includes(card(suit, r)));
      return own.every((c) => ranks.indexOf(rankOf(c)) < own.length);
    });
  }
  // Hawaii-Habicht: Selbst mit allen Königen sticht ein Gegner mit einer hohen Karte der Farbe,
  // die gerade Trumpf ist – zu unsicher für den Bot, er sagt dort kein Tout an.
  if (trumpsChange(contract)) return false;
  return allTrump && order.trumps.slice(0, 4).every(mine);
}

/**
 * Bewertung eines Spiels für dieses Blatt: Punktzahl minus Schwelle. Ab 0 wird es angesagt.
 * Die Gewichte sind von Hand gesetzt und über Simulationen grob abgestimmt.
 */
export function rateContract(hand: readonly Card[], contract: Contract, deckSize = 32): number {
  // Bewertet wird das Blatt vor dem ersten Stich. Die Schwellen gelten für acht Karten; mit
  // kurzer Karte zu viert (sechs Karten) schrumpfen sie im selben Verhältnis (Annahme 59).
  const order = orderFor(contract, 0);
  const scale = Math.min(1, hand.length / 8);
  const need = (n: number) => Math.ceil(n * scale);
  const trumps = hand.filter((c) => order.trumps.includes(c));
  const t = trumps.length;
  const sides = SUITS.filter((s) => isSideSuit(order, s));
  const sideSum = (skip?: Suit) =>
    sides.filter((s) => s !== skip).reduce((sum, s) => sum + sideStrength(hand, order, s), 0);

  if (contract.tout) {
    const base = rateContract(hand, { ...contract, tout: false }, deckSize);
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
      return t < need(4) ? -10 : score - 5.2 * scale;
    }
    case 'solo': {
      const w = trumpWeights(order, [2.3, 2.1, 2.0, 1.9, 1.6, 1.5, 1.4, 1.4, 1.3, 1.2], 1.0);
      const score = trumps.reduce((s, c) => s + w(c), 0) + sideSum() + 0.6 * voidCount(hand, order);
      return t < need(6) ? -10 : score - 10.8 * scale;
    }
    case 'farbwenz': {
      const w = trumpWeights(order, [2.2, 2.0, 1.7, 1.5, 1.3, 1.2, 1.0], 0.9);
      const score = trumps.reduce((s, c) => s + w(c), 0) + sideSum() + 0.6 * voidCount(hand, order);
      return t < need(6) ? -10 : score - 10.8 * scale;
    }
    case 'wenz':
    case 'geier':
    case 'eisenbahner': {
      // Eisenbahner (Zehner als Trümpfe) bewertet wie Wenz und Geier: vier Trümpfe, der Rest
      // sind Farbstiche von oben. Dass die Trümpfe selbst zehn Augen tragen, gleicht aus, dass
      // die Sau keinen Zehner mehr neben sich hat.
      const w = trumpWeights(order, [2.5, 2.2, 1.8, 1.6], 0);
      const score =
        trumps.reduce((s, c) => s + w(c), 0) +
        topSequenceValue(hand, order) +
        0.4 * voidCount(hand, order);
      const top = hand.includes(order.trumps[0]!);
      const threshold = contract.kind === 'eisenbahner' ? EISENBAHNER_THRESHOLD : 8.3;
      return t < 2 || (t === 2 && !top) ? -10 : score - threshold * scale;
    }
    case 'bettel':
      return bettelSafe(hand, order, deckSize) ? 0.5 : -10;
    case 'hawaii':
      return rateHawaii(hand, contract);
    case 'hochzeit':
    case 'arabischeHochzeit':
      return rateWedding(hand, weddingSize(contract.kind));
    case 'ramsch': // nicht ansagbar
      return -10;
  }
}

/**
 * Hawaii-Habicht: Die Könige sind immer Trumpf, die erste Farbe in den Stichen 1–4, die zweite
 * danach. Karten der ersten Farbe zählen voll (mit ihnen zieht man Trumpf, solange es zählt),
 * die der zweiten etwas weniger (bis zum Wechsel sind sie Farbkarten, die man halten muss).
 * Unter allen zwölf Paaren wählt der Bot das mit der besten Bewertung.
 */
function rateHawaii(hand: readonly Card[], contract: Contract): number {
  const early = orderFor(contract, 0);
  const late = orderFor(contract, 99);
  const kingWeights = [2.2, 2.0, 1.8, 1.6];
  const suitWeights = [1.4, 1.2, 1.0, 0.9, 0.8, 0.8, 0.8];
  const kings = early.trumps.slice(0, 4);
  const rankWeight = (c: Card, suit: Suit) => {
    const ranks: readonly string[] = early.rankOrder.filter((r) => r !== 'K');
    return suitOf(c) === suit ? (suitWeights[ranks.indexOf(rankOf(c))] ?? 0.8) : 0;
  };
  let score = 0;
  for (const c of hand) {
    const k = kings.indexOf(c);
    if (k >= 0) score += kingWeights[k]!;
    else score += rankWeight(c, contract.suit!) + 0.8 * rankWeight(c, contract.suit2!);
  }
  const others = SUITS.filter((s) => s !== contract.suit && s !== contract.suit2);
  for (const suit of others) {
    score += sideStrength(hand, early, suit);
    if (!hand.some((c) => effectiveSuit(c, early) === suit)) score += 0.5;
  }
  const t1 = hand.filter((c) => early.trumps.includes(c)).length;
  const t2 = hand.filter((c) => late.trumps.includes(c)).length;
  return t1 < 5 || t2 < 4 ? -10 : score - HAWAII_THRESHOLD;
}
const HAWAII_THRESHOLD = 10.8;
/** Niedriger als bei Wenz und Geier: Die Zehner als Trümpfe bringen selbst viele Augen. */
const EISENBAHNER_THRESHOLD = 7.6;

interface Rated {
  contract: Contract;
  margin: number;
}

function bestOf(rated: readonly Rated[]): Rated | undefined {
  return [...rated].sort(
    (a, b) => bidValue(b.contract) - bidValue(a.contract) || b.margin - a.margin,
  )[0];
}

function bid(view: HandView, rules: RuleSet, rng: Rng): BidCall {
  const calls = view.legalCalls;
  const passive = calls[0]!;
  const deckSize = view.handSizes.reduce((a, b) => a + b, 0);
  const rated = candidateContracts(view.hand, rules, view.auction.failed).map((contract) => ({
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
      // Bewertet werden genau die erlaubten Spiele – im Muss auch gelockerte Rufe, die
      // `candidateContracts` nicht kennt.
      const legalRated = calls
        .flatMap((c) => (c.type === 'declare' ? [c.contract] : []))
        .map((contract) => ({ contract, margin: rateContract(view.hand, contract, deckSize) }));
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
  rules: RuleSet;
  /**
   * Ordnung im letzten Stich, wenn sie sich bis dahin noch ändert (Hawaii-Habicht vor dem
   * Wechsel), sonst `null`. Daran erkennt der Bot Trümpfe, die verfallen, und Farbkarten, die
   * noch Trumpf werden.
   */
  finalOrder: CardOrder | null;
}

/** Ordnung des letzten Stichs, falls sie sich von der jetzigen unterscheidet. */
function finalOrderFor(contract: Contract, trick: number, totalTricks: number): CardOrder | null {
  if (!trumpsChange(contract)) return null;
  const last = orderFor(contract, totalTricks - 1);
  const now = orderFor(contract, trick);
  const same =
    last.trumps.length === now.trumps.length && last.trumps.every((c, i) => now.trumps[i] === c);
  return same ? null : last;
}

function makeCtx(view: HandView, memory: Memory, rules: RuleSet, rng: Rng): Ctx {
  const contract = view.contract!;
  const trick = tricksPlayed(view);
  const order = orderFor(contract, trick);
  const players = view.handSizes.length;
  const me = view.turn;
  const deck = memory.deck;
  const unseen = deck.filter((c) => !view.hand.includes(c) && !memory.played.has(c));
  // Im Ramsch gibt es keinen Ansager; dann ist jeder Gegner (`sideOf` liefert 'unknown').
  const declarer = view.declarer;
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

  const finalOrder = finalOrderFor(contract, trick, memory.deckSize / players);
  return {
    view,
    memory,
    rng,
    me,
    players,
    contract,
    order,
    declarerSide,
    unseen,
    sideOf,
    rules,
    finalOrder,
  };
}

/**
 * Kartenwahl des Heuristik-Bots mit einem schon nachgeführten Gedächtnis. Der starke Bot (B2)
 * nutzt sie als Ausspielstrategie in seinen Probespielen.
 */
export function heuristicCard(
  view: HandView,
  memory: Memory,
  rng: Rng,
  rules: RuleSet = DEFAULT_RULES,
): Card {
  return play(view, memory, rules, rng);
}

function play(view: HandView, memory: Memory, rules: RuleSet, rng: Rng): Card {
  const legal = view.legalCards;
  if (legal.length === 1) return legal[0]!;
  const ctx = makeCtx(view, memory, rules, rng);
  if (ctx.contract.kind === 'bettel') return bettelCard(ctx, legal);
  if (ctx.contract.kind === 'ramsch') return ramschCard(ctx, legal);
  return view.currentTrick.cards.length === 0 ? lead(ctx, legal) : follow(ctx, legal);
}

const isTrump = (ctx: Ctx, c: Card) => ctx.order.trumps.includes(c);
const eff = (ctx: Ctx, c: Card) => effectiveSuit(c, ctx.order);
const str = (ctx: Ctx, c: Card) => strength(c, ctx.order);
/** Fehlfarbe nach der Ordnung des laufenden Stichs. */
const voidOf = (ctx: Ctx, seat: Seat, suit: EffectiveSuit) =>
  isVoid(ctx.memory, seat, suit, ctx.order);

/**
 * Wie teuer es ist, einen Trumpf herzugeben (hohe Trümpfe sind Stiche wert). Ein Trumpf, der
 * nach dem Wechsel keiner mehr ist (Hawaii-Habicht: erste Farbe), ist billiger – ihn jetzt
 * einzusetzen kostet weniger als später.
 */
function trumpCost(ctx: Ctx, c: Card): number {
  const i = ctx.order.trumps.indexOf(c);
  if (i < 0) return 0;
  const cost = i < 4 ? 8 : i < 8 ? 4 : 1;
  return expiring(ctx, c) ? Math.min(cost, 2) : cost;
}

/** Trumpf jetzt, aber nicht mehr im letzten Stich (Hawaii-Habicht vor dem Wechsel). */
function expiring(ctx: Ctx, c: Card): boolean {
  return ctx.finalOrder !== null && isTrump(ctx, c) && !ctx.finalOrder.trumps.includes(c);
}

/** Farbkarte jetzt, aber Trumpf nach dem Wechsel (Hawaii-Habicht: zweite Farbe). */
function futureTrump(ctx: Ctx, c: Card): boolean {
  return ctx.finalOrder !== null && !isTrump(ctx, c) && ctx.finalOrder.trumps.includes(c);
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
  const higherInLead = ctx.unseen.some(
    (u) => eff(ctx, u) === leadSuit && eff(ctx, best) === leadSuit && str(ctx, u) > str(ctx, best),
  );
  if (!voidOf(ctx, seat, leadSuit) && higherInLead) return true;
  if (leadSuit === 'trump' || voidOf(ctx, seat, 'trump')) return false;
  const leadLeft = ctx.unseen.filter((u) => eff(ctx, u) === leadSuit).length;
  const mayBeVoid = voidOf(ctx, seat, leadSuit) || leadLeft < 3;
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
      (futureTrump(ctx, c) ? 4 : 0) +
      (!isTrump(ctx, c) && isTopOfSuit(ctx, c) ? 5 : 0) +
      suitLen * 0.1 +
      ctx.rng() * 0.01
    );
  });
}

/** Karte zum Schmieren: viele Augen, aber keine hohen Trümpfe. */
function richest(ctx: Ctx, cards: readonly Card[]): Card {
  return maxBy(
    cards,
    (c) => pointsOf(c) - 2 * trumpCost(ctx, c) - (futureTrump(ctx, c) ? 4 : 0) + ctx.rng() * 0.01,
  );
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
        (foes.every((s) => !voidOf(ctx, s, eff(ctx, c))) &&
          ctx.unseen.filter((u) => eff(ctx, u) === eff(ctx, c)).length >= 3)),
  );

  if (ctx.declarerSide) {
    // Spieler: Trumpf ziehen, solange die Gegner noch welche haben können.
    if (trumps.length > 0 && unseenTrumps.length > 0) {
      const top = maxBy(trumps, (c) => str(ctx, c));
      if (isTopOfSuit(ctx, top)) return top;
      // Allein von oben ziehen; im Sauspiel klein anspielen, der Partner sticht mit.
      // Vor dem Trumpfwechsel zuerst mit den Trümpfen, die danach verfallen.
      if (trumps.length >= 2 || sureSide.length === 0) {
        const alone = MODES[contract.kind].parties === 'alone';
        const fading = trumps.filter((c) => expiring(ctx, c));
        if (alone && fading.length > 0)
          return minBy(fading, (c) => pointsOf(c) + str(ctx, c) * 0.01);
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
    const notVoid = sideCards.filter((c) => !voidOf(ctx, declarer, eff(ctx, c)));
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

/**
 * Ramsch: jeder für sich, Augen vermeiden (B3).
 *  - Durchmarsch (`RuleSet.ramsch.durchmarsch`): Mit sehr starkem Blatt spielt der Bot auf alle
 *    Augen wie ein Solospieler mit Herz als Trumpf (dieselben Trümpfe wie im Ramsch). Sobald die
 *    anderen zusammen mehr als 29 Augen haben, gibt er auf und spielt wieder normal.
 *  - Droht ein anderer mit Durchmarsch (hat alle Stiche, mindestens drei), nimmt der Bot einen
 *    Stich, wenn es sicher geht – mit möglichst wenig Augen.
 *  - Sonst Stiche vermeiden (das hält auch die Jungfrau, `RuleSet.ramsch.jungfrau`):
 *    Anspielen: eine Karte, über der noch viele unbekannte Karten ihrer Farbe liegen, mit wenig
 *    Augen. Zugeben: Kann man drunter bleiben, die teuerste Karte, die den Stich nicht nimmt
 *    (hohe Karten und Augen loswerden). Muss man stechen, die Karte mit den wenigsten Augen
 *    (als Letzter davon die höchste, um sie loszuwerden).
 */
function ramschCard(ctx: Ctx, legal: readonly Card[]): Card {
  const { memory } = ctx;
  if (ctx.rules.ramsch.durchmarsch) {
    memory.durchmarsch ??= tricksPlayed(ctx.view) === 0 && durchmarschHand(ctx.view.hand);
    if (memory.durchmarsch && othersPoints(ctx) > 29) memory.durchmarsch = false;
    if (memory.durchmarsch) return durchmarschCard(ctx, legal);
  } else {
    memory.durchmarsch = false;
  }

  const trick = ctx.view.currentTrick;
  const jitter = () => ctx.rng() * 0.01;
  const threat = ctx.rules.ramsch.durchmarsch ? durchmarschThreat(ctx) : null;
  if (trick.cards.length === 0) {
    if (threat !== null) {
      // Durchmarsch verhindern: eine Karte anspielen, die sicher sticht.
      const sure = legal.filter(
        (c) =>
          isTopOfSuit(ctx, c) &&
          (isTrump(ctx, c) || !voidOf(ctx, threat, eff(ctx, c))) &&
          !canBeat(ctx, threat, c, eff(ctx, c)),
      );
      if (sure.length > 0) return minBy(sure, (c) => pointsOf(c) + jitter());
    }
    // Je mehr höhere Karten der Farbe noch draußen sind, desto sicherer bleibt man drunter.
    const higher = (c: Card) =>
      ctx.unseen.filter((u) => eff(ctx, u) === eff(ctx, c) && str(ctx, u) > str(ctx, c)).length;
    return minBy(legal, (c) => {
      const h = higher(c);
      return (
        (h === 0 ? 100 : 0) -
        Math.min(h, 4) * 3 +
        (isTrump(ctx, c) ? 4 : 0) +
        pointsOf(c) +
        str(ctx, c) * 0.01 +
        jitter()
      );
    });
  }
  const wins = (c: Card) => trickWinnerIndex([...trick.cards, c], ctx.order) === trick.cards.length;
  const leadSuit = eff(ctx, trick.cards[0]!);

  if (threat !== null) {
    const winIdx = trickWinnerIndex(trick.cards, ctx.order);
    const threatWins = (trick.leader + winIdx) % ctx.players === threat;
    const later = laterSeats(ctx);
    if (threatWins || later.includes(threat)) {
      const stoppers = legal.filter(
        (c) => wins(c) && (!later.includes(threat) || !canBeat(ctx, threat, c, leadSuit)),
      );
      if (stoppers.length > 0) return minBy(stoppers, (c) => pointsOf(c) + jitter());
      // Nicht zu verhindern: ihm wenigstens keine Augen schenken.
      if (threatWins && !later.includes(threat)) return minBy(legal, (c) => pointsOf(c) + jitter());
    }
  }

  const under = legal.filter((c) => !wins(c));
  if (under.length > 0) return maxBy(under, (c) => pointsOf(c) * 2 + str(ctx, c) + jitter());
  // Als Letzter gehört einem der Stich sicher: wenig Augen dazulegen, dabei eine hohe Karte loswerden.
  if (laterSeats(ctx).length === 0)
    return minBy(legal, (c) => pointsOf(c) * 10 - str(ctx, c) + jitter());
  return minBy(legal, (c) => pointsOf(c) + str(ctx, c) * 0.1 + jitter());
}

/** Augen, die die anderen im Ramsch schon haben (aus den gesehenen Stichen). */
function othersPoints(ctx: Ctx): number {
  return ctx.memory.pointsWon.reduce((sum, p, seat) => (seat === ctx.me ? sum : sum + p), 0);
}

/**
 * Blatt für einen Durchmarsch: fast ein Solo-Tout – mindestens sechs Trümpfe mit den beiden
 * höchsten Obern und sonst nur Sauen (eine Farbe frei oder mit Sau besetzt).
 */
export function durchmarschHand(hand: readonly Card[]): boolean {
  const order = orderFor({ kind: 'solo', suit: 'herz' }, 0);
  const trumps = hand.filter((c) => order.trumps.includes(c));
  if (trumps.length < Math.ceil(hand.length * 0.75)) return false;
  if (!order.trumps.slice(0, 2).every((c) => hand.includes(c))) return false;
  const top = order.trumps.slice(0, 4).filter((c) => hand.includes(c)).length;
  const sideOk = hand.every((c) => order.trumps.includes(c) || rankOf(c) === 'A');
  return sideOk && top >= 3;
}

/** Durchmarsch spielen: wie ein Solospieler, alle anderen sind Gegner. */
function durchmarschCard(ctx: Ctx, legal: readonly Card[]): Card {
  const solo: Ctx = {
    ...ctx,
    contract: { kind: 'solo', suit: 'herz' },
    declarerSide: true,
    sideOf: (seat) => (seat === ctx.me ? 'friend' : 'foe'),
  };
  return ctx.view.currentTrick.cards.length === 0 ? lead(solo, legal) : follow(solo, legal);
}

/**
 * Droht ein anderer Sitz mit Durchmarsch? Ja, wenn er alle bisherigen Stiche hat (mindestens
 * zwei) oder schon viele Augen, während die übrigen zusammen fast keine haben.
 */
function durchmarschThreat(ctx: Ctx): Seat | null {
  const done = tricksPlayed(ctx.view);
  if (done < 2) return null;
  const points = ctx.memory.pointsWon;
  const total = points.reduce((a, b) => a + b, 0);
  for (let seat = 0; seat < ctx.players; seat++) {
    if (seat === ctx.me) continue;
    const allTricks = ctx.view.tricksWon[seat] === done;
    const rest = total - (points[seat] ?? 0);
    if (allTricks || ((points[seat] ?? 0) >= 40 && rest <= 15)) return seat;
  }
  return null;
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
    const notVoid = legal.filter((c) => !voidOf(ctx, declarer, eff(ctx, c)));
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
