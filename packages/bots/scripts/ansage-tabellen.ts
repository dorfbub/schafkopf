import {
  type Card,
  type Contract,
  type ContractKind,
  type DeckKind,
  type Rng,
  type RuleSet,
  BID_ORDER,
  DEFAULT_RULES,
  MODES,
  SUITS,
  availableKinds,
  card,
  createDeck,
  createRng,
  orderFor,
  scoreHand,
  shuffle,
} from '@schafkopf/core';
import {
  type AnsageModell,
  type AnsageTabelle,
  type Ziel,
  MERKMALE,
  MODELL_SKALA,
  ZIELE,
  ansageWert,
  imBereich,
  merkmaleOf,
} from '../src/ansage';
import { rateContract } from '../src/heuristicBot';
import { chooseWeddingGive, rateAcceptWedding, rateWedding, weddingSize } from '../src/hochzeit';
import { playOutHand } from '../src/strongBot';

/**
 * Ansage-Tabellen erzeugen (Paket B4). Verfahren, ausführlich in docs/STRATEGIEN.md
 * („Ansage-Tabellen“):
 *
 *  1. Je Besetzung (lang/4, kurz/4, kurz/3) und ansagbarer Spielart werden Blätter gezogen:
 *     zufällige Hand, zufällige Position am Tisch, eine zufällige Farbe (bzw. Farbpaar) unter
 *     denen, mit denen das Blatt im Bereich der Tabelle liegt (`imBereich`). Blätter, die nach der
 *     alten Heuristik hoffnungslos wären (Marge unter −4), werden nur mit Wahrscheinlichkeit 1/4
 *     genommen und zählen dafür vierfach – so liegen mehr Blätter nahe der Entscheidung, ohne die
 *     Verteilung zu verzerren.
 *  2. Jedes Blatt wird auf `verteilungen` zufälligen Verteilungen der übrigen Karten zu Ende
 *     gespielt, alle Sitze nach der Heuristik (wie die Ansage-Suche von „Stark“; der volle starke
 *     Bot an allen Sitzen wäre etwa 2000-mal teurer). Hochzeiten mit Vorspiel: Die anderen nehmen
 *     an wie der Heuristik-Bot, der Partner gibt zurück wie er; nimmt keiner an, zählt es 0.
 *  3. Gezählt wird je Probespiel: gewonnen, Schneider, Schwarz (beide Richtungen). Daraus wird je
 *     Spielart und Besetzung und Zielgröße ein logistisches Modell über `MERKMALE` geschätzt
 *     (gewichtete Likelihood mit kleinem Ridge-Term, IRLS).
 *
 * Alles ist über `seed` reproduzierbar; jedes Stück (Spielart, Besetzung, Teil) hat einen eigenen,
 * daraus abgeleiteten Seed, sodass die Aufteilung auf Prozesse das Ergebnis nicht ändert.
 */

export interface Besetzung {
  key: string;
  players: number;
  deck: DeckKind;
}

export const BESETZUNGEN: readonly Besetzung[] = [
  { key: 'lang/4', players: 4, deck: 'lang' },
  { key: 'kurz/4', players: 4, deck: 'kurz' },
  { key: 'kurz/3', players: 3, deck: 'kurz' },
];

export interface Parameter {
  seed: number;
  /** Blätter je Spielart und Besetzung. */
  blaetter: number;
  /** Verteilungen (Probespiele) je Blatt. */
  verteilungen: number;
  /** Blätter je Stück (Einheit der Aufteilung auf Prozesse). */
  stueck: number;
}

export const STANDARD_PARAMETER: Parameter = {
  seed: 2026,
  blaetter: 10000,
  verteilungen: 64,
  stueck: 250,
};

/** Tischregeln der Probespiele: Standard, alle Spielarten erlaubt, ohne Kontra. */
export function regelnFuer(b: Besetzung): RuleSet {
  return { ...DEFAULT_RULES, players: b.players, deck: b.deck, contracts: [...BID_ORDER] };
}

/** Spielarten, die es in der Besetzung gibt (ohne Ramsch). */
export function spielartenFuer(b: Besetzung): ContractKind[] {
  return availableKinds(regelnFuer(b));
}

