# Arbeitspakete

Jedes Paket ist so geschnitten, dass ein Agent es eigenständig erledigen kann: klarer Bereich,
klare Abnahme. Vor dem Start [ARCHITEKTUR.md](ARCHITEKTUR.md) und [REGELN.md](REGELN.md) lesen;
die Arbeitsweise steht in [`CLAUDE.md`](../CLAUDE.md). Langfristige Themen ohne Paket stehen
im [Backlog](BACKLOG.md).

**Für alle Pakete gilt als Abnahme zusätzlich:** `npm run check` und `npm run build` laufen sauber
durch, neue Logik hat Tests, betroffene Doku ist angepasst.

Pakete mit gleichem Buchstaben berühren meist dieselben Dateien und sollten nacheinander laufen.
Pakete verschiedener Buchstaben können parallel laufen, sofern keine Abhängigkeit genannt ist.

## Reihenfolge

| Stufe | Ziel                      | Pakete                             |
| ----- | ------------------------- | ---------------------------------- |
| 1     | Mit Freunden gut spielbar | D1, D2, D3, K1, N1, N2, U2, B1, I1 |
| 2     | Komfort und Tischregeln   | D4, K2, N3, N4, U4, U5, I2         |
| 3     | Ausbau                    | K3a–K3d, K4, K5, K6, U6, U7, B2    |
| 4     | Hausregeln                | H1, H2, H3, B3                     |

## Welches Modell für welches Paket

Grundsatz: **Opus ist der Standard.** Fable nur dort, wo eine Entscheidung das ganze Projekt
prägt und ein Fehler teuer wird. Sonnet für klar umrissene Pakete, bei denen der Weg feststeht.
Haiku für rein mechanische Handgriffe.

| Modell | Wofür                                                        | Pakete                                                      |
| ------ | ------------------------------------------------------------ | ----------------------------------------------------------- |
| Fable  | Eingriffe in die Architektur; Entwurf vor der Umsetzung      | Entwurf K3/K5/Hausregeln (erledigt)                         |
| Opus   | Knifflige Logik, Gestaltung, Netz, alles mit Urteilsvermögen | D1–D4, K1, K3a, K3b, K4, K5, K6, N1, N2, N3, B1, B2, B3, H2 |
| Sonnet | Klar beschriebene Umsetzung nach vorhandenem Muster          | K2, K3c, K3d, K7, N4, U2, U4, U5, U6, U7, I2, H1, H3        |
| Haiku  | Mechanisches ohne Entscheidungen                             | I1, I3                                                      |

Hinweise dazu:

- **K3, K5 und Hausregeln in zwei Schritten:** Der Entwurf der Schnittstellen liegt vor
  ([entwurf-sonderspiele.md](entwurf-sonderspiele.md), mit Fable erstellt). Die Umsetzung machen
  Opus (Umbau, Ramsch, Hochzeit, Hawaii-Habicht) und Sonnet (Pakete, die nur noch ein Eintrag
  sind). So fällt der teure Teil klein aus.
- **Gestaltung (D-Pakete):** Opus. Wenn die Entwürfe aus D1 nicht überzeugen, D1 einmal mit Fable
  wiederholen – die Richtung ist die Entscheidung mit der größten Wirkung, die Umsetzung danach nicht.
- **Hochstufen statt vorsorglich teuer:** Scheitert ein Paket auf Sonnet (Abnahme nicht erreicht,
  dreht sich im Kreis), dasselbe Paket mit Opus neu starten, nicht nachbessern lassen.
- **Prüfen ist billiger als Bauen:** Ein Review der fertigen Änderung (`/code-review`) durch Opus
  lohnt sich bei Kern- und Netz-Paketen mehr als ein größeres Modell für die Umsetzung.

---

## K – Kern (`packages/core`)

### K1 · Zweistufige Ansage

Die Ansage läuft derzeit in einer Runde. Umsetzen wie am Tisch üblich: erst reihum „Ich würde“ /
„weiter“, danach nennen die Interessenten ihr Spiel; bei gleichem Rang hat der Frühere Vorrang.

- **Bereich:** `hand.ts` (Phase `bidding`, `Bid`, `legalContracts`), `view.ts`, Ansage-Dialog in
  `apps/web/src/ui/Table.tsx`, `packages/bots`.
