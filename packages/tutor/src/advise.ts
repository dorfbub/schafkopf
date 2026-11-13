import {
  type BidCall,
  type Card,
  type Contract,
  type Rng,
  MODES,
  bidValue,
  createDeck,
  createRng,
  sameContract,
  tricksPlayed,
} from '@schafkopf/core';
import {
  type Evaluation,
  type Memory,
  type StrongBotOptions,
  candidateContracts,
  createHeuristicBot,
  createMemory,
  evaluateCards,
  evaluateContracts,
  evaluateDouble,
  evaluateWeddingGive,
  evaluateWeddingOffer,
  heuristicCard,
  markVoid,
  rateContract,
  wantsDouble,
  weddingMove,
} from '@schafkopf/bots';
import { type Lage, buildLage } from './lage';
import { RULES } from './rules';
import { ruleValue } from './werte';
import type {
  Advice,
  AskKind,
  Importance,
  Message,
  OptionValue,
  Review,
  RuleHit,
  TutorInput,
  TutorOption,
  TutorOptions,
} from './types';

/**
 * Aufwand der Rechnung: etwa das Zweieinhalbfache des starken Bots, damit die Werte ruhiger
 * sind. Auf einem Entwicklerrechner bleibt eine Antwort damit deutlich unter 300 ms (Test).
 */
export const TUTOR_BUDGET = {
  playBudget: 5000,
  minSamples: 10,
  maxSamples: 60,
  bidBudget: 3000,
  minBidSamples: 6,
} as const;

/**
 * Schwellen in Vielfachen des Sauspiel-Tarifs (`rules.tariff.sauspiel`, Standard 10 Cent), damit
 * sie bei anderen Tarifen mitwachsen. Begründung in docs/STRATEGIEN.md, „Didaktik“.
 */
export const THRESHOLDS = {
  /** Unterschiede darunter gelten als Gleichstand; dann entscheidet die Faustregel. */
  tie: 0.15,
  /** Verlust bis hier: „gut“. */
  good: 0.2,
  /** Verlust ab hier: „Fehler“ – nur dann spricht der Tutor es von selbst an. */
  mistake: 0.6,
  /** Einsatz ab hier: Wichtigkeit „mittel“. */
  medium: 0.4,
  /** Einsatz ab hier: Wichtigkeit „hoch“ – der Automatikmodus meldet sich. */
  high: 1.0,
} as const;

/**
 * Ein Unterschied zählt erst, wenn er mindestens so viele Standardfehler groß ist (gepaarter
 * Vergleich über dieselben Kartenverteilungen). Darunter kann er Zufall der Stichprobe sein.
 */
export const SIGNIFICANCE = 2;

/** Spielt nicht bei der Ansage mit: Spiele mit Marge darunter rechnet der Tutor nicht durch. */
const HOPELESS_MARGIN = -4;
/** Höchstzahl durchgerechneter Spiele bei der Ansage (Laufzeit). */
const MAX_SIMULATED = 6;

// ---------------------------------------------------------------------------
// Öffentliche Schnittstelle

/** Welche Frage passt gerade? Ansage, Vorspiel, eigene Karte oder Kontra/Re – sonst `null`. */
export function currentAsk(input: TutorInput): AskKind | null {
  const { view, seat } = input;
  if (view.phase === 'prelude')
    return view.turn === seat && view.legalMoves.length > 0 ? 'prelude' : null;
  if (view.phase === 'bidding')
    return view.turn === seat && view.legalCalls.length > 0 ? 'bid' : null;
  if (view.phase !== 'playing') return null;
  if (view.turn === seat && view.legalCards.length > 0) return 'card';
  return view.canDouble ? 'double' : null;
}

/**
 * Rat zu einer Entscheidung: Bewertung aller Möglichkeiten, Empfehlung, Faustregeln, Denkanstoß
 * und Wichtigkeit. `ask` wählt die Frage (ohne Angabe: `currentAsk`). `null`, wenn die Frage
 * gerade nicht passt (nicht am Zug, kein Kontra möglich …).
 */
export function advise(
  input: TutorInput,
  ask: AskKind | null = currentAsk(input),
  options: TutorOptions = {},
): Advice | null {
  const analysis = analyse(input, ask, options);
  return analysis?.advice ?? null;
}

