import {
  type Card,
  type Contract,
  type CardOrder,
  type ContractKind,
  type DeckKind,
  type HandView,
  type LaufendeKind,
  type RuleSet,
  type Seat,
  type Suit,
  MODES,
  SUITS,
  card,
  createDeck,
  laufendeTrumpsFor,
  orderFor,
  pointsOf,
  rankOf,
  suitOf,
  trumpsChange,
} from '@schafkopf/core';
import { ANSAGE_TABELLE } from './ansageTabelle';

/**
 * Ansage-Tabellen (B4): Was ein Spiel mit einem Blatt im Schnitt bringt, in Cent für den Ansager.
 *
 * Grundlage sind Probespiele (`scripts/ansage-tabellen.ts`): je Spielart und Besetzung viele
 * Blätter, jedes auf sehr vielen Verteilungen der übrigen Karten mit der Heuristik an allen Sitzen
 * zu Ende gespielt. Verdichtet ist das zu kleinen logistischen Modellen über Merkmale des Blatts
 * (`MERKMALE`): Je Spielart und Besetzung sagen sie, wie wahrscheinlich das Spiel gewonnen wird,
 * mit Schneider, mit Schwarz, und wie wahrscheinlich es mit Schneider bzw. Schwarz verloren geht.
 *
 * Die Modelle rechnen in Wahrscheinlichkeiten, nicht in Cent. Erst `ansageWert` macht daraus Cent
 * – mit dem Tarif und den Laufenden-Schwellen der übergebenen Tischregeln. So stimmen die Werte
 * auch für eigene Tarife. Verfahren, Merkmale und Genauigkeit: docs/STRATEGIEN.md, „Ansage-Tabellen“.
 */

/**
 * Merkmale, mit denen der Bettel geschätzt wird. Beim Bettel zählt nur, ob man überall drunter
 * kommt; Trümpfe, Augen oder Sauen als Stichbringer bedeuten nichts und machten das Modell
 * unruhig (Fund bei der Abnahme von B4).
 */
export const BETTEL_MERKMALE: readonly Merkmal[] = [
  'fK1',
  'fK2',
  'fK3',
  'fS1',
  'fS2',
  'fS3',
  'fS4',
  'fS5',
  'fS6',
  'fDoppelt',
  'fEinzelSicher',
  'gefahrFest',
  'festeLuecken',
  'frei',
  'vorhand',
  'hinterhand',
];

