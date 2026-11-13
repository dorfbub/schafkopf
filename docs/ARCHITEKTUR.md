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
apps/web ──► packages/net ──────► packages/core
    │                                ▲
    ├──────► packages/bots ──────────┤
    │              ▲                 │
    └──────► packages/tutor ─────────┘
```

Abhängigkeiten zeigen nur in Pfeilrichtung: `web → net → core`, `web → bots → core`,
`web → tutor → bots → core` (der Tutor darf auch `core` direkt nutzen). `core` hängt von nichts ab.

### packages/core – Spielregeln

| Datei           | Inhalt                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `cards.ts`      | Karten als Strings (`"EA"`, `"HO"`), Augen, Blatt (lang/kurz)                                                                                   |
| `log.ts`        | Spielprotokoll `HandLog` (mit `carry`), `replay`, `HandSummary`                                                                                 |
| `rng.ts`        | Seed-basierter Zufall und Mischen                                                                                                               |
| `trick.ts`      | Bedienpflicht und Stichgewinner – allgemein, über eine `CardOrder`                                                                              |
| `modes.ts`      | Spielarten als `ModeDefinition` (Parteien, Tarifklasse, Trümpfe je Stich, Hooks); `BID_ORDER` als einzige Quelle für den Rang                   |
| `rules.ts`      | `RuleSet`: alles, was am Tisch einstellbar ist (Blatt, Spielarten, Tarif, „alle weiter“, …)                                                     |
| `hand.ts`       | Ein Spiel: `dealHand` (mit `HandCarry`), `applyAction`, `legalCards`, `legalContracts`                                                          |
| `allPassed.ts`  | Registry `ALL_PASSED`: was bei „alle weiter“ geschieht, je `RuleSet.allPassed`                                                                  |
| `prelude.ts`    | Vorspiel-Hook: `PreludeDefinition`, `PreludeState`, `weddingPrelude(n)` für die Hochzeit                                                        |
| `ramsch.ts`     | `ramschOutcome`: Stufe 1 der Abrechnung im Ramsch (Verlierer nach Augen, Gleichstand, Durchmarsch, Jungfrauen)                                  |
| `scoring.ts`    | Abrechnung in drei Stufen: `Outcome` (Spielart), `Factor`s, Zahlungen und Pott (`HandResult`)                                                   |
| `table.ts`      | Der Tisch: Plätze, Kontostände, Pott, Geberwechsel; `settle` als einzige Stelle, an der ein Ergebnis auf den Tisch wirkt                        |
| `settlement.ts` | Abrechnung über Spiele hinweg: `breakdownOf` (Aufschlüsselung), `ledgerOf` (Tabelle des Abends), `settleUp` (Pott zurück, wenige Überweisungen) |
| `view.ts`       | Sichten je Spieler (`HandView`, `TableView`)                                                                                                    |
| `bot.ts`        | Schnittstelle `Bot`                                                                                                                             |

Zentrale Signatur:

```ts
applyAction(state: HandState, action: Action): { ok: true; state } | { ok: false; error }
```

Der Zustand wird nie verändert, immer kopiert. Ungültige Aktionen liefern einen Fehlercode und
lassen den Zustand unberührt.

Eine ESLint-Regel verbietet im Kern `window`, `document`, `setTimeout`, `Math.random`, `Date.now`.

### packages/net – Host, Mitspieler, Transport

- `protocol.ts` – Nachrichten (`hello`, `action` → `welcome`, `state`, `waiting`, `rejected`,
  `error`) und die beiden
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
  `setSpectatorsWelcome(bool)`, `setRequireApproval(bool)`, `admitJoin(id)`/`rejectJoin(id)`
  (Beitrittsanfragen, siehe „Tisch-Code“) sowie `setRules(optionen)` (Tischregeln, nur vor Spielbeginn,
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
- **Bots** sagen Kontra und Re nur, wenn sie am Zug sind und `HandView.canDouble` gilt (B3,
  `doubling.ts`); außerhalb der Reihe fragt der Host sie nicht.

**Hochzeit (K5).** Sagt jemand eine Spielart mit `prelude` an, geht das Spiel in die Phase
`prelude` statt gleich zu den Stichen. Züge sind `{ type: 'prelude', move }` (`accept`, `decline`,
`give` mit Karten); `legalPreludeMoves` liefert die erlaubten, der passive Zug zuerst. Der Stand
liegt in `HandState.prelude` und ist öffentlich (wer gefragt wird, wer angenommen hat, Verlauf
ohne Karten); die getauschten Karten sieht jeder nur in seiner eigenen `hand`. `host.ts` prüft nur
die Form (`isWellFormedMove`), der Kern die Regel (Fehler `illegal_move`).

- **Gescheitert:** Nimmt keiner an, setzt `preludeFailed` die Ansage fort: Spieler aus
  `Auction.yielded` (wer im Zweikampf aufgegeben hat) tragen es neu aus, die Spielart steht in
  `Auction.failed` und ist gesperrt; ohne Nachrücker greift `ALL_PASSED`.
- **Bots:** Der Heuristik-Bot sagt Hochzeiten bei passendem Blatt an, nimmt mit starkem
  Trumpfblatt an und gibt Karten so zurück, dass eine Farbe frei wird (`weddingMove` in
  `packages/bots/src/hochzeit.ts`, B3). Der Zufalls-Bot lehnt ab und gibt die billigsten erlaubten
  Karten (`preludeMove`). Der Notfallzug des Hosts nimmt `legalMoves[0]`.
- **E2E:** Der E2E-Build kennt `?seed=` für feste Karten (`connection.ts`); das Szenario
  `e2e/hochzeit.spec.ts` nutzt es.

**Trumpfwechsel (Hawaii-Habicht, H2).** Eine Spielart mit `suitCount: 2` trägt zwei Farben
(`Contract.suit`, `Contract.suit2`, verschieden); `allContracts` bildet alle Paare, `cleanCall`
und `sameContract` kennen `suit2`, also prüft der Host die zweite Farbe ohne eigenen Code über
`legalCalls`. Die Trümpfe hängen am Stich-Index (`trumps(contract, trick)`, Wechsel ab
`HAWAII_SWITCH_TRICK` = 4); `trumpSuitFor(contract, trick)` liefert die gültige Farbe,
`trumpsChange(contract)` sagt, ob sie wechselt. Wer eine Kartenordnung behält, muss das
berücksichtigen:

- **Kern:** `legalCards` und `applyPlay` rechnen jedes Mal mit `state.tricks.length`; Laufende über
  `laufendeTrumps` (nur die Könige). Vorspiel und Ramsch nutzen Index 0 – sie haben keinen Wechsel.
- **Bot-Gedächtnis:** Der Heuristik-Bot merkt sich Fehlfarben als Karten, die ein Sitz sicher
  nicht hat (`Memory.absent`), und fragt `isVoid` mit der Ordnung des laufenden Stichs. Eine
  gemerkte Farbe wäre nach dem Wechsel falsch („kein Trumpf“ hieß vorher König oder erste Farbe).
  Vor dem Wechsel kennt er außerdem die Ordnung des letzten Stichs (`Ctx.finalOrder`): Trümpfe,
  die verfallen, gibt er billiger her, Karten, die noch Trumpf werden, hält er.
- **Oberfläche:** `sortHand(hand, contract, tricksPlayed(view))` sortiert bei jedem Zeichnen neu;
  das Spielschild zeigt das Zeichen der gültigen Farbe und als Zusatz „ab Stich 5: …“ bzw.
  „Trumpf gewechselt“, die Tischleiste nach dem Wechsel „Trumpf jetzt …“. Der Ansage-Dialog hat
  bei `suitCount: 2` einen zweiten Farbschritt.

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

Ein Bot implementiert `decide(view: HandView, rules?: RuleSet): PlayerAction`. Er sieht exakt das,
was ein Mensch sieht: seine Sicht und die öffentlichen Tischregeln, die der Host bei jedem Zug
mitgibt (ohne sie gelten die Standardregeln). `createRandomBot` ist der Platzhalter; am Tisch spielen die drei Spielstärken (B2):

| Stufe (`BotStrength`) | Fabrik               | Wie er spielt                                                         |
| --------------------- | -------------------- | --------------------------------------------------------------------- |
| `anfaenger`           | `createBeginnerBot`  | Faustregeln, aber ohne Gedächtnis, 40 % Fehlgriffe, überreizt knapp   |
| `normal`              | `createHeuristicBot` | Faustregeln vom Wirtshaustisch (B1), unverändert die Referenz         |
| `stark`               | `createStrongBot`    | Monte-Carlo-Suche über mögliche Kartenverteilungen, Heuristik im Kern |

`createBotOfStrength(stärke, seed, regeln, optionen)` wählt die passende Fabrik.

**Stark im Einzelnen** (`strongBot.ts`):

- **Wissen:** nur die eigene Sicht und die selbst gemerkten Stiche. Daraus: ungesehene Karten,
  Fehlfarben je Sitz (Bedienpflicht), Rufsau beim bekannten Mitspieler bzw. nicht beim Ansager.
  Fremde Karten kennt er nur als Stichprobe („Determinisierung“): Die ungesehenen Karten werden
  passend zu Kartenzahlen und Fehlfarben zufällig verteilt (stark eingeschränkte Karten zuerst).
- **Kartenspiel:** Jede erlaubte Karte wird auf denselben Verteilungen bis zum Ende gespielt, alle
  Sitze nach der Heuristik (`heuristicCard` mit einem gemeinsamen, öffentlichen Gedächtnis).
  Bewertet wird mit `scoreHand` – also in Cent samt Schneider, Laufenden, Kontra, im Ramsch ebenso.
  Gespielt wird der beste Schnitt, bei Gleichstand der Vorschlag der Heuristik.
- **Ansage (seit B4):** wie die Heuristik nach den Ansage-Tabellen (siehe unten). Mit
  `ansage: 'faustregel'` wie vor B4: Klare Blätter (Marge der Heuristik über 3) und klar schwache
  (unter −2) entscheidet die Heuristik, knappe spielt er durch (klassisch, ohne Vorspiel, ohne
  Tout; weiter = 0).
- **Aufwand:** feste Budgets in simulierten Karten (`STRONG_DEFAULTS`: 2000 je Entscheidung, Ansage
  ebenso), deterministisch über den Seed. Eine Uhr gibt es nur von außen (`now`, `budgetMs`); die
  Web-App gibt `performance.now` und 200 ms mit, damit auch langsame Handys unter 300 ms bleiben.
  Auf einem Entwicklerrechner: Schnitt ≈ 16 ms, längste Entscheidung ≈ 65 ms.
- **Nach dem Neuladen** fehlen ihm die früheren Stiche; dann spielt er das Spiel wie die Heuristik
  zu Ende.
- **Zeit und Zufall:** ESLint verbietet in `packages/bots/src` `Math.random`, `Date.now` und
  `performance`.

**Einstellung:** `RuleSet.botStrength` (Standard `normal`) stellt der Gastgeber in der Lobby für
alle Bots ein. Sie reist mit den Regeln in Sicht, Protokoll und Speicherstand und wird mit
`parseRuleOptions` geprüft. `HostOptions.createBot(seat, rules)` bekommt die Regeln beim Erzeugen;
daraus nimmt die Web-App die Stärke (Bots entstehen erst beim Start bzw. beim Wiederherstellen,
die Regeln stehen dann fest). Auch Vertretungen getrennter Spieler spielen in dieser Stärke.

**Tests:** `strength.test.ts` und `strengthBeginner.test.ts` (Stärkevergleich gepaart: dieselbe Verteilung einmal mit Prüfling,
einmal nur mit Referenz-Bots; Laufzeit; Uhr; Neuladen), `strengthTabelle.test.ts` (B4: mit gegen
ohne Ansage-Tabelle, alle Besetzungen; Stark über `compare`, zwei Prüflinge auf demselben Platz), `strengthLegality.test.ts` (alle Stufen
über viele Spiele in sieben Regelvarianten mit einem „Wildfang“, der Hochzeiten, Sonderspiele und
Kontra herbeiführt). Große Läufe mit den eigentlichen Schwellen: `BOTS_FULL=1 npx vitest run
packages/bots`.

**Bausteine der Heuristik (B3, B4):**

- `heuristicBot.ts` – Gedächtnis, Ansage (Werte aus `ansage.ts`, nur am Tisch erlaubte
  Spielarten; die alten Schwellen `rateContract` als `ansage: 'faustregel'` und für Kontra/Re),
  Faustregeln fürs Anspielen und Zugeben, Bettel, Ramsch (Jungfrau, Durchmarsch).
- `ansage.ts` – Ansage-Tabellen (B4): `ansageWert(hand, spiel, regeln, position)` ist der erwartete
  Wert in Cent für den Ansager, `ansageWertInSicht(sicht, spiel, regeln)` dasselbe aus einer
  `HandView` (Besetzung aus der Sicht, Position zum Geber), `merkmaleOf` die Merkmale des Blatts.
  Die Modelle (`ansageTabelle.ts`, erzeugt) rechnen in Wahrscheinlichkeiten (gewonnen, Schneider,
  Schwarz); Tarif und Laufenden-Schwellen kommen erst beim Abfragen aus dem `RuleSet`, eigene Tarife
  stimmen also. Außerhalb des Bereichs der Tabelle (Blatt zu schwach) `null`.
- `scripts/ansage-tabellen.ts`, `scripts/ansage-schreiben.ts` – Erzeugung der Tabelle unter Node
  (nicht im Browser, nicht in CI), gestartet über `test/ansageTabellen.test.ts` mit
  Umgebungsvariablen; Verfahren und Befehle in `docs/STRATEGIEN.md`, „Ansage-Tabellen“. Probespiele
  über `playOutHand` aus `strongBot.ts` (Heuristik an allen Sitzen).
- `hochzeit.ts` – Hochzeit und arabische Hochzeit: ansagen, annehmen, zurückgeben.
- `doubling.ts` – Kontra und Re.
- `prelude.ts` – einfacher Vorspiel-Zug (ablehnen, billigste Karten) für den Zufalls-Bot.

**Bewertung für den Tutor (T1):** `evaluateCards`, `evaluateContracts` und `evaluateDouble` in
`strongBot.ts` liefern die Suche des starken Bots mit dem Wert jeder Möglichkeit (Mittel und
Ergebnis je Kartenverteilung, für einen gepaarten Vergleich). `search` nutzt denselben Kern; der
starke Bot spielt unverändert. Für die Hochzeit (T3) gibt es `evaluateWeddingOffer` (annehmen oder
ablehnen) und `evaluateWeddingGive` (welche Karten zurück): Probespiele nach dem Vorspiel, mit
einem Hochzeiter, der `n` Trümpfe hatte und zu seiner Ansage passt. Die Option `respectBids` verwirft Verteilungen, in denen der
Ansager sein Spiel nach der Heuristik nicht angesagt hätte (nur der Tutor schaltet sie ein).

### packages/tutor

Der Trainer-Kern (T1): rät, bewertet und fragt – aus der eigenen Sicht, noch ohne Oberfläche.
Fachlicher Hintergrund, Faustregeln und Didaktik stehen in `docs/STRATEGIEN.md`.

| Datei          | Inhalt                                                                               |
| -------------- | ------------------------------------------------------------------------------------ |
| `types.ts`     | `TutorInput` (Sicht, Regeln, Sitz, gesehene Stiche), `Advice`, `Review`, `RuleHit`   |
| `lage.ts`      | Lage aus der Sicht: gefallene Karten, Fehlfarben, Parteien, wer den Stich hält       |
| `rules.ts`     | Katalog der Faustregeln (`RULE_IDS`, `RULES`): je Regel Prüfung und bevorzugte Züge  |
| `advise.ts`    | `advise`, `importance`, `review`, Schwellen (`THRESHOLDS`), Aufwand (`TUTOR_BUDGET`) |
| `questions.ts` | Auswahlfragen als Kennungen mit Platzhaltern (`questionsFor`)                        |

- **Eingabe:** nur `TutorInput` – nie `HandState`. Die gesehenen Stiche reicht die Oberfläche mit
  (sie sind öffentlich); fehlen welche, rät der Tutor nur mit Faustregeln.
- **Rechnung:** `evaluateCards`, `evaluateContracts` und `evaluateDouble` aus `packages/bots`
  (die Suche des starken Bots, mit Werten je Möglichkeit und je Kartenverteilung). Bei der Ansage
  die Ansage-Tabellen (`ansageWertInSicht`, B4); `Advice.ansage` trägt das wertvollste Spiel samt
  Wert, das die Oberfläche in der Begründung nennt. Der Tutor
  schaltet `respectBids` ein: Verteilungen, in denen der Ansager sein Spiel nicht angesagt hätte,
  werden verworfen. Der starke Bot am Tisch rechnet ohne.
- **Antwort:** Werte in Cent, Empfehlung, bis zu zwei begründende Faustregeln, Ausnahmen, ein
  Denkanstoß und die Wichtigkeit. Texte gibt es im Paket keine, nur Kennungen mit Platzhaltern
  (`denkanstoss.<regel>`, `frage.…`); die Texte stehen in `apps/web/src/i18n/de.ts`
  (`TUTOR_TEXT`).
- **Zufall und Zeit:** über den Seed (`TutorOptions.seed`, Standard 1); eine Uhr nur von außen.
  ESLint verbietet in `packages/tutor/src` wie bei den Bots `Math.random`, `Date.now` und
  `performance`, dazu Importe aus `net`, `web` und React.
- **Erweitern:** neue Faustregel = Eintrag in `docs/STRATEGIEN.md`, Kennung in `RULE_IDS`, Prüfung in
  `RULES` (an der passenden Stelle der Priorität) und eine feste Lage in `test/faelle.ts`. Tests
  prüfen, dass Katalog, Code und Lagen zusammenpassen.

### apps/web

React + Vite, keine weitere Zustandsbibliothek.

- `connection.ts` – Tisch eröffnen/beitreten/fortsetzen, Speicherstand des Gastgebers,
  Einladungslink, gemerkter Name.
- `ui/StartScreen`, `ui/Lobby`, `ui/Table` – die drei Ansichten.
- `ui/cardTheme.tsx` – `CardTheme`: Schnittstelle für Kartenbilder; einziges Bild ist `bayerischTheme`.
- `ui/kit/` – Grundbausteine (Schaltfläche, Eingabefeld, Tafel, Dialog, Spielerplatz, Karte);
  Stile und Variablen in `styles/`, Musterseite unter `#muster` (nur Entwicklungsserver).
