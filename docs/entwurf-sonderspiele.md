# Entwurf: Sonderspiele und Hausregeln

Stand November 2026. Reiner Entwurf – noch nichts davon ist umgesetzt. Die Regeln selbst stehen in
[REGELN.md](REGELN.md) („Varianten“, „Hausregeln“, Annahmen 10–19); dieses Dokument beschreibt, wie
der Kern erweitert wird, damit jede Variante **ein Eintrag oder ein Hook** ist und keine
Sonderfälle quer durch `hand.ts` und `scoring.ts` entstehen. Die Pakete dazu stehen in
[ARBEITSPAKETE.md](ARBEITSPAKETE.md) (K3a–K3d, K4, K5, H1–H3, B3).

Die Typen unten sind Skizzen. Namen dürfen bei der Umsetzung abweichen, die Aufteilung nicht.

## 1. Was die Varianten vom Kern verlangen

| Variante           | Ansage                  | Ablauf vor dem Spiel | Trumpf                  | Parteien        | Abrechnung               | Tisch  |
| ------------------ | ----------------------- | -------------------- | ----------------------- | --------------- | ------------------------ | ------ |
| Eisenbahner        | neuer Rang              | –                    | neue Trümpfe            | allein          | wie Wenz                 | –      |
| Hawaii-Habicht     | neuer Rang, zwei Farben | –                    | wechselt nach 4 Stichen | allein          | Laufende nur über Könige | –      |
| Hochzeit           | neuer Rang, Bedingung   | Angebot + Tausch     | wie Sauspiel            | Partner bekannt | wie Sauspiel             | –      |
| Arabische Hochzeit | wie Hochzeit            | Tausch von 2 Karten  | wie Sauspiel            | Partner bekannt | wie Sauspiel             | –      |
| Ramsch             | nicht ansagbar          | –                    | wie Sauspiel            | jeder für sich  | eigene                   | –      |
| Stock              | –                       | –                    | –                       | –               | Pott ein/aus             | Pott   |
| Muss               | erzwungenes Sauspiel    | –                    | –                       | –               | –                        | –      |
| Kontra/Re (K4)     | –                       | Fenster bis 1. Karte | –                       | –               | Faktor                   | –      |
| Bockrunden (K4)    | –                       | –                    | –                       | –               | Faktor                   | Zähler |

Daraus ergeben sich **sechs Erweiterungspunkte**. Jede Variante benutzt nur diese:

1. Rangfolge als Liste statt Zahl (§2)
2. `ModeDefinition`: Parteien, Tarifklasse, Bedingung ans Blatt, stichabhängige Trümpfe (§3)
3. Vorspiel-Hook für Abläufe zwischen Ansage und erstem Stich (§4)
4. Registry für „alle weiter“ (§5)
5. Abrechnung in Stufen mit Faktoren und Pott (§6)
6. Übertrag zwischen Tisch und Spiel: `HandCarry` (§7)

## 2. Rangfolge

Heute steht der Rang als Zahl in jeder `ModeDefinition` (`rank: 1…6`). Vier neue Spielarten
dazwischenzuschieben hieße, alle umzunummerieren. Stattdessen eine Liste; der Rang ist der Index:

```ts
export const CONTRACT_KINDS = [
  'sauspiel',
  'arabischeHochzeit',
  'hochzeit',
  'bettel',
  'eisenbahner',
  'geier',
  'hawaii',
  'farbwenz',
  'wenz',
  'solo',
  'ramsch', // nicht ansagbar, steht außerhalb der Rangfolge
] as const;

/** Ansagbare Spielarten, niedrigste zuerst. Einzige Quelle für den Rang. */
export const BID_ORDER: readonly ContractKind[] = CONTRACT_KINDS.filter((k) => MODES[k].biddable);

export function bidValue(level: BidLevel): number {
  return BID_ORDER.indexOf(level.kind) + (level.tout ? 100 : 0);
}
```

