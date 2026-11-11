# Backlog

Langfristige Themen, die noch nicht als Arbeitspaket geschnitten sind. Wer ein Thema angeht,
schneidet es zuerst in Pakete mit Abnahmekriterien für [ARBEITSPAKETE.md](ARBEITSPAKETE.md) und
streicht es hier. Neue Ideen einfach unten anhängen – ein Satz genügt.

Spalte „Klären“: was Lukas beantworten muss, bevor jemand anfängt.

| Thema                            | Größe                     | Klären                               |
| -------------------------------- | ------------------------- | ------------------------------------ |
| Mehrere Kartensets               | mittel                    | Welche Sets zuerst; Lizenzen         |
| Watten                           | groß                      | Variante(n); integrieren oder forken |
| Android-App                      | klein bis mittel          | Reicht die installierbare Web-App?   |
| Weitere Hausregeln               | je Regel klein bis mittel | Genaue Regeln aufschreiben           |
| Mischen wie am echten Tisch      | klein                     | –                                    |
| Letzten Stich besser zeigen      | klein                     | Wo soll er hin?                      |
| Spielverlauf nach dem Spiel      | mittel                    | –                                    |
| Wer spielt was – besser sichtbar | klein bis mittel          | Gestaltung mit Lukas                 |

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

## Weitere Hausregeln

Eisenbahner, Hawaii-Habicht und arabische Hochzeit sind beschrieben
([REGELN.md](REGELN.md), „Hausregeln“) und als Pakete H1–H3 geschnitten
([ARBEITSPAKETE.md](ARBEITSPAKETE.md)); der gemeinsame Entwurf steht in
[entwurf-sonderspiele.md](entwurf-sonderspiele.md). Hier bleibt nur, was noch nicht beschrieben ist.

- **Weitere Regeln der Runde:** Lukas beschreibt je Regel: wer sie ansagen darf, was Trumpf ist,
  wer mit wem spielt, wie abgerechnet wird, wo sie in der Rangfolge steht. Eintrag in REGELN.md
  unter „Hausregeln“, dann ein Paket nach dem Muster von H1.
- **Legen und Bockrunden:** spielt Lukas' Runde nicht. Der Entwurf hält den Platz frei
  (`Factor`, `HandCarry.factor`); ein Paket gibt es erst, wenn eine Runde sie wünscht.

## Mischen wie am echten Tisch

Manche Runden wollen „echtes“ Mischen wie am Tisch, bei dem Stiche teilweise zusammenbleiben. Das
ist bewusst nicht zufällig und wäre eine eigene Tischregel (`RuleSet`). Das faire, zufällige
Mischen ist beschrieben in `docs/ARCHITEKTUR.md`, „Mischen“.

## Letzten Stich besser zeigen

Lukas (Spielabend): Man sollte den letzten Stich sehen können.

- **Gibt es schon, wird aber nicht gefunden:** Seit D3 steht oben rechts in der Tischleiste ein
  kleiner Knopf „Letzter Stich“ (ab dem zweiten Stich, `TableBar.tsx`, `LastTrickDialog.tsx`).
  Er ist offenbar zu unauffällig, vor allem am Handy.
- **Idee:** den letzten Stich dauerhaft klein neben der Tischmitte zeigen oder per Tippen auf den
  Stapel des Gewinners aufklappen. Gestaltung mit Lukas abstimmen (Stil aus `docs/DESIGN.md`).
- Passt als kleines Paket in die Oberfläche; ggf. mit dem Spielverlauf zusammen.

## Spielverlauf nach dem Spiel

Lukas: Am Ende eines Spiels sehen, wie gespielt wurde – wer in welchem Stich welche Karte gelegt
hat und welche Karte den Stich gemacht hat.

- **Daten sind da:** Das Spielprotokoll (K7, `packages/core/src/log.ts`) hält jedes Spiel fest und
  kann es mit `replay` nachspielen. Nach Spielende dürfen alle Karten gezeigt werden.
- **Fehlt:** Die Sicht der Mitspieler enthält bisher nur eine Zusammenfassung je Spiel. Nach
  Spielende müsste der Host die Stiche (Ausspieler, Karten, Gewinner) mitschicken – nie während
  des Spiels.
- **Anzeige:** im Ergebnis-Dialog aufklappbar „So wurde gespielt“: acht Zeilen, je Stich die vier
  Karten in Spielreihenfolge, die stechende Karte hervorgehoben. Gehört zu U4 (Abrechnung und
  Verlauf) oder als eigenes Paket direkt danach; nach K3a, weil K3a das Ergebnis umbaut.

## Wer spielt was – besser sichtbar

Lukas: Man sollte einfacher sehen, wer spielt und was. Die Zeile oben in der Tischleiste ist sehr
klein und nur Text.

- **Heute:** Spielart und Spieler stehen als Text in der Tischleiste (`TableBar.tsx`,
  `tisch-leiste__status`); am Spielerplatz gibt es zusätzlich die Marken „Spieler“ und
  „Mitspieler“ (sobald bekannt).
- **Ideen:** ein deutliches Schild in der Tischmitte bzw. am Platz des Spielers mit dem
  Spiel-Symbol (z. B. Farbzeichen der Rufsau oder Trumpffarbe, „Wenz“, „Geier“) und dem Namen;
  Spieler-Platz farbig hervorgehoben; bei Tout/Sonderspielen eigene Kennzeichnung. Muss mit den
  kommenden Sonderspielen (K3–K5, H1–H3) mitwachsen, etwa Ramsch ohne Spieler oder die Hochzeit.
- **Vorgehen:** Gestaltungspaket mit Lukas im Dialog (Haltepunkt mit Bildschirmfotos), gut
  zusammen mit „Letzten Stich besser zeigen“; nach K3a, damit die neuen Ergebnis- und
  Spielarten-Strukturen schon stehen.