- `i18n/de.ts` – alle Texte.
- `tutor/` – der Trainer am Tisch (T2), siehe unten.

#### Trainer am Tisch (T2)

Max Weber gibt es **nur allein gegen Bots**: `Table` bekommt `solo` (eigener Tisch ohne
Einladungslink, man ist Gastgeber) und legt den Trainer nur dann an, wenn man selbst sitzt und
ihn in der Lobby nicht ausgeschaltet hat. Am Tisch mit Freunden wird nichts davon geladen.

| Datei                      | Inhalt                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `tutor/settings.ts`        | Ein/aus und Automatik als Vorliebe des Geräts (localStorage `schafkopf.tutor`, kein `RuleSet`) |
| `tutor/session.ts`         | `TutorSession`: verfolgt die Sicht, sammelt gesehene Stiche, Sprechblase, Automatik, Rückblick |
| `tutor/engine.ts`          | `TutorEngine`: Rechnung im Web Worker (`createWorkerEngine`), ohne Worker direkt               |
| `tutor/worker.ts`          | Web Worker; rechnet `advise`/`review` aus `@schafkopf/tutor` mit Uhr und Zeitbudget (400 ms)   |
| `tutor/context.tsx`        | `useTutorSession`, `TutorProvider`, `useTutor` für die Bausteine des Tisches                   |
| `ui/table/Tutor.tsx`       | Figur und Sprechblase                                                                          |
| `ui/table/GameHistory.tsx` | markiert im Rückblick „So wurde gespielt“ die teuersten drei Fehler                            |

