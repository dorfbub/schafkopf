# Architektur

## Leitgedanken

1. **Kein Server.** Der Browser des Gastgebers ist der Spielleiter. Alle anderen verbinden sich
   direkt mit ihm (WebRTC). Ausgeliefert wird die App als statische Seite (GitHub Pages).
2. **Regeln als reine Funktionen.** Der Kern kennt weder Netz noch Oberfläche, noch Zeit oder
   Zufall. Ein Spiel ist vollständig durch Regeln + Seed + Folge der Aktionen bestimmt. Das macht
   ihn testbar und für Bots, Wiederholungen und spätere Plattformen (Android) wiederverwendbar.
3. **Niemand bekommt fremde Karten.** Der Host verschickt nie den Zustand, sondern pro Spieler
   eine _Sicht_ (`TableView`). Oberfläche und Bots arbeiten ausschließlich auf Sichten.
4. **Erweitern durch Hinzufügen.** Neue Spielart, Tischregel, Kartenbild, Bot oder Transport ist
   jeweils ein neuer Eintrag hinter einer bestehenden Schnittstelle – nicht ein Umbau.

## Pakete

```
apps/web ──► packages/net ──► packages/core
    │                              ▲
    └──────► packages/bots ────────┘
```

Abhängigkeiten zeigen nur in Pfeilrichtung. `core` hängt von nichts ab.

### packages/core – Spielregeln

| Datei        | Inhalt                                                                       |
| ------------ | ---------------------------------------------------------------------------- |
| `cards.ts`   | Karten als Strings (`"EA"`, `"HO"`), Augen, Blatt (lang/kurz)                |
| `rng.ts`     | Seed-basierter Zufall und Mischen                                            |
| `trick.ts`   | Bedienpflicht und Stichgewinner – allgemein, über eine `CardOrder`           |
| `modes.ts`   | Spielarten als deklarative `ModeDefinition` (Trümpfe, Rang, Sonderregeln)    |
| `rules.ts`   | `RuleSet`: alles, was am Tisch einstellbar ist (Blatt, Spielarten, Tarif, …) |
| `hand.ts`    | Ein Spiel: `dealHand`, `applyAction`, `legalCards`, `legalContracts`         |
| `scoring.ts` | Abrechnung: Schneider, Schwarz, Laufende, Tout, Sie, Zahlungen               |
| `table.ts`   | Der Tisch: Plätze, Kontostände, Geberwechsel                                 |
| `view.ts`    | Sichten je Spieler (`HandView`, `TableView`)                                 |
| `bot.ts`     | Schnittstelle `Bot`                                                          |

Zentrale Signatur:

```ts
applyAction(state: HandState, action: Action): { ok: true; state } | { ok: false; error }
```

Der Zustand wird nie verändert, immer kopiert. Ungültige Aktionen liefern einen Fehlercode und
lassen den Zustand unberührt.

Eine ESLint-Regel verbietet im Kern `window`, `document`, `setTimeout`, `Math.random`, `Date.now`.

### packages/net – Host, Mitspieler, Transport

- `protocol.ts` – Nachrichten (`hello`, `action` → `welcome`, `state`, `error`) und die beiden
  Transport-Schnittstellen `HostTransport` und `ClientTransport`.
- `host.ts` – `HostSession`: hält den `TableState`, vergibt Plätze, prüft Aktionen mit dem Kern,
  verteilt Sichten, lässt Bots ziehen. Mehrere Transporte gleichzeitig möglich.
- `client.ts` – `ClientSession`: meldet sich an, schickt Aktionen, hält die letzte Sicht.
  `subscribe`/`getSnapshot` passen auf Reacts `useSyncExternalStore`.
- `loopback.ts` – Transport im selben Prozess. Der Gastgeber spielt selbst über Loopback mit –
  dadurch gibt es in der Oberfläche keinen Sonderweg für den Host. Tests brauchen kein WebRTC.
- `trysteroTransport.ts` – WebRTC über [Trystero](https://github.com/dmotz/trystero). Separat
  exportiert als `@schafkopf/net/trystero`.

```
Gastgeber-Browser                                   Gast-Browser
┌──────────────────────────────────────┐            ┌────────────────────────┐
│ Oberfläche ─ ClientSession           │            │ Oberfläche             │
│                  │ Loopback          │            │     │                  │
│              HostSession ── Bots     │◄─ WebRTC ─►│ ClientSession          │
│                  │                   │            └────────────────────────┘
│            core (TableState)         │
└──────────────────────────────────────┘
```

**Verbindungsaufbau.** WebRTC braucht eine Vermittlung, damit sich zwei Browser finden. Trystero
nutzt dafür öffentliche Nostr-Relays; darüber laufen nur verschlüsselte Verbindungsdaten, keine
Spieldaten. Der Tisch-Code im Einladungslink ist der Raumname.

**Vertrauensmodell.** Der Host kennt alle Karten und könnte schummeln. Für Freundesrunden ist das
bewusst akzeptiert. Gäste können nicht schummeln: Der Host prüft jede Aktion.

**Wiederverbinden.** Jeder Browser-Tab hat eine `clientId` (sessionStorage). Meldet sich dieselbe
`clientId` erneut, bekommt sie ihren Platz zurück.

### packages/bots

Ein Bot implementiert `decide(view: HandView): PlayerAction`. Er sieht exakt das, was ein Mensch
sieht. `createRandomBot` ist der Platzhalter.

### apps/web

React + Vite, keine weitere Zustandsbibliothek.

- `connection.ts` – Tisch eröffnen/beitreten, Einladungslink, gemerkter Name.
- `ui/StartScreen`, `ui/Lobby`, `ui/Table` – die drei Ansichten.
- `ui/cardTheme.tsx` – `CardTheme`: Schnittstelle für Kartenbilder; einziges Bild ist `bayerischTheme`.
- `ui/kit/` – Grundbausteine (Schaltfläche, Eingabefeld, Tafel, Dialog, Spielerplatz, Karte);
  Stile und Variablen in `styles/`, Musterseite unter `#muster` (nur Entwicklungsserver).
- `i18n/de.ts` – alle Texte.

## So wird erweitert

| Vorhaben                       | Wo                                                                        |
| ------------------------------ | ------------------------------------------------------------------------- |
| Neue Spielart (z. B. Hochzeit) | `ContractKind` + Eintrag in `MODES`, ggf. Hook in `ModeDefinition`        |
| Neue Tischregel (z. B. Ramsch) | Feld in `RuleSet`, Auswertung in `hand.ts`/`scoring.ts`, Auswahl in Lobby |
| Kurzes Blatt / 3 Spieler       | `RuleSet.deck` / `RuleSet.players` (im Kern schon parametrisiert)         |
| Anderes Kartenset              | Weiteres `CardTheme`                                                      |
| Stärkerer Bot                  | Weitere `Bot`-Implementierung in `packages/bots`                          |
| Anderer Verbindungsweg         | Weitere Implementierung von `HostTransport`/`ClientTransport`             |
| Android                        | PWA, später ggf. Hülle (Capacitor/Tauri) um `apps/web`                    |

## Bekannte Grenzen des Grundgerüsts

- Lädt der Gastgeber die Seite neu, ist der Tisch weg (Zustand nur im Speicher).
- Hinter sehr strengen Routern kommt ohne TURN-Server keine Verbindung zustande
  (`TrysteroOptions.turnConfig` ist vorbereitet).
- Der Verbindungsaufbau über die öffentlichen Relays kann einige Sekunden bis über eine Minute
  dauern.
- Fällt ein Mitspieler aus, wartet der Tisch auf ihn.