/** Ein gemessenes Blatt. Zähler über alle Probespiele. */
export interface Probe {
  hand: Card[];
  contract: Contract;
  position: number;
  /** Gewicht aus der Auswahl (1 oder 4). */
  gewicht: number;
  n: number;
  /** Zähler je Zielgröße; `vw` (schwarz verloren) nur zur Kontrolle. */
  zaehler: Record<Ziel | 'vw', number>;
  /** Summe und Quadratsumme der Cent nach Standardtarif (zur Kontrolle). */
  cent: number;
  cent2: number;
}

export interface Stueck {
  besetzung: string;
  kind: ContractKind;
  teil: number;
}

/** Alle Stücke der Erzeugung, in fester Reihenfolge. */
export function stuecke(p: Parameter): Stueck[] {
  const out: Stueck[] = [];
  const teile = Math.ceil(p.blaetter / p.stueck);
  for (const b of BESETZUNGEN) {
    for (const kind of spielartenFuer(b)) {
      for (let teil = 0; teil < teile; teil++) out.push({ besetzung: b.key, kind, teil });
    }
  }
  return out;
}

function seedFor(p: Parameter, s: Stueck): [number, number, number, number] {
  const bi = BESETZUNGEN.findIndex((b) => b.key === s.besetzung);
  const ki = BID_ORDER.indexOf(s.kind);
  return [p.seed >>> 0, 0x4b4 + bi, 0x100 + ki, s.teil];
}

/** Farben bzw. Farbpaare, die man mit diesem Blatt nennen dürfte. */
function variants(kind: ContractKind, hand: readonly Card[]): Contract[] {
  const mode = MODES[kind];
  if (mode.eligible && !mode.eligible(hand)) return [];
  if (mode.suitRole === 'none') return [{ kind }];
  const suits = mode.suitChoices?.(hand) ?? SUITS;
  if (mode.suitCount !== 2) return suits.map((suit) => ({ kind, suit }));
  return suits.flatMap((suit) =>
    suits.filter((s2) => s2 !== suit).map((suit2) => ({ kind, suit, suit2 })),
  );
}

/** Marge der alten Heuristik (für die Auswahl der Blätter). */
function heuristicMargin(hand: readonly Card[], contract: Contract, deckSize: number): number {
  const n = weddingSize(contract.kind);
  return n > 0 ? rateWedding(hand, n) : rateContract(hand, contract, deckSize);
}

/** Zieht ein Blatt für Spielart `kind` (siehe Kopf, Schritt 1). */
function drawHand(
  b: Besetzung,
  kind: ContractKind,
  rng: Rng,
): { hand: Card[]; contract: Contract; position: number; gewicht: number } {
  const deck = createDeck(b.deck);
  const size = deck.length / b.players;
  for (;;) {
    const hand = shuffle(deck, rng).slice(0, size);
    const position = Math.floor(rng() * b.players);
    const ok = variants(kind, hand).filter((c) =>
      imBereich(kind, merkmaleOf(hand, c, b.deck, position, b.players), size),
    );
    if (ok.length === 0) continue;
    const contract = ok[Math.floor(rng() * ok.length)]!;
    if (heuristicMargin(hand, contract, deck.length) < -4) {
      if (rng() >= 0.25) continue;
      return { hand, contract, position, gewicht: 4 };
    }
    return { hand, contract, position, gewicht: 1 };
  }
}

interface Ergebnis {
  won: boolean;
  lost: boolean;
  schneider: boolean;
  schwarz: boolean;
  cent: number;
}

/** Erlaubte Rückgaben bei der Hochzeit: `n` Karten, Nicht-Trümpfe, soweit vorhanden. */
function weddingGives(hand: readonly Card[], n: number, trumps: readonly Card[]): Card[][] {
  const plain = hand.filter((c) => !trumps.includes(c)).length;
  const need = Math.min(n, plain);
  const out: Card[][] = [];
  const pick = (from: number, chosen: Card[]) => {
    if (chosen.length === n) {
      if (chosen.filter((c) => !trumps.includes(c)).length === need) out.push([...chosen]);
      return;
    }
    for (let i = from; i < hand.length; i++) pick(i + 1, [...chosen, hand[i]!]);
  };
  pick(0, []);
  return out;
}