/** Merkmale eines Blatts für ein Spiel (Reihenfolge = Spalten der Modelle). */
export const MERKMALE = [
  /** Zahl der Trümpfe (Hawaii-Habicht: in den Stichen 1–4). */
  't',
  /** Zahl der Trümpfe zum Quadrat, durch 8 (lange Trumpfreihen tragen überproportional). */
  't2',
  /** Höchster Trumpf (Eichel-Ober, im Wenz Eichel-Unter, …). */
  'top1',
  /** Zweithöchster Trumpf. */
  'top2',
  /** Wie viele der vier höchsten Trümpfe. */
  'hoch',
  /** Wie viele der Trümpfe auf Platz 5–8. */
  'mittel',
  /** Laufende von oben auf der eigenen Hand („mit“). */
  'lauf',
  /** Sauen in Farben, die nicht Trumpf sind. */
  'sauen',
  /** Zehner neben der Sau derselben Farbe. */
  'sauZehn',
  /** Zehner ohne die Sau. */
  'blankeZehn',
  /** Freie Farben (Farben mit Nicht-Trümpfen, von denen man keine Karte hat). */
  'frei',
  /** Einzelne Karten einer Farbe, die keine Sau sind. */
  'einzeln',
  /** Nicht-Trümpfe in Folgen von oben (Sau, Sau-Zehn, …): sichere Farbstiche. */
  'folge',
  /** Augen auf der Hand, durch 10. */
  'augen',
  /** Man kommt heraus (Vorhand). */
  'vorhand',
  /** Man gibt als Letzter zu (Hinterhand). */
  'hinterhand',
  /** Sauspiel: Karten der Ruffarbe. */
  'ruf',
  /** Sauspiel: Zehner der Ruffarbe. */
  'rufZehn',
  /** Hawaii-Habicht: Trümpfe ab Stich 5. */
  'spaet',
  /** Hawaii-Habicht: Trümpfe ab Stich 5 zum Quadrat, durch 8 (sie entscheiden das Spiel). */
  'spaet2',
  /** Bettel: Lücken (Karten, unter die man nicht sicher drunter kommt). */
  'luecken',
  /** Längste Farbe ohne Trümpfe (lange Farben bringen im Wenz Stiche, im Bettel Sicherheit). */
  'lange',
  /**
   * Bettel: größte Gefahr in einer Farbe – wie viele Karten der Gegner unter einer eigenen Karte
   * liegen, die man nicht mit kleineren eigenen abfangen kann (je Farbe das Maximum von
   * Rang − 2 × Zahl der kleineren eigenen Karten). 0 heißt „von unten gedeckt“.
   */
  'gefahr',
  /**
   * Bettel, je Farbe gezählt (wie viele Farben fallen in die Klasse): `fS…` – gefährdete
   * Farben nach ihrer Gefahr (1 bis 5, `fS6` ab 6); `fK…` – zusätzlich, wenn schon die
   * niedrigste eigene Karte über Karten der Gegner liegt (über 1, 2, ab 3: jede davon ist ein
   * Anspiel, das sofort fängt). `fDoppelt`: Farben mit mindestens zwei gefährdeten Karten.
   */
  'fK1',
  'fK2',
  'fK3',
  'fS1',
  'fS2',
  'fS3',
  'fS4',
  'fS5',
  'fS6',
  'fDoppelt',
  /**
   * Bettel: Farben mit nur einer, ungefährdeten Karte – nach dem ersten Anspiel ist man dort
   * frei und kann eine gefährdete Karte abwerfen.
   */
  'fEinzelSicher',
  /**
   * Bettel: größte Gefahr, wenn es keine Gelegenheit zum Abwerfen gibt (keine freie Farbe, keine
   * einzelne sichere Karte) – dann muss die gefährdete Karte irgendwann zugegeben werden.
   */
  'gefahrFest',
  /** Bettel: gefährdete Karten, die man nicht abwerfen kann (Lücken − freie und einzelne Farben). */
  'festeLuecken',
] as const;
export type Merkmal = (typeof MERKMALE)[number];

/**
 * Zielgrößen der Modelle, je Probespiel 0 oder 1, das Modell schätzt die Wahrscheinlichkeit:
 *   g  – gewonnen;  gs – gewonnen mit Schneider (oder Schwarz);  gw – gewonnen mit Schwarz;
 *   v  – verloren (nur Hochzeiten: scheitert das Vorspiel, ist es weder noch);
 *   vs – verloren mit Schneider (oder Schwarz).
 * Schwarz gewonnen heißt: alle Stiche – daraus schätzt `ansageWert` auch das Tout. „Schwarz
 * verloren“ ist so selten bei Blättern, die man überhaupt erwägt, dass es fehlt (zählt als 0).
 */
export const ZIELE = ['g', 'gs', 'gw', 'v', 'vs'] as const;
export type Ziel = (typeof ZIELE)[number];

/**
 * Ein logistisches Modell je Zielgröße: [Achsenabschnitt, ein Gewicht je Merkmal in der
 * Reihenfolge von `MERKMALE`] als ganze Zahlen in `1 / MODELL_SKALA`. Fehlende Einträge (am Ende
 * oder als Lücke `[1,,2]` – hält die Datei klein) sind 0.
 */
export type AnsageModell = Partial<Record<Ziel, readonly (number | undefined)[]>>;

/** Gewichte stehen in Hundertsteln in der Tabelle (kleinere Datei, Fehler unter 0,005 je Gewicht). */
export const MODELL_SKALA = 100;

/** Besetzung als Schlüssel: `lang/4`, `kurz/4`, `kurz/3`. */
export type Besetzung = `${DeckKind}/${number}`;

export interface AnsageTabelle {
  /** Wie erzeugt (Seed, Zahl der Blätter und Verteilungen) – nur zur Dokumentation. */
  erzeugung: {
    seed: number;
    blaetter: number;
    verteilungen: number;
    /** Bettel, mit „Stark“ als Gegenspieler gemessen. */
    bettelBlaetter?: number;
    bettelVerteilungen?: number;
    stand: string;
  };
  modelle: Partial<Record<string, Partial<Record<ContractKind, AnsageModell>>>>;
}

export function besetzungOf(rules: Pick<RuleSet, 'deck' | 'players'>): Besetzung {
  return `${rules.deck}/${rules.players}`;
}