`ModeDefinition.rank` entfällt. `DEFAULT_RULES.contracts` zählt die sechs heutigen Spielarten
**ausdrücklich** auf (nicht mehr `[...CONTRACT_KINDS]`), damit Hausregeln standardmäßig aus sind.

## 3. `ModeDefinition`

```ts
export interface Contract {
  kind: ContractKind;
  suit?: Suit;
  /** Zweite Trumpffarbe (Hawaii-Habicht: gilt ab Stich 5). */
  suit2?: Suit;
  tout?: boolean;
}

export interface ModeDefinition {
  kind: ContractKind;
  /** false = entsteht nur durch eine Tischregel (Ramsch), nie durch Ansage. */
  biddable: boolean;
  suitRole: 'none' | 'called' | 'trump';
  /** Zahl der zu nennenden Farben (Standard 1; Hawaii-Habicht 2, müssen verschieden sein). */
  suitCount?: 1 | 2;

  /** Wer spielt mit wem – ersetzt `alone: boolean`. */
  parties:
    | 'alone' // Ansager gegen alle
    | 'calledAce' // Partner = Besitzer der Rufsau, verdeckt bis die Sau fällt
    | 'prelude' // Partner ergibt sich aus dem Vorspiel, sofort bekannt
    | 'everyone'; // jeder für sich (Ramsch), kein Ansager
  /** Welcher Grundtarif gilt – ersetzt `alone ? tariff.solo : tariff.sauspiel`. */
  tariff: 'sauspiel' | 'solo' | 'ramsch';

  canTout: boolean;
  goal: 'points' | 'noTricks' | 'fewestPoints';
  hasLaufende: boolean;

  /** Trümpfe für den Stich mit Index `trick` (0-basiert), höchster zuerst. */
  trumps(contract: Contract, trick: number): Card[];
  /** Trümpfe, über die Laufende zählen (Standard: `trumps(contract, 0)`). */
  laufendeTrumps?(contract: Contract): Card[];
  rankOrder?: readonly Rank[];

  /** Darf dieses Blatt die Spielart überhaupt ansagen? (Hochzeit: genau ein Trumpf) */
  eligible?(hand: readonly Card[]): boolean;
  suitChoices?(hand: readonly Card[], ctx: { forced: boolean }): Suit[];
  restrictLegal?(ctx: LegalContext, candidates: Card[]): Card[];

  /** Ablauf zwischen Ansage und erstem Stich, siehe §4. */
  prelude?: PreludeDefinition;
  /** Eigene Auswertung statt der Partei-Abrechnung, siehe §6 (Ramsch). */
  outcome?(state: HandState): Outcome;
}

export function orderFor(contract: Contract, trick: number): CardOrder;
```

Folgen im Kern:

- `orderFor` bekommt überall den Index des laufenden Stichs (`state.tricks.length`). Ein Stich liegt
  immer ganz in einer Phase, Bedienpflicht und Stichgewinner bleiben also eindeutig.
- `playable` in `hand.ts` prüft zusätzlich `eligible` und bildet bei `suitCount: 2` alle Paare
  verschiedener Farben. `allContracts`, `cleanCall` und `sameContract` kennen `suit2`.
- `partyOf` und `partnerVisible` lesen `parties` statt `alone`/`suitRole`.
- `ctx.forced` bei `suitChoices` ist für das Muss: Das Sauspiel lockert dann die Ruf-Bedingung.

### Die neuen Einträge

