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

| Datei          | Inhalt                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `cards.ts`     | Karten als Strings (`"EA"`, `"HO"`), Augen, Blatt (lang/kurz)                                                                 |
| `log.ts`       | Spielprotokoll `HandLog` (mit `carry`), `replay`, `HandSummary`                                                               |
| `rng.ts`       | Seed-basierter Zufall und Mischen                                                                                             |
| `trick.ts`     | Bedienpflicht und Stichgewinner – allgemein, über eine `CardOrder`                                                            |
| `modes.ts`     | Spielarten als `ModeDefinition` (Parteien, Tarifklasse, Trümpfe je Stich, Hooks); `BID_ORDER` als einzige Quelle für den Rang |
| `rules.ts`     | `RuleSet`: alles, was am Tisch einstellbar ist (Blatt, Spielarten, Tarif, „alle weiter“, …)                                   |
| `hand.ts`      | Ein Spiel: `dealHand` (mit `HandCarry`), `applyAction`, `legalCards`, `legalContracts`                                        |
| `allPassed.ts` | Registry `ALL_PASSED`: was bei „alle weiter“ geschieht, je `RuleSet.allPassed`                                                |
| `prelude.ts`   | Vorspiel-Hook: `PreludeDefinition`, `PreludeState`, `weddingPrelude(n)` für die Hochzeit                                      |
| `ramsch.ts`    | `ramschOutcome`: Stufe 1 der Abrechnung im Ramsch (Verlierer nach Augen, Gleichstand, Durchmarsch, Jungfrauen)                |
| `scoring.ts`   | Abrechnung in drei Stufen: `Outcome` (Spielart), `Factor`s, Zahlungen und Pott (`HandResult`)                                 |
| `table.ts`     | Der Tisch: Plätze, Kontostände, Pott, Geberwechsel; `settle` als einzige Stelle, an der ein Ergebnis auf den Tisch wirkt      |
| `view.ts`      | Sichten je Spieler (`HandView`, `TableView`)                                                                                  |
| `bot.ts`       | Schnittstelle `Bot`                                                                                                           |

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
- `broadcastTransport.ts` – `BroadcastChannel` zwischen Tabs desselben Browsers, ohne Relays; das
  Weggehen eines Tabs erkennt er über Web Locks. Nur für die Ende-zu-Ende-Tests (`npm run e2e`,
  Ordner `e2e/`): Der Schalter `?transport=broadcast` (dazu `?botDelay=`, `?standIn=` und
  `?kontraWindow=` in ms)
  existiert nur in einem Build mit `VITE_E2E=1`; im ausgelieferten Bündel ist er entfernt.

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

**Ausgefallene Mitspieler (N3).** Verliert ein Mensch die Verbindung, wird sein Platz in der Lobby
frei; im laufenden Spiel (`table.hand !== null`) bleibt er ihm (`PlayerInfo.connected = false`),
und der Host startet eine Frist (`HostOptions.standInDelayMs`, Standard 30 s). Danach zieht ein
Bot (`createBot`) für ihn, bis er sich mit seiner `clientId` zurückmeldet; ab dem nächsten Zug
spielt dann wieder der Mensch (überlegt der Bot gerade, verfällt dessen Zug).

- **Sicht:** Jede `state`-Nachricht trägt `absent: AbsentSeat[]` – je getrenntem Platz, ob ein Bot
  vertritt, und die Restzeit bis zur Vertretung in Millisekunden. Eine Restzeit statt eines
  Zeitpunkts, weil die Uhren der Geräte nicht übereinstimmen; `ClientSession` rechnet sie beim
  Empfang mit der eigenen Uhr in `AbsentSeatInfo.standInAt` um. Die Oberfläche zeigt am Platz
  „getrennt · Bot in 24 s“ bzw. „Bot vertritt“.
- **Gastgeber-Befehle** (direkt über `HostSession`): `standInNow(platz)` lässt den Bot sofort
  übernehmen (der Spieler kann trotzdem zurückkommen); `replaceWithBot(platz)` nimmt einen
  getrennten Spieler dauerhaft vom Platz – der Platz wird ein gewöhnlicher Bot-Platz samt
  Kontostand, die `clientId` schaut beim Wiederkommen zu. Beide nur für getrennte Spieler.
- **Zeit:** Die Frist läuft über `schedule`, die Restzeit über `HostOptions.now`; Tests ersetzen
  beides durch eine synchrone Uhr. Jede Frist hat eine Marke, damit ein alter Zeitgeber nach
  Rückkehr und erneutem Trennen nicht zählt.