- **Abnahme:** Tests für: Früherer behält bei Gleichstand; Überbieten; alle weiter. REGELN.md,
  Abschnitt „Ansage“ und Annahme 1 aktualisiert.

### K2 · Regeln am Tisch einstellbar (erledigt)

`RuleSet` vollständig aus der Lobby wählbar machen: erlaubte Spielarten, Tout, Tarif, Schwellen für
Laufende. Annahmen aus REGELN.md, die Geschmackssache sind, als Optionen abbilden.

- **Bereich:** `rules.ts`, `modes.ts` (Schwellen aus den Regeln lesen), Host-Option, Lobby.
- **Abhängigkeit:** N4 (Lobby-Einstellungen).
- **Abnahme:** Jede Option hat einen Test, der ihr Verhalten zeigt; Standard bleibt wie bisher.

### K3 · „Alle weiter“: Ramsch, Stock, Muss (in K3a–K3d geschnitten, erledigt)

Regeln: [REGELN.md](REGELN.md), „Varianten“. Schnittstellen:
[entwurf-sonderspiele.md](entwurf-sonderspiele.md). Die Pakete K3a–K3d, K5, H1–H3 und K4 berühren
alle den Kern und laufen **nacheinander** in der Reihenfolge aus §11 des Entwurfs. Die Annahmen
10–19 in REGELN.md hat Lukas am 11.11.2026 bestätigt; sie gelten als Regel. Jedes Paket erhöht
`PROTOCOL_VERSION` und `HOST_SNAPSHOT_VERSION`, wenn es Sicht, Zustand oder `RuleSet` ändert, und
streicht „(geplant)“ bzw. „noch nicht umgesetzt“ für seinen Teil in REGELN.md.

### K3a · Umbau des Kerns für Sonderspiele (ohne Verhaltensänderung) (erledigt)

Die sechs Erweiterungspunkte aus dem Entwurf einziehen, ohne dass sich ein Spiel anders verhält:
`BID_ORDER` statt `rank`; `parties`/`tariff`/`biddable` statt `alone`; `trumps(contract, trick)`
und `orderFor(contract, trick)`; `HandResult` in Stufen (`outcome`, `factors`, `payments`,
`potDelta`); `HandCarry` und `TableState.pot` (immer 0); Registry `ALL_PASSED` mit dem einen
Eintrag `zusammenwerfen`; `DEFAULT_RULES.contracts` ausdrücklich aufgezählt.

- **Modell:** Opus. Danach `/code-review`.
- **Bereich:** ganz `packages/core/src`, Anpassungen in `packages/net` (`snapshot.ts`),
  `packages/bots`, `apps/web` (`ResultDialog`, `BidDialog`, `LobbySettings`, `RulesSummary`).
- **Abhängigkeit:** K7 und U4 vorher zusammengeführt oder noch nicht begonnen (beide lesen
  `HandResult`).
- **Abnahme:** Alle bestehenden Tests grün; geändert werden dürfen in ihnen nur Feldnamen, keine
  erwarteten Werte. Neuer Test: 500 Zufallsspiele (fester Seed-Satz) ergeben dieselben `payments`
  wie eine vor dem Umbau erzeugte, eingecheckte Liste. `docs/ARCHITEKTUR.md` („So wird erweitert“,
  Tabelle der Dateien) beschreibt die neuen Erweiterungspunkte.

### K3b · Ramsch (erledigt)

`allPassed: 'ramsch'`: Spielart `ramsch` (nicht ansagbar, jeder für sich), `ramschOutcome` mit
Verlierer nach Augen, Durchmarsch ab 91 Augen, Jungfrau als Faktor; `RuleSet.ramsch`,
`tariff.ramsch`; Wahl in der Lobby; Ergebnis-Dialog für Ramsch; Bots spielen regelgerecht
(Augen vermeiden genügt).

- **Modell:** Opus (erstes Spiel ohne Ansager – trifft Sicht, Bots und Oberfläche).
- **Abhängigkeit:** K3a.
- **Abnahme:** Tests für: Verlierer zahlt an drei; jeder Gleichstands-Fall aus Annahme 10; eine und
  zwei Jungfrauen; Durchmarsch mit genau 91 und 90 Augen; beide Unteroptionen aus. Zufallsspiel-Test
  über Host mit vier Bots, in dem jedes Spiel „alle weiter“ beginnt. Summe der Zahlungen 0.