```ts
eisenbahner: {
  biddable: true, suitRole: 'none', parties: 'alone', tariff: 'solo',
  canTout: true, goal: 'points', hasLaufende: true,
  trumps: () => [...ZEHNER],
},
hawaii: {
  biddable: true, suitRole: 'trump', suitCount: 2, parties: 'alone', tariff: 'solo',
  canTout: true, goal: 'points', hasLaufende: true,
  trumps: (c, trick) => [...KOENIG, ...suitCards(trick < 4 ? c.suit! : c.suit2!, ['K'])],
  laufendeTrumps: () => [...KOENIG],
},
hochzeit: {
  biddable: true, suitRole: 'none', parties: 'prelude', tariff: 'sauspiel',
  canTout: false, goal: 'points', hasLaufende: true,
  trumps: SAUSPIEL_TRUMPS,
  eligible: (hand) => countTrumps(hand) === 1,
  prelude: weddingPrelude(1),
},
arabischeHochzeit: { ...wie hochzeit, eligible: … === 2, prelude: weddingPrelude(2) },
ramsch: {
  biddable: false, suitRole: 'none', parties: 'everyone', tariff: 'ramsch',
  canTout: false, goal: 'fewestPoints', hasLaufende: false,
  trumps: SAUSPIEL_TRUMPS,
  outcome: ramschOutcome,
},
```

Der Eisenbahner ist damit wirklich nur ein Eintrag; die Farbkarten-Reihenfolge A K O U 9 8 7
ergibt sich von selbst, weil `trick.ts` Trümpfe aus der Farbe herausnimmt. Die Grenze „4“ im
Hawaii-Habicht ist die halbe Stichzahl; bei kurzem Blatt (K6) wäre sie `Stiche / 2` – dort klären.

## 4. Vorspiel-Hook (Hochzeit, später Kontra-Fenster)

Neue Phase `'prelude'` zwischen `'bidding'` und `'playing'`. Der Kern kennt nur den Rahmen; was
passiert, steht in der `PreludeDefinition` der Spielart.

```ts
export type HandPhase = 'bidding' | 'prelude' | 'playing' | 'finished';

export type PreludeMove =
  { type: 'accept' } | { type: 'decline' } | { type: 'give'; cards: Card[] };

export type PlayerAction =
  | { type: 'bid'; call: BidCall }
  | { type: 'prelude'; move: PreludeMove }
  | { type: 'play'; card: Card };

/** Zustand des Vorspiels; reine Daten, liegt in `HandState.prelude`. */
export interface PreludeState {
  step: 'offer' | 'exchange';
  /** Wer noch gefragt wird, in Reihenfolge. */
  asking: Seat[];
  partner: Seat | null;
  log: { seat: Seat; move: 'accept' | 'decline' | 'give' }[]; // ohne Karten – öffentlich
}

export interface PreludeDefinition {
  start(state: HandState): PreludeState;
  turn(state: HandState): Seat;
  legalMoves(state: HandState, seat: Seat): PreludeMove[]; // passiver Zug zuerst
  apply(state: HandState, seat: Seat, move: PreludeMove): PreludeStep;
}

export type PreludeStep =
  | { type: 'continue'; prelude: PreludeState }
  | { type: 'play'; partner: Seat | null; hands: Card[][] } // Spiel beginnt
  | { type: 'failed' }; // kommt nicht zustande
```

`weddingPrelude(n)` setzt Hochzeit und arabische Hochzeit um:

1. `offer`: reihum ab links vom Hochzeiter `accept`/`decline`. Erster `accept` → `partner`.
2. `exchange`: Der Kern gibt die `n` Trümpfe des Hochzeiters an den Partner; der Partner ist dran
   und wählt mit `give` genau `n` Karten zurück (Nicht-Trümpfe, soweit vorhanden).
3. → `play` mit getauschten Händen. `initialHands` wird auf den Stand **nach** dem Tausch gesetzt
   (Laufende, Annahme 15); der Stand vor dem Tausch bleibt als `dealtHands` erhalten.
4. Lehnen alle ab → `failed`.

**Bei `failed`** (allgemein, nicht hochzeitsspezifisch): Der Ansager gilt als „weiter“. Die Ansage
wird mit denen fortgesetzt, die in einem Zweikampf gegen ihn oder vorher aufgegeben haben – dazu
merkt sich `Auction` neu `yielded: Seat[]`. Sie tragen ihre Zweikämpfe wie gewohnt aus, der
gescheiterte Ansager ist draußen, und die gescheiterte Spielart darf nicht noch einmal genannt
werden. Ist `yielded` leer, greift die Regel für „alle weiter“ (§5).

