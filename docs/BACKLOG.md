# Backlog

Langfristige Themen, die noch nicht als Arbeitspaket geschnitten sind. Wer ein Thema angeht,
schneidet es zuerst in Pakete mit Abnahmekriterien für [ARBEITSPAKETE.md](ARBEITSPAKETE.md) und
streicht es hier. Neue Ideen einfach unten anhängen – ein Satz genügt.

Spalte „Klären“: was Lukas beantworten muss, bevor jemand anfängt.

| Thema                       | Größe                     | Klären                               |
| --------------------------- | ------------------------- | ------------------------------------ |
| Mehrere Kartensets          | mittel                    | Welche Sets zuerst; Lizenzen         |
| Watten                      | groß                      | Variante(n); integrieren oder forken |
| Android-App                 | klein bis mittel          | Reicht die installierbare Web-App?   |
| Spezialregeln der Runde     | je Regel klein bis mittel | Genaue Regeln aufschreiben           |
| Mischen wie am echten Tisch | klein                     | –                                    |

---

## Mehrere Kartensets

Beim Eröffnen des Tisches das Blatt wählen: bayerisch, Salzburger, ggf. weitere (fränkisch,
württembergisch, französisch).

- **Passt zur Architektur:** Kartenbilder laufen über `CardTheme` (`apps/web/src/ui/cardTheme.tsx`).
  Ein neues Set ist ein weiteres Theme; die Regeln merken davon nichts.
- **Zu entscheiden:** Wählt der Gastgeber das Set für alle (dann gehört die Wahl in den
  Tischzustand und die Sicht, z. B. neben `RuleSet`) oder jeder Spieler für sich? Lukas' Wunsch:
  beim Erstellen der Runde.
- **Aufwand steckt in den Bildern:** je Set 32 Karten plus Rücken, mit geklärter Lizenz (siehe
  Abschnitt Urheberrecht in [DESIGN.md](DESIGN.md)). Das Salzburger Bild ist dem bayerischen nah.
- **Hängt zusammen mit Watten:** Watten braucht je nach Variante Salzburger bzw. bayerisches Blatt
  mit Weli (33. Karte).

## Watten (bayerisch oder südtirolerisch)

Ein eigenes Spiel mit gleichem Blatt, aber völlig anderen Regeln: Schlag und Trumpf ansagen,
„Bieten“/„Gehen“, Kritische, Weli; bayerische und südtiroler Spielweise unterscheiden sich.

- **Empfehlung: integrieren, nicht forken.** Netz (Host, Transporte, Wiederverbinden,
  Speicherstand), Lobby, Bots-Schnittstelle, Gestaltung und Deployment lassen sich
  wiederverwenden. Ein Fork würde all das verdoppeln; jede Verbesserung müsste zweimal gemacht
  werden.
- **Was dafür nötig ist:** `packages/core` ist heute Schafkopf-spezifisch (`HandState`,
  `TableView`, Protokoll). Vorher eine Spiel-Schnittstelle einziehen (z. B. `GameDefinition` mit
  Zustand, Aktionen, Sicht, Abrechnung), Schafkopf darauf umstellen, dann `packages/watten`
  danebenstellen. Der Gastgeber wählt beim Eröffnen das Spiel.
- **Modell:** Der Entwurf der Spiel-Schnittstelle ist eine Architekturentscheidung – laut
  Modellwahl in ARBEITSPAKETE.md ein Fall für Fable (nur der Entwurf), die Umsetzung Opus.
- **Zu klären:** welche Variante zuerst, ob auch zu zweit/dritt gewattet wird.

## Android-App

Stand nach U5 (installierbare Web-App, Einschätzung; auf einem echten Gerät noch nicht geprüft).

- **Was die PWA auf Android schon kann:** Chrome bietet „App installieren“ an (Manifest,
  Symbole und Service Worker sind da). Danach eigenes Symbol, Start im Vollbild ohne
  Browserleiste, Hochformat, Startbildschirm ohne Netz. WebRTC (der Tisch) läuft in Chrome
  für Android wie im Browser, auch in der installierten App. Ein neuer Stand wird mit dem
  Hinweis „Neue Version verfügbar“ angeboten.
- **Was eine Play-Store-Hülle zusätzlich brächte:** Auffindbarkeit im Store, Installation ohne
  Umweg über den Browser-Dialog, Push-Benachrichtigungen („du bist dran“) und ein Tisch, der im
  Hintergrund verbunden bleibt. Ohne Hülle pausiert Android den Tab bald, die Verbindung
  zum Gastgeber reißt dann ab (N2 fängt das Neuladen ab, nicht das Wegwischen).
- **Wege dorthin:** _Trusted Web Activity_ (z. B. mit Bubblewrap) verpackt die PWA fast ohne
  Code; nötig sind ein Entwicklerkonto bei Google (einmalig 25 US-$), ein Signaturschlüssel und
  `/.well-known/assetlinks.json` auf der Domain. GitHub Pages liefert das Unterverzeichnis
  `/schafkopf/` – die Datei müsste im Stamm der Domain `dorfbub.github.io` liegen, also eigene
  Domain oder ein Repository `dorfbub.github.io`. _Capacitor_ bündelt die Seite in der App und
  erlaubt native Erweiterungen (Benachrichtigungen, Vordergrunddienst), kostet aber eigenen
  Build und Pflege.
- **Empfehlung:** Erst mit der PWA spielen. Eine Hülle lohnt, sobald Store-Präsenz oder
  Benachrichtigungen gewünscht sind; dann TWA, bei Hintergrund-Verbindung Capacitor.
- **Hinweis „Neue Version“** ist mit U5 umgesetzt (`apps/web/src/updates.ts`).

## Spezialregeln der Runde

In Lukas' Runde gibt es manchmal Eisenbahner, Hawaii, Habicht, arabische Hochzeit u. a.

- **Erst aufschreiben:** Diese Regeln sind regional bzw. hausgemacht; es gibt keine verlässliche
  allgemeine Quelle. Lukas beschreibt je Regel: Wer darf sie ansagen, was ist Trumpf, wer spielt
  mit wem, wie wird abgerechnet, wo steht sie in der Rangfolge. Danach in
  [REGELN.md](REGELN.md) unter einem eigenen Abschnitt „Hausregeln“.
- **Passt zur Architektur:** Neue Spielarten sind Einträge in `MODES` (`packages/core/src/modes.ts`);
  einschalten pro Tisch über `RuleSet` (seit K2 in der Lobby einstellbar). Regeln mit eigenem
  Ablauf vor dem Spiel brauchen den Vorbereitungs-Hook aus K5 (Hochzeit).
- **Reihenfolge:** nach K5, damit der Hook schon existiert.

## Mischen wie am echten Tisch

Manche Runden wollen „echtes“ Mischen wie am Tisch, bei dem Stiche teilweise zusammenbleiben. Das
ist bewusst nicht zufällig und wäre eine eigene Tischregel (`RuleSet`). Das faire, zufällige
Mischen ist beschrieben in `docs/ARCHITEKTUR.md`, „Mischen“.