### K3c · Stock (erledigt)

`allPassed: 'stock'`: Einzahlung über `potDelta`, `TableState.pot`, Auszahlung an die Spielerpartei
des nächsten gewonnenen Spiels gleich welcher Art; `tariff.stock`; `TableView.pot`, Pott-Anzeige am
Tisch und im Ergebnis; Lobby.

- **Modell:** Sonnet.
- **Abhängigkeit:** K3a. K7: Spielprotokoll schreibt `HandCarry` mit.
- **Abnahme:** Tests für: Einzahlung; Pott wächst bei zweimal „alle weiter“; Auszahlung bei
  gewonnenem Sauspiel (geteilt) und Solo; Pott bleibt bei verlorenem Spiel; nach jedem Schritt
  `Summe(balances) + pot = 0`; Speicherstand mit Pott wird wiederhergestellt. Rückzahlung am Ende
  des Abends gehört zu U4 und ist dort vermerkt.

### K3d · Muss (erledigt)

`allPassed: 'muss'`: Besitzer des Eichel-Obers nennt ein Sauspiel (`auction.forced`), gelockerte
Ruf-Bedingung nur wenn gesperrt, Zusammenwerfen bei drei eigenen Säuen; Hinweis im Ansage-Dialog;
Bot nennt ein erlaubtes Sauspiel.

- **Modell:** Sonnet.
- **Abhängigkeit:** K3a.
- **Abnahme:** Tests für: normales Muss; gesperrt → Ruf ohne Farbkarte erlaubt, sonst nicht; drei
  Säue → zusammenwerfen; Rufsau-Regeln gelten für den Mitspieler unverändert.

### K4 · Kontra und Re

Optionale Tischregel `RuleSet.kontra`, Standard aus. Kontra durch einen Gegenspieler, solange die
erste Karte nicht liegt; darauf Re durch die Spielerpartei. Umsetzung als Aktion `double` und als
`Factor` in der Abrechnung (Entwurf §4 und §6). Legen und Bockrunden spielt Lukas' Runde nicht;
sie sind nicht Teil dieses Pakets – der Entwurf hält nur den Platz frei (`HandCarry.factor`).

- **Modell:** Opus.
- **Bereich:** `RuleSet`, `PlayerAction`, `HandState.doubling`, `scoring.ts`, Sicht, `host.ts`
  (`isWellFormed`), Knopf am Tisch, Bots (sagen vorerst nie Kontra).
- **Abhängigkeit:** K3a.
- **Abnahme:** Tests für: Kontra nur durch Gegenspieler und nur vor der ersten Karte; Re nur nach
  Kontra und nur durch die Spielerpartei; Verdopplung und Vervierfachung des Spielwerts, auch bei
  Tout; kein Kontra im Ramsch; Pott wird nicht verdoppelt.
- **Stand:** umgesetzt (November 2026). Tests in `packages/core/test/kontra.test.ts`,
  `packages/net/test/kontra.test.ts` und E2E „Kontra“; neue Annahmen 22–25 in `REGELN.md`
  (bitte prüfen). Der Ramsch-Fall ist bis K3b nur mit einem Spiel ohne Ansager nachgestellt.

### K5 · Hochzeit (Vorspiel-Hook)

Phase `prelude` und `PreludeDefinition` nach Entwurf §4; Spielart `hochzeit` mit `weddingPrelude(1)`
(Bedingung genau ein Trumpf, Angebot reihum, verdeckter Tausch, Partner bekannt, Abrechnung wie
Sauspiel); Wiederaufnahme der Ansage über `auction.yielded`, wenn keiner annimmt; Vorspiel-Dialog
am Tisch; Bots lehnen ab bzw. geben die niedrigsten Karten zurück.

