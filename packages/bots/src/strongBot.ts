import {
  type BidCall,
  type Bot,
  type Contract,
  type Card,
  type CompletedTrick,
  type EffectiveSuit,
  type HandState,
  type HandView,
  type PlayerAction,
  type Rng,
  type RuleSet,
  type Seat,
  CLASSIC_CONTRACTS,
  DEFAULT_RULES,
  MODES,
  SUITS,
  bidValue,
  card,
  createDeck,
  createRng,
  effectiveSuit,
  legalCards,
  orderFor,
  sameContract,
  scoreHand,
  shuffle,
  sumPoints,
  trickWinnerIndex,
  tricksPlayed,
} from '@schafkopf/core';
import {
  type Memory,
  createHeuristicBot,
  heuristicCard,
  markVoid,
  rateContract,
} from './heuristicBot';

/**
 * Starker Bot (B2): sagt an wie der Heuristik-Bot, wählt seine Karten aber mit einer
 * Monte-Carlo-Suche über mögliche Kartenverteilungen („Determinisierung“):
 *
 *  1. Aus seiner Sicht bestimmt er die Karten, die er noch nicht gesehen hat, und verteilt sie
 *     zufällig auf die anderen – passend zu ihren Kartenzahlen und zu allem, was er sicher weiß
 *     (erkannte Fehlfarben aus der Bedienpflicht, Rufsau beim Mitspieler bzw. nicht beim Ansager).
 *  2. Für jede erlaubte Karte spielt er jede dieser Verteilungen bis zum Ende durch; alle Sitze
 *     ziehen dabei nach der Heuristik (`heuristicCard`). Gezählt wird, was er am Ende bekäme
 *     (`scoreHand`, also Cent mit Schneider, Laufenden, Kontra – im Ramsch ebenso).
 *  3. Er spielt die Karte mit dem besten Schnitt; bei Gleichstand die der Heuristik.
 *
 * Er sieht dabei nie mehr als seine `HandView`: Fremde Karten kennt er nur als Stichprobe.
 * Gespielte Stiche merkt er sich selbst; fehlt ihm ein Stich (Tisch nach dem Neuladen
 * wiederhergestellt), spielt er für den Rest des Spiels wie der Heuristik-Bot.
 *
 * Aufwand: höchstens `playBudget` simulierte Karten je Entscheidung (deterministisch über den
 * Seed). Eine Uhr gibt es nur, wenn sie übergeben wird (`now`, `budgetMs`) – dann bricht die
 * Suche zusätzlich nach der Zeit ab.
 */
export interface StrongBotOptions {
  /**
   * Tischregeln (öffentlich, stehen in der `TableView`). Ohne sie rechnet der Bot mit den
   * Standardregeln für Spielerzahl und Blatt seiner Sicht.
   */
  rules?: RuleSet;
  /** Höchstzahl simulierter Karten je Entscheidung. */
  playBudget?: number;
  /** Mindest- und Höchstzahl der Kartenverteilungen je Entscheidung. */
  minSamples?: number;
  maxSamples?: number;
  /** Höchstzahl simulierter Karten für die Ansage (verteilt auf alle knappen Spiele). */
  bidBudget?: number;
  /** Mindestzahl der Verteilungen bei der Ansage. */
  minBidSamples?: number;
  /** Injizierbare Uhr in Millisekunden; nur zusammen mit `budgetMs` wirksam. */
  now?: () => number;
  /** Zeitbudget je Entscheidung in Millisekunden (nur mit `now`). */
  budgetMs?: number;
}

/**
 * Standardaufwand: auf einem Entwicklerrechner im Schnitt unter 20 ms, höchstens etwa 60 ms je
 * Entscheidung (eine simulierte Karte kostet dort rund 30 µs).
 */
export const STRONG_DEFAULTS = {
  playBudget: 2000,
  minSamples: 6,
  maxSamples: 40,
  bidBudget: 2000,
  minBidSamples: 4,
} as const;

