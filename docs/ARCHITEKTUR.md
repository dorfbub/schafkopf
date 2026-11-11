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
- `snapshot.ts` – Speicherstand des Hosts (`HostSnapshot`) und dessen Prüfung
  (`parseHostSnapshot`); siehe „Neuladen des Gastgebers“.
- `client.ts` – `ClientSession`: meldet sich an, schickt Aktionen, hält die letzte Sicht.
  `subscribe`/`getSnapshot` passen auf Reacts `useSyncExternalStore`.
- `loopback.ts` – Transport im selben Prozess. Der Gastgeber spielt selbst über Loopback mit –
  dadurch gibt es in der Oberfläche keinen Sonderweg für den Host. Tests brauchen kein WebRTC.
- `signaling.ts` – Vermittlungswege und geprüfte Relay-Listen, Lesen von Relay-/TURN-Einstellungen,
  `DiscoveryGate` (lässt die Vermittlung ruhen, wenn niemand mehr dazukommen muss). Ohne Netz
  testbar.
- `trysteroTransport.ts` – WebRTC über [Trystero](https://github.com/dmotz/trystero). Separat
  exportiert als `@schafkopf/net/trystero`; der gewählte Weg wird erst beim Verbinden nachgeladen.

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
nutzt dafür öffentliche Relays; darüber laufen nur verschlüsselte Verbindungsdaten, keine
Spieldaten. Der Tisch-Code im Einladungslink ist der Raumname.

- **Weg:** Standard ist Nostr mit einer eigenen, geprüften Relay-Liste (`DEFAULT_RELAYS` in
  `signaling.ts`). Trysteros Standardliste enthielt tote und drosselnde Relays. Alternativen:
  BitTorrent-Tracker (`torrent`) und MQTT-Broker (`mqtt`). Messwerte: Abschnitt „Messungen“ unten.
- **Wenig Nachrichten:** Öffentliche Relays drosseln schon bei rund zehn Nachrichten in wenigen
  Sekunden („rate-limited: slow down“). Deshalb schickt Nostr ICE-Kandidaten gebündelt mit dem SDP
  (`trickleIce: false`, eine Nachricht statt fünf je Signal), und die Vermittlung ruht, sobald sie
  nicht gebraucht wird: beim Host, wenn alle Plätze verbunden sind (vor dem Spiel: kein Platz frei;
  im Spiel: kein Mensch getrennt – `HostSession.isDiscoverable`), beim Gast, sobald der Host ihn
  begrüßt hat. Dann werden die Relay-Verbindungen geschlossen (`pauseRelayReconnection`); fällt
  jemand aus, nimmt der Host sie sofort wieder auf. MQTT kennt kein Pausieren.
- **Status beim Gast:** „Suche Tisch“ → „verbunden“; ohne Begrüßung nach 45 s „Tisch nicht
  gefunden“ mit „Erneut versuchen“ (`ClientSession.retry`). Gleiches nach einem Verbindungsverlust.
- **Einstellungen beim Bauen** (Vite-Umgebungsvariablen, z. B. in `apps/web/.env.local`, die nicht
  eingecheckt wird, oder als Secret im Build):

  | Variable              | Bedeutung                                              |
  | --------------------- | ------------------------------------------------------ |
  | `VITE_SIGNALING`      | `nostr` (Standard), `torrent` oder `mqtt`              |
  | `VITE_SIGNALING_URLS` | eigene Relay-Liste, durch Komma getrennt, nur `wss://` |
  | `VITE_TURN_CONFIG`    | TURN-Server als JSON (siehe unten)                     |

  Host und Gäste müssen denselben Weg und dieselben Relays nutzen – also dieselbe Ausgabe der Seite.
  Im Entwicklungsserver schaltet `?weg=torrent` den Weg um (der Einladungslink nimmt ihn mit).

- **TURN-Fallback:** Hinter sehr strengen Routern (symmetrisches NAT, Firmen-/Hotelnetze) kommt
  keine direkte Verbindung zustande; dann leitet ein TURN-Server die (verschlüsselten) Daten weiter.
  Es gibt bewusst keinen Standard-TURN-Server – das wäre ein gemieteter Dienst. Wer einen hat
  (eigener coturn, Cloudflare, Metered …), setzt beim Bauen:

  ```
  VITE_TURN_CONFIG='[{"urls":"turn:turn.example.org:3478","username":"…","credential":"…"}]'
  ```

  Achtung: Alles mit `VITE_` landet im ausgelieferten JavaScript und ist für jeden lesbar. Nur
  Zugangsdaten verwenden, die dafür gedacht sind (zeitlich begrenzt oder auf die Seite beschränkt),
  und nie ins Repo einchecken.

- **Messen:** `apps/web/src/dev/messung.ts` (nur im Entwicklungsserver) spielt Verbindungsversuche
  zwischen zwei Tabs automatisch durch; Anleitung im Dateikopf.

**Lobby-Funktionen (N4).** Vor dem ersten Spiel (`table.hand === null`) regeln Gäste und Gastgeber
die Plätze; im laufenden Spiel ist alles davon gesperrt (`wrong_phase`).

- **Gäste-Befehle** sind `ClientMessage`s, die der Host prüft: `seat` (freien Platz wählen oder
  wechseln; `null` = nur zuschauen; besetzt → `seat_taken`, ungültig → `bad_message`) und `rename`
  (Name 1–24 Zeichen). Ein Platz wird nie einem anderen Menschen weggenommen oder getauscht.
- **Admin-Befehle des Gastgebers** laufen direkt über `HostSession`, nicht übers Protokoll:
  `moveSeat(von, nach)` (tauscht, wenn `nach` besetzt ist), `unseat(platz)` und
  `setSpectatorsWelcome(bool)` sowie `setRules(optionen)` (Tischregeln, nur vor Spielbeginn,
  geprüft mit `parseRuleOptions`; Gäste sehen sie in `TableView.rules`). Sie geben `false` zurück, wenn der Befehl nicht möglich ist.
- **Zuschauer:** Wer keinen Platz hat oder nur zuschauen will (`seat` mit `null`, oder der Gastgeber
  nimmt ihn vom Platz), bekommt eine Sicht ohne Hand (`TableView.you === null`) und merkt sich beim
  Host als „will zuschauen“: Beim Wiederverbinden wird ihm kein freier Platz zugeteilt. Die Namen
  der verbundenen Zuschauer und die Einstellung „Zuschauer zulassen“ kommen in jeder `state`-
  Nachricht als `lobby: LobbyInfo` mit; `ClientSession.getSnapshot().lobby` hält sie.
- **Zuschauer-Beitritt und Vermittlung:** Die Vermittlung ruht, sobald alle Plätze verbunden sind
  (N1). Dann kann niemand mehr neu dazukommen. Lässt der Gastgeber „Zuschauer zulassen“
  (`setSpectatorsWelcome(true)`, Standard aus) an, bleibt `isDiscoverable()` immer `true` – auch bei
  voller Besetzung und im laufenden Spiel. Das kostet Relay-Nachrichten, deshalb nur auf Wunsch.
  Die Einstellung steht im Speicherstand (`spectatorsWelcome`, ebenso `watching`).
- **Name:** Wer einen Platz hat, behält dort seinen Namen, auch wenn der Gast sich mit dem alten
  Namen neu verbindet; das `hello` bestimmt den Namen nur für neue Plätze und Zuschauer.
- **Oberfläche:** `ui/Lobby` hat einen eigenen Bereich „Einstellungen“ (`#tisch-einstellungen`, nur
  Gastgeber); dort kommen mit K2 die Tischregeln dazu.

**Vertrauensmodell.** Der Host kennt alle Karten und könnte schummeln. Für Freundesrunden ist das
bewusst akzeptiert. Gäste können nicht schummeln: Der Host prüft jede Aktion.

**Wiederverbinden.** Jeder Browser-Tab hat eine `clientId` (sessionStorage). Meldet sich dieselbe
`clientId` erneut, bekommt sie ihren Platz zurück.

**Neuladen des Gastgebers (N2).** Der Tisch lebt im Speicher des Gastgeber-Tabs. Damit ein
Neuladen ihn nicht beendet, schreibt `apps/web/src/connection.ts` nach jeder Änderung
`HostSession.exportSnapshot()` in den localStorage (`schafkopf.host`): `TableState`,
Platz-Zuordnung `clientId` → Sitz, Bot-Plätze und Raum-Code, dazu Gastgeber-`clientId`, Name und
Zeitpunkt. `HostSession.restore` baut daraus den Host wieder auf; Bots werden neu erzeugt, alle
Menschen gelten als getrennt, bis sie sich mit ihrer `clientId` melden. Weil damit ein Mensch fehlt,
nimmt der Host die Vermittlung sofort wieder auf (`isDiscoverable`), und die Gäste – deren Transport
nach dem Verlust des Hosts ohnehin weitersucht – finden ihn unter demselben Raum-Code.

- **Fortsetzen:** Lädt derselbe Tab neu (gleiche `clientId` im sessionStorage), geht es ohne
  Rückfrage weiter – die Gäste warten, und wer mitten im Spiel neu lädt, will weiterspielen. In
  einem anderen Tab oder nach einem Neustart des Browsers bietet die Startseite „Tisch fortsetzen“
  an, denn dort kann der Tisch längst vergessen sein; der neue Tab übernimmt dann die `clientId`
  des Gastgebers und damit seinen Platz.
- **Nur ein Host je Tisch:** Der hostende Tab hält ein Web Lock (`schafkopf.host`). Ist es belegt
  (der hostende Tab ist noch offen, etwa nach dem Duplizieren eines Tabs), wird nichts fortgesetzt
  oder angeboten. Eröffnet ein anderer Tab einen neuen Tisch, gewinnt dessen Stand; der ältere Tab
  hört auf zu speichern.
- **Verwerfen:** Stände mit anderer Version, älter als 12 Stunden oder mit unstimmigem Inhalt
  (`parseHostSnapshot` prüft Aufbau, Wertebereiche, Kontosumme 0, Platz-Zuordnung, Felder von
  `RuleSet` und `HandState`, und baut probehalber jede Sicht) werden gelöscht. „Tisch verlassen“
  löscht den Stand ebenfalls. Bei Änderungen an `TableState`, `HandState` oder `RuleSet`
  `HOST_SNAPSHOT_VERSION` in `snapshot.ts` erhöhen.
- **Datenschutz:** Der Stand enthält alle Karten. Er bleibt im localStorage des Gastgebers und wird
  weder verschickt noch in eine URL geschrieben.

### packages/bots

Ein Bot implementiert `decide(view: HandView): PlayerAction`. Er sieht exakt das, was ein Mensch
sieht. `createRandomBot` ist der Platzhalter.

### apps/web

React + Vite, keine weitere Zustandsbibliothek.

- `connection.ts` – Tisch eröffnen/beitreten/fortsetzen, Speicherstand des Gastgebers,
  Einladungslink, gemerkter Name.
- `ui/StartScreen`, `ui/Lobby`, `ui/Table` – die drei Ansichten.
- `ui/cardTheme.tsx` – `CardTheme`: Schnittstelle für Kartenbilder; einziges Bild ist `bayerischTheme`.
- `ui/kit/` – Grundbausteine (Schaltfläche, Eingabefeld, Tafel, Dialog, Spielerplatz, Karte);
  Stile und Variablen in `styles/`, Musterseite unter `#muster` (nur Entwicklungsserver).
- `i18n/de.ts` – alle Texte.

## Installierbar und Updates (U5)

- **Bau:** `apps/web/pwa-plugin.ts` schreibt `sw.js` (Dateiliste des Builds, relative Pfade) und
  `version.json`; jeder Build hat eine Kennung (`__BUILD_ID__`, überschreibbar mit `BUILD_ID=…`).
  Manifest und Symbole liegen in `apps/web/public/`.
- **Cache:** Pro Version ein eigener Cache; eine offene Seite behält ihre alten Dateien, bis sie
  neu lädt. Ein neuer Service Worker wartet, bis die Seite „Neu laden“ bestätigt.
- **Hinweis:** `src/updates.ts` meldet eine neue Version (wartender Worker, abweichende
  `version.json`, fehlendes Kartenbild); `App.tsx` zeigt sie als `Notice` oben. Geladen wird nie
  von allein neu. Im Entwicklungsserver ist das alles aus.

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

- Lädt der Gastgeber neu, geht der Tisch weiter – aber nur im selben Browser. Wechselt der
  Gastgeber das Gerät oder löscht er die Website-Daten, ist der Tisch weg; ein privates Fenster ohne
  localStorage übersteht kein Neuladen. Nach 12 Stunden gilt ein gespeicherter Tisch als vergessen.
- Gäste, die nach dem Neuladen des Gastgebers nicht zurückkommen, halten ihren Platz besetzt – auch
  in der Lobby (der Tisch wartet auf sie, siehe nächster Punkt).
- Hinter sehr strengen Routern kommt ohne TURN-Server keine Verbindung zustande
  (`VITE_TURN_CONFIG`, siehe „Verbindungsaufbau“).
- Die Vermittlung hängt an öffentlichen Relays, die kommen und gehen. Die Liste in `signaling.ts`
  gelegentlich prüfen (Messwerkzeug) und notfalls per `VITE_SIGNALING_URLS` übersteuern.
- Ruht die Vermittlung, kann niemand neu dazukommen (z. B. als Zuschauer) – erst wenn ein Platz frei
  wird oder jemand die Verbindung verliert, oder der Gastgeber „Zuschauer zulassen“ einschaltet.
- Fällt ein Mitspieler aus, wartet der Tisch auf ihn.

## Messungen zum Verbindungsaufbau (N1, November 2026)

Zwei Tabs im selben Browser auf einem Rechner (Arch Linux, Chrome im Claude-Desktop), Messwerkzeug
`apps/web/src/dev/messung.ts`, Host jeweils 5 s „warm“. Gemessen: Klick auf Beitreten bis zur
Begrüßung durch den Host. Beide Tabs liefen als Hintergrundseiten (Zeitgeber gedrosselt); über zwei
verschiedene Netze ist der Aufbau langsamer (STUN, ggf. TURN) – diese Probe steht noch aus.

| Weg                            | Versuche | verbunden | Median | Maximum |
| ------------------------------ | -------- | --------- | ------ | ------- |
| Nostr, eigene Relay-Liste      | 10       | 10        | 360 ms | 1109 ms |
| BitTorrent-Tracker (2 Tracker) | 10       | 10        | 298 ms | 1042 ms |
| MQTT (2 Broker)                | 10       | 10        | 323 ms | 979 ms  |

Alle drei sind gleich zuverlässig und gleich schnell (Unterschiede im Rauschen). Standard bleibt
Nostr: viele unabhängige Relays (Ausfälle einzelner verkraftbar), pausierbar; bei BitTorrent gibt
es nur zwei brauchbare öffentliche Tracker, MQTT lässt sich nicht pausieren und lädt ~330 kB mehr.

Nachrichten des Hosts an die Relays (Host + ein Gast, Spiel nach ~15–20 s gestartet):

|                             | vorher (Trystero-Standard)                                                      | nachher                                          |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------ |
| Relays                      | 5 aus der App-ID abgeleitet, davon 2 tot                                        | 4 geprüfte                                       |
| Aufbau, 1. Minute, je Relay | 1 REQ + 11 EVENT                                                                | 1 REQ + 5–7 EVENT                                |
| danach, je Relay und Minute | ≈ 1 EVENT, dazu endlose Wiederverbindungsversuche zu den toten Relays (≈ 3/min) | 0 – Verbindungen geschlossen 5 s nach Spielstart |
| Drosselungsmeldungen        | nach 9 s von `relay.layer.systems` und `nostr.stakey.net`                       | keine                                            |

Ursache der Drosselung: Trickle-ICE schickt Angebot und Kandidaten als fünf Nachrichten in derselben
Millisekunde, dazu kündigt Trystero sich in den ersten 7 s fünfmal an. Diese Relays begrenzen vermutlich pro
IP-Adresse – Host und Gäste im selben WLAN zählen zusammen. Bei vier Spielern verbindet Trystero
außerdem alle Gäste untereinander (Vollvermaschung), was die Zahl der Signale verdoppelt.