/** Wie wichtig ist der Moment? Für den Automatikmodus (meldet sich bei `auto`). */
export function importance(
  input: TutorInput,
  ask: AskKind | null = currentAsk(input),
  options: TutorOptions = {},
): Importance {
  return (
    advise(input, ask, options)?.importance ?? { stakeCents: 0, level: 'niedrig', auto: false }
  );
}

/**
 * Bewertung hinterher: `input` ist die Lage vor dem Zug, `move` der gemachte Zug. `null`, wenn
 * der Zug in dieser Lage nicht zur Wahl stand.
 */
export function review(
  input: TutorInput,
  move: TutorOption,
  options: TutorOptions = {},
): Review | null {
  const analysis = analyse(input, askOf(move), options);
  if (!analysis) return null;
  const { advice, hits, valued } = analysis;
  const key = optionKey(move);
  const moveValue = valued.get(key);
  if (!moveValue) return null;
  const best = advice.recommended;
  const bestValue = valued.get(optionKey(best))!;
  const unit = unitOf(input);
  const sameAsBest = optionKey(best) === key;
  const counted = bestValue.cents !== null && moveValue.cents !== null;
  const loss = sameAsBest || !counted ? 0 : Math.max(0, bestValue.cents! - moveValue.cents!);
  const noise = counted ? SIGNIFICANCE * pairedError(bestValue, moveValue) : 0;
  let verdict: Review['verdict'];
  if (sameAsBest) verdict = 'gut';
  else if (!counted) verdict = 'vertretbar';
  else if (loss <= Math.max(THRESHOLDS.good * unit, noise)) verdict = 'gut';
  else if (loss < THRESHOLDS.mistake * unit) verdict = 'vertretbar';
  else verdict = 'fehler';
  const favors = (h: RuleHit, k: string) => h.favored.some((o) => optionKey(o) === k);
  const misleading =
    verdict === 'gut'
      ? null
      : (hits.find((h) => favors(h, key) && !favors(h, optionKey(best))) ?? null);
  return {
    verdict,
    move,
    best,
    lossCents: round(loss),
    rule: verdict === 'gut' ? null : (advice.reasons[0] ?? null),
    misleading,
    mention: verdict === 'fehler',
  };
}

/** Eindeutige Kennung einer Möglichkeit (zum Vergleichen und als Schlüssel in der Oberfläche). */
export function optionKey(o: TutorOption): string {
  switch (o.type) {
    case 'card':
      return `card:${o.card}`;
    case 'double':
      return `double:${o.double ? 'ja' : 'nein'}`;
    case 'bid':
      return `bid:${callKey(o.call)}`;
    case 'prelude':
      return o.move.type === 'give'
        ? `prelude:give:${[...o.move.cards].sort().join(',')}`
        : `prelude:${o.move.type}`;
  }
}

function callKey(call: BidCall): string {
  switch (call.type) {
    case 'name':
      return `name:${call.level.kind}${call.level.tout ? ':tout' : ''}`;
    case 'declare': {
      const c = call.contract;
      return `declare:${c.kind}:${c.suit ?? ''}:${c.suit2 ?? ''}${c.tout ? ':tout' : ''}`;
    }
    default:
      return call.type;
  }
}

// ---------------------------------------------------------------------------
// Analyse

interface Analysis {
  advice: Advice;
  /** Alle greifenden Faustregeln (auch die, die weder Grund noch Ausnahme sind). */
  hits: RuleHit[];
  /** Werte samt Ergebnissen je Verteilung, nach `optionKey`. */
  valued: Map<string, Valued>;
}

/** Wert einer Möglichkeit mit den Ergebnissen je Verteilung (`null`: kein Rauschen bekannt). */
interface Valued extends OptionValue {
  samples: number[] | null;
}

/**
 * Standardfehler des Unterschieds zweier Möglichkeiten, gepaart über dieselben Verteilungen.
 * Ohne Stichprobe (geschätzt oder fest wie „weiter“ = 0) zählt nur die andere Seite.
 */