- **Modell:** Opus.
- **Abhängigkeit:** K3a; sinnvoll nach K3b–K3d (dieselben Stellen in `applyBid`).
- **Abnahme:** Hochzeit vollständig spielbar (Kern, Host mit Bots, Oberfläche); bestehende
  Spielarten unverändert. Tests für: nur mit genau einem Trumpf ansagbar; Rang über Sauspiel, unter
  Bettel; Erster nimmt an; Rückgabe muss Nicht-Trumpf sein, wenn vorhanden; die Sichten der beiden
  Unbeteiligten verraten die getauschten Karten nicht; keiner nimmt an → verdrängter Sauspieler
  spielt; keiner nimmt an und niemand hat aufgegeben → Regel für „alle weiter“.
- **Stand:** umgesetzt (November 2026). Tests in `packages/core/test/hochzeit.test.ts`,
  `packages/net/test/hochzeit.test.ts` (Host mit Menschen und mit vier Bots, Speicherstand) und
  E2E „Hochzeit“ (`e2e/hochzeit.spec.ts`, feste Karten über `?seed=`). Neue Annahmen 26–30 in
  `REGELN.md` (bitte prüfen). Eigene Laufende-Schwelle `laufende.hochzeit` (Standard 3).
  H3 braucht nur noch den Eintrag mit `weddingPrelude(2)`.

### K6 · Kurzes Blatt und Dreier-Modus

`RuleSet.deck = 'kurz'` und `players = 3` durchgängig unterstützen (Kern ist parametrisiert, aber
ungetestet). Zu klären: welche Spielarten zu dritt, Sie mit kurzer Karte, Tischanordnung.

- **Bereich:** Kern-Tests, `scoring.ts` (Sie), `ui/Table.tsx` (Positionen), Lobby.
- **Abnahme:** Zufallsspiel-Test (wie in `hand.test.ts`) für kurz/4 und kurz/3.

### K7 · Spielprotokoll

Jedes Spiel als Seed + Aktionsliste festhalten; daraus Wiederholung und „letzte Spiele“-Liste.

- **Abnahme:** `replay(protokoll)` ergibt denselben Endzustand; Test dafür.
- **Stand:** umgesetzt (siehe `docs/ARCHITEKTUR.md`, „Spielprotokoll“); die Anzeige baut U4.

---

## H – Hausregeln (`packages/core`, Lobby, Tisch)

Spielarten aus Lukas' Runde; Regeln in [REGELN.md](REGELN.md), „Hausregeln“. Alle sind einzeln in
`RuleSet.contracts` einschaltbar und standardmäßig aus. Es gilt der Vorspann von K3 (nacheinander,
Annahmen bestätigen, Versionen erhöhen). Weitere Hausregeln beschreibt Lukas zuerst in REGELN.md;
passen sie in die sechs Erweiterungspunkte des Entwurfs, ist jede ein Paket nach dem Muster von H1.

### H1 · Eisenbahner (erledigt)

Eintrag `eisenbahner` in `MODES` (Trümpfe: vier Zehner), Platz in `BID_ORDER` zwischen Bettel und
Geier, Laufende-Schwelle 2 in `RuleSet.laufende`, Bereich „Hausregeln“ in der Lobby, Texte.

- **Modell:** Sonnet.
- **Abhängigkeit:** K3a.
- **Abnahme:** Außer dem Eintrag, der Schwelle und Texten ändert sich im Kern nichts (zeigt, dass
  K3a trägt). Tests für: Zehner stechen in der Reihenfolge Eichel, Gras, Herz, Schellen und sind
  eigene Farbe beim Bedienen; Rang gegenüber Bettel und Geier im Zweikampf; Tout; Laufende ab 2;
  standardmäßig nicht ansagbar.
- **Stand:** umgesetzt. Im Kern nur der Eintrag in `CONTRACT_KINDS`/`MODES` (`modes.ts`) und die
  Schwelle in `RuleSet.laufende` (`rules.ts`, `LAUFENDE_KINDS`); `parseRuleOptions`, `bidValue`,
  Abrechnung und Stichlogik blieben unverändert. Außerhalb des Kerns: Lobby-Bereich „Hausregeln“,
  Texte, Schild-Buchstabe „10“, Bot bewertet ihn mit „nie ansagen“. `PROTOCOL_VERSION` 13,
  `HOST_SNAPSHOT_VERSION` 12 (nach K5). Tests: `packages/core/test/eisenbahner.test.ts`,
  Zufallsspiele über den Host in `packages/net/test/eisenbahner.test.ts`. Annahmen 31–32.

