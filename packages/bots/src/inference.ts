import {
  type BidLevel,
  type Card,
  type CompletedTrick,
  type Contract,
  type HandState,
  type HandView,
  type Rng,
  type RuleSet,
  type Seat,
  MODES,
  bidValue,
  card,
  createDeck,
  createRng,
  legalCards,
  orderFor,
  trumpsChange,
} from '@schafkopf/core';
import { ansageWert, positionOf } from './ansage';
import { RE_MARGIN_DECLARER, RE_MARGIN_PARTNER, kontraStrength } from './doubling';
import {
  ANSAGE_SCHWELLE,
  type Memory,
  candidateContracts,
  heuristicCard,
  rateContract,
} from './heuristicBot';
import { playInPlace, simView } from './probespiel';

/**
 * Gewichtete Verteilungen (B5, „policy-based inference“): Wie gut passt eine Verteilung der
 * verdeckten Karten zu dem, was die anderen bisher getan haben? Als Modell dafür, wie jemand mit
 * einem bestimmten Blatt handelt, dient der Heuristik-Bot selbst:
 *
 *  - **Ansage:** Wer „weiter“ sagt, hat kein Spiel über der Schwelle der Ansage-Tabelle; wer
 *    „Ich würde“ sagt, hält oder eine Spielart nennt, hat eines; der Ansager hat sein Spiel.
 *  - **Kontra und Re:** wie die Heuristik doppelt (`kontraStrength`, Marge fürs Re).
 *  - **Kartenspiel:** Jede gespielte Karte der anderen wird mit der Karte verglichen, die die
 *    Heuristik mit diesem Blatt in dieser Lage gespielt hätte. Darin stecken Schmieren,
 *    Abwerfen, Davonlaufen, nicht Einstechen, das Ausspiel des Spielers usw.
 *
 * Alles als weiche Wahrscheinlichkeit, nie als harter Filter: Eine Karte, die die Heuristik nicht
 * gespielt hätte, kostet den Faktor `cardMiss`, eine unpassende Ansage höchstens `bidFloor`.
 * Spielt jemand ganz anders als die Heuristik (ein Mensch), trifft das alle Verteilungen etwa
 * gleich, und die Suche rechnet wie ohne Gewichtung weiter – sie läuft nie leer.
 *
 * Ergebnis ist der Logarithmus des Gewichts (bis auf eine Konstante, gleich für alle
 * Verteilungen einer Entscheidung).
 */
export interface InferenceParams {
  /** Wahrscheinlichkeit einer Karte, die die Heuristik nicht gespielt hätte (relativ zu 1). */
  cardMiss: number;
  /** Untergrenze der Wahrscheinlichkeit einer Ansage oder eines Doppelns. */
  bidFloor: number;
  /** Breite des Übergangs bei der Ansage in Vielfachen des Sauspiel-Tarifs. */
  bidTemp: number;
  /** Breite des Übergangs bei Kontra und Re (in Punkten der Bewertung `rateContract`). */
  doubleTemp: number;
  /** So viele Kandidaten je benötigter Verteilung werden gezogen und gewichtet. */
  candidateFactor: number;
}

export const INFERENCE_DEFAULTS: InferenceParams = {
  cardMiss: 0.2,
  bidFloor: 0.05,
  bidTemp: 1,
  doubleTemp: 1,
  candidateFactor: 6,
};

/** Was öffentlich bekannt ist und aus der Sicht von `me` gewichtet wird. */
export interface InferenceInput {
  view: HandView;
  me: Seat;
  rules: RuleSet;
  /** Fertige Stiche des Spiels in Reihenfolge. */
  tricks: readonly CompletedTrick[];
  /** Karten, die jeder Sitz in diesem Spiel schon gespielt hat. */
  playedBy: readonly Card[][];
}

/**
 * Gewichtsfunktion einer Verteilung (`hands`: jetzige Hände aller Sitze, die eigene wie in der
 * Sicht). `floor`: Liegt das Gewicht darunter, darf die Rechnung abbrechen und irgendeinen Wert
 * darunter liefern – solche Verteilungen werden ohnehin praktisch nie gezogen.
 */
export type Inference = (hands: readonly Card[][], floor: number) => number;

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Ansage eines Sitzes, wie die Heuristik sie gemacht hätte, als weiche Wahrscheinlichkeit. */
interface BidEvent {
  seat: Seat;
  /** Mindesthöhe des gewünschten Spiels (`bidValue`), 0 = irgendeines. */
  min: number;
  /** Mindesthöhe ausschließlich? (Forderer muss überbieten.) */
  strict: boolean;
  /** true: hat ein solches Spiel; false: hat keines. */
  wants: boolean;
  /** Stufe 3: dieses Spiel (dann zählt sein Wert statt des besten). */
  contract?: Contract;
}