/** Position am Tisch: 0 = Vorhand (kommt heraus), `players - 1` = Hinterhand (gibt). */
export function positionOf(seat: Seat, dealer: Seat, players: number): number {
  return (((seat - dealer - 1) % players) + players) % players;
}

/** Trümpfe des Spiels im verwendeten Blatt, höchster zuerst. */
function trumpsIn(contract: Contract, trick: number, deck: readonly Card[]): Card[] {
  return orderFor(contract, trick).trumps.filter((c) => deck.includes(c));
}

/** Laufende von oben auf der eigenen Hand (nur „mit“). */
function runFromTop(hand: readonly Card[], trumps: readonly Card[]): number {
  let n = 0;
  while (n < trumps.length && hand.includes(trumps[n]!)) n++;
  return n;
}

/**
 * Bettel nach Farben. In jeder Farbe sind die eigenen Karten nach Rang von unten sortiert (Rang 0
 * = Sieben); die k-te Karte (ab 0) ist gefährdet, wenn ihr Rang über 2k liegt – dann liegen unter
 * ihr mehr Karten der Gegner, als man mit den kleineren eigenen abfangen kann (wie `bettelSafe`).
 * Die Gefahr einer Farbe ist das größte Rang − 2k. Daraus: Lücken (gefährdete Karten), größte
 * Gefahr und die Klassen je Farbe (siehe `MERKMALE`).
 */
function bettelGaps(
  hand: readonly Card[],
  rankOrder: readonly string[],
  deck: DeckKind,
): { gaps: number; danger: number; klassen: Partial<Record<Merkmal, number>> } {
  const low = [...rankOrder].reverse().filter((r) => deck === 'lang' || (r !== '7' && r !== '8'));
  let gaps = 0;
  let danger = 0;
  const klassen: Partial<Record<Merkmal, number>> = {};
  const add = (m: Merkmal) => (klassen[m] = (klassen[m] ?? 0) + 1);
  for (const suit of SUITS) {
    const idx = hand
      .filter((c) => suitOf(c) === suit)
      .map((c) => low.indexOf(rankOf(c)))
      .sort((a, b) => a - b);
    const d = Math.max(0, ...idx.map((i, k) => i - 2 * k));
    const endangered = idx.filter((i, k) => i > 2 * k).length;
    gaps += endangered;
    danger = Math.max(danger, d);
    if (idx.length === 1 && d === 0) add('fEinzelSicher');
    if (d > 0) {
      add(`fS${Math.min(d, 6)}` as Merkmal);
      if (idx[0]! > 0) add(`fK${Math.min(idx[0]!, 3)}` as Merkmal);
      if (endangered >= 2) add('fDoppelt');
    }
  }
  return { gaps, danger, klassen };
}

/**
 * Was an einem Spiel nicht vom Blatt abhängt – Trümpfe, Farben, Rangfolge im verwendeten Blatt –,
 * einmal je Spiel und Blatt berechnet. `merkmaleOf` läuft in der Gewichtung des starken Bots (B5)
 * tausendfach je Entscheidung; ohne diesen Speicher kostete das die meiste Rechenzeit.
 */
interface Geometrie {
  deck: readonly Card[];
  order: CardOrder;
  /** Trümpfe im Blatt, höchster zuerst, und als Menge. */
  trumps: readonly Card[];
  trumpSet: ReadonlySet<Card>;
  /** Farben mit Nicht-Trümpfen; je Farbe ihre Karten in Rangfolge von oben. */
  sides: readonly { suit: Suit; cards: readonly Card[] }[];
  /** Hawaii-Habicht: Trümpfe nach dem Wechsel. */
  late: readonly Card[];
}

const GEOMETRIE = new Map<string, Geometrie>();

function geometrie(contract: Contract, deckKind: DeckKind): Geometrie {
  const key = `${contract.kind}/${contract.suit ?? ''}/${contract.suit2 ?? ''}/${deckKind}`;
  let g = GEOMETRIE.get(key);
  if (g) return g;
  const deck = createDeck(deckKind);
  const order = orderFor(contract, 0);
  const trumps = trumpsIn(contract, 0, deck);
  const trumpSet = new Set(trumps);
  const sides = SUITS.filter((s) => deck.some((c) => suitOf(c) === s && !trumpSet.has(c))).map(
    (suit) => ({
      suit,
      cards: order.rankOrder
        .map((r) => card(suit, r))
        .filter((c) => deck.includes(c) && !trumpSet.has(c)),
    }),
  );
  const late = contract.kind === 'hawaii' ? trumpsIn(contract, 99, deck) : [];
  g = { deck, order, trumps, trumpSet, sides, late };
  GEOMETRIE.set(key, g);
  return g;
}