- **Nichts geht über das Netz.** Der Trainer bekommt dieselbe `TableView` wie der Tisch und
  rechnet daraus `TutorInput` (eigene Sicht + gesehene Stiche). Die Aktionen laufen wie immer über
  `ClientSession`; `Table` meldet dem Trainer nur vorher den eigenen Zug (`noteMove`), damit er
  ihn hinterher bewerten kann.
- **Gesehene Stiche:** Die Sicht hat nur `lastTrick`; die Sitzung hängt jeden neuen Stich an.
  Fehlt einer (Neuladen mitten im Spiel), passt die Zahl nicht, und der Kern rät nur nach
  Faustregeln (`basis: 'faustregel'`).
- **Veraltete Antworten:** Jede Antwort gehört zu einer Lage (Spiel, Phase, wer dran ist, Zahl
  der Rufe und Karten, Kontra). Ändert sich die Lage, schließt die Blase; ein Rat zu einer alten
  Lage wird nie angezeigt. Gleiche Lage → gleicher Seed → gleiche Antwort.
- **Automatik:** rechnet bei jeder eigenen Entscheidung im Worker mit und meldet sich bei
  `importance.auto` – höchstens einmal je Stich (Ansage und Kontra je einmal), nie zweimal
  hintereinander mit derselben Faustregel, nie über eine Blase, die man gerade selbst bedient.
  Bewertungen hinterher spricht sie nur bei `review.mention` an.
