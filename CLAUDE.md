# Schafkopf – Hinweise für Agents

Online-Schafkopf als Web-App, Peer-to-Peer ohne Server. Sprache des Projekts ist Deutsch: Doku,
Kommentare, Texte der Oberfläche und Testnamen. Bezeichner im Code sind englisch, Fachbegriffe
bleiben deutsch (`sauspiel`, `wenz`, `laufende`).

## Zuerst lesen

- `docs/ARCHITEKTUR.md` – Aufbau, Schnittstellen, Erweiterungspunkte
- `docs/REGELN.md` – verbindliche Spielregeln; Referenz für Tests
- `docs/ARBEITSPAKETE.md` – die offenen Pakete mit Abnahmekriterien
- `docs/BACKLOG.md` – langfristige Themen, noch nicht in Pakete geschnitten
- `docs/STRATEGIEN.md` – Faustregeln und Didaktik des Trainers (`packages/tutor`)

## Befehle

```bash
npm run dev         # Entwicklungsserver, http://localhost:5180
npm run check       # Typprüfung + Lint + Tests – muss vor jedem Commit sauber sein
npm run test:watch  # Tests im Beobachtungsmodus
npm run build       # Produktions-Build
npm run format      # Prettier
```

Einzelne Testdatei: `npx vitest run packages/core/test/hand.test.ts`

## Regeln für die Arbeit

- **Abhängigkeitsrichtung einhalten:** `web → net → core`, `web → bots → core`,
  `web → tutor → bots → core`. `core` importiert nichts aus anderen Paketen und nutzt weder DOM,
  Netz, Zeit noch `Math.random` (ESLint prüft das). Bots und Tutor nutzen Zufall nur über den Seed
  und Zeit nur über eine übergebene Uhr.
- **Kern bleibt rein:** Zustand nie verändern, immer kopieren. Zufall nur über den übergebenen Seed.
- **Sichten statt Zustand:** Über das Netz und an Oberfläche/Bots gehen nur `TableView`/`HandView`.
  Nie `TableState` oder `HandState` verschicken.
- **Nachrichten aus dem Netz prüfen:** Alles, was ein Mitspieler schickt, validiert der Host.
- **Regeländerung = Doku + Test + Code**, in dieser Reihenfolge. Unklare Regel: nicht raten,
  sondern in `docs/REGELN.md` unter „Annahmen“ eintragen und nachfragen.
- **Einstellbares gehört in `RuleSet`**, nicht als Konstante in die Logik.
- **Texte der Oberfläche** stehen in `apps/web/src/i18n/de.ts`.
- **Protokolländerungen** erhöhen `PROTOCOL_VERSION` in `packages/net/src/protocol.ts`.
- Pakete sind reine Quelltext-Pakete (kein eigener Build); Importe über `@schafkopf/core` usw.
- Tests liegen in `packages/*/test`. Netz-Tests nutzen `createLoopbackPair` und eine synchrone
  `schedule`-Funktion – kein echtes WebRTC, keine echten Timer.
- Keine neuen Abhängigkeiten ohne Grund; wenn doch, im Commit begründen.

## Im Browser prüfen

Zwei Tabs: im ersten „Mit Freunden spielen“, den Einladungslink im zweiten öffnen. Jeder Tab ist
ein eigener Spieler (`clientId` liegt im sessionStorage). Der Verbindungsaufbau über die
öffentlichen Relays kann dauern; für schnelle Proben „Allein gegen Bots“ nutzen.