- **Speicherstand:** Fristen und Vertretungen werden nicht gespeichert (`HOST_SNAPSHOT_VERSION`
  bleibt). Nach `restore` gelten alle Menschen als getrennt und ihre Frist beginnt von vorn – auch
  wer vorher schon vertreten wurde. Dauerhaft ersetzte Plätze stehen als Bot-Plätze im Stand.

**Kontra und Re (K4).** Die Aktion `{ type: 'double' }` ist an keinen Zug gebunden: `applyAction`
prüft sie vor der Zugreihenfolge, `canDouble(state, sitz)` entscheidet (Tischregel an, Spiel läuft,
noch keine Karte, Spielerpartei vorhanden; Kontra für Gegenspieler, danach Re für die
Spielerpartei). Der Stand steht in `HandState.doubling`, die Sicht trägt `doubling` und für den
eigenen Platz `canDouble`. Die Faktoren entstehen in Stufe 2 der Abrechnung (`factorsFor`).

- **Kontra-Fenster:** Weil Bots sonst nach `botDelayMs` sofort die erste Karte legen, wartet der
  Host mit dem ersten Zug eines Bots mindestens `HostOptions.kontraWindowMs` (Standard 3 s),
  solange ein Mensch (kein Bot, keine Vertretung) noch Kontra oder Re sagen darf. Ändert sich
  Kontra/Re während der Wartezeit, plant der Host den Bot-Zug neu (der alte Zeitgeber verfällt
  über eine Kennung) – mit frischem Fenster, wenn nun ein Mensch Re sagen darf, sonst ohne.
- **Bots** sagen nie Kontra (B3 kann das später übernehmen).

**Hochzeit (K5).** Sagt jemand eine Spielart mit `prelude` an, geht das Spiel in die Phase
`prelude` statt gleich zu den Stichen. Züge sind `{ type: 'prelude', move }` (`accept`, `decline`,
`give` mit Karten); `legalPreludeMoves` liefert die erlaubten, der passive Zug zuerst. Der Stand
liegt in `HandState.prelude` und ist öffentlich (wer gefragt wird, wer angenommen hat, Verlauf
ohne Karten); die getauschten Karten sieht jeder nur in seiner eigenen `hand`. `host.ts` prüft nur
die Form (`isWellFormedMove`), der Kern die Regel (Fehler `illegal_move`).

- **Gescheitert:** Nimmt keiner an, setzt `preludeFailed` die Ansage fort: Spieler aus
  `Auction.yielded` (wer im Zweikampf aufgegeben hat) tragen es neu aus, die Spielart steht in
  `Auction.failed` und ist gesperrt; ohne Nachrücker greift `ALL_PASSED`.
- **Bots** lehnen jede Hochzeit ab und sagen selbst keine an; müssen sie als Vertretung Karten
  zurückgeben, nehmen sie die billigsten erlaubten (`preludeMove` in `packages/bots`). Der
  Notfallzug des Hosts nimmt `legalMoves[0]`.
- **E2E:** Der E2E-Build kennt `?seed=` für feste Karten (`connection.ts`); das Szenario
  `e2e/hochzeit.spec.ts` nutzt es.

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

## Spielprotokoll (K7)

Ein Spiel ist durch `RuleSet`, Geber, `Seed`, den Übertrag vom Tisch (`HandCarry`: Pott, Faktor)
und die Folge der Aktionen (mit Sitz) vollständig bestimmt. `HandLog` (`packages/core/src/log.ts`) hält genau das fest; `replay(log)` gibt das Spiel
mit `dealHand` + `applyAction` wieder und liefert denselben `HandState` wie der echte Ablauf (wirft,
wenn eine Aktion nicht regelkonform ist). Die Tests spielen viele Zufallsspiele – im Netz auch mit
Bot-Vertretung (N3) – und vergleichen.

- **Im Tisch:** `TableState.logs` (die letzten `MAX_LOGS` = 100 Protokolle; das letzte gehört zum
  laufenden Spiel, `applyTableAction` hängt jede angenommene Aktion in bereinigter Form an) und
  `TableState.history` (eine `HandSummary` je fertigem Spiel: Nummer, Geber und `HandResult` mit
  Ansage, Spieler, Augen, Ergebnis, Zahlungen). Die Zusammenfassungen bleiben dauerhaft.
- **Beim Host:** Protokolle enthalten über den Seed alle Karten und verlassen den Host nie.
  `TableView.history` trägt nur die Zusammenfassungen _fertiger_ Spiele – ohne Karten, für alle
  Plätze gleich. Daraus baut U4 die Verlaufstabelle.