- **Hervorhebung:** `useTutor().snap.tip` – die empfohlene Karte in der Hand (`OwnSeat`), der
  Knopf im Ansage-Dialog (`BidDialog`) bzw. „Kontra“/„Re“; erst ab der zweiten Stufe.
- **Hochzeit (T3):** Frage `prelude`: `PreludeDialog` hebt „Ich nehme an“/„Nein“ bzw. die
  empfohlene Rückgabe hervor (`snap.tip` mit `type: 'prelude'`). Max meldet sich im Vorspiel nicht
  von selbst und bewertet Vorspiel-Züge nicht hinterher.
- **Name:** Der vierte Bot heißt ebenfalls „Weber Max“ (`DEFAULT_BOT_NAMES`), sitzt aber nur an
  einem Tisch ganz ohne Menschen. Der Trainer braucht einen Menschen am Tisch – beide kommen
  also nie zusammen vor (geprüft in `e2e/trainer.spec.ts`).

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
  Plätze gleich. Daraus baut `ledgerOf` (`settlement.ts`) die Tabelle des Abends mit laufendem
  Stand; `settleUp` rechnet die Endabrechnung. Beides sind reine Funktionen auf `TableView`-Daten
  (Dialog „Der Abend“, `EveningDialog.tsx`).
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
| Kurzes Blatt / 3 Spieler       | `RuleSet.deck`/`players`, erlaubt laut `TABLE_SETUPS` (siehe unten, K6)    |
| Anderes Kartenset              | Weiteres `CardTheme`                                                       |
| Stärkerer Bot                  | Weitere `Bot`-Implementierung in `packages/bots`, Stufe in `BOT_STRENGTHS` |
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

