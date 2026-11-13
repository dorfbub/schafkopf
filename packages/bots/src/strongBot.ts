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
import {
  chooseWeddingGive,
  rateAcceptWedding,
  rateWedding,
  weddingGiveScore,
  weddingSize,
} from './hochzeit';

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
  /**
   * Verteilungen, in denen der Ansager sein Spiel nach der Heuristik gar nicht angesagt hätte,
   * werden verworfen (bis `PLAUSIBLE_TRIES` Versuche). Der starke Bot am Tisch rechnet ohne das;
   * der Tutor (T1) schaltet es ein, damit er gegen ein Solo nicht mit einem schwachen Ansager rechnet.
   */
  respectBids?: boolean;
  /**
   * Grundlage der Ansage (B4): Standard sind die Ansage-Tabellen der Heuristik; `'faustregel'`
   * ist der Stand vor B4 (Schwellen der Heuristik, knappe Blätter durchgespielt).
   */
  ansage?: 'tabelle' | 'faustregel';
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
  const heuristic = createHeuristicBot(seed, options.ansage ? { ansage: options.ansage } : {});
  const byTable = options.ansage !== 'faustregel';
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
        // Mit Tabelle sagt er an wie die Heuristik: Die Tabelle beruht auf hunderten
        // Probespielen je Blatt, die eigene Suche hätte nur ein gutes Dutzend.
        if (byTable) return suggestion;
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
  const hands = dealt.map((h) => [...h]);
  let partner: Seat | null = null;
  if (MODES[contract.kind].parties === 'calledAce') {
    const sau = card(contract.suit!, 'A');
    partner = hands.findIndex((h) => h.includes(sau));
  }
  return playOut(view, hands, contract, view.turn, partner, rules, rng, view.turn);
}

/**
 * Spielt ein ganzes Spiel von Stich 1 an mit der Heuristik zu Ende und gibt das Ergebnis von
 * `me` in Cent zurück. `hands` sind die Hände zu Spielbeginn.
 */
function playOut(
  view: HandView,
  hands: Card[][],
  contract: Contract,
  declarer: Seat,
  partner: Seat | null,
  rules: RuleSet,
  rng: Rng,
  me: Seat,
): number {
  const state = playOutHand(
    { dealer: view.dealer, hands, contract, declarer, partner, rules, auction: view.auction },
    rng,
  );
  return scoreHand(state).payments[me]!;
}

/** Ausgangslage eines Probespiels ab Stich 1 (Hände nach Ansage und Vorspiel). */
export interface PlayOutSetup {
  dealer: Seat;
  hands: Card[][];
  contract: Contract;
  declarer: Seat;
  partner: Seat | null;
  rules: RuleSet;
  /** Stand der Ansage, wie ihn die Heuristik sieht (Standard: leer). */
  auction?: HandState['auction'];
}

const EMPTY_AUCTION: HandState['auction'] = {
  stage: 'declare',
  holder: null,
  challenger: null,
  waiting: [],
  level: null,
  forced: false,
  yielded: [],
  failed: [],
};

/**
 * Spielt ein ganzes Spiel ab Stich 1 mit der Heuristik an allen Sitzen zu Ende und gibt den
 * fertigen Zustand zurück (für `scoreHand`). Gemeinsamer Kern der Ansage-Suche des starken Bots
 * und der Ansage-Tabellen (B4, `scripts/ansage-tabellen.ts`). Ohne Kontra und Re.
 */