- **Spielverlauf eines Spiels:** `HandView.tricks` trägt nach Spielende alle Stiche (Ausspieler,
  Karten in Reihenfolge, Gewinner, Augen) an alle Plätze und Zuschauer, während des Spiels ist es
  `null` (Protokoll 7). Die gespielten Karten waren ohnehin offen; ältere Stiche als der letzte
  stehen trotzdem erst nach dem Spiel in der Sicht (Tests in `core/test/log.test.ts` und
  `net/test/log.test.ts`). Der Ergebnis-Dialog zeigt sie unter „So wurde gespielt“.
- **Speicherstand:** `HOST_SNAPSHOT_VERSION` 5 (seit K3a 6: `pot`, `carry`, `HandResult` in
  Stufen; seit K3b 7: `allPassed`, `tariff.ramsch`, `ramsch`; seit K3c 8: `tariff.stock`; seit K3d 9: `Auction.forced`; seit K4 10: `RuleSet.kontra`, `HandState.doubling`; seit K5 11: `HandState.prelude`, `Auction.yielded`/`failed`, `laufende.hochzeit`). Kontra und Re stehen als Aktion `double` mit Sitz im Protokoll, Vorspiel-Züge als `prelude` samt zurückgegebener Karten (das Protokoll bleibt beim Host). `parseHostSnapshot` prüft die Protokolle und spielt das letzte nach; passt es nicht zum laufenden Spiel, wird der Stand verworfen. Größe: 50 Spiele
  ≈ 106 KiB JSON (Protokolle + Verlauf; je Protokoll stecken die Regeln mit ~½ KiB mit drin),
  also gut im Rahmen der ~5 MiB von localStorage.
- Später möglich: den Host über den Seed festlegen (Schutz gegen Schummeln) und Spiele nachspielen.

## So wird erweitert

| Vorhaben                       | Wo                                                                         |
| ------------------------------ | -------------------------------------------------------------------------- |
| Neue Spielart (z. B. Hochzeit) | Name in `CONTRACT_KINDS` an seinem Rang + Eintrag in `MODES` (siehe unten) |
| „Alle weiter“ (Ramsch, Stock)  | `AllPassedRule` + Eintrag in `ALL_PASSED`, Auswahl in Lobby                |
| Faktor (Kontra/Re, Bock)       | Quelle in `factorsFor` (`scoring.ts`), Zustand in `HandState`/`HandCarry`  |
| Neue Tischregel sonst          | Feld in `RuleSet` + `parseRuleOptions`, Auswahl in Lobby                   |
| Kurzes Blatt / 3 Spieler       | `RuleSet.deck` / `RuleSet.players` (im Kern schon parametrisiert)          |
| Anderes Kartenset              | Weiteres `CardTheme`                                                       |
| Stärkerer Bot                  | Weitere `Bot`-Implementierung in `packages/bots`                           |
| Anderer Verbindungsweg         | Weitere Implementierung von `HostTransport`/`ClientTransport`              |
| Android                        | PWA, später ggf. Hülle (Capacitor/Tauri) um `apps/web`                     |

Die Erweiterungspunkte für Sonderspiele (Entwurf: [entwurf-sonderspiele.md](entwurf-sonderspiele.md),
eingezogen mit K3a). Jede Variante soll **ein Eintrag oder ein Hook** sein, kein Sonderfall in
`hand.ts` oder `scoring.ts`:

1. **Rangfolge als Liste.** `CONTRACT_KINDS` führt die Spielarten in Rangfolge; `BID_ORDER` sind
   davon die ansagbaren (`biddable`). `bidValue` ist der Index in `BID_ORDER` (+ 1, + 100 für
   Tout). Eine neue Spielart wird an ihrer Stelle eingefügt, ohne andere umzunummerieren.
   Oberfläche (Ansage, Lobby, Regelübersicht) und Bots lesen `BID_ORDER`.
2. **`ModeDefinition`.** `parties` (`alone`, `calledAce`, `prelude`, `everyone`) sagt, wer mit wem
   spielt – `partyOf`, `startPlay` und die Sichtbarkeit des Partners lesen nur das. `tariff`
   wählt den Grundtarif aus `RuleSet.tariff`. `trumps(contract, trick)` liefert die Trümpfe für
   den Stich mit Index `trick`; alle Aufrufer (Kern, Bots, Hand-Sortierung) geben den Index
   ausdrücklich mit (`orderFor(contract, trick)`, in Sichten `tricksPlayed(view)`).
   `laufendeTrumps` (Laufende über andere Karten als die Trümpfe), `eligible` (Bedingung ans
   Blatt), `outcome` (eigene Auswertung, z. B. Ramsch) und `prelude` (Vorspiel) sind optionale
   Hooks.