## Kurze Karte und Dreier (K6)

Spielerzahl und Blatt sind Tischregeln wie alle anderen (`RuleOptions` enthält seit K6 auch
`players` und `deck`). Erlaubt sind nur die Besetzungen aus `TABLE_SETUPS` (4/lang, 4/kurz,
3/kurz); `parseRuleOptions` lehnt alles andere ab, außerdem zu dritt das Muss und einen Satz
ohne Einzelspiel.

- **Welche Spielarten gehen:** `availableKinds(rules)` ist die einzige Quelle. Sie filtert
  `contracts` nach `kindFitsPlayers` (zu dritt nur Spielarten mit `parties: 'alone'` oder
  `'everyone'`) und nach `ModeDefinition.handSize` (eine Spielart, die genau acht Karten je
  Spieler braucht, fehlt mit kurzer Karte zu viert – gedacht für den Hawaii-Habicht).
  `allContracts` und damit Ansage, Lobby und Regelübersicht lesen nur diese Liste.
- **Davonlaufen:** `davonlaufenAb(deck)` (lang 4, kurz 3) kommt über `LegalContext` in
  `restrictRufsau`.
- **Abrechnung, Laufende, Sie, Ramsch, Stock** brauchten nichts Neues: Sie rechnen schon mit
  `rules.players` und dem Blatt aus `createDeck(rules.deck)`.