export function createStrongBot(seed: number, options: StrongBotOptions = {}): Bot {
  const heuristic = createHeuristicBot(seed);
  // Eigener Zufall für die Suche, damit die Heuristik dieselben Gleichstände würfelt wie sonst.
  const rng = createRng([seed >>> 0, 0x5bd1e995, 0x9e3779b9, 0x85ebca6b]);
  const log = createTrickLog();
  const bidding: BidPlan = { mode: 'heuristic', contract: null };
  return {
    decide(view: HandView, rules?: RuleSet): PlayerAction {
      // Die Heuristik entscheidet immer mit: Beim Kartenspiel hält das ihr Gedächtnis aktuell
      // und liefert den Vorschlag für Gleichstände; das Vorspiel bleibt ganz ihres.
      const suggestion = heuristic.decide(view, rules ?? options.rules);
      updateLog(log, view);
      if (view.phase === 'bidding' && suggestion.type === 'bid') {
        return { type: 'bid', call: bid(view, suggestion.call, bidding, rng, options) };
      }
      if (view.phase !== 'playing' || suggestion.type !== 'play') return suggestion;
      if (view.legalCards.length <= 1 || !log.complete) return suggestion;
      return { type: 'play', card: search(view, log, rng, suggestion.card, options) };
    },
  };
}

// ---------------------------------------------------------------------------
// Ansage

/**
 * Ansage-Plan für das laufende Spiel. Klare Blätter (Marge der Heuristik über
 * `CLEAR_MARGIN`) und klar schwache überlässt der Bot der Heuristik. Knappe Blätter spielt er
 * durch: Jedes in Frage kommende Spiel wird auf zufälligen Verteilungen der übrigen Karten mit
 * der Heuristik bis zum Ende simuliert; lohnt sich keines im Schnitt, sagt er „weiter“,
 * sonst nimmt er das Spiel mit dem besten Schnitt und hält es im Zweikampf.
 */
interface BidPlan {
  mode: 'heuristic' | 'search';
  contract: Contract | null;
}

/** Ab dieser Marge der Heuristik gilt ein Blatt als klar (Stand B2 über Simulationen gewählt). */
const CLEAR_MARGIN = 3.0;
/** Unter dieser Marge kommt ein Spiel gar nicht in Frage. */
const WEAK_MARGIN = -2.0;

function bid(
  view: HandView,
  suggestion: BidCall,
  plan: BidPlan,
  rng: Rng,
  options: StrongBotOptions,
): BidCall {
  const calls = view.legalCalls;
  const has = (call: BidCall) => calls.some((c) => sameCall(c, call));
  if (view.auction.stage === 'interest') {
    const decided = planBid(view, rng, options);
    plan.mode = decided.mode;
    plan.contract = decided.contract;
    if (plan.mode === 'heuristic') return suggestion;
    return plan.contract && has({ type: 'interest' }) ? { type: 'interest' } : calls[0]!;
  }
  if (plan.mode === 'heuristic' || view.auction.forced) return suggestion;
  const wanted = plan.contract;
  if (!wanted) return calls[0]!;
  const current = view.auction.level ? bidValue(view.auction.level) : 0;
  if (view.auction.stage === 'duel') {
    if (view.turn === view.auction.holder) {
      return bidValue(wanted) >= current && has({ type: 'hold' }) ? { type: 'hold' } : calls[0]!;
    }
    const name: BidCall = { type: 'name', level: { kind: wanted.kind } };
    return bidValue(wanted) > current && has(name) ? name : calls[0]!;
  }
  const declare: BidCall = { type: 'declare', contract: wanted };
  return has(declare) ? declare : suggestion;
}

function sameCall(a: BidCall, b: BidCall): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'name' && b.type === 'name') {
    return a.level.kind === b.level.kind && Boolean(a.level.tout) === Boolean(b.level.tout);
  }
  if (a.type === 'declare' && b.type === 'declare') return sameContract(a.contract, b.contract);
  return true;
}

/** Spiele, die die Regeln erlauben, die das Blatt ansagen darf und die der Bot simulieren kann. */
function biddable(view: HandView, rules: RuleSet): Contract[] {
  const out: Contract[] = [];
  for (const kind of rules.contracts) {
    if (!CLASSIC_CONTRACTS.includes(kind)) continue;
    const mode = MODES[kind];
    if (mode.prelude || (mode.eligible && !mode.eligible(view.hand))) continue;
    const suits = mode.suitRole === 'none' ? [undefined] : (mode.suitChoices?.(view.hand) ?? SUITS);
    for (const suit of suits) out.push(suit ? { kind, suit } : { kind });
  }
  return out;
}

