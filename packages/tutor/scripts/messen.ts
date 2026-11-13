import {
  type Action,
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
import { createHeuristicBot } from '@schafkopf/bots';
import { RULE_IDS, type RuleId, advise, optionKey, ruleHits } from '../src';
import type { AskKind, RuleHit, TutorInput, TutorOption } from '../src/types';

/**
 * Faustregeln nachmessen (Paket T4). Verfahren, ausführlich in docs/STRATEGIEN.md („Messung“):
 *
 * Gepaarter Vergleich wie in B2. Alle vier Sitze spielen den Heuristik-Bot (Seeds fest). Im
 * Grundlauf wird bei jeder Entscheidung geprüft, ob eine Regel greift. Beim ersten Vorkommen je
 * Sitz und Spiel wird das Spiel zweimal von vorn gespielt – mit denselben Karten, denselben Bots,
 * und nur an dieser einen Stelle verschieden:
 *   Arm „folgt“:       der Sitz nimmt die Möglichkeit, für die die Regel spricht und die der
 *                      Tutor (Suche, `advise`) am höchsten bewertet.
 *   Arm „widerspricht“: der Sitz nimmt die am höchsten bewertete Möglichkeit, für die die Regel
 *                      nicht spricht (die beste Alternative).
 * Danach spielt wieder die Heuristik. Wert der Regel = Unterschied der Zahlungen des Sitzes am
 * Spielende (Cent), gemittelt über die Vorkommen; Fehler = Standardfehler dieses Mittels.
 */

export interface MessParameter {
  /** Spiele je Regelsatz, die auf Vorkommen durchsucht werden (Seeds 1..spiele). */
  spiele: number;
  /** Höchstzahl gemessener Lagen je Regel. */
  lagen: number;
  /** Weniger gemessene Lagen gelten als „zu selten“. */
  mindestLagen: number;
}

export const STANDARD_PARAMETER: MessParameter = { spiele: 3000, lagen: 300, mindestLagen: 30 };

export interface Messergebnis {
  regel: RuleId;
  regelsatz: Regelsatz;
  /** Durchsuchte Spiele und darin gefundene Vorkommen (alle Sitze). */
  spiele: number;
  vorkommen: number;
  /** Gemessene Lagen (erstes Vorkommen je Sitz und Spiel, bis zur Höchstzahl). */
  lagen: number;
  /** Mittlerer Vorteil des Befolgens in Cent je Vorkommen und Standardfehler; `null` bei zu wenigen Lagen. */
  cents: number | null;
  fehler: number | null;
  /** Mittlere Zahlung im Arm „folgt“ bzw. „widerspricht“ (Cent). */
  folgt: number | null;
  widerspricht: number | null;
  /** In wie vielen Lagen die beiden Arme zu verschiedenen Ergebnissen kamen. */
  verschieden: number;
  zuSelten: boolean;
  parameter: MessParameter;
}

export type Regelsatz = 'standard' | 'kontra' | 'ramsch' | 'hochzeit';

export function regelsatzFuer(id: RuleId): Regelsatz {
  if (id.startsWith('kontra.') || id.startsWith('re.')) return 'kontra';
  if (id.startsWith('ramsch.')) return 'ramsch';
  if (id.startsWith('hochzeit.')) return 'hochzeit';
  return 'standard';
}

function rulesFor(set: Regelsatz): RuleSet {
  switch (set) {
    case 'kontra':
      return { ...DEFAULT_RULES, kontra: true };
    case 'ramsch':
      return { ...DEFAULT_RULES, allPassed: 'ramsch' };
    case 'hochzeit':
      return { ...DEFAULT_RULES, contracts: [...DEFAULT_RULES.contracts, 'hochzeit'] };
    default:
      return DEFAULT_RULES;
  }
}

// ---------------------------------------------------------------------------
// Ein Spiel mit Heuristik-Bots, optional mit einer erzwungenen Entscheidung

const botSeed = (game: number, seat: Seat) => 2000 + 4 * game + seat;

interface Eingriff {
  step: number;
  option: TutorOption;
}

/** Entscheidung, die ein Sitz zu einem Zeitpunkt trifft: Aktion und die Fragen, die sich stellen. */
interface Schritt {
  state: HandState;
  seat: Seat;
  action: PlayerAction;
  /** Fragen an den Tutor, die sich an dieser Stelle stellen. */
  fragen: AskKind[];
}

function fragenAn(state: HandState, seat: Seat): AskKind[] {
  const view = handViewFor(state, seat);
  const out: AskKind[] = [];
  if (view.phase === 'bidding' && view.legalCalls.length > 0) out.push('bid');
  if (view.phase === 'playing') {
    if (view.legalCards.length > 1) out.push('card');
    if (view.canDouble) out.push('double');
  }
  return out;
}

function aktionFuer(option: TutorOption, bot: Bot, state: HandState, seat: Seat, rules: RuleSet) {
  if (option.type === 'bid') return { type: 'bid', call: option.call } as PlayerAction;
  if (option.type === 'card') return { type: 'play', card: option.card } as PlayerAction;
  if (option.double) return { type: 'double' } as PlayerAction;
  // „Kein Kontra“: so spielen, als gäbe es keines.
  return bot.decide({ ...handViewFor(state, seat), canDouble: false }, rules);
}

/**
 * Spielt Spiel `game` mit lauter Heuristik-Bots. Mit `eingriff` wird an Entscheidung `step` die
 * Möglichkeit erzwungen. `beobachter` sieht jede Entscheidung vor der Ausführung.
 */
function spiele(
  game: number,
  rules: RuleSet,
  eingriff: Eingriff | null,
  beobachter?: (s: Schritt, step: number) => void,
): HandState {
  const bots = [0, 1, 2, 3].map((s) => createHeuristicBot(botSeed(game, s)));
  let state = dealHand(rules, game % 4, game);
  for (let step = 0; state.phase !== 'finished'; step++) {
    if (step > 200) throw new Error(`Spiel ${game} endet nicht`);
    const seat = state.turn;
    const bot = bots[seat]!;
    let action = bot.decide(handViewFor(state, seat), rules);
    if (beobachter) beobachter({ state, seat, action, fragen: fragenAn(state, seat) }, step);
    if (eingriff && eingriff.step === step) {
      action = aktionFuer(eingriff.option, bot, state, seat, rules);
    }
    const result = applyAction(state, { ...action, seat } as Action);
    if (!result.ok)
      throw new Error(`Unerlaubte Aktion (Spiel ${game}, Schritt ${step}): ${result.error}`);
    state = result.state;
  }
  return state;
}

// ---------------------------------------------------------------------------
// Messen

const tutorInput = (state: HandState, seat: Seat, rules: RuleSet): TutorInput => ({
  view: handViewFor(state, seat),
  rules,
  seat,
  history: state.tricks,
});

interface Zaehler {
  vorkommen: number;
  diffs: number[];
  folgt: number[];
  widerspricht: number[];
}

/**
 * Misst die Regeln `ids` (alle im selben Regelsatz) über Spiele 1..`p.spiele`.
 * `meldung` bekommt Fortschrittszeilen.
 */
export function messen(
  ids: readonly RuleId[],
  set: Regelsatz,
  p: MessParameter = STANDARD_PARAMETER,
  meldung: (s: string) => void = () => {},
): Messergebnis[] {
  const rules = rulesFor(set);
  const z = new Map<RuleId, Zaehler>(
    ids.map((id) => [id, { vorkommen: 0, diffs: [], folgt: [], widerspricht: [] }]),
  );
  for (let game = 1; game <= p.spiele; game++) {
    const first = new Map<string, true>(); // Regel+Sitz: erstes Vorkommen ist schon vergeben
    const experimente: {
      id: RuleId;
      seat: Seat;
      step: number;
      hit: RuleHit;
      ask: AskKind;
      state: HandState;
    }[] = [];
    spiele(game, rules, null, (s, step) => {
      for (const ask of s.fragen) {
        const input = tutorInput(s.state, s.seat, rules);
        // Kontra/Re und Ansage nur am Zug; Karten ebenso (fragenAn setzt das voraus).
        for (const hit of ruleHits(input, ask)) {
          if (!z.has(hit.id)) continue;
          z.get(hit.id)!.vorkommen++;
          const key = `${hit.id}/${s.seat}`;
          if (first.has(key)) continue;
          first.set(key, true);
          if (
            z.get(hit.id)!.diffs.length + experimente.filter((e) => e.id === hit.id).length <
            p.lagen
          ) {
            experimente.push({ id: hit.id, seat: s.seat, step, hit, ask, state: s.state });
          }
        }
      }
    });
    for (const e of experimente) {
      const diff = experiment(game, rules, e);
      if (!diff) continue;
      const c = z.get(e.id)!;
      c.diffs.push(diff.folgt - diff.widerspricht);
      c.folgt.push(diff.folgt);
      c.widerspricht.push(diff.widerspricht);
    }
    if (game % 250 === 0) {
      meldung(
        `  ${set}: Spiel ${game}/${p.spiele}, Lagen: ${ids.map((i) => z.get(i)!.diffs.length).join(',')}`,
      );
    }
  }
  return ids.map((id) => ergebnis(id, set, p, z.get(id)!));
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function ergebnis(id: RuleId, set: Regelsatz, p: MessParameter, c: Zaehler): Messergebnis {
  const n = c.diffs.length;
  const zuSelten = n < p.mindestLagen;
  const m = n > 0 ? mean(c.diffs) : 0;
  const varianz = n > 1 ? c.diffs.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1) : 0;
  const r = (x: number) => Math.round(x * 100) / 100;
  return {
    regel: id,
    regelsatz: set,
    spiele: p.spiele,
    vorkommen: c.vorkommen,
    lagen: n,
    cents: zuSelten ? null : r(m),
    fehler: zuSelten ? null : r(Math.sqrt(varianz / n)),
    folgt: n > 0 ? r(mean(c.folgt)) : null,
    widerspricht: n > 0 ? r(mean(c.widerspricht)) : null,
    verschieden: c.diffs.filter((d) => d !== 0).length,
    zuSelten,
    parameter: p,
  };
}

/** Beide Arme einer Lage; `null`, wenn es keine Alternative gibt oder nichts bewertet werden kann. */
function experiment(
  game: number,
  rules: RuleSet,
  e: { seat: Seat; step: number; hit: RuleHit; ask: AskKind; state: HandState },
): { folgt: number; widerspricht: number } | null {
  const input = tutorInput(e.state, e.seat, rules);
  const advice = advise(input, e.ask, { seed: game });
  if (!advice) return null;
  const favored = new Set(e.hit.favored.map(optionKey));
  const score = (o: { option: TutorOption; cents: number | null }) => o.cents ?? -Infinity;
  const best = (group: typeof advice.options) =>
    group.length === 0 ? null : group.reduce((a, b) => (score(b) > score(a) ? b : a)).option;
  const folgt = best(advice.options.filter((o) => favored.has(optionKey(o.option))));
  const widerspricht = best(advice.options.filter((o) => !favored.has(optionKey(o.option))));
  if (!folgt || !widerspricht) return null;
  const pay = (option: TutorOption) =>
    spiele(game, rules, { step: e.step, option }).result!.payments[e.seat]!;
  return { folgt: pay(folgt), widerspricht: pay(widerspricht) };
}

export const ALLE_REGELN: readonly RuleId[] = RULE_IDS;
