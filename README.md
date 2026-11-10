# Schafkopf

Online-Schafkopf für Freundesrunden – direkt von Browser zu Browser, ohne gemieteten Server.

- **Läuft im Browser** auf Linux, Windows, Mac und Android. Keine Installation: Ein Spieler
  eröffnet einen Tisch und verschickt einen Link.
- **Peer-to-Peer** über WebRTC. Das Gerät des Gastgebers mischt, gibt und prüft die Regeln.
- **Bots** besetzen freie Plätze.
- **Erweiterbar**: Spielarten, Tischregeln, Kartenbilder und Bots sind jeweils eigene, austauschbare
  Bausteine.

## Stand

Das Grundgerüst steht und ist spielbar: Tisch eröffnen, Freunde per Link einladen, ansagen, Stiche
spielen, abrechnen, nächstes Spiel. Oberfläche und Bots sind bewusst einfach gehalten – der Ausbau
ist in [docs/ARBEITSPAKETE.md](docs/ARBEITSPAKETE.md) in einzelne Pakete zerlegt.

| Bereich       | Stand                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| Spielarten    | Sauspiel, Wenz, Geier, Farbwenz, Farb-Solo, Bettel; Tout und Sie       |
| Abrechnung    | Grundtarif, Schneider, Schwarz, Laufende                               |
| Alle „weiter“ | Zusammenwerfen (weitere Varianten als Tischregel vorgesehen)           |
| Netz          | WebRTC über Trystero, Wiederfinden des Platzes nach Verbindungsabbruch |
| Bots          | Spielen regelkonform, aber zufällig                                    |
| Oberfläche    | Funktional, Platzhalter-Kartenbild                                     |

Die genauen Regeln und alle getroffenen Annahmen stehen in [docs/REGELN.md](docs/REGELN.md).

## Entwickeln

Voraussetzung: Node.js ab Version 22.

```bash
npm install
npm run dev      # Entwicklungsserver auf http://localhost:5180
npm run check    # Typprüfung, Lint und Tests
npm run build    # Produktions-Build nach apps/web/dist
```

Zum Ausprobieren zu zweit auf einem Rechner: zwei Browser-Tabs öffnen, im ersten „Mit Freunden
spielen“ wählen und den Einladungslink im zweiten Tab öffnen.

## Aufbau

```
packages/core   Spielregeln als reine Funktionen (kein Netz, kein DOM, kein Zufall)
packages/net    Host, Mitspieler, Protokoll und Transporte (Loopback, WebRTC)
packages/bots   Computer-Gegner
apps/web        Oberfläche (React + Vite)
docs            Architektur, Regeln, Arbeitspakete
```

Mehr dazu in [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).

## Veröffentlichen

Der Workflow in `.github/workflows/ci.yml` prüft jeden Push und veröffentlicht `main` auf GitHub
Pages. Dafür einmalig im Repo unter **Settings → Pages → Source** „GitHub Actions“ auswählen.