function planBid(view: HandView, rng: Rng, options: StrongBotOptions): BidPlan {
  const players = view.handSizes.length;
  const deckSize = view.handSizes.reduce((a, b) => a + b, 0);
  const rules = rulesFor(options, players, deckSize);
  const rated = biddable(view, rules).map((contract) => ({
    contract,
    margin: rateContract(view.hand, contract, deckSize),
  }));
  if (rated.some((r) => r.margin > CLEAR_MARGIN)) return { mode: 'heuristic', contract: null };
  const close = rated.filter((r) => r.margin >= WEAK_MARGIN);
  if (close.length === 0) return { mode: 'heuristic', contract: null };
  // Ein simuliertes Spiel kostet so viele Karten, wie das Blatt hat. Alle Spiele werden auf
  // denselben Verteilungen verglichen; das macht den Vergleich ruhiger.
  const bidBudget = options.bidBudget ?? STRONG_DEFAULTS.bidBudget;
  const samples = Math.max(
    options.minBidSamples ?? STRONG_DEFAULTS.minBidSamples,
    Math.floor(bidBudget / (close.length * deckSize)),
  );
  const clock = startClock(options);
  const sums = close.map(() => 0);
  let done = 0;
  for (let i = 0; i < samples; i++) {
    if (i >= 2 && clock.expired()) break;
    const hands = dealRest(view, rules, rng);
    close.forEach(({ contract }, j) => {
      sums[j]! += simulateContract(view, hands, contract, rules, rng);
    });
    done++;
  }
  // Lohnt sich im Schnitt keines (weiter ist 0 wert), sagt er „weiter“.
  let best = -1;
  sums.forEach((sum, j) => {
    if (sum > 0 && (best < 0 || sum > sums[best]!)) best = j;
  });
  return { mode: 'search', contract: done > 0 && best >= 0 ? close[best]!.contract : null };
}

/** Verteilt die Karten, die man nicht selbst hat, zufällig auf die anderen. */
function dealRest(view: HandView, rules: RuleSet, rng: Rng): Card[][] {
  const rest = shuffle(
    createDeck(rules.deck).filter((c) => !view.hand.includes(c)),
    rng,
  );
  return view.handSizes.map((n, s) => (s === view.turn ? [...view.hand] : rest.splice(0, n)));
}

/** Ein ganzes Spiel `contract` (eigene Ansage) auf der Verteilung `dealt`, Heuristik überall. */
function simulateContract(
  view: HandView,
  dealt: Card[][],
  contract: Contract,
  rules: RuleSet,
  rng: Rng,
): number {
  const players = view.handSizes.length;
  const me = view.turn;
  const hands = dealt.map((h) => [...h]);
  let partner: Seat | null = null;
  if (MODES[contract.kind].parties === 'calledAce') {
    const sau = card(contract.suit!, 'A');
    partner = hands.findIndex((h) => h.includes(sau));
  }
  const first = (view.dealer + 1) % players;
  const state: HandState = {
    rules,
    dealer: view.dealer,
    phase: 'playing',
    turn: first,
    hands,
    initialHands: hands.map((h) => [...h]),
    bids: [],
    auction: view.auction,
    contract,
    declarer: me,
    partner,
    prelude: null,
    tricks: [],
    currentTrick: { leader: first, cards: [] },
    carry: { pot: 0, factor: 1 },
    doubling: { kontra: null, re: null },
    result: null,
  };
  const deckSize = hands.reduce((n, h) => n + h.length, 0);
  const memory: Memory = {
    played: new Set(),
    absent: hands.map(() => new Set()),
    tricksSeen: 0,
    deckSize,
    deck: createDeck(deckSize < 32 ? 'kurz' : 'lang'),
    pointsWon: hands.map(() => 0),
    durchmarsch: null,
  };
  return rollout(state, memory, me, rng);
}

/** Zeitgrenze über die injizierte Uhr; ohne Uhr läuft nie etwas ab. */
function startClock(options: StrongBotOptions): { expired(): boolean } {
  const { now, budgetMs } = options;
  if (!now || budgetMs === undefined) return { expired: () => false };
  const start = now();
  return { expired: () => now() - start > budgetMs };
}

function rulesFor(options: StrongBotOptions, players: number, deckSize: number): RuleSet {
  if (options.rules && options.rules.players === players) return options.rules;
  return { ...DEFAULT_RULES, players, deck: deckSize < 32 ? 'kurz' : 'lang' };
}

// ---------------------------------------------------------------------------
// Gedächtnis: alle Stiche des laufenden Spiels

interface TrickLog {
  tricks: CompletedTrick[];
  /** false, wenn ein Stich fehlt (etwa nach dem Wiederherstellen eines Tisches). */
  complete: boolean;
}