**Kontra/Re (K4)** braucht denselben Rahmen nicht als Vorspiel der Spielart, sondern als eigenes
Fenster für jedes Spiel; siehe §6. Der Phasenname bleibt frei dafür: Kontra wird als Aktion
`{ type: 'double' }` in der Phase `'playing'` erlaubt, solange `tricks` leer und `currentTrick`
leer ist, ohne Zugreihenfolge.

## 5. „Alle weiter“ als Registry

```ts
export type AllPassedRule = 'zusammenwerfen' | 'ramsch' | 'stock' | 'muss';

export type AllPassedStep =
  | { type: 'finish'; result: HandResult } // Zusammenwerfen, Stock
  | { type: 'play'; contract: Contract } // Ramsch: ohne Ansager
  | { type: 'forced'; seat: Seat } // Muss: seat nennt ein Sauspiel
  | { type: 'fallback'; rule: AllPassedRule }; // Muss mit drei Säuen → Zusammenwerfen

export const ALL_PASSED: Record<AllPassedRule, (state: HandState) => AllPassedStep>;
```

`applyBid` ruft bei „alle weiter“ (und nach gescheitertem Vorspiel ohne Nachrücker) genau
`ALL_PASSED[rules.allPassed](state)` auf und führt den Schritt aus. Mehr weiß `hand.ts` nicht.

- **Ramsch:** `startPlay(next, null, { kind: 'ramsch' })`. `declarer` bleibt `null`.
- **Stock:** `finish` mit `payments = −Einsatz` je Sitz und `potDelta = +4 × Einsatz`.
- **Muss:** `auction.stage = 'declare'`, `auction.forced = true`, am Zug ist der Besitzer des
  Eichel-Obers. `legalCalls` liefert nur Sauspiele; `suitChoices(hand, { forced: true })` lockert
  die Bedingung, wenn die normale Liste leer ist. Bleibt auch sie leer → `fallback`.

`RuleOptions` nimmt `allPassed` auf (heute ausgeschlossen), dazu:

```ts
export interface RuleSet {
  // … wie bisher …
  allPassed: AllPassedRule;
  tariff: Tariff & { ramsch: number; stock: number };
  ramsch: { durchmarsch: boolean; jungfrau: boolean };
  /** K4 */
  kontra: boolean;
  laufende: Record<LaufendeKind, number>; // + eisenbahner 2, hawaii 2, hochzeit 3, arabischeHochzeit 3
}
```

`parseRuleOptions` prüft die neuen Felder; fehlende Felder in alten Daten werden **nicht** ergänzt,
sondern der Stand verworfen (Versionen erhöhen, §9).

## 6. Abrechnung in Stufen

Heute rechnet `scoreHand` alles in einem Stück und kennt nur „Spielerpartei gegen Rest“. Neu drei
Stufen; nur die erste hängt an der Spielart:

```ts
/** Stufe 1 – wer hat gewonnen und was ist das Spiel wert (ohne Faktoren). */
export interface Outcome {
  /** Gewinner und Verlierer; Ramsch: ein Verlierer, drei Gewinner (Durchmarsch umgekehrt). */
  winners: Seat[];
  losers: Seat[];
  /** Betrag, den jeder Verlierer an jeden Gewinner zahlt … */
  value: number;
  /** … aufgeschlüsselt, für die Anzeige (U4). */
  parts: { label: ValuePart; amount: number }[]; // 'grundtarif' | 'schneider' | 'laufende' | …
  /** Hat die Spielerpartei gewonnen? `null`, wenn es keine gibt (Ramsch). */
  declarerWon: boolean | null;
  details: PartyDetails | RamschDetails;
}

/** Stufe 2 – Faktoren. Jeder Eintrag verdoppelt usw.; die Reihenfolge ist egal. */
export interface Factor {
  reason: 'kontra' | 're' | 'jungfrau' | 'bock';
  factor: number;
}

/** Stufe 3 – Zahlungen und Pott. */
export interface HandResult {
  kind: 'passed' | 'played';
  outcome: Outcome | null; // null bei 'passed'
  factors: Factor[];
  /** Saldo je Sitz. */
  payments: number[];
  /** Änderung des Potts. Immer gilt: Summe(payments) + potDelta = 0. */
  potDelta: number;
}
```