function pairedError(a: Valued, b: Valued): number {
  const n = a.samples?.length ?? b.samples?.length ?? 0;
  if (n < 2) return 0;
  const xs = a.samples ?? new Array<number>(n).fill(a.cents ?? 0);
  const ys = b.samples ?? new Array<number>(n).fill(b.cents ?? 0);
  if (xs.length !== ys.length) return 0;
  const d = xs.map((x, i) => x - ys[i]!);
  const mean = d.reduce((s, x) => s + x, 0) / n;
  const variance = d.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance / n);
}

function askOf(move: TutorOption): AskKind {
  return move.type === 'bid'
    ? 'bid'
    : move.type === 'card'
      ? 'card'
      : move.type === 'prelude'
        ? 'prelude'
        : 'double';
}

function unitOf(input: TutorInput): number {
  return input.rules.tariff.sauspiel > 0 ? input.rules.tariff.sauspiel : 10;
}

const sameCards = (a: readonly Card[], b: readonly Card[]) =>
  a.length === b.length && a.every((c) => b.includes(c));

const round = (x: number) => Math.round(x * 10) / 10;

function available(input: TutorInput, ask: AskKind): boolean {
  const { view, seat } = input;
  // Der Tutor spricht nur über den eigenen Sitz: Sicht und Sitz müssen zusammenpassen.
  if (ask === 'bid')
    return view.phase === 'bidding' && view.turn === seat && view.legalCalls.length > 0;
  if (ask === 'prelude')
    return view.phase === 'prelude' && view.turn === seat && view.legalMoves.length > 0;
  if (ask === 'card')
    return view.phase === 'playing' && view.turn === seat && view.legalCards.length > 0;
  return view.phase === 'playing' && view.canDouble;
}

function optionsFor(input: TutorInput, ask: AskKind): TutorOption[] {
  const { view } = input;
  if (ask === 'bid') return view.legalCalls.map((call) => ({ type: 'bid', call }));
  if (ask === 'card') return view.legalCards.map((c) => ({ type: 'card', card: c }));
  if (ask === 'prelude') return view.legalMoves.map((move) => ({ type: 'prelude', move }));
  return [
    { type: 'double', double: true },
    { type: 'double', double: false },
  ];
}

function strongOptions(input: TutorInput, options: TutorOptions): StrongBotOptions {
  return {
    ...TUTOR_BUDGET,
    rules: input.rules,
    respectBids: true,
    playBudget: options.playBudget ?? TUTOR_BUDGET.playBudget,
    bidBudget: options.bidBudget ?? TUTOR_BUDGET.bidBudget,
    ...(options.now && options.budgetMs !== undefined
      ? { now: options.now, budgetMs: options.budgetMs }
      : {}),
  };
}