function createTrickLog(): TrickLog {
  return { tricks: [], complete: true };
}

function updateLog(log: TrickLog, view: HandView): void {
  const completed = tricksPlayed(view);
  if (view.phase === 'bidding' || view.phase === 'prelude' || completed < log.tricks.length) {
    log.tricks = [];
    log.complete = true;
    if (view.phase !== 'playing') return;
  }
  if (completed === log.tricks.length + 1 && view.lastTrick) {
    log.tricks.push(view.lastTrick);
  } else if (completed !== log.tricks.length) {
    log.complete = false;
  }
}

// ---------------------------------------------------------------------------
// Suche

/** Was der Bot über die Lage weiß – nur aus seiner Sicht und seinem Gedächtnis. */
interface Knowledge {
  me: Seat;
  players: number;
  rules: RuleSet;
  /** Noch nicht gesehene Karten. */
  unseen: Card[];
  /** Erkannte Fehlfarben je Sitz. */
  voids: Set<EffectiveSuit>[];
  /** Karten, die jeder Sitz in diesem Spiel schon gespielt hat. */
  playedBy: Card[][];
  /** Wer eine Karte bekommen darf (zusätzlich zu den Fehlfarben); Standard: jeder andere. */
  allowedFor: Map<Card, Seat[]>;
  /** Rufsau im Sauspiel, solange sie nicht gefallen ist. */
  calledAce: Card | null;
}

function knowledge(view: HandView, log: TrickLog, options: StrongBotOptions): Knowledge {
  const contract = view.contract!;
  const players = view.handSizes.length;
  const deckSize = view.handSizes.reduce((a, b) => a + b, 0) + playedCount(view, log);
  const deck = createDeck(deckSize < 32 ? 'kurz' : 'lang');
  const rules = rulesFor(options, players, deckSize);
  const me = view.turn;
  const voids = view.handSizes.map(() => new Set<EffectiveSuit>());
  const playedBy: Card[][] = view.handSizes.map(() => []);
  const played = new Set<Card>();
  const note = (trick: { leader: Seat; cards: readonly Card[] }, index: number) => {
    const order = orderFor(contract, index);
    const lead = trick.cards[0];
    if (lead === undefined) return;
    const leadSuit = effectiveSuit(lead, order);
    trick.cards.forEach((c, i) => {
      const seat = (trick.leader + i) % players;
      played.add(c);
      playedBy[seat]!.push(c);
      if (i > 0 && effectiveSuit(c, order) !== leadSuit) voids[seat]!.add(leadSuit);
    });
  };
  log.tricks.forEach((t, i) => note(t, i));
  note(view.currentTrick, log.tricks.length);
  const unseen = deck.filter((c) => !played.has(c) && !view.hand.includes(c));

  const allowedFor = new Map<Card, Seat[]>();
  let calledAce: Card | null = null;
  if (MODES[contract.kind].parties === 'calledAce' && contract.suit) {
    const sau = card(contract.suit, 'A');
    if (unseen.includes(sau)) {
      calledAce = sau;
      const others = Array.from({ length: players }, (_, s) => s).filter((s) => s !== me);
      // Mitspieler bekannt: Er hat sie. Sonst hat sie jedenfalls nicht der Ansager.
      allowedFor.set(
        sau,
        view.partner !== null ? [view.partner] : others.filter((s) => s !== view.declarer),
      );
    }
  }
  return { me, players, rules, unseen, voids, playedBy, allowedFor, calledAce };
}

function playedCount(view: HandView, log: TrickLog): number {
  return log.tricks.reduce((n, t) => n + t.cards.length, 0) + view.currentTrick.cards.length;
}

/**
 * Verteilt die ungesehenen Karten zufällig auf die anderen Sitze. Am stärksten eingeschränkte
 * Karten zuerst; geht es nicht auf, neuer Versuch, zuletzt ohne die Fehlfarben-Schlüsse.
 */