- **Stufe 1:** `MODES[kind].outcome?.(state) ?? partyOutcome(state)`. `partyOutcome` ist der heutige
  Inhalt von `scoreHand` (Schneider, Schwarz, Laufende, Tout, Sie, Bettel), nur mit
  `mode.tariff` und `mode.laufendeTrumps`. `ramschOutcome` ist neu: Verlierer nach Augen und
  Annahme 10, Durchmarsch ab 91 Augen dreht Gewinner und Verlierer um.
- **Stufe 2:** `factorsFor(state)` sammelt: Jungfrauen (aus `RamschDetails`), Kontra/Re aus
  `state.doubling` (K4), Bock aus `state.carry.factor` (K4). Tout ×2 und Sie ×4 bleiben in Stufe 1,
  weil sie den Spielwert selbst bestimmen.
- **Stufe 3:** Jeder Verlierer zahlt `value × Π Faktoren` an jeden Gewinner – bei 2:2, 1:3 und 3:1
  dieselbe Formel, die heute schon gilt. Danach der Pott: Ist `state.carry.pot > 0` und
  `declarerWon === true`, bekommt die Spielerpartei den Pott zu gleichen Teilen, `potDelta = −pot`.

Die Felder des heutigen `HandResult` (`won`, `schneider`, `party`, …) wandern nach
`outcome.details`. Das ist die größte Änderung für bestehenden Code (§9).

**Kontra/Re (K4)** als Skizze, damit der Platz stimmt:

```ts
export interface HandState {
  // …
  doubling: { kontra: Seat | null; re: Seat | null };
}
```

`{ type: 'double' }` ist erlaubt, solange keine Karte liegt: für Gegenspieler, wenn `kontra` leer
ist; für die Spielerpartei, wenn `kontra` gesetzt und `re` leer ist. Legen und Bock (falls je
gewünscht) hängen sich als weitere `Factor`-Quellen ein, ohne Stufe 1 und 3 zu berühren.

## 7. Übertrag zwischen Tisch und Spiel

Ein Spiel muss wissen, was im Pott liegt, darf den Tisch aber nicht kennen. Deshalb ein kleiner,
ausdrücklicher Übertrag:

```ts
/** Was der Tisch dem Spiel mitgibt. Reine Daten. */
export interface HandCarry {
  pot: number; // Stock; 0, wenn nicht gespielt
  factor: number; // Bockrunde: 2, sonst 1 (K4)
}

export function dealHand(
  rules: RuleSet,
  dealer: Seat,
  seed: SeedInput,
  carry?: HandCarry,
): HandState;

export interface TableState {
  // … wie bisher …
  /** Stock in Cent. Immer gilt: Summe(balances) + pot = 0. */
  pot: number;
}

/** Einzige Stelle, an der ein Ergebnis auf den Tisch wirkt. */
function settle(table: TableState, result: HandResult): TableState {
  return {
    ...table,
    balances: table.balances.map((b, s) => b + result.payments[s]!),
    pot: table.pot + result.potDelta,
  };
}
```

`applyTableAction` ruft `settle` statt die Kontostände selbst zu addieren. Bockrunden bekämen hier
ihren Zähler (`TableState.bock`), der in `startHand` zu `carry.factor` wird – nur vorgemerkt.

## 8. Auswirkungen außerhalb des Kerns