- **Host:** `setRules` mit anderer Spielerzahl passt die Plätze an (`resizeSeats`): Wer auf einem
  wegfallenden Platz sitzt, rückt auf den ersten freien; sitzen zu viele, wird abgelehnt. Nur vor
  dem ersten Spiel, deshalb sind alle Stände noch 0.
- **Oberfläche:** `positionOf(seat, me, players)` in `ui/table/layout.ts` – zu dritt sitzen die
  anderen links und rechts, oben bleibt frei. Tisch und Lobby nutzen dieselbe Funktion.
- **Bots** filtern ihre Kandidaten mit `kindFitsPlayers` und sagen nach der Ansage-Tabelle ihrer
  Besetzung an (B4: eigene Modelle für lang/4, kurz/4 und kurz/3; die Besetzung lesen sie aus der
  Sicht). Die alten Schwellen (`rateContract`) skalieren mit der Kartenzahl; die Blattgröße schätzen
  sie aus Hand, Stichen und laufendem Stich.

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

## Tisch-Code (N5)

Erzeugung, Anzeige und Eingabe: `apps/web/src/roomCode.ts`. 10 Zeichen aus 31 (ohne i, l, o, 0,
1), rund 49,5 Bit, mit Rejection Sampling gezogen (Bytes ab 248 werden verworfen, kein
`b % 31`). Angezeigt als `k7mq-x2pd-hn`; bei der Eingabe zählen Bindestriche, Leerzeichen und
Groß-/Kleinschreibung nicht. Alte, kurze Codes (6 Zeichen) sind ungültig; der Einladungslink
zeigt dann eine Meldung.