function analyse(input: TutorInput, ask: AskKind | null, options: TutorOptions): Analysis | null {
  if (ask === null || !available(input, ask)) return null;
  const seed = options.seed ?? 1;
  const rng = createRng(seed);
  const lage = buildLage(input);
  const opts = optionsFor(input, ask);
  const keys = new Set(opts.map(optionKey));
  const unit = unitOf(input);

  const values = evaluate(input, lage, ask, opts, rng, strongOptions(input, options));
  const valueOf = new Map(values.map((v) => [optionKey(v.option), v]));
  /** Ist `a` besser als `b`, und zwar mehr als Gleichstand und Zufall? Um wie viel? */
  const lead = (a: Valued, b: Valued) => {
    if (a.cents === null || b.cents === null) return 0;
    const d = a.cents - b.cents;
    return d > Math.max(THRESHOLDS.tie * unit, SIGNIFICANCE * pairedError(a, b)) ? d : 0;
  };
  const naive = naiveChoice(input, lage, ask, seed);

  // Faustregeln: nur die mit Aussage (spricht für einige, aber nicht für alle Möglichkeiten).
  const hits = collectHits(lage, ask, keys);
  const support = (o: TutorOption) => {
    const k = optionKey(o);
    return hits.reduce(
      (s, h, i) => s + (h.favored.some((f) => optionKey(f) === k) ? hits.length - i : 0),
      0,
    );
  };

  const valued = values.filter((v) => v.cents !== null);
  const basis: Advice['basis'] = valued.length > 0 ? 'suche' : 'faustregel';
  let recommended: TutorOption;
  let near: Set<string>;
  if (basis === 'suche') {
    const top = valued.reduce((a, b) => (b.cents! > a.cents! ? b : a));
    const close = valued.filter((v) => lead(top, v) === 0);
    near = new Set(close.map((v) => optionKey(v.option)));
    // Gleichstand: Die Faustregel gewinnt (sie lässt sich lernen), dann die Heuristik, dann der Wert.
    const ranked = [...close].sort(
      (a, b) =>
        support(b.option) - support(a.option) ||
        Number(naive !== null && optionKey(b.option) === optionKey(naive)) -
          Number(naive !== null && optionKey(a.option) === optionKey(naive)) ||
        b.cents! - a.cents!,
    );
    recommended = ranked[0]!.option;
  } else {
    const top = hits[0];
    const naiveOk =
      naive !== null && (!top || top.favored.some((o) => optionKey(o) === optionKey(naive)));
    recommended = naiveOk ? naive! : (top?.favored[0] ?? naive ?? opts[0]!);
    near = new Set([optionKey(recommended)]);
  }

  const recKey = optionKey(recommended);
  const favorsRec = (h: RuleHit) => h.favored.some((o) => optionKey(o) === recKey);
  const reasons = hits.filter(favorsRec).slice(0, 2);
  const overruled = hits
    .filter((h) => !favorsRec(h))
    .filter((h) => !h.favored.some((o) => near.has(optionKey(o))))
    .slice(0, 2);

  const recValue = valueOf.get(recKey)!;
  const plausible = new Set<string>(hits.flatMap((h) => h.favored.map(optionKey)));
  if (naive) plausible.add(optionKey(naive));
  plausible.delete(recKey);
  let stake = 0;
  for (const k of plausible) {
    const other = valueOf.get(k);
    if (other) stake = Math.max(stake, lead(recValue, other));
  }
  const level =
    stake >= THRESHOLDS.high * unit
      ? 'hoch'
      : stake >= THRESHOLDS.medium * unit
        ? 'mittel'
        : 'niedrig';

  const sorted = [...values].sort((a, b) => (b.cents ?? -Infinity) - (a.cents ?? -Infinity));
  const advice: Advice = {
    ask,
    options: sorted.map((v) => ({
      option: v.option,
      cents: v.cents === null ? null : round(v.cents),
      estimated: v.estimated,
    })),
    recommended,
    basis,
    reasons,
    overruled,
    hint: hintFor(ask, lage, reasons, overruled),
    importance: { stakeCents: round(stake), level, auto: level === 'hoch' },
  };
  return { advice, hits, valued: valueOf };
}

/**
 * Greifende Faustregeln mit Aussage, nach gemessenem Wert sortiert (T4): Wer mehr bringt, steht
 * vorn und wird zuerst genannt. Regeln ohne Messung zählen 0 und behalten ihre Reihenfolge.
 */
function collectHits(lage: Lage, ask: AskKind, keys: ReadonlySet<string>): RuleHit[] {
  const hits: RuleHit[] = [];
  for (const rule of RULES) {
    if (rule.ask !== ask) continue;
    const check = rule.check(lage);
    if (!check) continue;
    const favored = dedupe(check.favored.filter((o) => keys.has(optionKey(o))));
    if (favored.length === 0 || favored.length === keys.size) continue;
    const wert = ruleValue(rule.id);
    hits.push({
      id: rule.id,
      area: rule.area,
      favored,
      params: check.params,
      ...(wert ? { wert } : {}),
    });
  }
  return hits
    .map((h, i) => ({ h, i }))
    .sort((a, b) => (b.h.wert?.cents ?? 0) - (a.h.wert?.cents ?? 0) || a.i - b.i)
    .map((x) => x.h);
}

/** Greifende Faustregeln einer Frage (für das Messen der Regeln, T4). */
export function ruleHits(input: TutorInput, ask: AskKind): RuleHit[] {
  const opts = optionsFor(input, ask);
  return collectHits(buildLage(input), ask, new Set(opts.map(optionKey)));
}