**Sicht (`view.ts`)**

- `HandView.prelude: PreludeState | null` (enthält keine Karten) und `legalMoves: PreludeMove[]`.
  Getauschte Karten sieht jeder nur in der eigenen `hand`.
- `HandView.auction.forced` (Muss) und `auction.yielded`.
- `HandView.doubling` (K4). `TableView.pot`.
- `partner` ist bei `parties: 'prelude'` sofort für alle sichtbar.
- `contract.suit2` ist öffentlich. Die gerade gültige Trumpffarbe leitet die Oberfläche aus der
  Zahl der gespielten Stiche ab (`orderFor(contract, stiche)`), kein eigenes Feld.
- Im Ramsch sind `declarer` und `partner` `null`, obwohl `contract` gesetzt ist. Alles, was heute
  „`contract` gesetzt ⇒ `declarer` gesetzt“ annimmt, muss das aushalten.

**Protokoll (`packages/net`)**

- `isWellFormed` in `host.ts` lernt `prelude` (und mit K4 `double`); `give` prüft Kartenliste.
- `PROTOCOL_VERSION` und `HOST_SNAPSHOT_VERSION` steigen mit jedem Paket, das `HandView`,
  `HandState`, `TableState` oder `RuleSet` ändert. `parseHostSnapshot` prüft die Invariante neu als
  `Summe(balances) + pot = 0`.
- Der Bot-Notfallzug im Host nimmt in der Phase `prelude` `legalMoves[0]` (passiv zuerst, wie bei
  `legalCalls`).

**Spielprotokoll (K7)**

- Ein Spiel ist nicht mehr nur „Regeln + Seed + Aktionen“, sondern zusätzlich `HandCarry`. Das
  Protokoll muss `carry` je Spiel mitschreiben, sonst stimmt die Wiederholung beim Stock nicht.

**Bots (`packages/bots`)**

- Der Heuristik-Bot bietet nur auf Spielarten, die er kennt; unbekannte ignoriert er. Er läuft also
  weiter, spielt Hausregeln aber nie selbst und verteidigt sie mit den Wenz-/Solo-Heuristiken.
- Zwingend nötig, sobald die Variante an ist: Muss (erzwungene Ansage: erstes `legalCalls`),
  Vorspiel (ablehnen bzw. beim Tausch die niedrigsten Karten), Ramsch (keine Augen nehmen,
  hohe Karten früh loswerden). Trumpf-Zählung des Bots muss `orderFor(contract, stich)` nutzen.
- Gutes Spiel in den neuen Spielarten ist ein eigenes Paket (B3).

**Oberfläche (`apps/web`)**

- Lobby: Auswahl „alle weiter“ mit Unteroptionen für Ramsch, Bereich „Hausregeln“ für die neuen
  Spielarten, Tarife Ramsch/Stock, Schalter Kontra.
- Ansage-Dialog: neue Spielarten erscheinen über `BID_ORDER` von selbst; Hawaii-Habicht braucht
  einen zweiten Farbschritt; beim Muss ein Hinweis „Du musst spielen“.
- Tisch: Vorspiel-Dialog (annehmen/ablehnen, Karten zum Zurückgeben wählen), Pott-Anzeige,
  Anzeige der gültigen Trumpffarbe mit Wechsel nach dem vierten Stich, Kontra/Re-Knopf.
- Ergebnis-Dialog liest `outcome.parts` und `factors`; Ramsch hat eine eigene Darstellung
  (Augen je Spieler, Jungfrauen, Durchmarsch).
- Alle Texte in `i18n/de.ts`.

## 9. Migration und Tests

Der Umbau wird vom Verhalten getrennt: **K3a** baut nur um, alle heutigen Tests bleiben grün.