const NULL_MERKMALE = Object.fromEntries(MERKMALE.map((m) => [m, 0])) as Record<Merkmal, number>;

/** Merkmale des Blatts `hand` für das Spiel `contract` (vor dem ersten Stich). */
export function merkmaleOf(
  hand: readonly Card[],
  contract: Contract,
  deckKind: DeckKind,
  position: number,
  players: number,
): Record<Merkmal, number> {
  const { order, trumps, trumpSet, sides, late } = geometrie(contract, deckKind);
  const own = new Set(hand);
  let t = 0;
  for (const c of hand) if (trumpSet.has(c)) t++;
  const has = (c: Card | undefined) => (c !== undefined && own.has(c) ? 1 : 0);
  const f: Record<Merkmal, number> = { ...NULL_MERKMALE };
  f.t = t;
  f.t2 = (t * t) / 8;
  f.top1 = has(trumps[0]);
  f.top2 = has(trumps[1]);
  f.hoch = trumps.slice(0, 4).filter((c) => own.has(c)).length;
  f.mittel = trumps.slice(4, 8).filter((c) => own.has(c)).length;
  f.lauf = runFromTop(hand, trumps);
  for (const { suit, cards: ranked } of sides) {
    let n = 0;
    for (const c of hand) if (!trumpSet.has(c) && suitOf(c) === suit) n++;
    const ace = card(suit, 'A');
    const ten = card(suit, '10');
    const hasAce = !trumpSet.has(ace) && own.has(ace);
    const hasTen = !trumpSet.has(ten) && own.has(ten);
    if (hasAce) f.sauen++;
    if (hasAce && hasTen) f.sauZehn++;
    if (hasTen && !hasAce) f.blankeZehn++;
    if (n === 0) f.frei++;
    if (n === 1 && !hasAce) f.einzeln++;
    f.lange = Math.max(f.lange, n);
    let i = 0;
    while (i < ranked.length && own.has(ranked[i]!)) i++;
    f.folge += i;
  }
  f.augen = hand.reduce((s, c) => s + pointsOf(c), 0) / 10;
  f.vorhand = position === 0 ? 1 : 0;
  f.hinterhand = position === players - 1 ? 1 : 0;
  if (MODES[contract.kind].parties === 'calledAce' && contract.suit) {
    const called = hand.filter((c) => !trumpSet.has(c) && suitOf(c) === contract.suit);
    f.ruf = called.length;
    f.rufZehn = called.some((c) => rankOf(c) === '10') ? 1 : 0;
  }
  if (contract.kind === 'hawaii') {
    f.spaet = hand.filter((c) => late.includes(c)).length;
    f.spaet2 = (f.spaet * f.spaet) / 8;
  }
  if (contract.kind === 'bettel') {
    const gaps = bettelGaps(hand, order.rankOrder, deckKind);
    f.luecken = gaps.gaps;
    f.gefahr = gaps.danger;
    Object.assign(f, gaps.klassen);
    f.gefahrFest = f.frei + f.fEinzelSicher === 0 ? f.gefahr : 0;
    f.festeLuecken = Math.max(0, f.luecken - f.frei - f.fEinzelSicher);
  }
  return f;
}

/**
 * Mindestblatt je Spielart: Darunter gibt es keine Probespiele und keinen Wert (`null` = lohnt
 * sich nicht). Die Grenzen liegen weit unter dem, was sich lohnt (Belege in der Messung).
 */