/** Liest die Ansage aus `view.bids` als Ereignisse (nur Sitze, deren Blatt man schätzt). */
function bidEvents(view: HandView, skip: (seat: Seat) => boolean): BidEvent[] {
  const out: BidEvent[] = [];
  let level: BidLevel | null = null;
  let previous: { seat: Seat; type: string } | null = null;
  for (const { seat, call } of view.bids) {
    const current = level ? bidValue(level) : 0;
    if (!skip(seat)) {
      switch (call.type) {
        case 'pass':
          out.push({ seat, min: 0, strict: false, wants: false });
          break;
        case 'interest':
          out.push({ seat, min: 0, strict: false, wants: true });
          break;
        case 'name':
          out.push({ seat, min: bidValue(call.level), strict: false, wants: true });
          break;
        case 'hold':
          out.push({ seat, min: current, strict: false, wants: true });
          break;
        case 'yield': {
          // Wer auf eine genannte Spielart aufgibt, hält; wer nach einem „ich auch“ aufgibt,
          // fordert und hätte überbieten müssen.
          const holder = previous?.type === 'name' && previous.seat !== seat;
          out.push({ seat, min: current, strict: !holder, wants: false });
          break;
        }
        case 'declare':
          // Im Muss ist das Spiel erzwungen und verrät nichts.
          if (!view.auction.forced) {
            out.push({ seat, min: 0, strict: false, wants: true, contract: call.contract });
          }
          break;
      }
    }
    if (call.type === 'name') level = call.level;
    previous = { seat, type: call.type };
  }
  return out;
}

export function createInference(
  input: InferenceInput,
  rng: Rng,
  params: InferenceParams = INFERENCE_DEFAULTS,
): Inference | null {
  const { view, me, rules, tricks, playedBy } = input;
  const contract = view.contract;
  if (!contract) return null;
  const players = view.handSizes.length;
  const mode = MODES[contract.kind];
  // Bei Spielen mit Vorspiel (Hochzeit) haben Ansager und Partner Karten getauscht; ihr Blatt
  // zur Zeit der Ansage kennt niemand.
  const exchanged = (s: Seat) =>
    mode.prelude !== undefined && (s === view.declarer || s === view.partner);
  const skip = (s: Seat) => s === me || exchanged(s);
  const bids = bidEvents(view, skip);
  const tariff = rules.tariff.sauspiel;
  const bidProb = (value: number) =>
    params.bidFloor +
    (1 - 2 * params.bidFloor) *
      sigmoid((value - ANSAGE_SCHWELLE * tariff) / (params.bidTemp * tariff));
  const logMiss = Math.log(params.cardMiss);
  const deckSize = view.handSizes.reduce((a, b) => a + b, 0) + playedBy.flat().length;

  // Kontra und Re: wer gedoppelt hat (außer einem selbst und den Tauschenden).
  const doubles: { seat: Seat; strength: (hand: readonly Card[]) => number }[] = [];
  if (mode.goal === 'points' && view.declarer !== null) {
    const { kontra, re } = view.doubling;
    if (kontra !== null && !skip(kontra)) {
      doubles.push({ seat: kontra, strength: (h) => kontraStrength(h, contract) });
    }
    if (re !== null && !skip(re)) {
      const declarer = re === view.declarer;
      const suit = contract.suit ?? 'eichel';
      doubles.push({
        seat: re,
        strength: declarer
          ? (h) => rateContract(h, contract, deckSize) - RE_MARGIN_DECLARER
          : (h) => rateContract(h, { kind: 'sauspiel', suit }, deckSize) - RE_MARGIN_PARTNER,
      });
    }
  }

  const cards = [...tricks, view.currentTrick].flatMap((t, index) =>
    t.cards.map((c, i) => ({ seat: (t.leader + i) % players, card: c, index })),
  );
  const observed = cards.some((e) => e.seat !== me);
  if (bids.length === 0 && doubles.length === 0 && !observed) return null;

  /** Werte aller Spiele, die der Sitz mit diesem Blatt ansagen konnte: [Höhe, Cent]. */
  /**
   * Werte der Spiele, die der Sitz mit diesem Blatt ansagen konnte: [Höhe, Cent]. Ohne Tout (für
   * „hat ein Spiel über der Schwelle“ zählt das Spiel ohne Tout). Spiele mit zu wenigen Trümpfen
   * liegen unter dem Bereich der Tabelle (`imBereich`) und werden gar nicht erst bewertet – das
   * spart die Merkmale, die den größten Teil der Rechenzeit kosten.
   */
  const valuesOf = (seat: Seat, hand: readonly Card[]): [number, number][] => {
    const position = positionOf(seat, view.dealer, players);
    const out: [number, number][] = [];
    for (const c of candidateContracts(hand, rules, [])) {
      if (c.tout) continue;
      const min = minTrumps(c.kind, hand.length);
      if (min > 0) {
        const trumps = trumpSetOf(c);
        let t = 0;
        for (const x of hand) if (trumps.has(x)) t++;
        if (t < min) continue;
      }
      out.push([bidValue(c), valueOf(hand, c, position)]);
    }
    return out;
  };
  const valueOf = (hand: readonly Card[], c: Contract, position: number): number => {
    if (c.tout && trumpsChange(c)) return -Infinity;
    return ansageWert(hand, c, rules, position) ?? -Infinity;
  };
  const trumpSets = new Map<string, Set<Card>>();
  const trumpSetOf = (c: Contract): Set<Card> => {
    const key = `${c.kind}/${c.suit ?? ''}`;
    let set = trumpSets.get(key);
    if (!set) trumpSets.set(key, (set = new Set(orderFor(c, 0).trumps)));
    return set;
  };

  // Gleichstände der Heuristik würfelt jede Gewichtung gleich: Dieselbe Verteilung bekommt
  // innerhalb einer Entscheidung immer dasselbe Gewicht.
  const tieSeed = Math.floor(rng() * 2 ** 32);
  // Reihenfolge nach Kosten: Kontra und Re (billig), dann das Nachspielen der Karten (bricht
  // oft früh ab), zuletzt die Ansage-Werte (teuer, aber für verworfene Kandidaten gespart).
  return (hands, floor) => {
    let logW = 0;
    const initial = hands.map((h, s) => [...h, ...playedBy[s]!]);
    for (const d of doubles) {
      const x = d.strength(initial[d.seat]!);
      const p = params.bidFloor + (1 - 2 * params.bidFloor) * sigmoid(x / params.doubleTemp);
      logW += Math.log(p);
    }
    if (logW < floor) return logW;

    // Kartenspiel: alles vom ersten Stich an nachspielen, die Heuristik je Zug fragen.
    if (observed) {
      const state = replayState(view, initial, rules);
      const memory = freshMemory(initial);
      const ties = createRng(tieSeed);
      for (const e of cards) {
        if (e.seat !== me) {
          const legal = legalCards(state, e.seat);
          if (legal.length > 1) {
            const h = heuristicCard(simView(state, e.seat, legal, memory), memory, ties, rules);
            if (h !== e.card) {
              logW += logMiss;
              if (logW < floor) return logW;
            }
          }
        }
        playInPlace(state, memory, e.seat, e.card);
      }
    }

    // Ansage
    const cache = new Map<Seat, [number, number][]>();
    for (const e of bids) {
      const hand = initial[e.seat]!;
      let value: number;
      if (e.contract) {
        value = valueOf(hand, e.contract, positionOf(e.seat, view.dealer, players));
      } else {
        let list = cache.get(e.seat);
        if (!list) cache.set(e.seat, (list = valuesOf(e.seat, hand)));
        value = -Infinity;
        for (const [height, v] of list) {
          if ((e.strict ? height > e.min : height >= e.min) && v > value) value = v;
        }
      }
      const p = bidProb(value);
      logW += Math.log(e.wants ? p : 1 - p);
      if (logW < floor) return logW;
    }
    return logW;
  };
}