3. **Vorspiel.** Hat die angesagte Spielart eine `PreludeDefinition`, kommt zwischen Ansage und
   erstem Stich die Phase `prelude`. Die Definition sagt, wer dran ist (`turn`), was erlaubt ist
   (`legalMoves`) und was ein Zug bewirkt (`apply` → `continue`, `play` mit Partner und Händen,
   oder `failed`). `hand.ts` kennt nur diesen Rahmen; nach `play` gelten die getauschten Hände
   als `initialHands` (Laufende). `weddingPrelude(n)` setzt die Hochzeit um (n = 1); die
   arabische Hochzeit (H3) ist derselbe Hook mit n = 2.
4. **„Alle weiter“ als Registry.** `applyBid` ruft nur `ALL_PASSED[rules.allPassed](state)` und
   führt den Schritt aus: `finish` (Zusammenwerfen; Stock mit Einzahlung über `potDelta`),
   `play` (Ramsch: Spiel ohne Ansager, `declarer` bleibt `null`), `forced` (Muss: Stufe 3 mit
   `auction.forced`, nur Sauspiele, `suitChoices(hand, { forced })` lockert den Ruf) oder
   `fallback` (eine andere Regel, z. B. Zusammenwerfen bei drei eigenen Säuen).
5. **Abrechnung in Stufen.** `scoreHand` = `outcomeOf` (Stufe 1: `MODES[kind].outcome` oder
   `partyOutcome`; Gewinner, Verlierer, Spielwert mit Bestandteilen `parts`) → `factorsFor`
   (Stufe 2) → `settleOutcome` (Stufe 3: Zahlungen, Pott). `HandResult` = `kind`, `outcome`,
   `factors`, `payments`, `potDelta`; die Einzelheiten (Augen, Schneider, Laufende …) stehen in
   `outcome.details`. Immer gilt `Summe(payments) + potDelta = 0`.
6. **Übertrag Tisch ↔ Spiel.** `HandCarry` (`pot`, `factor`) gibt `startHand` an `dealHand` und ins
   `HandLog`; `TableState.pot` hält den Stock, `settle` bucht `payments` und `potDelta`. Immer gilt
   `Summe(balances) + pot = 0` (geprüft auch in `parseHostSnapshot`).

Der Umbau ist gegen Verhaltensänderungen abgesichert: `packages/core/test/reference.test.ts` spielt
500 Zufallsspiele und vergleicht Ansage, Spieler und Zahlungen mit `reference-games.json` vom Stand
vor dem Umbau.

## Mischen (Seed und Generator)

**Ablauf.** Vor jedem Spiel zieht der Host 128 Bit aus Web Crypto (`cryptoSeed` in
`packages/net/src/host.ts`, vier `Uint32`). Der Kern mischt damit in `dealHand`: `createRng`
(`packages/core/src/rng.ts`) ist **xoshiro128\*\*** (Blackman/Vigna, 128 Bit Zustand, Periode
2¹²⁸ − 1, besteht BigCrush), darauf ein Fisher-Yates-Mischen der 32 Karten. Dann wird
reihum gegeben.

**Seed-Typ.** `Seed` = `[number, number, number, number]` (vier Zahlen 0 … 2³² − 1): als JSON
speicherbar (Speicherstand, später Spielprotokoll) und mit `isSeed` prüfbar. Eine einzelne Zahl ist
als Kurzform erlaubt (Tests, Bots) und wird per splitmix32 auf 128 Bit gestreut. Der Seed steckt
nicht im Speicherstand des Hosts, nur die ausgeteilten Hände; `HOST_SNAPSHOT_VERSION` blieb
unverändert.

**Warum das fair ist.**

- Vorher: 32 Bit Seed → höchstens 2³² ≈ 4,3 Milliarden verschiedene Mischungen. Es gibt aber
  32!/(8!)⁴ ≈ 9,96 · 10¹⁶ (≈ 2⁵⁶,⁵) verschiedene Kartenverteilungen auf vier Spieler; über 99,99999 %
  davon wären nie vorgekommen. Jetzt 2¹²⁸: jede Verteilung ist erreichbar, und der Seed lässt sich
  nicht erraten.
- Fisher-Yates ist bei gleichverteilten Zufallszahlen exakt gleichverteilt. Die Umrechnung
  `floor(u · (i + 1))` aus 32-Bit-Werten hat einen Rest-Fehler von höchstens i/2³² ≈ 10⁻⁹ pro
  Schritt, praktisch ohne Wirkung.