export function imBereich(
  kind: ContractKind,
  f: Record<Merkmal, number>,
  handSize: number,
): boolean {
  const short = handSize < 8;
  switch (kind) {
    case 'sauspiel':
      return f.t >= (short ? 2 : 3);
    case 'solo':
      return f.t >= (short ? 3 : 4);
    case 'farbwenz':
      return f.t >= (short ? 2 : 3);
    case 'wenz':
    case 'geier':
    case 'eisenbahner':
      return f.t >= (short ? 1 : 2);
    case 'hawaii':
      return f.t >= 4;
    case 'bettel':
      return f.luecken <= 2;
    case 'hochzeit':
    case 'arabischeHochzeit':
      return true; // `eligible` der Spielart: genau ein bzw. zwei Trümpfe
    case 'ramsch':
      return false;
  }
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

function predict(model: AnsageModell, ziel: Ziel, f: Record<Merkmal, number>): number | null {
  const w = model[ziel];
  if (!w) return null;
  let x = w[0] ?? 0;
  MERKMALE.forEach((m, i) => {
    x += (w[i + 1] ?? 0) * f[m];
  });
  return sigmoid(x / MODELL_SKALA);
}

/** Geschätzte Wahrscheinlichkeiten eines Spiels (Ziele wie in `ZIELE`). */
export interface AnsageChancen {
  g: number;
  gs: number;
  gw: number;
  v: number;
  vs: number;
}

/** Die Modelle für Spielart und Besetzung, sonst `null`. */
export function modellFor(
  kind: ContractKind,
  rules: Pick<RuleSet, 'deck' | 'players'>,
  tabelle: AnsageTabelle = ANSAGE_TABELLE,
): AnsageModell | null {
  return tabelle.modelle[besetzungOf(rules)]?.[kind] ?? null;
}

/**
 * Chancen eines Spiels mit diesem Blatt, `null` außerhalb des Bereichs der Tabelle (Blatt zu
 * schwach) oder ohne Tabelle für Spielart und Besetzung.
 */
export function ansageChancen(
  hand: readonly Card[],
  contract: Contract,
  rules: Pick<RuleSet, 'deck' | 'players'>,
  position: number,
  tabelle: AnsageTabelle = ANSAGE_TABELLE,
): AnsageChancen | null {
  const model = modellFor(contract.kind, rules, tabelle);
  if (!model) return null;
  const mode = MODES[contract.kind];
  if (mode.eligible && !mode.eligible(hand)) return null;
  if (alleSticheSicher(hand, contract, rules.deck)) return { g: 1, gs: 1, gw: 1, v: 0, vs: 0 };
  const f = merkmaleOf(hand, { ...contract, tout: false }, rules.deck, position, rules.players);
  if (!imBereich(contract.kind, f, hand.length)) return null;
  const g = predict(model, 'g', f)!;
  // Nur Hochzeiten haben ein eigenes Modell für „verloren“ (das Vorspiel kann scheitern).
  const v = predict(model, 'v', f) ?? 1 - g;
  const clamp = (x: number | null, max: number) => Math.min(x ?? 0, max);
  const gs = clamp(predict(model, 'gs', f), g);
  const gw = clamp(predict(model, 'gw', f), gs);
  const vs = clamp(predict(model, 'vs', f), v);
  return { g, gs, gw, v, vs };
}

/**
 * Macht das Blatt sicher alle Stiche? Dann sind die Chancen keine Schätzung mehr (die Modelle
 * unterschätzen solche Ecken). Zwei Fälle, beide ohne Trumpfwechsel:
 *  - Nur Trümpfe, und die Folge von oben ist so lang, dass die Gegner danach keinen Trumpf mehr
 *    haben können (so lang wie alle übrigen Trümpfe zusammen oder wie die ganze Hand).
 *  - Wenz, Geier, Eisenbahner: alle Trümpfe, und jede Farbe ist eine Folge von oben.
 */
export function alleSticheSicher(
  hand: readonly Card[],
  contract: Contract,
  deckKind: DeckKind,
): boolean {
  const mode = MODES[contract.kind];
  if (mode.goal !== 'points' || mode.parties !== 'alone' || trumpsChange(contract)) return false;
  const { deck, trumps } = geometrie(contract, deckKind);
  if (hand.every((c) => trumps.includes(c))) {
    const others = trumps.length - hand.length;
    return runFromTop(hand, trumps) >= Math.min(others, hand.length);
  }
  if (trumps.length > 4 || !trumps.every((c) => hand.includes(c))) return false;
  const order = orderFor(contract, 0);
  return SUITS.every((suit) => {
    const own = hand.filter((c) => suitOf(c) === suit && !trumps.includes(c));
    const ranks = order.rankOrder.filter((r) => {
      const c = card(suit, r);
      return deck.includes(c) && !trumps.includes(c);
    });
    return own.every((c) => ranks.indexOf(rankOf(c)) < own.length);
  });
}

/** Laufende, die der Ansager sicher auf der Hand hat und die nach den Tischregeln zählen. */
function sureLaufende(hand: readonly Card[], contract: Contract, rules: RuleSet): number {
  const mode = MODES[contract.kind];
  if (!mode.hasLaufende) return 0;
  const deck = geometrie(contract, rules.deck).deck;
  const trumps = laufendeTrumpsFor(contract).filter((c) => deck.includes(c));
  const threshold = rules.laufende[contract.kind as LaufendeKind];
  if (trumps.length === 0) return 0;
  if (mode.parties === 'alone') {
    // Allein steht die Folge fest: „mit“ oder „ohne“ zählt gleich.
    const side = hand.includes(trumps[0]!);
    let n = 0;
    while (n < trumps.length && hand.includes(trumps[n]!) === side) n++;
    return n >= threshold ? n : 0;
  }
  // Mit Partner: nur die eigenen Laufenden „mit“ sind sicher; der Partner kann sie verlängern
  // (wird nicht geschätzt). „Ohne“ hängt ganz am Partner und zählt hier nicht.
  const n = runFromTop(hand, trumps);
  return n >= threshold ? n : 0;
}

/** „Sie“: alle Ober und Unter im Solo – gewonnen, vierfacher Grundtarif. */
function isSie(hand: readonly Card[], contract: Contract, rules: RuleSet): boolean {
  if (!rules.sie || contract.kind !== 'solo') return false;
  const ou = geometrie(contract, rules.deck).deck.filter(
    (c) => rankOf(c) === 'O' || rankOf(c) === 'U',
  );
  return hand.length === ou.length && ou.every((c) => hand.includes(c));
}

/**
 * Erwarteter Wert des Spiels `contract` mit dem Blatt `hand` für den Ansager, in Cent nach dem
 * Tarif von `rules` (ohne Kontra, Bock und Stock). `position`: 0 = Vorhand. `null`, wenn das Blatt
 * unter dem Bereich der Tabelle liegt (lohnt sich sicher nicht) oder es keine Tabelle gibt.
 *
 * Rechnung je Probespiel wie in `scoring.ts`: Spielwert = Grundtarif + Aufschlag je Schneider,
 * Schwarz und Laufendem; allein zahlt bzw. bekommt der Ansager das von jedem Gegner. Tout: doppelt,
 * ohne Schneider und Schwarz, gewonnen nur mit allen Stichen (geschätzt als „schwarz gewonnen“).
 */
export function ansageWert(
  hand: readonly Card[],
  contract: Contract,
  rules: RuleSet,
  position: number,
  tabelle: AnsageTabelle = ANSAGE_TABELLE,
): number | null {
  const mode = MODES[contract.kind];
  const opponents = mode.parties === 'alone' ? rules.players - 1 : 1;
  const base = rules.tariff[mode.tariff];
  const extra = rules.tariff.extra;
  if (isSie(hand, contract, rules)) return opponents * 4 * base;
  const p = ansageChancen(hand, contract, rules, position, tabelle);
  if (!p) return null;
  const lauf = sureLaufende(hand, contract, rules);
  if (contract.tout) {
    const win = p.gw;
    return opponents * 2 * (base + extra * lauf) * (2 * win - 1);
  }
  const w = p.g - p.v;
  if (mode.goal === 'noTricks') return opponents * base * w;
  const s = p.gs + p.gw - p.vs;
  return opponents * (base * w + extra * (s + lauf * w));
}

/**
 * Tischregeln mit Spielerzahl und Blatt, wie sie die Sicht zeigt. Bots bekommen die Regeln nicht
 * immer mit (dann gelten die Standardregeln); die Besetzung steht aber in jeder Sicht.
 */
export function regelnDerSicht(view: HandView, rules: RuleSet): RuleSet {
  const players = view.handSizes.length;
  const deckSize = view.handSizes.reduce((a, b) => a + b, 0);
  const deck: DeckKind = deckSize < 32 ? 'kurz' : 'lang';
  return rules.players === players && rules.deck === deck ? rules : { ...rules, players, deck };
}

/**
 * `ansageWert` für den Sitz, der in der Ansage gerade dran ist (`view.turn`), vor dem ersten
 * Stich: Besetzung und Position kommen aus der Sicht.
 */
export function ansageWertInSicht(
  view: HandView,
  contract: Contract,
  rules: RuleSet,
): number | null {
  const r = regelnDerSicht(view, rules);
  const position = positionOf(view.turn, view.dealer, r.players);
  return ansageWert(view.hand, contract, r, position);
}