**Was der Code schützt:** Wer den Code nicht kennt, findet den Tisch nicht. Raten ist bei 2^49
Möglichkeiten und einem Tisch, der nur kurz offen ist, aussichtslos. Beim Nostr-Signalweg steht
der Raumname nicht im Klartext bei den Relays: Trystero veröffentlicht nur
`sha1("Trystero@<appId>@<roomId>")` als Themen-Etikett (`x`-Tag, Event-Art daraus abgeleitet).
Ein eigener Hash ist deshalb nicht nötig. Der Hash ist ungesalzen; ein Relay-Betreiber könnte
Codes offline durchprobieren, bei 49 Bit ist das unpraktisch.

**Was er nicht schützt:** Der Code ist ein Geheimnis, das man weitergibt. Wer ihn hat (Link in
einem Gruppenchat, Bildschirmfoto, Browserverlauf), sitzt ohne Rückfrage am Tisch, und die
Beitrittsanfragen (SDP) sind nicht mit dem Code verschlüsselt. Der Host prüft Nachrichten, aber
von sich aus nicht, _wer_ beitritt – dafür gibt es die Einstellung „Neue Mitspieler bestätigen“
(unten). Der Broadcast-Transport (nur E2E und Tests) hat keinerlei Schutz.

### Neue Mitspieler bestätigen (N6)

