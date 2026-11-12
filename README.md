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

| Bereich       | Stand                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Spielarten    | Sauspiel, Wenz, Geier, Farbwenz, Farb-Solo, Bettel; Tout und „Sie“ (einstellbar); Hausregeln Eisenbahner, Hawaii-Habicht (Lobby)   |
| Tischregeln   | In der Lobby einstellbar: erlaubte Spielarten, Tout, Tarif, Schwellen für Laufende, „Sie“, Davonlaufen                             |
| Abrechnung    | Grundtarif, Schneider, Schwarz, Laufende                                                                                           |
| Alle „weiter“ | Zusammenwerfen (weitere Varianten Ramsch, Stock, Muss sind als Tischregel geplant)                                                 |
| Netz          | WebRTC über Trystero; Platz wird nach Verbindungsabbruch wiedergefunden; Gastgeber-Tisch übersteht Neuladen (Zustand im Browser)   |
| Ausfall       | Getrennte Spieler werden nach 30 s durch einen Bot vertreten, bei Rückkehr übernommen; der Gastgeber kann Spieler vom Tisch nehmen |
| Lobby         | Platzwahl, Zuschauer, Umbenennen, Tischeinstellungen                                                                               |
| Bots          | Heuristik-Bot: sagt nach Blattstärke an, spielt Partner-/Gegner-Taktik; gegen den Zufalls-Bot getestet                             |
| App           | Installierbar (Manifest, Symbole), Offline-Start, Hinweis bei neuer Version                                                        |
| Tests         | Unit-Tests für Kern, Netz und Bots; Ende-zu-Ende-Tests mit Playwright (zwei Spieler, ein ganzes Spiel)                             |
| Oberfläche    | Funktional, Platzhalter-Gestaltung und Kartenbild (Gestaltung ist ein eigenes Paket)                                               |

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