function sampleHands(view: HandView, k: Knowledge, rng: Rng): Card[][] {
  const order = orderFor(view.contract!, tricksPlayed(view));
  const others = Array.from({ length: k.players }, (_, s) => s).filter((s) => s !== k.me);
  const candidatesFor = (c: Card, useVoids: boolean) => {
    const base = k.allowedFor.get(c) ?? others;
    if (!useVoids) return base;
    const suit = effectiveSuit(c, order);
    return base.filter((s) => !k.voids[s]!.has(suit));
  };
  for (let attempt = 0; attempt < 30; attempt++) {
    const useVoids = attempt < 25;
    const options = k.unseen.map((c) => ({ c, seats: candidatesFor(c, useVoids), r: rng() }));
    options.sort((a, b) => a.seats.length - b.seats.length || a.r - b.r);
    const hands: Card[][] = view.handSizes.map(() => []);
    hands[k.me] = [...view.hand];
    let ok = true;
    for (const { c, seats } of options) {
      const open = seats.filter((s) => hands[s]!.length < view.handSizes[s]!);
      if (open.length === 0) {
        ok = false;
        break;
      }
      // Gewichtet nach freien Plätzen, damit volle Hände nicht bevorzugt leer bleiben.
      const weights = open.map((s) => view.handSizes[s]! - hands[s]!.length);
      let x = rng() * weights.reduce((a, b) => a + b, 0);
      let pick = open[open.length - 1]!;
      for (let i = 0; i < open.length; i++) {
        x -= weights[i]!;
        if (x < 0) {
          pick = open[i]!;
          break;
        }
      }
      hands[pick]!.push(c);
    }
    if (ok) return hands;
  }
  // Kann nur bei widersprüchlichem Wissen passieren: der Reihe nach auffüllen.
  const hands: Card[][] = view.handSizes.map(() => []);
  hands[k.me] = [...view.hand];
  const rest = [...k.unseen];
  for (const s of others) hands[s] = rest.splice(0, view.handSizes[s]!);
  return hands;
}

/** Spielstand einer Determinisierung als `HandState` – Grundlage der Probespiele. */
function determinize(view: HandView, log: TrickLog, k: Knowledge, hands: Card[][]): HandState {
  const contract = view.contract!;
  let partner = view.partner;
  if (partner === null && k.calledAce) partner = hands.findIndex((h) => h.includes(k.calledAce!));
  const initialHands = hands.map((h, s) => [...h, ...k.playedBy[s]!]);
  return {
    rules: k.rules,
    dealer: view.dealer,
    phase: 'playing',
    turn: view.turn,
    hands,
    initialHands,
    bids: view.bids,
    auction: view.auction,
    contract,
    declarer: view.declarer,
    partner: partner !== null && partner >= 0 ? partner : null,
    prelude: null,
    tricks: log.tricks.map((t) => ({ ...t, cards: [...t.cards] })),
    currentTrick: { leader: view.currentTrick.leader, cards: [...view.currentTrick.cards] },
    carry: { pot: 0, factor: 1 },
    doubling: view.doubling,
    result: null,
  };
}

function cloneState(s: HandState): HandState {
  return {
    ...s,
    hands: s.hands.map((h) => [...h]),
    tricks: [...s.tricks],
    currentTrick: { leader: s.currentTrick.leader, cards: [...s.currentTrick.cards] },
  };
}

/** Gedächtnis für die Heuristik in einem Probespiel: alles Gefallene ist öffentlich. */
function memoryOf(state: HandState, k: Knowledge): Memory {
  const played = new Set<Card>();
  for (const t of state.tricks) for (const c of t.cards) played.add(c);
  for (const c of state.currentTrick.cards) played.add(c);
  const deckSize = state.hands.reduce((n, h) => n + h.length, 0) + played.size;
  const memory: Memory = {
    played,
    absent: k.voids.map(() => new Set()),
    tricksSeen: state.tricks.length,
    deckSize,
    deck: createDeck(deckSize < 32 ? 'kurz' : 'lang'),
    pointsWon: state.hands.map(() => 0),
    durchmarsch: null,
  };
  for (const t of state.tricks) memory.pointsWon[t.winner]! += t.points;
  // Fehlfarben nach der jetzt gültigen Ordnung (beim Hawaii-Wechsel eine Näherung).
  const order = orderFor(state.contract!, state.tricks.length);
  k.voids.forEach((suits, seat) => {
    for (const suit of suits) markVoid(memory, seat, suit, order);
  });
  return memory;
}