### H2 · Hawaii-Habicht

Eintrag `hawaii` mit `suitCount: 2`, `Contract.suit2`, Trumpfwechsel nach dem vierten Stich über
`trumps(contract, trick)`, Laufende nur über die Könige; zweiter Farbschritt im Ansage-Dialog;
Anzeige der gültigen Trumpffarbe und ihres Wechsels am Tisch; Hand-Sortierung folgt der gültigen
Farbe; Bots zählen Trümpfe je Stich richtig.

- **Modell:** Opus (Trumpfwechsel trifft jede Stelle, die eine Kartenordnung behält).
- **Abhängigkeit:** K3a.
- **Abnahme:** Tests für: beide Farben müssen verschieden sein; Bedienpflicht und Stichgewinner in
  Stich 4 nach der ersten, in Stich 5 nach der zweiten Farbe; Könige durchgehend höchste Trümpfe;
  Laufende zählen höchstens vier; Rang zwischen Geier und Farbwenz; Tout. Zufallsspiel-Test über
  Host mit Bots.

### H3 · Arabische Hochzeit

Eintrag `arabischeHochzeit` mit `weddingPrelude(2)`: Bedingung genau zwei Trümpfe, Tausch von zwei
Karten, Rang zwischen Sauspiel und Hochzeit.

- **Modell:** Sonnet.
- **Abhängigkeit:** K5.
- **Abnahme:** Kein neuer Ablaufcode außer dem Parameter 2. Tests für: nur mit genau zwei Trümpfen;
  zwei Karten hin und zwei zurück; Hochzeit überbietet arabische Hochzeit; keiner nimmt an.

---

## N – Netz (`packages/net`)

### N1 · Verbindungsaufbau härten

Der Aufbau über öffentliche Nostr-Relays funktioniert, dauerte im Test aber teils über eine Minute.

Praxisbefund (Spielabend am 10.11.2026, 4 Spieler, 4 Runden): Das Spiel lief, aber beim Gastgeber
meldete Chrome wiederholt `Trystero: relay failure from wss://relay.layer.systems/ - rate-limited:
slow down, please`. Schon im ersten Test war dasselbe Relay gedrosselt und andere
(`nostr.robosats.org`, `relay.bullishbounty.com`) gar nicht erreichbar. Ursache klären: Wie viele
Nachrichten schickt Trystero pro Raum und Minute an jedes Relay (Ankündigungen, Wiederholungen,
weiter nach dem Verbindungsaufbau?), und lässt sich das senken – etwa die Signalisierung ruhen
lassen, sobald alle Plätze verbunden sind, und erst bei Verbindungsverlust wieder aufnehmen.

- Signalisierungs-Strategien von Trystero vergleichen (Nostr, BitTorrent, MQTT), ggf. eigene
  Relay-Liste; die schnellste und zuverlässigste wählen.
- Drosselnde oder tote Relays aus der Liste nehmen; Relay-Liste konfigurierbar machen. Der
  Gastgeber darf keine Drosselungsmeldungen mehr bekommen, solange der Tisch normal läuft.
- Verbindungsstatus in der Oberfläche (suche Tisch / verbunden / fehlgeschlagen), Zeitüberschreitung
  mit verständlicher Meldung.
- TURN-Fallback dokumentieren und konfigurierbar machen (`TrysteroOptions.turnConfig`).
- **Abnahme:** Messwerte (Zeit bis verbunden, 10 Versuche je Strategie) in der PR-Beschreibung;
  manuelle Probe über zwei verschiedene Netze (z. B. WLAN und Mobilfunk).
- **Stand:** umgesetzt (Relay-Liste, Pausieren, Statusanzeige, `VITE_TURN_CONFIG`); Messwerte in
  `docs/ARCHITEKTUR.md`. Offen: Probe über zwei verschiedene Netze.

### N2 · Tisch übersteht Neuladen des Gastgebers

`TableState` plus Platzzuordnung im Browser speichern und beim Neuladen wiederherstellen; Gäste
verbinden sich automatisch neu.