export function playOutHand(setup: PlayOutSetup, rng: Rng): HandState {
  const { dealer, hands, contract, declarer, partner, rules } = setup;
  const players = hands.length;
  const first = (dealer + 1) % players;
  const state: HandState = {
    rules,
    dealer,
    phase: 'playing',
    turn: first,
    hands,
    initialHands: hands.map((h) => [...h]),
    bids: [],
    auction: setup.auction ?? EMPTY_AUCTION,
    contract,
    declarer,
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
  playToEnd(state, memory, rng);
  return state;
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
  /** Nur mit `respectBids`: Hätte der Ansager mit dieser Verteilung so angesagt? */
  plausible: ((hands: Card[][]) => boolean) | null;
}

function knowledge(
  view: HandView,
  log: TrickLog,
  options: StrongBotOptions,
  me: Seat = view.turn,
): Knowledge {
  const contract = view.contract!;
  const players = view.handSizes.length;
  const deckSize = view.handSizes.reduce((a, b) => a + b, 0) + playedCount(view, log);
  const deck = createDeck(deckSize < 32 ? 'kurz' : 'lang');
  const rules = rulesFor(options, players, deckSize);
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
  const plausible = options.respectBids ? bidPlausibility(view, me, playedBy, deckSize) : null;
  return { me, players, rules, unseen, voids, playedBy, allowedFor, calledAce, plausible };
}

/** Mindestmarge der Heuristik, mit der ein Ansager sein Spiel plausibel angesagt hat. */
const PLAUSIBLE_MARGIN = -2.0;
/** So oft wird höchstens neu verteilt, bis der Ansager ein passendes Blatt hat. */
const PLAUSIBLE_TRIES = 20;

/**
 * Prüft, ob der Ansager (nicht man selbst) mit seinem Blatt aus dieser Verteilung sein Spiel
 * angesagt hätte: Marge der Heuristik für sein Ausgangsblatt (verbleibende plus gespielte Karten)
 * mindestens `PLAUSIBLE_MARGIN`. Ohne Ansager, für einen selbst, bei Spielen mit Vorspiel
 * (Hochzeit: getauschte Karten unbekannt) und im Bettel gibt es keine Prüfung.
 */
function bidPlausibility(
  view: HandView,
  me: Seat,
  playedBy: Card[][],
  deckSize: number,
): ((hands: Card[][]) => boolean) | null {
  const contract = view.contract;
  const declarer = view.declarer;
  if (!contract || declarer === null || declarer === me) return null;
  // Bettel bewertet die Heuristik nur als sicher/unsicher – zu streng als Filter.
  if (MODES[contract.kind].prelude || MODES[contract.kind].goal !== 'points') return null;
  const base: Contract = { ...contract, tout: false };
  return (hands) =>
    rateContract([...hands[declarer]!, ...playedBy[declarer]!], base, deckSize) >= PLAUSIBLE_MARGIN;
}

function playedCount(view: HandView, log: TrickLog): number {
  return log.tricks.reduce((n, t) => n + t.cards.length, 0) + view.currentTrick.cards.length;
}

/**
 * Verteilt die ungesehenen Karten zufällig auf die anderen Sitze. Am stärksten eingeschränkte
 * Karten zuerst; geht es nicht auf, neuer Versuch, zuletzt ohne die Fehlfarben-Schlüsse.
 */
function sampleHands(view: HandView, k: Knowledge, rng: Rng): Card[][] {
  if (!k.plausible) return sampleOnce(view, k, rng);
  for (let i = 0; i < PLAUSIBLE_TRIES; i++) {
    const hands = sampleOnce(view, k, rng);
    if (k.plausible(hands)) return hands;
  }
  return sampleOnce(view, k, rng);
}

function sampleOnce(view: HandView, k: Knowledge, rng: Rng): Card[][] {
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
  playToEnd(state, memory, rng);
  return scoreHand(state).payments[me]!;
}

/** Spielt von `state` aus mit der Heuristik zu Ende (verändert `state` und `memory`). */
function playToEnd(state: HandState, memory: Memory, rng: Rng): void {
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
}

function search(
  view: HandView,
  log: TrickLog,
  rng: Rng,
  suggestion: Card,
  options: StrongBotOptions,
): Card {
  const legal = view.legalCards;
  const { totals, done } = sampleCards(view, log, view.turn, rng, options);
  if (done === 0) return suggestion;
  // Beste Summe; Gleichstand (auch „egal“) zugunsten der Heuristik.
  let best = legal.indexOf(suggestion);
  if (best < 0) best = 0;
  legal.forEach((_, j) => {
    if (totals[j]! > totals[best]! + 1e-9) best = j;
  });
  return legal[best]!;
}

/**
 * Probespiele für jede erlaubte Karte auf denselben Verteilungen; Summen der Ergebnisse von
 * `me` in Cent. Gemeinsamer Kern von `search` (Stark) und `evaluateCards` (Tutor).
 */
function sampleCards(
  view: HandView,
  log: TrickLog,
  me: Seat,
  rng: Rng,
  options: StrongBotOptions,
): { totals: number[]; done: number; values: number[][] } {
  const legal = view.legalCards;
  const k = knowledge(view, log, options, me);
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
  const values: number[][] = legal.map(() => []);
  let done = 0;
  for (let i = 0; i < samples; i++) {
    if (i >= 2 && clock.expired()) break;
    const base = determinize(view, log, k, sampleHands(view, k, rng));
    legal.forEach((c, j) => {
      const state = cloneState(base);
      const memory = memoryOf(state, k);
      playInPlace(state, memory, k.me, c);
      const v = rollout(state, memory, k.me, rng);
      totals[j]! += v;
      values[j]!.push(v);
    });
    done++;
  }
  return { totals, done, values };
}

// ---------------------------------------------------------------------------
// Bewertung für den Tutor (T1): dieselbe Suche, aber mit den Werten aller Möglichkeiten

/** Erwarteter Wert einer Möglichkeit in Cent aus Sicht des Fragenden, gemittelt über Verteilungen. */
export interface Evaluation<T> {
  option: T;
  cents: number;
  /** Zahl der Kartenverteilungen, über die gemittelt wurde. */
  samples: number;
  /**
   * Ergebnis je Verteilung (gleiche Reihenfolge für alle Möglichkeiten einer Bewertung) – damit
   * lässt sich prüfen, ob ein Unterschied mehr ist als Zufall (gepaarter Vergleich).
   */
  values: number[];
}

/**
 * Bewertet jede erlaubte Karte (`view.legalCards`) wie der starke Bot: Probespiele auf
 * zufälligen, zur Sicht passenden Verteilungen, alle Sitze nach der Heuristik. `tricks` sind die
 * fertigen Stiche des Spiels in Reihenfolge – öffentlich, jeder am Tisch hat sie gesehen. Fehlen
 * welche (`tricks.length` passt nicht zu `view.tricksWon`), gibt es keine Bewertung (leere Liste).
 */
export function evaluateCards(
  view: HandView,
  tricks: readonly CompletedTrick[],
  rng: Rng,
  options: StrongBotOptions = {},
): Evaluation<Card>[] {
  if (view.phase !== 'playing' || !view.contract || view.legalCards.length === 0) return [];
  if (tricks.length !== tricksPlayed(view)) return [];
  const log: TrickLog = { tricks: [...tricks], complete: true };
  const { totals, done, values } = sampleCards(view, log, view.turn, rng, options);
  if (done === 0) return [];
  return view.legalCards.map((c, j) => ({
    option: c,
    cents: totals[j]! / done,
    samples: done,
    values: values[j]!,
  }));
}

/**
 * Bewertet Kontra bzw. Re für `seat` vor der ersten Karte: dasselbe Probespiel einmal mit
 * (`option: true`) und einmal ohne Doppeln (`false`) abgerechnet. Nicht berücksichtigt: dass auf ein Kontra ein Re folgen
 * kann und dass ein Kontra etwas über das eigene Blatt verrät.
 */
export function evaluateDouble(
  view: HandView,
  seat: Seat,
  rng: Rng,
  options: StrongBotOptions = {},
): Evaluation<boolean>[] {
  if (view.phase !== 'playing' || !view.contract || view.declarer === null) return [];
  if (tricksPlayed(view) > 0 || view.currentTrick.cards.length > 0) return [];
  const log: TrickLog = { tricks: [], complete: true };
  const k = knowledge(view, log, options, seat);
  const remaining = view.handSizes.reduce((a, b) => a + b, 0);
  const budget = options.playBudget ?? STRONG_DEFAULTS.playBudget;
  const samples = Math.max(
    options.minSamples ?? STRONG_DEFAULTS.minSamples,
    Math.min(options.maxSamples ?? STRONG_DEFAULTS.maxSamples, Math.floor(budget / remaining)),
  );
  const inParty = seat === view.declarer || seat === view.partner;
  const doubled = inParty ? { ...view.doubling, re: seat } : { ...view.doubling, kontra: seat };
  const clock = startClock(options);
  const pass: number[] = [];
  const double: number[] = [];
  let done = 0;
  for (let i = 0; i < samples; i++) {
    if (i >= 2 && clock.expired()) break;
    const state = determinize(view, log, k, sampleHands(view, k, rng));
    const memory = memoryOf(state, k);
    rollout(state, memory, seat, rng);
    pass.push(scoreHand(state).payments[seat]!);
    double.push(scoreHand({ ...state, doubling: doubled }).payments[seat]!);
    done++;
  }
  if (done === 0) return [];
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return [
    { option: true, cents: mean(double), samples: done, values: double },
    { option: false, cents: mean(pass), samples: done, values: pass },
  ];
}

/**
 * Bewertet Spiele, die `view.turn` selbst ansagen würde: jedes auf denselben zufälligen
 * Verteilungen der übrigen Karten mit der Heuristik bis zum Ende gespielt (wie die Ansage des
 * starken Bots). Spiele mit Vorspiel (Hochzeit) lassen sich so nicht simulieren und fehlen.
 * „Weiter“ gilt als 0 – eine Näherung: Spielt dann ein anderer, kann man auch gewinnen oder
 * verlieren.
 */
export function evaluateContracts(
  view: HandView,
  contracts: readonly Contract[],
  rng: Rng,
  options: StrongBotOptions = {},
): Evaluation<Contract>[] {
  const playable = contracts.filter((c) => !MODES[c.kind].prelude && c.kind !== 'ramsch');
  if (playable.length === 0 || view.hand.length === 0) return [];
  const players = view.handSizes.length;
  const deckSize = view.handSizes.reduce((a, b) => a + b, 0);
  const rules = rulesFor(options, players, deckSize);
  const bidBudget = options.bidBudget ?? STRONG_DEFAULTS.bidBudget;
  const samples = Math.max(
    options.minBidSamples ?? STRONG_DEFAULTS.minBidSamples,
    Math.floor(bidBudget / (playable.length * deckSize)),
  );
  const clock = startClock(options);
  const values: number[][] = playable.map(() => []);
  let done = 0;
  for (let i = 0; i < samples; i++) {
    if (i >= 2 && clock.expired()) break;
    const hands = dealRest(view, rules, rng);
    playable.forEach((contract, j) => {
      values[j]!.push(simulateContract(view, hands, contract, rules, rng));
    });
    done++;
  }
  if (done === 0) return [];
  return playable.map((contract, j) => ({
    option: contract,
    cents: values[j]!.reduce((a, b) => a + b, 0) / done,
    samples: done,
    values: values[j]!,
  }));
}

// ---------------------------------------------------------------------------
// Hochzeit (T3): Annehmen und Zurückgeben für den Tutor

/** Wie oft höchstens neu verteilt wird, bis die Verteilung zu dem passt, was man gehört hat. */
const WEDDING_TRIES = 40;
/** Höchstzahl durchgerechneter Rückgaben (die übrigen rechnet der Tutor nicht). */
export const MAX_WEDDING_GIVES = 6;

interface WeddingSetting {
  me: Seat;
  players: number;
  rules: RuleSet;
  contract: Contract;
  declarer: Seat;
  n: number;
  /** Sitze, die schon abgelehnt haben (vor einem selbst gefragt). */
  decliners: Seat[];
  trumps: readonly Card[];
  unseen: Card[];
}

function weddingSetting(view: HandView, options: StrongBotOptions): WeddingSetting | null {
  const contract = view.contract;
  const prelude = view.prelude;
  if (view.phase !== 'prelude' || !contract || !prelude || view.declarer === null) return null;
  const n = weddingSize(contract.kind);
  if (n === 0 || view.legalMoves.length === 0) return null;
  const players = view.handSizes.length;
  const deckSize = view.handSizes.reduce((a, b) => a + b, 0);
  const rules = rulesFor(options, players, deckSize);
  const me = view.turn;
  return {
    me,
    players,
    rules,
    contract,
    declarer: view.declarer,
    n,
    decliners: prelude.log.filter((e) => e.move === 'decline').map((e) => e.seat),
    trumps: orderFor(contract, 0).trumps,
    unseen: createDeck(rules.deck).filter((c) => !view.hand.includes(c)),
  };
}

/**
 * Verteilt die unbekannten Karten für das Vorspiel: Der Hochzeiter hat vor dem Tausch genau `n`
 * Trümpfe und sonst keine; die übrigen gehen an die anderen. Passend zu dem, was man gehört hat:
 * Der Hochzeiter hätte mit diesem Blatt angesagt (`rateWedding`), wer vor einem abgelehnt hat,
 * hätte nicht angenommen. Geht es nach `WEDDING_TRIES` Versuchen nicht auf, ohne diese Prüfung.
 * Rückgabe: Hände zu Beginn des Vorspiels, die eigene Hand wie in der Sicht.
 */
function dealWedding(view: HandView, w: WeddingSetting, rng: Rng): Card[][] {
  const exchange = view.prelude!.step === 'exchange';
  const others = Array.from({ length: w.players }, (_, s) => s).filter(
    (s) => s !== w.me && s !== w.declarer,
  );
  let fallback: Card[][] | null = null;
  for (let attempt = 0; attempt < WEDDING_TRIES; attempt++) {
    const strict = attempt < WEDDING_TRIES - 1;
    const sideCards = shuffle(
      w.unseen.filter((c) => !w.trumps.includes(c)),
      rng,
    );
    const trumpCards = shuffle(
      w.unseen.filter((c) => w.trumps.includes(c)),
      rng,
    );
    const hands: Card[][] = view.handSizes.map(() => []);
    hands[w.me] = [...view.hand];
    // Im Schritt „Rückgabe“ hat der Hochzeiter seine Trümpfe schon abgegeben (sie liegen in der
    // eigenen Hand); es bleiben ihm nur Karten ohne Trumpf.
    const declarerSize = view.handSizes[w.declarer]!;
    if (exchange) {
      hands[w.declarer] = sideCards.splice(0, declarerSize);
    } else {
      const own = trumpCards.splice(0, w.n);
      hands[w.declarer] = [...own, ...sideCards.splice(0, declarerSize - w.n)];
    }
    const rest = shuffle([...sideCards, ...trumpCards], rng);
    for (const s of others) hands[s] = rest.splice(0, view.handSizes[s]!);
    fallback ??= hands;
    if (!strict) return hands;
    const wedding = exchange
      ? [...hands[w.declarer]!, ...w.trumps.slice(0, w.n)]
      : hands[w.declarer]!;
    if (rateWedding(wedding, w.n) < 0) continue;
    if (w.decliners.some((s) => s !== w.me && rateAcceptWedding(hands[s]!, w.n) >= 0)) continue;
    return hands;
  }
  return fallback!;
}

/** Zahl der Probespiele: Budget geteilt durch die Kosten eines Spiels. */
function weddingSamples(
  view: HandView,
  options: StrongBotOptions,
  candidates: number,
  budget: number,
): number {
  const size = view.handSizes.reduce((a, b) => a + b, 0);
  return Math.max(
    options.minSamples ?? STRONG_DEFAULTS.minSamples,
    Math.min(
      options.maxSamples ?? STRONG_DEFAULTS.maxSamples,
      Math.floor(budget / (candidates * size)),
    ),
  );
}

/**
 * Bewertet „annehmen“ und „ablehnen“, wenn einem eine Hochzeit angeboten wird (Schritt `offer`,
 * `view.turn` am Zug). Angenommen: Man bekommt die Trümpfe des Hochzeiters, gibt zurück, was der
 * Heuristik-Bot zurückgäbe, und spielt das Spiel mit der Heuristik zu Ende. Abgelehnt zählt 0 –
 * eine Näherung wie bei „weiter“ in der Ansage (spielt dann ein anderer mit, kann man auch
 * gewinnen oder verlieren). Nur die eigene Sicht: Der Hochzeiter und die anderen sind eine
 * Stichprobe, die zu ihrer Ansage passt.
 */
export function evaluateWeddingOffer(
  view: HandView,
  rng: Rng,
  options: StrongBotOptions = {},
): Evaluation<'accept' | 'decline'>[] {
  const w = weddingSetting(view, options);
  if (!w || view.prelude!.step !== 'offer') return [];
  const samples = weddingSamples(view, options, 1, options.bidBudget ?? STRONG_DEFAULTS.bidBudget);
  const clock = startClock(options);
  const accept: number[] = [];
  for (let i = 0; i < samples; i++) {
    if (i >= 2 && clock.expired()) break;
    const hands = dealWedding(view, w, rng);
    const given = hands[w.declarer]!.filter((c) => w.trumps.includes(c));
    const mine = [...hands[w.me]!, ...given];
    const gives = weddingGives(mine, w);
    const back = chooseWeddingGive(mine, gives);
    const after = hands.map((h) => [...h]);
    after[w.declarer] = [...hands[w.declarer]!.filter((c) => !given.includes(c)), ...back];
    after[w.me] = mine.filter((c) => !back.includes(c));
    accept.push(playOut(view, after, w.contract, w.declarer, w.me, w.rules, rng, w.me));
  }
  const done = accept.length;
  if (done === 0) return [];
  const mean = accept.reduce((a, b) => a + b, 0) / done;
  return [
    { option: 'accept', cents: mean, samples: done, values: accept },
    { option: 'decline', cents: 0, samples: done, values: accept.map(() => 0) },
  ];
}

/** Erlaubte Rückgaben für eine Hand: `n` Karten, Nicht-Trümpfe, soweit vorhanden. */
function weddingGives(hand: readonly Card[], w: WeddingSetting): Card[][] {
  const plain = hand.filter((c) => !w.trumps.includes(c)).length;
  const need = Math.min(w.n, plain);
  const out: Card[][] = [];
  const pick = (from: number, chosen: Card[]) => {
    if (chosen.length === w.n) {
      if (chosen.filter((c) => !w.trumps.includes(c)).length === need) out.push([...chosen]);
      return;
    }
    for (let i = from; i < hand.length; i++) pick(i + 1, [...chosen, hand[i]!]);
  };
  pick(0, []);
  return out;
}

/**
 * Bewertet jede erlaubte Rückgabe (Schritt `exchange`, `view.turn` ist der Partner): Man kennt
 * seine neue Hand; der Hochzeiter hat nur Nicht-Trümpfe. Höchstens `MAX_WEDDING_GIVES` Rückgaben
 * werden gerechnet – die, die die Heuristik am besten findet. Gleiche Verteilungen für alle
 * Rückgaben, Heuristik an allen Sitzen.
 */
export function evaluateWeddingGive(
  view: HandView,
  rng: Rng,
  options: StrongBotOptions = {},
): Evaluation<Card[]>[] {
  const w = weddingSetting(view, options);
  if (!w || view.prelude!.step !== 'exchange') return [];
  const all = view.legalMoves.flatMap((m) => (m.type === 'give' ? [m.cards] : []));
  const gives = [...all]
    .sort((a, b) => weddingGiveScore(view.hand, b) - weddingGiveScore(view.hand, a))
    .slice(0, MAX_WEDDING_GIVES);
  if (gives.length === 0) return [];
  const samples = weddingSamples(
    view,
    options,
    gives.length,
    (options.playBudget ?? STRONG_DEFAULTS.playBudget) * 0.6,
  );
  const clock = startClock(options);
  const values: number[][] = gives.map(() => []);
  let done = 0;
  for (let i = 0; i < samples; i++) {
    if (i >= 2 && clock.expired()) break;
    const hands = dealWedding(view, w, rng);
    gives.forEach((back, j) => {
      const after = hands.map((h) => [...h]);
      after[w.me] = hands[w.me]!.filter((c) => !back.includes(c));
      after[w.declarer] = [...hands[w.declarer]!, ...back];
      values[j]!.push(playOut(view, after, w.contract, w.declarer, w.me, w.rules, rng, w.me));
    });
    done++;
  }
  if (done === 0) return [];
  return gives.map((cards, j) => ({
    option: cards,
    cents: values[j]!.reduce((a, b) => a + b, 0) / done,
    samples: done,
    values: values[j]!,
  }));
}
