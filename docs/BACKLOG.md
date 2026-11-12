# Backlog

Langfristige Themen, die noch nicht als Arbeitspaket geschnitten sind. Wer ein Thema angeht,
schneidet es zuerst in Pakete mit Abnahmekriterien für [ARBEITSPAKETE.md](ARBEITSPAKETE.md) und
streicht es hier. Neue Ideen einfach unten anhängen – ein Satz genügt.

Spalte „Klären“: was Lukas beantworten muss, bevor jemand anfängt.

Entschieden am 12.11.2026: Gemischt wird weiter fair und zufällig (`docs/ARCHITEKTUR.md`,
„Mischen“); „Mischen wie am echten Tisch“ kommt nicht. Eine eigene Android-App kommt nicht: Lukas
hat die installierbare Web-App getestet, auch offline, und sie reicht. Die Überlegungen dazu
(Trusted Web Activity, Capacitor) stehen in der Git-Geschichte dieser Datei. Weitere Hausregeln
gibt es nicht (Lukas, 12.11.2026). Der Schafkopf-Trainer ist als T1/T2 in die Arbeitspakete
gewandert.

Erledigt vom Spielabend (11.11.2026): „Tisch springt bei letzter Karte“, „Wer spielt was“,
„Letzten Stich besser zeigen“, „Spielverlauf nach dem Spiel“ – beschrieben in
[DESIGN.md](DESIGN.md), Abschnitt „Spieltisch“.

| Thema                | Größe  | Klären                               |
| -------------------- | ------ | ------------------------------------ |
| Weitere Kartensets   | mittel | Welche nach bayerisch und Salzburger |
| Watten               | groß   | Variante(n); integrieren oder forken |
| Lebendige Bildkarten | mittel | Welche Momente; wie viel Bewegung    |

---

## Weitere Kartensets

Bayerisch und Salzburger gibt es seit U9 (`docs/ARBEITSPAKETE.md`). Offen sind weitere Sätze
(fränkisch, württembergisch, französisch) – die Grundlage dafür steht.

Ursprüngliche Notiz:

Beim Eröffnen des Tisches das Blatt wählen: bayerisch, Salzburger, ggf. weitere (fränkisch,
württembergisch, französisch).

**In Arbeit als U9** ([ARBEITSPAKETE.md](ARBEITSPAKETE.md)): Grundlage und Salzburger Entwurf
stehen, Haltepunkt bei Lukas.

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

## Lebendige Bildkarten

Idee vom Testabend (12.11.2026), eher für später: Die Figuren auf den Karten (Könige, Ober, Unter,
Säue) bewegen sich in passenden Momenten. Beispiel: Wird die Eichel-Sau gerufen, winkt sie.

- **Passt zur Architektur:** Die Kartenbilder sind selbst gezeichnete SVGs (U2, `CardTheme`).
  Einzelne Teile (Arm, Krone, Schwanz) lassen sich als eigene Gruppen per CSS animieren, ohne
  neue Abhängigkeit.
- **Zu klären:** bei welchen Momenten (gerufene Sau, Stich mit dem Eichel-Ober, Laufende, Tout);
  nur kurz und selten, damit es nicht nervt; „Bewegung reduzieren“ schaltet alles ab.
- **Ohne Ton:** U6 (Töne, Sprüche) ist gestrichen, das Spiel bleibt tonlos und einfach. Animationen
  deshalb sparsam halten.