/** Sicht eines Sitzes im Probespiel – nur die Felder, die die Heuristik beim Kartenspiel liest. */
function simView(state: HandState, seat: Seat, legal: Card[], memory: Memory): HandView {
  const tricksWon = state.hands.map(() => 0);
  for (const t of state.tricks) tricksWon[t.winner]!++;
  const parties = MODES[state.contract!.kind].parties;
  const sau =
    parties === 'calledAce' && state.contract!.suit ? card(state.contract!.suit, 'A') : null;
  const partnerKnown =
    state.partner !== null &&
    (parties !== 'calledAce' ||
      seat === state.partner ||
      state.doubling.re === state.partner ||
      (sau !== null && memory.played.has(sau)));
  return {
    phase: 'playing',
    dealer: state.dealer,
    turn: seat,
    hand: state.hands[seat]!,
    handSizes: state.hands.map((h) => h.length),
    bids: state.bids,
    auction: state.auction,
    contract: state.contract,
    declarer: state.declarer,
    partner: partnerKnown ? state.partner : null,
    prelude: null,
    currentTrick: state.currentTrick,
    lastTrick: state.tricks.at(-1) ?? null,
    tricks: null,
    tricksWon,
    legalCards: legal,
    legalCalls: [],
    legalMoves: [],
    doubling: state.doubling,
    canDouble: false,
    result: null,
  };
}

/** Legt eine Karte; verändert `state` und `memory` (beides Kopien des Probespiels). */
function playInPlace(state: HandState, memory: Memory, seat: Seat, c: Card): void {
  const players = state.hands.length;
  const order = orderFor(state.contract!, state.tricks.length);
  state.hands[seat] = state.hands[seat]!.filter((x) => x !== c);
  const trick = state.currentTrick;
  const lead = trick.cards[0];
  if (lead !== undefined) {
    const leadSuit = effectiveSuit(lead, order);
    if (effectiveSuit(c, order) !== leadSuit) markVoid(memory, seat, leadSuit, order);
  }
  trick.cards.push(c);
  memory.played.add(c);
  if (trick.cards.length < players) {
    state.turn = (seat + 1) % players;
    return;
  }
  const winner = (trick.leader + trickWinnerIndex(trick.cards, order)) % players;
  state.tricks.push({
    leader: trick.leader,
    cards: trick.cards,
    winner,
    points: sumPoints(trick.cards),
  });
  memory.pointsWon[winner] = (memory.pointsWon[winner] ?? 0) + sumPoints(trick.cards);
  memory.tricksSeen = state.tricks.length;
  state.currentTrick = { leader: winner, cards: [] };
  state.turn = winner;
}

/** Spielt von `state` aus mit der Heuristik zu Ende; Ergebnis aus Sicht von `me` in Cent. */
function rollout(state: HandState, memory: Memory, me: Seat, rng: Rng): number {
  while (state.hands.some((h) => h.length > 0)) {
    const seat = state.turn;
    const legal = legalCards(state, seat);
    const c =
      legal.length === 1
        ? legal[0]!
        : heuristicCard(simView(state, seat, legal, memory), memory, rng);
    playInPlace(state, memory, seat, c);
  }
  state.phase = 'finished';
  return scoreHand(state).payments[me]!;
}

function search(
  view: HandView,
  log: TrickLog,
  rng: Rng,
  suggestion: Card,
  options: StrongBotOptions,
): Card {
  const legal = view.legalCards;
  const k = knowledge(view, log, options);
  const remaining = view.handSizes.reduce((a, b) => a + b, 0);
  const budget = options.playBudget ?? STRONG_DEFAULTS.playBudget;
  const minSamples = options.minSamples ?? STRONG_DEFAULTS.minSamples;
  const maxSamples = options.maxSamples ?? STRONG_DEFAULTS.maxSamples;
  const samples = Math.max(
    minSamples,
    Math.min(maxSamples, Math.floor(budget / (legal.length * remaining))),
  );
  const clock = startClock(options);

  const totals = legal.map(() => 0);
  let done = 0;
  for (let i = 0; i < samples; i++) {
    if (i >= 2 && clock.expired()) break;
    const base = determinize(view, log, k, sampleHands(view, k, rng));
    legal.forEach((c, j) => {
      const state = cloneState(base);
      const memory = memoryOf(state, k);
      playInPlace(state, memory, k.me, c);
      totals[j]! += rollout(state, memory, k.me, rng);
    });
    done++;
  }
  if (done === 0) return suggestion;
  // Beste Summe; Gleichstand (auch „egal“) zugunsten der Heuristik.
  let best = legal.indexOf(suggestion);
  if (best < 0) best = 0;
  legal.forEach((_, j) => {
    if (totals[j]! > totals[best]! + 1e-9) best = j;
  });
  return legal[best]!;
}
