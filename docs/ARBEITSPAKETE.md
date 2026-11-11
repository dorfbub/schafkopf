# Arbeitspakete

Jedes Paket ist so geschnitten, dass ein Agent es eigenständig erledigen kann: klarer Bereich,
klare Abnahme. Vor dem Start [ARCHITEKTUR.md](ARCHITEKTUR.md) und [REGELN.md](REGELN.md) lesen;
die Arbeitsweise steht in [`CLAUDE.md`](../CLAUDE.md).

**Für alle Pakete gilt als Abnahme zusätzlich:** `npm run check` und `npm run build` laufen sauber
durch, neue Logik hat Tests, betroffene Doku ist angepasst.

Pakete mit gleichem Buchstaben berühren meist dieselben Dateien und sollten nacheinander laufen.
Pakete verschiedener Buchstaben können parallel laufen, sofern keine Abhängigkeit genannt ist.

## Reihenfolge

| Stufe | Ziel                      | Pakete                     |
| ----- | ------------------------- | -------------------------- |
| 1     | Mit Freunden gut spielbar | K1, N1, N2, U1, U2, B1, I1 |
| 2     | Komfort und Tischregeln   | K2, N3, N4, U3, U4, U5, I2 |
| 3     | Ausbau                    | K3, K4, K5, K6, U6, U7, B2 |

---

## K – Kern (`packages/core`)

### K1 · Zweistufige Ansage

Die Ansage läuft derzeit in einer Runde. Umsetzen wie am Tisch üblich: erst reihum „Ich würde“ /
„weiter“, danach nennen die Interessenten ihr Spiel; bei gleichem Rang hat der Frühere Vorrang.

- **Bereich:** `hand.ts` (Phase `bidding`, `Bid`, `legalContracts`), `view.ts`, Ansage-Dialog in
  `apps/web/src/ui/Table.tsx`, `packages/bots`.
- **Abnahme:** Tests für: Früherer behält bei Gleichstand; Überbieten; alle weiter. REGELN.md,
  Abschnitt „Ansage“ und Annahme 1 aktualisiert.

### K2 · Regeln am Tisch einstellbar

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

- Signalisierungs-Strategien von Trystero vergleichen (Nostr, BitTorrent, MQTT), ggf. eigene
  Relay-Liste; die schnellste und zuverlässigste wählen.
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

### N3 · Ausgefallene Mitspieler

Getrennte Spieler nach Wartezeit durch einen Bot vertreten lassen, bei Rückkehr wieder übernehmen.
Gastgeber kann Spieler vom Tisch nehmen.

- **Abnahme:** Tests mit Loopback: Trennen → Bot zieht → Wiederverbinden → Mensch zieht.

### N4 · Lobby-Funktionen

Platzwahl, Zuschauer, Tisch-Einstellungen (Regeln), Umbenennen. Admin-Befehle des Gastgebers
laufen direkt über `HostSession`, nicht über das Protokoll.

- **Abnahme:** Tests für Platzwechsel und Zuschauer; Protokolländerungen erhöhen
  `PROTOCOL_VERSION`.

---

## U – Oberfläche (`apps/web`)

### U1 · Spieltisch gestalten

Das jetzige Layout ist ein funktionaler Platzhalter. Ziel: ein Tisch, der auf Handy (hochkant und
quer) und Desktop gut aussieht. Karten fächern, Stich mittig, wer ist dran, wer hat was angesagt,
Stich bleibt kurz liegen und wandert zum Gewinner, letzter Stich einsehbar.

- **Abnahme:** Screenshots für 360×740, 740×360 und 1440×900; bedienbar per Tastatur;
  `prefers-reduced-motion` beachtet.

### U2 · Bayerisches Kartenbild

Gezeichnete Karten als weiteres `CardTheme`. **Lizenz zuerst klären** – nur gemeinfreie oder
passend lizenzierte Vorlagen (z. B. von Wikimedia Commons) oder selbst gezeichnete SVGs; Quelle und
Lizenz in `apps/web/src/assets/LIZENZEN.md` festhalten. Theme-Auswahl in den Einstellungen.

- **Abnahme:** Alle 32 Karten vorhanden und bei 44 px Breite noch unterscheidbar.

### U3 · Ansage-Dialog

Kompakter Dialog, der den Tisch nicht verdeckt: erst Spielart, dann Farbe, Tout als Schalter;
bisherige Ansagen der anderen sichtbar. Nach K1 an die zweistufige Ansage anpassen.

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

### B1 · Bot, der vernünftig spielt

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