/** Ein Probespiel: Ansager auf Sitz `declarer`, Geber 0, übrige Karten zufällig verteilt. */
function probespiel(
  rules: RuleSet,
  hand: readonly Card[],
  contract: Contract,
  declarer: number,
  rng: Rng,
): Ergebnis {
  const players = rules.players;
  const rest = shuffle(
    createDeck(rules.deck).filter((c) => !hand.includes(c)),
    rng,
  );
  const size = hand.length;
  let hands = Array.from({ length: players }, (_, s) =>
    s === declarer ? [...hand] : rest.splice(0, size),
  );
  let partner: number | null = null;
  const mode = MODES[contract.kind];
  if (mode.parties === 'calledAce') {
    const sau = card(contract.suit!, 'A');
    partner = hands.findIndex((h) => h.includes(sau));
  }
  const n = weddingSize(contract.kind);
  if (n > 0) {
    // Vorspiel wie am Tisch: reihum ab links vom Hochzeiter, der Erste, der will, nimmt an.
    const trumps = orderFor(contract, 0).trumps;
    for (let i = 1; i < players && partner === null; i++) {
      const s = (declarer + i) % players;
      if (rateAcceptWedding(hands[s]!, n) >= 0) partner = s;
    }
    if (partner === null)
      return { won: false, lost: false, schneider: false, schwarz: false, cent: 0 };
    const given = hands[declarer]!.filter((c) => trumps.includes(c));
    const mine = [...hands[partner]!, ...given];
    const back = chooseWeddingGive(mine, weddingGives(mine, n, trumps));
    hands = hands.map((h) => [...h]);
    hands[declarer] = [...hands[declarer]!.filter((c) => !given.includes(c)), ...back];
    hands[partner] = mine.filter((c) => !back.includes(c));
  }
  const state = playOutHand({ dealer: 0, hands, contract, declarer, partner, rules }, rng);
  const result = scoreHand(state);
  const outcome = result.outcome!;
  const d = outcome.details;
  const won = outcome.declarerWon === true;
  return {
    won,
    lost: !won,
    schneider: d.type === 'party' && d.schneider,
    schwarz: d.type === 'party' && d.schwarz,
    cent: result.payments[declarer]!,
  };
}

/** Misst ein Stück: `p.stueck` Blätter mit je `p.verteilungen` Probespielen. */
export function messeStueck(p: Parameter, s: Stueck): Probe[] {
  const b = BESETZUNGEN.find((x) => x.key === s.besetzung)!;
  const rules = regelnFuer(b);
  const rng = createRng(seedFor(p, s));
  const count = Math.min(p.stueck, p.blaetter - s.teil * p.stueck);
  const out: Probe[] = [];
  for (let i = 0; i < count; i++) {
    const { hand, contract, position, gewicht } = drawHand(b, s.kind, rng);
    const declarer = (position + 1) % b.players; // Geber ist Sitz 0
    const z: Record<Ziel | 'vw', number> = { g: 0, gs: 0, gw: 0, v: 0, vs: 0, vw: 0 };
    let cent = 0;
    let cent2 = 0;
    for (let k = 0; k < p.verteilungen; k++) {
      const e = probespiel(rules, hand, contract, declarer, rng);
      if (e.won) {
        z.g++;
        if (e.schneider) z.gs++;
        if (e.schwarz) z.gw++;
      } else if (e.lost) {
        z.v++;
        if (e.schneider) z.vs++;
        if (e.schwarz) z.vw++;
      }
      cent += e.cent;
      cent2 += e.cent * e.cent;
    }
    out.push({ hand, contract, position, gewicht, n: p.verteilungen, zaehler: z, cent, cent2 });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Verdichtung: logistische Regression je Spielart, Besetzung und Zielgröße

/** Löst A x = b (A symmetrisch positiv definit) per Gauß mit Pivotsuche. */
function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[piv]![col]!)) piv = r;
    [m[col], m[piv]] = [m[piv]!, m[col]!];
    const d = m[col]![col]!;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r]![col]! / d;
      if (f === 0) continue;
      for (let c = col; c <= n; c++) m[r]![c]! -= f * m[col]![c]!;
    }
  }
  return m.map((row, i) => row[n]! / row[i]!);
}

/**
 * Gewichtete logistische Regression mit Ridge-Term (`lambda` auf standardisierten Merkmalen,
 * nicht auf dem Achsenabschnitt). `x`: Merkmale je Zeile, `y`: Anteil der Erfolge, `w`: Gewicht.
 * Gibt [Achsenabschnitt, Gewichte] in Originaleinheiten zurück.
 */
