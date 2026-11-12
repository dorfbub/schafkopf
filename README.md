# Schafkopf

**Live: https://dorfbub.github.io/schafkopf/**

Online-Schafkopf für Freundesrunden – direkt von Browser zu Browser, ohne gemieteten Server.

- **Läuft im Browser** auf Linux, Windows, Mac und Android. Keine Anmeldung: Ein Spieler
  eröffnet einen Tisch und verschickt einen Link.
- **Peer-to-Peer** über WebRTC. Das Gerät des Gastgebers mischt, gibt und prüft die Regeln.
- **Bots** besetzen freie Plätze; ein getrennter Spieler wird nach 30 Sekunden vertreten.
- **Erweiterbar**: Spielarten, Tischregeln, Kartenbilder und Bots sind jeweils eigene, austauschbare
  Bausteine.

## Installieren

Die App lässt sich wie eine normale App zum Startbildschirm hinzufügen und startet dann auch ohne
Netz bis zum Startbildschirm. Im Browser öffnen, dann:

- **Android (Chrome):** Menü ⋮ → „Zum Startbildschirm hinzufügen“ bzw. „App installieren“.
- **Desktop (Chrome, Edge):** Installationssymbol in der Adressleiste.
- **iPhone (Safari):** Teilen → „Zum Home-Bildschirm“.

Nach einer Aktualisierung zeigt die App den Hinweis „Neue Version – neu laden“. Neu geladen wird nie
von allein, damit ein laufender Tisch nicht abbricht.

## Stand

Spielbar: Tisch eröffnen, Freunde per Link einladen, ansagen, Stiche spielen, abrechnen, nächstes
Spiel. Die Ausbaupakete stehen in [docs/ARBEITSPAKETE.md](docs/ARBEITSPAKETE.md).

| Bereich       | Stand                                                                                                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spielarten    | Sauspiel, Wenz, Geier, Farbwenz, Farb-Solo, Bettel, Hochzeit; Tout und „Sie“ (einstellbar); Hausregeln Eisenbahner, Hawaii-Habicht, Arabische Hochzeit (Lobby, Standard aus)                                                                    |
| Besetzung     | Zu viert mit langer oder kurzer Karte, zu dritt mit kurzer Karte (nur Einzelspiele); in der Lobby wählbar                                                                                                                                       |
| Tischregeln   | In der Lobby einstellbar: zu viert/zu dritt, lange/kurze Karte, Spielarten, Tout, Tarif, Laufende, „Sie“, Davonlaufen, alle „weiter“, Kontra und Re                                                                                             |
| Abrechnung    | Grundtarif, Schneider, Schwarz, Laufende, Kontra/Re; Aufschlüsselung, Tabelle des Abends, „wer zahlt wem“                                                                                                                                       |
| Alle „weiter“ | Tischregel: Zusammenwerfen, Ramsch, Stock oder Muss                                                                                                                                                                                             |
| Netz          | WebRTC über Trystero; Tischcode mit 10 Zeichen; Platz wird nach Verbindungsabbruch wiedergefunden; Gastgeber-Tisch übersteht Neuladen (Zustand im Browser)                                                                                      |
| Ausfall       | Getrennte Spieler werden nach 30 s durch einen Bot vertreten, bei Rückkehr übernommen; der Gastgeber kann Spieler vom Tisch nehmen                                                                                                              |
| Lobby         | Platzwahl, Zuschauer, Umbenennen, Tischeinstellungen                                                                                                                                                                                            |
| Bots          | Drei Spielstärken (Lobby): Anfänger, Normal (Heuristik), Stark (Monte-Carlo-Suche über Kartenverteilungen). Die Bots kennen die Tischregeln, sagen auch Hausregeln und Hochzeiten an, spielen Ramsch und Kontra; Stärke und Regeltreue getestet |
| Trainer       | Allein gegen Bots schaut Max Weber über die Schulter (abschaltbar): Auswahlfragen zur Lage, Antwort in drei Stufen (Denkanstoß, Empfehlung, Begründung mit Faustregel), meldet sich in wichtigen Momenten von selbst, Rückblick nach dem Spiel  |
| App           | Installierbar (Manifest, Symbole), Offline-Start, Hinweis bei neuer Version                                                                                                                                                                     |
| Tests         | Unit-Tests für Kern, Netz, Bots und Trainer; Ende-zu-Ende-Tests mit Playwright                                                                                                                                                                  |
| Oberfläche    | Gestaltung „Kartentisch“ (grüner Filz, Holzrahmen), eigenes bayerisches Kartenbild, Spielschild, letzter Stich, Spielverlauf                                                                                                                    |

Die genauen Regeln und alle getroffenen Annahmen stehen in [docs/REGELN.md](docs/REGELN.md).

## Entwickeln

Voraussetzung: Node.js ab Version 22.

```bash
npm install
npm run dev      # Entwicklungsserver auf http://localhost:5180
npm run check    # Typprüfung, Lint und Tests
npm run build    # Produktions-Build nach apps/web/dist
npm run e2e      # Ende-zu-Ende-Tests mit Playwright (vorher einmalig: npx playwright install chromium)
```

Zum Ausprobieren zu zweit auf einem Rechner: zwei Browser-Tabs öffnen, im ersten „Mit Freunden
spielen“ wählen und den Einladungslink im zweiten Tab öffnen. Für schnelle Proben ohne Relays
reicht „Allein gegen Bots“.

## Aufbau

```
packages/core   Spielregeln als reine Funktionen (kein Netz, kein DOM, kein Zufall)
packages/net    Host, Mitspieler, Protokoll und Transporte (Loopback, WebRTC)
packages/bots   Computer-Gegner
packages/tutor  Trainer-Kern: Rat, Bewertung, Faustregeln (Oberfläche: Max Weber in apps/web)
apps/web        Oberfläche (React + Vite), PWA
e2e             Ende-zu-Ende-Tests (Playwright)
docs            Architektur, Regeln, Arbeitspakete
```

Mehr dazu in [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).

## Veröffentlichen

Der Workflow in `.github/workflows/ci.yml` prüft jeden Push (Typen, Lint, Tests, Build sowie die
Ende-zu-Ende-Tests) und veröffentlicht `main` auf GitHub Pages unter
https://dorfbub.github.io/schafkopf/. Dafür einmalig im Repo unter **Settings → Pages → Source**
„GitHub Actions“ auswählen.

## Lizenz

MIT, siehe [LICENSE](LICENSE). Forken, selbst betreiben und verändern ist ausdrücklich erlaubt.
Die selbst gezeichneten Karten stehen ebenfalls unter MIT; Schriften (SIL OFL) und eingebundene
fremde Bilder behalten ihre eigene Lizenz, siehe
[apps/web/src/assets/LIZENZEN.md](apps/web/src/assets/LIZENZEN.md).