- **Bereich:** `host.ts` (Zustand exportieren/laden), `apps/web/src/connection.ts`.
- **Abnahme:** Test: Host aus gespeichertem Zustand erzeugen, Gast meldet sich mit alter `clientId`
  und sieht dieselbe Hand.

### N3 · Ausgefallene Mitspieler (erledigt)

Getrennte Spieler nach Wartezeit durch einen Bot vertreten lassen, bei Rückkehr wieder übernehmen.
Gastgeber kann Spieler vom Tisch nehmen.

- **Abnahme:** Tests mit Loopback: Trennen → Bot zieht → Wiederverbinden → Mensch zieht.
- **Stand:** Frist 30 s (`HostOptions.standInDelayMs`), Anzeige am Platz mit Restzeit,
  Gastgeber-Befehle `standInNow` und `replaceWithBot` (Protokoll 4; Speicherstand unverändert).

### N4 · Lobby-Funktionen

Platzwahl, Zuschauer, Tisch-Einstellungen (Regeln), Umbenennen. Admin-Befehle des Gastgebers
laufen direkt über `HostSession`, nicht über das Protokoll.

- **Abnahme:** Tests für Platzwechsel und Zuschauer; Protokolländerungen erhöhen
  `PROTOCOL_VERSION`.
- **Stand:** Platzwahl, Zuschauer, Umbenennen, Vom-Platz-Nehmen umgesetzt (Protokoll 3,
  Speicherstand 3). Tischregeln einstellen folgt mit K2; die Lobby hat dafür den Bereich
  „Einstellungen“.

### N5 · Tischcode schwerer zu erraten

Vom Testabend (12.11.2026): Die Tischcodes wirken leicht zu erraten. Stand: Der Code entsteht schon
kryptografisch zufällig (`crypto.getRandomValues` in `apps/web/src/connection.ts`), ist aber nur
6 Zeichen aus 31 lang (rund 30 Bit, etwa eine Milliarde Möglichkeiten) und durch `b % 31` leicht
ungleich verteilt. Wer einen Code errät, sitzt ohne Rückfrage am Tisch.

- **Modell:** Sonnet.
- **Umfang:** Code auf mindestens 10 Zeichen verlängern (rund 50 Bit) und ohne Modulo-Verzerrung
  ziehen (Rejection Sampling); lesbar in Gruppen anzeigen (z. B. `k7mq-x2pd-hn`). Alte, kurze Links
  dürfen ungültig werden. Prüfen, ob der Raumname bei den öffentlichen Relays im Klartext steht;
  falls ja, nur einen Hash davon verwenden. Optional: Der Gastgeber lässt neue Mitspieler erst nach
  Bestätigung an den Tisch (Einstellung in der Lobby).
- **Abnahme:** Test für Länge, Alphabet und Gleichverteilung des Codes; Einladungslink und E2E
  funktionieren weiter; ARCHITEKTUR.md beschreibt, was der Code schützt und was nicht.

---

## D – Gestaltung (`apps/web`)

Das jetzige Aussehen ist ein Platzhalter und wird grundlegend überarbeitet. **Lukas entscheidet
über die Gestaltung.** Jedes D-Paket hat deshalb feste Haltepunkte: Der Agent legt etwas zum
Anschauen vor, wartet auf die Entscheidung und baut erst dann weiter. Ohne Freigabe wird kein
D-Paket abgeschlossen. Die Pakete laufen nacheinander und in einer Sitzung mit Lukas, nicht
unbeaufsichtigt im Hintergrund.

### D1 · Gestaltungsrichtung finden

Drei deutlich verschiedene Richtungen für den Spieltisch als klickbare Entwürfe (statisches HTML,
kein Umbau der App), jeweils Handy hochkant und Desktop, in den Zuständen Ansage, laufender Stich
und Ergebnis. Vorher mit Lukas klären: Stimmung (Wirtshaus/traditionell, modern-schlicht,
verspielt …), Vorbilder, was auf keinen Fall.

- **Haltepunkt 1:** Fragen zur Richtung, bevor etwas gezeichnet wird.
- **Haltepunkt 2:** Lukas wählt eine Richtung oder mischt; eine Überarbeitungsrunde ist eingeplant.
- **Abnahme:** Gewählte Richtung mit Begründung und Bildern in `docs/DESIGN.md`.