export function logistic(
  x: readonly number[][],
  y: readonly number[],
  w: readonly number[],
  lambda = 1,
): number[] {
  const n = x.length;
  const d = x[0]?.length ?? 0;
  const W = w.reduce((a, b) => a + b, 0);
  const mean = Array.from({ length: d }, (_, j) => x.reduce((s, r, i) => s + w[i]! * r[j]!, 0) / W);
  const sd = mean.map((mu, j) => {
    const v = x.reduce((s, r, i) => s + w[i]! * (r[j]! - mu) ** 2, 0) / W;
    return Math.sqrt(v) || 1;
  });
  const z = x.map((r) => [1, ...r.map((v, j) => (v - mean[j]!) / sd[j]!)]);
  const ybar = y.reduce((s, v, i) => s + w[i]! * v, 0) / W;
  const clampP = Math.min(Math.max(ybar, 1e-4), 1 - 1e-4);
  let beta = [Math.log(clampP / (1 - clampP)), ...Array.from({ length: d }, () => 0)];
  // Ridge im Maßstab der Datenmenge: lambda je 1000 Gewichtseinheiten.
  const ridge = (lambda * W) / 1000;
  /** Bestrafte Log-Likelihood (größer ist besser). */
  const objective = (b: readonly number[]) => {
    let ll = 0;
    for (let i = 0; i < n; i++) {
      const zi = z[i]!;
      let eta = 0;
      for (let j = 0; j <= d; j++) eta += b[j]! * zi[j]!;
      // log(1 + e^eta) numerisch stabil
      const soft = eta > 0 ? eta + Math.log1p(Math.exp(-eta)) : Math.log1p(Math.exp(eta));
      ll += w[i]! * (y[i]! * eta - soft);
    }
    for (let j = 1; j <= d; j++) ll -= 0.5 * ridge * b[j]! ** 2;
    return ll;
  };
  let current = objective(beta);
  for (let iter = 0; iter < 100; iter++) {
    const h = Array.from({ length: d + 1 }, () => Array.from({ length: d + 1 }, () => 0));
    const g = Array.from({ length: d + 1 }, () => 0);
    for (let i = 0; i < n; i++) {
      const zi = z[i]!;
      let eta = 0;
      for (let j = 0; j <= d; j++) eta += beta[j]! * zi[j]!;
      const p = 1 / (1 + Math.exp(-eta));
      const wi = w[i]!;
      const r = wi * (y[i]! - p);
      const v = wi * Math.max(p * (1 - p), 1e-9);
      for (let j = 0; j <= d; j++) {
        g[j]! += r * zi[j]!;
        const vz = v * zi[j]!;
        for (let k = j; k <= d; k++) h[j]![k]! += vz * zi[k]!;
      }
    }
    for (let j = 0; j <= d; j++) for (let k = 0; k < j; k++) h[j]![k] = h[k]![j]!;
    for (let j = 1; j <= d; j++) {
      g[j]! -= ridge * beta[j]!;
      h[j]![j]! += ridge;
    }
    const step = solve(h, g);
    // Newton-Schritt, halbiert, bis die bestrafte Likelihood steigt (sonst kann IRLS bei
    // seltenen Ereignissen wie „schwarz“ davonlaufen).
    let t = 1;
    let next = beta;
    let value = current;
    for (let k = 0; k < 30; k++) {
      const cand = beta.map((b, j) => b + t * step[j]!);
      const v = objective(cand);
      if (v >= current) {
        next = cand;
        value = v;
        break;
      }
      t /= 2;
    }
    const moved = Math.max(...next.map((b, j) => Math.abs(b - beta[j]!)));
    beta = next;
    current = value;
    if (moved < 1e-7) break;
  }
  // Zurück in Originaleinheiten.
  const coef = beta.slice(1).map((b, j) => b / sd[j]!);
  const intercept = beta[0]! - coef.reduce((s, c, j) => s + c * mean[j]!, 0);
  return [intercept, ...coef];
}

const round = (v: number, digits = 3) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

/** Kenngrößen eines Modells auf zurückgelegten Blättern. */
export interface Guete {
  besetzung: string;
  kind: ContractKind;
  blaetter: number;
  /** Mittlerer gemessener Wert (Cent, Standardtarif), gewichtet. */
  mittel: number;
  /** Anteil der Blätter (gewichtet), mit denen sich das Spiel im Schnitt lohnt. */
  lohnt: number;
  /** Wurzel des mittleren quadratischen Fehlers in Cent und Anteil erklärter Varianz. */
  rmse: number;
  r2: number;
  /** Anteil der Blätter, bei denen Tabelle und Messung im Vorzeichen übereinstimmen. */
  treffer: number;
  /** Was falsche Entscheidungen im Schnitt kosten (Cent je Blatt), Tabelle bzw. alte Heuristik. */
  verlust: number;
  verlustHeuristik: number;
  /** Mittlerer Standardfehler der Messung je Blatt (Cent). */
  rauschen: number;
}