/** Mindestzahl an Trümpfen für einen Wert der Tabelle (wie `imBereich`); 0 = keine Grenze. */
function minTrumps(kind: Contract['kind'], handSize: number): number {
  const short = handSize < 8 ? 1 : 0;
  switch (kind) {
    case 'sauspiel':
    case 'farbwenz':
      return 3 - short;
    case 'solo':
      return 4 - short;
    case 'wenz':
    case 'geier':
    case 'eisenbahner':
      return 2 - short;
    case 'hawaii':
      return 4;
    default:
      return 0;
  }
}

/** Spielstand vor der ersten Karte mit den Händen zu Spielbeginn. */
function replayState(view: HandView, initial: Card[][], rules: RuleSet): HandState {
  const contract = view.contract!;
  let partner = view.partner;
  if (partner === null && MODES[contract.kind].parties === 'calledAce' && contract.suit) {
    const sau = card(contract.suit, 'A');
    const holder = initial.findIndex((h) => h.includes(sau));
    partner = holder >= 0 ? holder : null;
  }
  const players = initial.length;
  const first = (view.dealer + 1) % players;
  return {
    rules,
    dealer: view.dealer,
    phase: 'playing',
    turn: first,
    hands: initial.map((h) => [...h]),
    initialHands: initial,
    bids: view.bids,
    auction: view.auction,
    contract,
    declarer: view.declarer,
    partner,
    prelude: null,
    tricks: [],
    currentTrick: { leader: first, cards: [] },
    carry: { pot: 0, factor: 1 },
    doubling: view.doubling,
    result: null,
  };
}

function freshMemory(initial: Card[][]): Memory {
  const deckSize = initial.reduce((n, h) => n + h.length, 0);
  return {
    played: new Set(),
    absent: initial.map(() => new Set()),
    tricksSeen: 0,
    deckSize,
    deck: createDeck(deckSize < 32 ? 'kurz' : 'lang'),
    pointsWon: initial.map(() => 0),
    durchmarsch: null,
  };
}