### D2 · Gestaltungsgrundlagen

Aus der gewählten Richtung ein kleines System: Farben, Schrift, Abstände, Schatten als
CSS-Variablen; Grundbausteine (Schaltfläche, Feld, Tafel, Dialog, Karte, Spielerplatz) auf einer
Musterseite. Hell/Dunkel entscheiden.

- **Bereich:** `apps/web/src/styles/`, Musterseite, `docs/DESIGN.md`.
- **Haltepunkt:** Lukas gibt die Musterseite frei.
- **Abnahme:** Keine festen Farb- oder Größenwerte mehr außerhalb der Variablen; Kontraste
  ausreichend (WCAG AA).

### D3 · Spieltisch umsetzen

Den Tisch nach D1/D2 bauen: Hand als Fächer, Stich mittig, Stich bleibt kurz liegen und wandert zum
Gewinner, letzter Stich einsehbar; klar erkennbar, wer dran ist, wer gibt, was gespielt wird und
wer zusammenspielt. Handy hochkant und quer, Desktop. Ansage-Dialog, der den Tisch nicht verdeckt:
erst Spielart, dann Farbe, Tout als Schalter (nach K1 an die zweistufige Ansage anpassen).

- **Bereich:** `apps/web/src/ui/Table.tsx`, `CardView.tsx`, Stile. Kern und Netz bleiben unberührt.
- **Haltepunkte:** Nach dem Layout (ohne Bewegung) und nach den Animationen je eine Vorlage mit
  Bildschirmfotos.
- **Abnahme:** Bildschirmfotos für 360×740, 740×360 und 1440×900; per Tastatur bedienbar;
  `prefers-reduced-motion` beachtet; Freigabe durch Lukas.

### D4 · Start, Lobby, Ergebnis

Die übrigen Ansichten im selben Stil: Startbildschirm, Lobby mit Einladung, Verbindungsstatus,
Ergebnis-Dialog, Fehlermeldungen.

- **Abhängigkeit:** D2; sinnvoll nach N1 (Statusanzeige) und N4 (Lobby-Funktionen).
- **Haltepunkt:** Vorlage mit Bildschirmfotos, Freigabe durch Lukas.

---

## U – Oberfläche (`apps/web`)

### U2 · Bayerisches Kartenbild

Gezeichnete Karten als weiteres `CardTheme`. **Lizenz zuerst klären** – nur gemeinfreie oder
passend lizenzierte Vorlagen (z. B. von Wikimedia Commons) oder selbst gezeichnete SVGs; Quelle und
Lizenz in `apps/web/src/assets/LIZENZEN.md` festhalten. Theme-Auswahl in den Einstellungen.
Lukas wählt die Vorlage aus zwei bis drei Vorschlägen, bevor alle 32 Karten gebaut werden.

- **Abnahme:** Alle 32 Karten vorhanden und bei 44 px Breite noch unterscheidbar.

### U4 · Abrechnung und Verlauf

Ergebnis verständlich aufschlüsseln (Grundtarif, Schneider, Laufende …), Tabelle aller Spiele des
Abends, Endabrechnung „wer zahlt wem“. Dazu gehört die Rückzahlung eines stehengebliebenen Potts
(Stock, K3c) zu gleichen Teilen in der Endabrechnung (REGELN.md, Annahme 13).

- **Abhängigkeit:** K7 für den Verlauf.

### U5 · Installierbar (PWA) und Android

Web-App-Manifest, Icons, Service Worker für Offline-Start. Danach prüfen, ob eine Android-Hülle
(Capacitor oder Tauri) über die PWA hinaus nötig ist.

- **Abnahme:** Lighthouse „installierbar“; App startet ohne Netz bis zum Startbildschirm.

### U6 · Atmosphäre

Töne (Karte legen, Stich), kurze Sprüche/Emotes an den Tisch, Einstellungen dafür.

### U7 · Mehrsprachigkeit

`i18n/de.ts` zu austauschbaren Sprachdateien ausbauen (Hochdeutsch, Bairisch, Englisch).

### U8 · Kleinigkeiten vom Testabend (12.11.2026)

Drei kleine Funde, die zusammen ein Paket ergeben.