/** Schätzt die Modelle für eine Spielart und Besetzung. */
export function passeAn(proben: readonly Probe[], b: Besetzung, kind: ContractKind): AnsageModell {
  const rows = proben.map((p) => merkmaleOf(p.hand, p.contract, b.deck, p.position, b.players));
  // Nur Merkmale, die in den Daten schwanken; die übrigen bekommen das Gewicht 0.
  const used = MERKMALE.filter((m) => new Set(rows.map((r) => r[m])).size > 1);
  const x = rows.map((r) => used.map((m) => r[m]));
  const w = proben.map((p) => p.gewicht * p.n);
  const model: Record<string, number[]> = {};
  const prelude = weddingSize(kind) > 0;
  for (const ziel of ZIELE) {
    if (ziel === 'v' && !prelude) continue;
    if (kind === 'bettel' && ziel !== 'g') continue;
    const y = proben.map((p) => p.zaehler[ziel] / p.n);
    const [intercept, ...coef] = logistic(x, y, w);
    // Ganzzahlig in Hundertsteln (`MODELL_SKALA`), Nullen am Ende weggelassen: hält die Datei klein.
    const ints = [
      intercept!,
      ...MERKMALE.map((m) => (used.includes(m) ? coef[used.indexOf(m)]! : 0)),
    ].map((c) => Math.round(c * MODELL_SKALA) || 0);
    while (ints.length > 1 && ints[ints.length - 1] === 0) ints.pop();
    model[ziel] = ints;
  }
  return model;
}

/** Gütemaße auf zurückgelegten Blättern (Cent nach Standardtarif). */
export function guete(
  test: readonly Probe[],
  b: Besetzung,
  kind: ContractKind,
  model: AnsageModell,
): Guete {
  const rules = regelnFuer(b);
  const tabelle: AnsageTabelle = {
    erzeugung: { seed: 0, blaetter: 0, verteilungen: 0, stand: '' },
    modelle: { [b.key]: { [kind]: model } },
  };
  const deckSize = createDeck(b.deck).length;
  let W = 0;
  let sum = 0;
  let sum2 = 0;
  let se = 0;
  let hits = 0;
  let lohnt = 0;
  let verlust = 0;
  let verlustH = 0;
  let noise = 0;
  for (const p of test) {
    const measured = p.cent / p.n;
    const pred = ansageWert(p.hand, p.contract, rules, p.position, tabelle) ?? -Infinity;
    const heur = heuristicMargin(p.hand, p.contract, deckSize) >= 0;
    const w = p.gewicht;
    W += w;
    sum += w * measured;
    sum2 += w * measured * measured;
    se += w * (Number.isFinite(pred) ? (pred - measured) ** 2 : measured ** 2);
    if (pred > 0 === measured > 0) hits += w;
    if (measured > 0) lohnt += w;
    // Verlust einer Entscheidung: spielen, obwohl es im Schnitt kostet, oder umgekehrt.
    if (pred > 0 !== measured > 0) verlust += w * Math.abs(measured);
    if (heur !== measured > 0) verlustH += w * Math.abs(measured);
    const varMean = (p.cent2 / p.n - measured ** 2) / Math.max(1, p.n - 1);
    noise += w * Math.sqrt(Math.max(0, varMean));
  }
  const mean = sum / W;
  const variance = sum2 / W - mean * mean;
  return {
    besetzung: b.key,
    kind,
    blaetter: test.length,
    mittel: round(mean, 1),
    lohnt: round(lohnt / W, 3),
    rmse: round(Math.sqrt(se / W), 1),
    r2: round(1 - se / W / variance, 3),
    treffer: round(hits / W, 3),
    verlust: round(verlust / W, 2),
    verlustHeuristik: round(verlustH / W, 2),
    rauschen: round(noise / W, 1),
  };
}

/** Teilt die Proben: jedes fünfte Blatt zur Prüfung, der Rest zum Schätzen. */
export function teile(proben: readonly Probe[]): { lern: Probe[]; test: Probe[] } {
  return {
    lern: proben.filter((_, i) => i % 5 !== 4),
    test: proben.filter((_, i) => i % 5 === 4),
  };
}