- Der Host entscheidet allein über den Seed und gibt ihn nie heraus (Mitspieler sehen nur ihre
  `HandView`). Ein Host, der schummeln will, kann das mit jedem Peer-to-Peer-Aufbau ohne Server;
  dagegen hilft nur ein Protokoll mit Verpflichtung auf den Seed (siehe Backlog, Spielprotokoll).

**Prüfung** (`packages/core/test/shuffle-statistics.test.ts`, 20 000 Mischungen mit festen Seeds,
läuft in unter einer Sekunde; Schwelle jeweils 99,9 %-Quantil, ein Fehlschlag ist also ein echter
Befund):

| Messgröße                                                   | Erwartet                      | Gemessen                      |
| ----------------------------------------------------------- | ----------------------------- | ----------------------------- |
| Karte × Position, Chi² über 32 × 32 Felder (992 FG)         | 992 (Grenze ≈ 1130)           | 1006                          |
| Karte × Spieler, größtes Chi² einer Karte (3 FG)            | 3 (Grenze 21,5)               | 8,1                           |
| Sauspiel, Hände mit 0 / 1 / 2 / 3 / 4 Trümpfen (Platz 0)    | 83 / 847 / 3212 / 5930 / 5824 | 78 / 863 / 3137 / 5971 / 5807 |
| Sauspiel, Hände mit 5 / 6 / 7 / 8 Trümpfen                  | 3106 / 874 / 118 / 5,7        | 3160 / 868 / 108 / 8          |
| Drei höchste Trümpfe bei einem Spieler (3 Laufende, Spiele) | 903 (± 29)                    | 912                           |

Die Trumpfzahl folgt der hypergeometrischen Verteilung (14 Trümpfe unter 32 Karten, 8 je Hand);
getestet wird Chi² je Platz. Die Erwartungswerte „drei höchste Trümpfe“: 4 · C(29,5)/C(32,8)
≈ 4,5 % der Spiele.

**Nur gerechnet, nicht getestet: „Sie“.** Alle acht Ober und Unter auf einer Hand ist bei vier
Spielern die Wahrscheinlichkeit 4 · 1/C(32,8) ≈ 3,8 · 10⁻⁷ je Spiel, also etwa einmal in 2,6
Millionen Spielen. Das lässt sich mit vertretbarer Laufzeit nicht statistisch prüfen; die
Gleichverteilung der Karten (oben) deckt es mit ab.

## Bekannte Grenzen des Grundgerüsts

- Lädt der Gastgeber neu, geht der Tisch weiter – aber nur im selben Browser. Wechselt der
  Gastgeber das Gerät oder löscht er die Website-Daten, ist der Tisch weg; ein privates Fenster ohne
  localStorage übersteht kein Neuladen. Nach 12 Stunden gilt ein gespeicherter Tisch als vergessen.
- Gäste, die nach dem Neuladen des Gastgebers nicht zurückkommen, halten in der Lobby ihren Platz
  besetzt (der Gastgeber kann sie mit „vom Platz nehmen“ entfernen). Im laufenden Spiel vertritt sie
  nach der Frist ein Bot.
- Hinter sehr strengen Routern kommt ohne TURN-Server keine Verbindung zustande
  (`VITE_TURN_CONFIG`, siehe „Verbindungsaufbau“).
- Die Vermittlung hängt an öffentlichen Relays, die kommen und gehen. Die Liste in `signaling.ts`
  gelegentlich prüfen (Messwerkzeug) und notfalls per `VITE_SIGNALING_URLS` übersteuern.
- Ruht die Vermittlung, kann niemand neu dazukommen (z. B. als Zuschauer) – erst wenn ein Platz frei
  wird oder jemand die Verbindung verliert, oder der Gastgeber „Zuschauer zulassen“ einschaltet.
- Fällt ein Mitspieler aus, wartet der Tisch die Frist ab (Standard 30 s), dann zieht ein Bot. Bis
  der Ausfall bemerkt wird, vergeht je nach Transport zusätzlich etwas Zeit (WebRTC: wenige
  Sekunden). Ein Gast, der nur langsam ist, aber verbunden bleibt, wird nie vertreten – eine
  Bedenkzeit gibt es nicht.
- Schließt ein Gast seinen Tab ganz, ist seine `clientId` (sessionStorage) weg; ein neuer Tab ist
  ein neuer Mitspieler und kann nur zuschauen. Zurück an den Platz kommt nur, wer denselben Tab neu
  lädt oder ihn über „Geschlossenen Tab wieder öffnen“ zurückholt.

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