function dedupe(options: TutorOption[]): TutorOption[] {
  const seen = new Set<string>();
  return options.filter((o) => {
    const k = optionKey(o);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Denkanstoß: eine Frage zur Lage, die auf die Faustregel hinführt, ohne die Karte zu nennen.
 * Greift keine Regel, eine allgemeine Frage; spricht die übliche Regel hier dagegen, ein Hinweis,
 * dass die Lage besonders ist.
 */
function hintFor(ask: AskKind, l: Lage, reasons: RuleHit[], overruled: RuleHit[]): Message {
  const top = reasons[0];
  if (top) return { key: `denkanstoss.${top.id}`, params: top.params };
  if (overruled[0]) return { key: 'denkanstoss.ausnahme', params: { regel: overruled[0].id } };
  if (ask === 'bid') return { key: 'denkanstoss.ansage', params: {} };
  if (ask === 'double') return { key: 'denkanstoss.kontra', params: {} };
  if (ask === 'prelude') {
    const offer = l.view.prelude?.step === 'offer';
    return {
      key: offer ? 'denkanstoss.hochzeit.annehmen' : 'denkanstoss.hochzeit.zurueck',
      params: {},
    };
  }
  if (l.leading) return { key: 'denkanstoss.karte.anspielen', params: {} };
  return {
    key: 'denkanstoss.karte.zugeben',
    params: { stich: l.winnerSeat ?? 0, augen: l.trickPoints },
  };
}

// ---------------------------------------------------------------------------
// Bewertung

function evaluate(
  input: TutorInput,
  lage: Lage,
  ask: AskKind,
  opts: TutorOption[],
  rng: Rng,
  strong: StrongBotOptions,
): Valued[] {
  const none = (): Valued[] =>
    opts.map((option) => ({ option, cents: null, estimated: false, samples: null }));
  const from = <T>(evals: Evaluation<T>[], pick: (o: TutorOption) => Evaluation<T> | undefined) =>
    opts.map((option): Valued => {
      const e = pick(option);
      return { option, cents: e?.cents ?? null, estimated: false, samples: e?.values ?? null };
    });
  if (ask === 'card') {
    if (!lage.historyComplete) return none();
    const evals = evaluateCards(input.view, input.history, rng, strong);
    if (evals.length === 0) return none();
    return from(evals, (o) => evals.find((e) => o.type === 'card' && e.option === o.card));
  }
  if (ask === 'prelude') {
    if (input.view.prelude?.step === 'offer') {
      const evals = evaluateWeddingOffer(input.view, rng, strong);
      if (evals.length === 0) return none();
      return from(evals, (o) =>
        evals.find((e) => o.type === 'prelude' && e.option === o.move.type),
      );
    }
    const evals = evaluateWeddingGive(input.view, rng, strong);
    if (evals.length === 0) return none();
    return from(evals, (o) =>
      evals.find(
        (e) => o.type === 'prelude' && o.move.type === 'give' && sameCards(e.option, o.move.cards),
      ),
    );
  }
  if (ask === 'double') {
    const evals = evaluateDouble(input.view, input.seat, rng, strong);
    if (evals.length === 0) return none();
    return from(evals, (o) => evals.find((e) => o.type === 'double' && e.option === o.double));
  }
  return evaluateBids(input, opts, rng, strong);
}

interface ContractValue {
  contract: Contract;
  cents: number | null;
  estimated: boolean;
  samples: number[] | null;
}

/**
 * Ansage: Die erfolgversprechenden Spiele (nach der Heuristik) werden durchgespielt, „weiter“
 * zählt 0 (Näherung wie beim starken Bot). Spiele mit Vorspiel (Hochzeit) lassen sich nicht
 * simulieren; sie bekommen eine Schätzung aus der Heuristik (`estimated`).
 */
function evaluateBids(
  input: TutorInput,
  opts: TutorOption[],
  rng: Rng,
  strong: StrongBotOptions,
): Valued[] {
  const { view, rules } = input;
  const a = view.auction;
  const current = a.level ? bidValue(a.level) : 0;
  const holder = view.turn === a.holder;
  const size = view.handSizes.reduce((x, y) => x + y, 0);
  const contracts =
    a.stage === 'declare'
      ? view.legalCalls.flatMap((c) => (c.type === 'declare' ? [c.contract] : []))
      : candidateContracts(view.hand, rules, a.failed).filter(
          (c) =>
            a.stage === 'interest' || (holder ? bidValue(c) >= current : bidValue(c) > current),
        );
  const rated = contracts
    .map((contract) => ({ contract, margin: rateContract(view.hand, contract, size) }))
    .sort((x, y) => y.margin - x.margin);
  const simulable = rated.filter((r) => !MODES[r.contract.kind].prelude);
  let chosen = simulable.filter((r) => r.margin >= HOPELESS_MARGIN).slice(0, MAX_SIMULATED);
  if (chosen.length === 0 && a.stage === 'declare') chosen = simulable.slice(0, 3);
  const evals = evaluateContracts(
    view,
    chosen.map((r) => r.contract),
    rng,
    strong,
  );
  const unit = unitOf(input);
  const values: ContractValue[] = rated.map(({ contract, margin }) => {
    const e = evals.find((x) => sameContract(x.option, contract));
    if (e) return { contract, cents: e.cents, estimated: false, samples: e.values };
    if (MODES[contract.kind].prelude && margin >= 0) {
      const cents = unit * (0.5 + 0.25 * Math.min(margin, 4));
      return { contract, cents, estimated: true, samples: null };
    }
    return { contract, cents: null, estimated: false, samples: null };
  });
  const bestOf = (pred: (c: Contract) => boolean): Omit<Valued, 'option'> => {
    let best: ContractValue | null = null;
    for (const v of values) {
      if (v.cents === null || !pred(v.contract)) continue;
      if (!best || v.cents > best.cents!) best = v;
    }
    return {
      cents: best?.cents ?? null,
      estimated: best?.estimated ?? false,
      samples: best?.samples ?? null,
    };
  };
  return opts.map((option): Valued => {
    if (option.type !== 'bid') return { option, cents: null, estimated: false, samples: null };
    const call = option.call;
    switch (call.type) {
      case 'pass':
      case 'yield':
        return { option, cents: 0, estimated: false, samples: null };
      case 'interest':
        return { option, ...bestOf(() => true) };
      case 'hold':
        return { option, ...bestOf((c) => bidValue(c) >= current) };
      case 'name':
        return { option, ...bestOf((c) => bidValue(c) === bidValue(call.level)) };
      case 'declare':
        return { option, ...bestOf((c) => sameContract(c, call.contract)) };
    }
  });
}

// ---------------------------------------------------------------------------
// Was ein ordentlicher Spieler ohne Nachdenken täte: der Heuristik-Bot

function naiveChoice(
  input: TutorInput,
  lage: Lage,
  ask: AskKind,
  seed: number,
): TutorOption | null {
  const { view, rules, seat } = input;
  if (ask === 'bid') {
    const action = createHeuristicBot(seed).decide(view, rules);
    return action.type === 'bid' ? { type: 'bid', call: action.call } : null;
  }
  if (ask === 'prelude') return { type: 'prelude', move: weddingMove(view) };
  if (ask === 'double') {
    return { type: 'double', double: wantsDouble({ ...view, turn: seat }, rateContract) };
  }
  const c: Card = heuristicCard(view, memoryOf(input, lage), createRng(seed + 1), rules);
  return { type: 'card', card: c };
}

/** Gedächtnis der Heuristik aus der Lage – alles darin ist öffentlich. */
function memoryOf(input: TutorInput, lage: Lage): Memory {
  const memory = createMemory();
  const deck = createDeck(input.rules.deck);
  memory.deck = deck;
  memory.deckSize = deck.length;
  memory.played = new Set(lage.played);
  memory.absent = input.view.handSizes.map(() => new Set());
  memory.tricksSeen = tricksPlayed(input.view);
  memory.pointsWon = input.view.handSizes.map(() => 0);
  for (const t of input.history) memory.pointsWon[t.winner]! += t.points;
  if (lage.order) {
    lage.voids.forEach((suits, s) => {
      for (const suit of suits) markVoid(memory, s, suit, lage.order!);
    });
  }
  return memory;
}