Damit ein erratener oder weitergereichter Code allein nicht reicht, kann der Gastgeber in der
Lobby „Neue Mitspieler bestätigen“ einschalten (`HostSession.setRequireApproval`, Standard aus,
im Speicherstand als `requireApproval`).

- **Bekannt** ist, wer schon einmal zugelassen war: Der Host merkt sich jede `clientId`, die an den
  Tisch kam (`known`, im Speicherstand; dazu alle aus `seatByClient` und `watching`). Auch wer vor
  dem Einschalten schon da war, gilt als bekannt. Der Gastgeber selbst (`HostOptions.owner`, seine
  `clientId` aus `connection.ts`) muss nie zugelassen werden. Bekannte kommen ohne Rückfrage
  zurück – nach einem Abbruch, im laufenden Spiel an ihren Platz und nach dem Neuladen des
  Gastgebers.
- **Wartezustand:** Meldet sich eine unbekannte `clientId`, ist die Verbindung `waiting`. Sie
  bekommt nur `{ t: 'waiting', host }` (Name des Gastgebers) – kein `welcome`, keine `state`,
  also keine `TableView` und keine Namen der Mitspieler. Alles außer `hello` beantwortet der Host
  mit `not_admitted`, ohne etwas zu ändern. Eine Verbindung kann ihre `clientId` nicht wechseln.
  Wartende stehen weder am Tisch noch in der Zuschauerliste.
- **Anfragen beim Gastgeber:** `getJoinRequests()` liefert `{ id, name }[]` in der Reihenfolge des
  Eingangs (gleiche Referenz, solange sich nichts ändert; passt auf `useSyncExternalStore`). Die
  `id` ist eine laufende Nummer, nicht die `clientId` – die verlässt den Host nicht.
  `admitJoin(id)` lässt alle Verbindungen dieser `clientId` herein (wie ein normales `hello`: in
  der Lobby auf einen freien Platz, im laufenden Spiel als Zuschauer) und merkt sie als bekannt.
  `rejectJoin(id)` schickt `{ t: 'rejected' }`; dieselbe `clientId` wird sofort wieder abgewiesen,
  bis der Gastgeber neu lädt (abgewiesene stehen nicht im Speicherstand). Geht die letzte wartende
  Verbindung, verfällt die Anfrage. Ausschalten der Einstellung lässt alle Wartenden herein.
- **Neuladen des Gastgebers:** Anfragen werden nicht gespeichert. Die Wartenden verlieren die
  Verbindung, finden den Tisch wieder, melden sich neu und stehen wieder in der Liste.
- **Gast:** `ClientSnapshot.admission` (`'waiting' | 'rejected' | null`) und `hostName`. Solange er
  wartet, läuft keine Zeitüberschreitung (die Zusage kann dauern); verliert er die Verbindung, gilt
  wieder die normale Suche.

Grenzen: Die Bestätigung schützt nur vor Unbekannten, nicht vor jemandem, der eine fremde
`clientId` kennt (sie liegt nur im sessionStorage des jeweiligen Tabs). Wer abgewiesen wurde,
kann mit einem neuen Tab (neue `clientId`) erneut anfragen; der Gastgeber muss dann wieder
abweisen.

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
