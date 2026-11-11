# Gestaltung

Festlegungen zur Gestaltung der Oberfläche. **Lukas entscheidet über die Gestaltung**; was hier
steht, hat er freigegeben. Die Entwürfe liegen als klickbares HTML unter `docs/entwuerfe/`
(Übersicht: `docs/entwuerfe/index.html`; zum Ansehen `python3 -m http.server 5190 --directory
docs/entwuerfe` oder in Claude Code die Vorschau „entwuerfe“).

## Richtung: „Kartentisch“ (D1, freigegeben am 11.11.2026)

Grüner Filz als Einlage in einem dunklen Holzrahmen – ein Kartentisch im Wirtshaus, aber ohne
Deko. Die Spieler sitzen um den ovalen Tisch, der Stich liegt in der Mitte, die eigene Hand als
Fächer unten. Ansage- und Ergebnis-Dialoge stehen auf hellem Papier mitten auf dem Tisch; die Hand
bleibt beim Ansagen sichtbar.

Entwurf: `docs/entwuerfe/filz.html`

| Ansage                                                        | Laufender Stich                                             | Ergebnis                                                          |
| ------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| ![Ansage, Desktop](entwuerfe/bilder/filz-ansage-desktop.webp) | ![Stich, Desktop](entwuerfe/bilder/filz-stich-desktop.webp) | ![Ergebnis, Desktop](entwuerfe/bilder/filz-ergebnis-desktop.webp) |
| ![Ansage, Handy](entwuerfe/bilder/filz-ansage-handy.webp)     | ![Stich, Handy](entwuerfe/bilder/filz-stich-handy.webp)     | ![Ergebnis, Handy](entwuerfe/bilder/filz-ergebnis-handy.webp)     |

### Begründung

- **Grün wie bisher:** Lukas gefällt das Grün aus dem jetzigen Stand am besten. Es bleibt der
  Grundton und wird nur verfeinert (Filz, Lampenlicht, Holzrand).
- **Warm statt steril:** Der Holzrahmen und die Serifenschrift für Namen geben Gemütlichkeit; der
  Rest bleibt schlicht – keine Brezn, kein Hirschgeweih, keine Effekte.
- **Dunkel:** Lukas will einen dunklen Grundton; die hellen Karten und Papier-Dialoge stechen
  heraus.
- **Desktop zuerst:** Hauptgerät ist Desktop/Laptop; das Handy hochkant muss gut bedienbar sein.
- **Das Blatt steht im Mittelpunkt:** Der Tisch ist ruhig, damit die bunten Karten im bayerischen
  Bild wirken.

### Farben (erste Festlegung, Feinschliff in D2)

| Rolle                       | Wert                                       | Verwendung                                            |
| --------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| Grund                       | `#0d2a18`                                  | Hintergrund um den Tisch                              |
| Filz                        | `#17603a`                                  | Tischplatte (Verlauf nach `#0f4428`, Licht `#2a7d4e`) |
| Holzrand                    | `#4a2f1c`                                  | Rahmen um den Filz                                    |
| Schrift auf Grün            | `#f5f0e4`                                  | Namen, Leiste                                         |
| Schrift auf Grün, leise     | `#b9cdb9`                                  | Stiche, Stand, Nebeninfos                             |
| Messing                     | `#e9c46a`                                  | Wer dran ist, spielbare Karte, „Spieler“-Marke        |
| Papier                      | `#fbf7ec`                                  | Dialoge, Sprechblasen                                 |
| Schrift auf Papier          | `#1f1a14` / leise `#6b6355`                | Text in Dialogen                                      |
| Akzent (Handlung)           | `#b45309`                                  | Hauptknopf, gewählte Spielart, Augenzahl              |
| Minus auf Papier / auf Grün | `#b42318` / `#ffb4a6`                      | negative Beträge                                      |
| Kartenrücken                | `#1f4f8a` mit weißem Rand und Rautengitter | verdeckte Karten                                      |

Kontraste nach WCAG AA prüft D2; der Akzent `#b45309` auf Papier und Weiß auf `#b45309` liegen
über 4,5 : 1.

### Schrift (erste Festlegung)

- **Fraunces** (Serif, 500/650) für Namen, Überschriften und die Augenzahl.
- **Source Sans 3** (400/600/700) für alles andere; Zahlen mit `tabular-nums`.
- Beide stehen unter der SIL Open Font License. In der App werden sie **selbst ausgeliefert**,
  nicht von Google Fonts geladen (kein Fremdserver, auch offline nutzbar) – das erledigt D2.

### Karten

Das Blatt ist das bayerische Bild im Stil des Schmid-Blatts „Tarock Schafkopf“: doppelbildig,
Eckzeichen an allen vier Ecken. Zahlenkarten stammen von Fabian Bally, einem Freund von Lukas
(Herkunft und offene Lizenzfrage in `docs/entwuerfe/karten/LIZENZ.md`). Unter, Ober, König und Sau
sind in diesem Stil neu gezeichnet (`docs/entwuerfe/karten/erzeuge-figuren.mjs`, Übersicht
`docs/entwuerfe/karten.html`). Lukas: „geht in die richtige Richtung, aber mehr Ornamente und wie
Schmid“ – das ist Aufgabe von U2.

**Urheberrecht (Stand der Recherche, keine Rechtsberatung):** Das bayerische Bild als Muster ist
alt und frei. Die konkreten Zeichnungen der heutigen F.X.-Schmid-Karten (Marke heute bei
Ravensburger, Herstellung über Altenburger) sind dagegen vermutlich geschützt – in Deutschland bis
70 Jahre nach dem Tod des Zeichners, und das Blatt wurde zuletzt neu gezeichnet. Deshalb: Karten
selbst zeichnen und sich an den traditionellen Motiven orientieren (Haltung, Kleidung, Ornamente),
aber keine Schmid-Scans abpausen. Als Vorlage taugen gemeinfreie Drucke des Münchner Bilds aus dem 19. Jahrhundert. Quellen: [F.X. Schmid (Wikipedia)](https://en.wikipedia.org/wiki/F.X._Schmid),
[Bavarian pattern (IPCS)](https://i-p-c-s.org/pattern/ps-54.html),
[Bayerisches Einfachbild (WOPC)](https://www.wopc.co.uk/germany/ass/bayerisches-einfachbild).

### Offene Punkte für die nächsten Pakete

- **Eckzeichen zu klein:** In den Vorlagen sind Zahl und Farbzeichen in der Ecke etwa 9 % der
  Kartenbreite; in der überlappenden Hand und bei 44 px kaum lesbar. U2 vergrößert sie.
- **Handy, Ansage:** Der Dialog überdeckt die seitlichen Plätze; in D3 kompakter machen.
- **Kartenrücken:** Platzhalter; endgültig mit U2.

## Verworfene Richtungen

- **A · Stube** (`docs/entwuerfe/stube.html`): dunkles Nussholz mit Bernstein – „ok“, aber das
  Grün gefällt besser. ![Stube](entwuerfe/bilder/stube-stich-desktop.webp)
- **C · Schiefer** (`docs/entwuerfe/schiefer.html`): flaches Graphit mit Herzrot und
  Kreidetafel – nicht gewählt. ![Schiefer](entwuerfe/bilder/schiefer-stich-desktop.webp)
- **Rauten** (erste Runde): Nachtblau mit Rautenmuster – „geht gar nicht“, Entwurf gelöscht.