- **Bot-Namen:** Die Bots heißen „Saller Wolfe“, „Lengschwendtner Sepp“ und „Ziegler Fritz“
  (bisher `DEFAULT_BOT_NAMES` in `packages/net/src/host.ts`), der vierte (nur für den Fall ohne
  Menschen am Tisch) „Weber Max“. Lange Namen müssen am Platz
  und in der Tabelle sauber kürzen.
- **„Am Zug“ zentrieren:** Die Marke „am Zug“ sitzt beim Spielerplatz nicht mittig unter dem
  Namen bzw. Bild. In allen drei Größen (hochkant, quer, Desktop) prüfen.
- **Spielverlauf auch im Ramsch:** Nach einem Ramsch fehlt „So wurde gespielt“; den Verlauf
  (`GameHistory.tsx`) auch in `RamschResult.tsx` zeigen. Hängt mit U4 zusammen, das dieselben
  Dialoge anfasst – nach U4 umsetzen oder dort mitnehmen.

- **Modell:** Sonnet.
- **Abnahme:** Bot-Namen in Lobby, Tisch und Ergebnis; E2E prüft den Verlauf nach einem Ramsch;
  Bildschirmfotos der Marke „am Zug“ in drei Größen.

---

## B – Bots (`packages/bots`)

### B1 · Bot, der vernünftig spielt (erledigt)

Umgesetzt als `createHeuristicBot` in `packages/bots/src/heuristicBot.ts`; Quote und Regeltreue
in `packages/bots/test/heuristicBot.test.ts`. Bekannte Schwächen: kennt die Tischregeln nicht
(sagt in Stufe 1 evtl. für eine abgeschaltete Spielart „Ich würde“), merkt sich nach dem
Wiederherstellen eines Tisches nur die Stiche ab dann, zählt keine Augen mit.

Heuristik-Bot: sagt nach Blattstärke an (Trumpfzahl, Laufende, freie Farben), spielt sinnvoll
(Partner schmieren, Trumpf ziehen als Spieler, Rufsau suchen als Gegner).

- **Abnahme:** Gewinnt über 1000 Spiele (fester Seed-Satz) deutlich gegen `createRandomBot`;
  die Quote steht als Test mit Schwelle im Repo. Entscheidet in unter 50 ms.

### B2 · Spielstärken

Mehrere Stufen wählbar; optional Suchverfahren (Monte-Carlo über mögliche Kartenverteilungen).

### B3 · Bots für Sonderspiele und Hausregeln

Der Heuristik-Bot kennt die Tischregeln und die neuen Spielarten: sagt Eisenbahner,
Hawaii-Habicht und (arabische) Hochzeit bei passendem Blatt an, nimmt Hochzeiten sinnvoll an,
spielt Ramsch mit Blick auf Jungfrau und Durchmarsch, sagt Kontra bei starkem Blatt.

- **Modell:** Opus.
- **Abhängigkeit:** die jeweiligen K- und H-Pakete (dort spielt der Bot nur regelgerecht mit).
- **Abnahme:** Je Variante ein Test mit festem Seed-Satz gegen `createRandomBot` mit Schwelle, wie
  in B1; Bot sagt nie eine abgeschaltete Spielart an.

---

## I – Infrastruktur

### I1 · Veröffentlichung (erledigt)

GitHub Pages einschalten (Settings → Pages → Source: GitHub Actions), ersten Deploy prüfen,
Adresse ins README. Versionen der Actions im Workflow auf den aktuellen Stand heben.

- **Stand:** Pages läuft unter https://dorfbub.github.io/schafkopf/ und steht im README. Actions
  auf den aktuellen Hauptversionen (checkout 7, setup-node 7, upload-pages-artifact 5,
  upload-artifact 7, deploy-pages 5). Der Lauf mit den neuen Versionen wird erst nach dem Push
  geprüft.

### I2 · Ende-zu-Ende-Tests

Playwright: ein Tisch mit zwei Browser-Kontexten, ein ganzes Spiel. Für CI einen Transport ohne
öffentliche Relays verwenden (z. B. `BroadcastChannel`-Transport als weitere Implementierung von
`HostTransport`/`ClientTransport`).

### I3 · Lizenz

Lizenz für das Repo festlegen (Entscheidung von Lukas) und `LICENSE` ergänzen.
