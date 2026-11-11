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
| 3     | Ausbau                    | K3, K4, K5, K6, U6, U7, B2         |

## Welches Modell für welches Paket

Grundsatz: **Opus ist der Standard.** Fable nur dort, wo eine Entscheidung das ganze Projekt
prägt und ein Fehler teuer wird. Sonnet für klar umrissene Pakete, bei denen der Weg feststeht.
Haiku für rein mechanische Handgriffe.

| Modell | Wofür                                                        | Pakete                                |
| ------ | ------------------------------------------------------------ | ------------------------------------- |
| Fable  | Eingriffe in die Architektur; Entwurf vor der Umsetzung      | K5 (nur Entwurf), K3 (nur Entwurf)    |
| Opus   | Knifflige Logik, Gestaltung, Netz, alles mit Urteilsvermögen | D1–D4, K1, K4, K6, N1, N2, N3, B1, B2 |
| Sonnet | Klar beschriebene Umsetzung nach vorhandenem Muster          | K2, K7, N4, U2, U4, U5, U6, U7, I2    |
| Haiku  | Mechanisches ohne Entscheidungen                             | I1, I3                                |

Hinweise dazu:

- **K3 und K5 in zwei Schritten:** Fable entwirft nur die Erweiterung der Schnittstellen
  (`ModeDefinition`, `RuleSet`, `TableState`) als kurze Notiz mit Typen; die Umsetzung macht Opus.
  So fällt der teure Teil klein aus.
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

### K3 · „Alle weiter“: Ramsch, Stock, Muss

`RuleSet.allPassed` um `'ramsch' | 'stock' | 'muss'` erweitern.

- **Ramsch:** jeder für sich, meiste Augen verliert; Durchmarsch und Jungfrau als Unteroptionen.
- **Stock:** Einzahlung in den Pott, Auszahlung an den nächsten Sauspiel-Gewinner (Tisch-Zustand).
- **Muss:** Besitzer des Eichel-Obers muss ein Sauspiel spielen (Sonderfälle: gesperrt).
- **Bereich:** `rules.ts`, `hand.ts` (`applyBid`), `scoring.ts`, `table.ts`, Lobby.
- **Abnahme:** Je Variante Tests für Ablauf und Abrechnung; Zahlungssumme bleibt 0 (Stock: inkl. Pott).

### K4 · Kontra, Re, Legen, Bockrunden

Optionale Tischregeln, standardmäßig aus.

- **Bereich:** `RuleSet`, neue Aktionen in `PlayerAction`, Multiplikator in `scoring.ts`.
- **Abnahme:** Tests für Zeitfenster (Kontra nur bis zur ersten/zweiten Karte) und Verdopplung.

### K5 · Hochzeit und weitere Spielarten

Hochzeit (ein Trumpf, Angebot an Mitspieler) braucht einen zusätzlichen Ablaufschritt vor dem
Spiel. Dafür `ModeDefinition` um einen optionalen Vorbereitungs-Hook erweitern, statt Sonderfälle
in `hand.ts` zu verteilen.

- **Abnahme:** Hochzeit vollständig spielbar; bestehende Spielarten unverändert.

### K6 · Kurzes Blatt und Dreier-Modus

`RuleSet.deck = 'kurz'` und `players = 3` durchgängig unterstützen (Kern ist parametrisiert, aber
ungetestet). Zu klären: welche Spielarten zu dritt, Sie mit kurzer Karte, Tischanordnung.

- **Bereich:** Kern-Tests, `scoring.ts` (Sie), `ui/Table.tsx` (Positionen), Lobby.
- **Abnahme:** Zufallsspiel-Test (wie in `hand.test.ts`) für kurz/4 und kurz/3.

### K7 · Spielprotokoll

Jedes Spiel als Seed + Aktionsliste festhalten; daraus Wiederholung und „letzte Spiele“-Liste.

- **Abnahme:** `replay(protokoll)` ergibt denselben Endzustand; Test dafür.

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
Abends, Endabrechnung „wer zahlt wem“.

- **Abhängigkeit:** K7 für den Verlauf.

### U5 · Installierbar (PWA) und Android

Web-App-Manifest, Icons, Service Worker für Offline-Start. Danach prüfen, ob eine Android-Hülle
(Capacitor oder Tauri) über die PWA hinaus nötig ist.

- **Abnahme:** Lighthouse „installierbar“; App startet ohne Netz bis zum Startbildschirm.

### U6 · Atmosphäre

Töne (Karte legen, Stich), kurze Sprüche/Emotes an den Tisch, Einstellungen dafür.

### U7 · Mehrsprachigkeit

`i18n/de.ts` zu austauschbaren Sprachdateien ausbauen (Hochdeutsch, Bairisch, Englisch).

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

---

## I – Infrastruktur

### I1 · Veröffentlichung

GitHub Pages einschalten (Settings → Pages → Source: GitHub Actions), ersten Deploy prüfen,
Adresse ins README. Versionen der Actions im Workflow auf den aktuellen Stand heben.

### I2 · Ende-zu-Ende-Tests

Playwright: ein Tisch mit zwei Browser-Kontexten, ein ganzes Spiel. Für CI einen Transport ohne
öffentliche Relays verwenden (z. B. `BroadcastChannel`-Transport als weitere Implementierung von
`HostTransport`/`ClientTransport`).

### I3 · Lizenz

Lizenz für das Repo festlegen (Entscheidung von Lukas) und `LICENSE` ergänzen.