| Änderung                                     | Betroffen                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `rank` → `BID_ORDER`                         | `modes.ts`, `hand.ts`; `BidDialog`, `LobbySettings`, `RulesSummary` (nutzen `CONTRACT_KINDS`) |
| `alone` → `parties`/`tariff`                 | `scoring.ts`, `view.ts`, `heuristicBot.ts` (2 Stellen)                                        |
| `trumps(c)` → `trumps(c, trick)`, `orderFor` | `hand.ts`, `scoring.ts`, Bots, Oberfläche (Sortierung der Hand)                               |
| `HandResult` neu gegliedert                  | `scoring.test.ts`, `ResultDialog`, `snapshot.ts` (Prüfung), K7/U4                             |
| `DEFAULT_RULES.contracts` ausdrücklich       | `ruleset.test.ts:84` vergleicht mit `CONTRACT_KINDS` – anpassen                               |
| `TableState.pot`, `HandState.carry`          | `table.ts`, `snapshot.ts`, Host-Tests zur Kontosumme                                          |

Vorgehen in K3a: zuerst die alten Tests unverändert laufen lassen und nur dort anfassen, wo sich
ein Feldname ändert (`result.won` → `result.outcome.details.won` o. ä.) – keine erwarteten Werte
ändern. Ein zusätzlicher Test spielt 500 Zufallsspiele mit festem Seed-Satz und vergleicht
`payments` mit einer vor dem Umbau erzeugten Liste (im Repo abgelegt). Erst danach kommen die
Varianten, jede mit eigenen Tests und der Invariante `Summe(payments) + potDelta = 0`.

## 10. Risiken

- **`declarer === null` bei laufendem Spiel (Ramsch).** Viele Stellen in Sicht, Bots und Oberfläche
  nehmen an, dass es einen Ansager gibt. K3b braucht einen Zufallsspiel-Test über Host und Bots,
  nicht nur über den Kern.
- **Trumpfwechsel mitten im Spiel (Hawaii-Habicht).** Jede Stelle, die `orderFor` einmal berechnet
  und behält (Bot-Gedächtnis, Hand-Sortierung, `restrictLegal` über abgeschlossene Stiche), wird
  still falsch. Deshalb verlangt die neue Signatur den Stich-Index ohne Standardwert.
- **Verdeckter Tausch.** Der Tausch darf in keiner Sicht, keinem `log` und keinem Spielprotokoll für
  Dritte erscheinen. Test: Sichten der beiden Unbeteiligten vor und nach dem Tausch sind bis auf
  `handSizes`/`prelude` gleich.
- **Kontosumme.** Mit dem Pott ist `Summe(balances) = 0` falsch; alle Prüfungen (Snapshot, Tests,
  Endabrechnung U4) müssen auf `+ pot` umgestellt werden, sonst werden gültige Stände verworfen.
- **Ansage nach gescheiterter Hochzeit.** Die Wiederaufnahme der Ansage ist der einzige Rücksprung
  im Ablauf. Sie muss mit K1 (kein Wiedereinstieg nach „weiter“) verträglich bleiben: Nur wer
  _aufgegeben_ hat, rückt nach, nicht wer „weiter“ gesagt hat.
- **Parallele Pakete.** K7 (Spielprotokoll) und U4 lesen `HandResult`; sie sollten vor K3a
  zusammengeführt sein oder danach beginnen.
- **Offene Regelfragen.** Annahmen 10–19 in REGELN.md sind nicht bestätigt; jedes Paket lässt seine
  Annahmen zuerst von Lukas bestätigen.

## 11. Reihenfolge

```
K3a Umbau ──► H1 Eisenbahner ──► K3b Ramsch ──► K3c Stock ──► K3d Muss
                                                                 │
              K4 Kontra/Re ◄──── H2 Hawaii-Habicht ◄──── H3 Arab. Hochzeit ◄──── K5 Hochzeit
```

Alle Pakete berühren `packages/core` und laufen nacheinander. H1 kommt früh, weil es als reiner
Eintrag zeigt, dass der Umbau trägt. B3 (Bots) kann nach K5 parallel laufen.
