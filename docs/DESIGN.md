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

### Farben (erste Festlegung; gültige Werte unter „Gestaltungssystem (D2)“)

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

Die Kontrastprüfung in D2 hat einige Werte angepasst, siehe unten.

### Schrift (erste Festlegung)

- **Fraunces** (Serif, 500/650) für Namen, Überschriften und die Augenzahl.
- **Source Sans 3** (400/600/700) für alles andere; Zahlen mit `tabular-nums`.
- Beide stehen unter der SIL Open Font License. In der App werden sie **selbst ausgeliefert**,
  nicht von Google Fonts geladen (kein Fremdserver, auch offline nutzbar); umgesetzt in D2.

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

## Gestaltungssystem (D2)

Aus der Richtung „Kartentisch“ abgeleitet. **Stand: Entwurf, wartet auf Freigabe durch Lukas.**

### Dateien

| Datei                                | Inhalt                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `apps/web/src/styles/tokens.css`     | Alle Variablen – die einzige Stelle mit festen Farb-, Größen- und Zeitwerten |
| `apps/web/src/styles/base.css`       | Schriften, Zurücksetzen, Grundtypografie, Flächen `.surface-felt/-paper`     |
| `apps/web/src/styles/components.css` | Klassen der Bausteine (`.btn`, `.field`, `.tafel`, `.dialog`, …)             |
| `apps/web/src/styles/contrast.ts`    | Kontrastformel und die Farbpaare, die WCAG AA erreichen müssen               |
| `apps/web/src/ui/kit/`               | Bausteine als React-Komponenten                                              |
| `apps/web/src/styles.css`            | Bisherige Ansichten, auf die Variablen umgestellt; Layout bauen D3/D4 neu    |
| `apps/web/src/muster/`               | Musterseite, nur im Entwicklungsserver: `http://localhost:5180/#muster`      |

Regel: **Außerhalb von `tokens.css` keine festen Farben, Längen oder Zeiten.** Erlaubt sind
Prozente, Verhältnisse und Vielfache einer Variable (z. B. `calc(var(--card-w) * 0.26)`).

### Entscheidungen

- **Nur die dunkle Filz-Variante**, kein Hell-Modus (Lukas, D2). Eine helle Variante wäre ein
  zweiter Satz derselben Variablennamen.
- **Schriften selbst ausgeliefert** über die npm-Pakete `@fontsource-variable/fraunces` und
  `@fontsource-variable/source-sans-3` (OFL 1.1). Vite bündelt die woff2-Dateien; kein Fremdserver,
  offline nutzbar. Der Browser lädt nur die Teilmengen, die er braucht (`unicode-range`).
- **Zwei Flächen:** Alles steht entweder auf Grün (`.surface-felt`) oder auf Papier
  (`.surface-paper`). Die Fläche setzt Schrift-, Leise-, Minus- und Fokusfarbe für ihren Inhalt.

### Farben

Gegenüber D1 geändert, damit alle Schriften WCAG AA erreichen: Lampenlicht `#2a7d4e` → `#1b663f`
(dezenter), leise Schrift auf Grün `#b9cdb9` → `#d0dfd0`, Minus auf Grün `#ffb4a6` → `#ffc8bd`,
Hover des Hauptknopfs dunkler statt heller (`#9a4708`), neu ein Rand für Eingabefelder.

| Variable                                                | Wert                                          | Verwendung                                       |
| ------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `--color-ground`                                        | `#0d2a18`                                     | Hintergrund um den Tisch, Leisten                |
| `--color-felt` / `-deep` / `-light`                     | `#17603a` / `#0f4428` / `#1b663f`             | Filz, Verlauf zum Rand, Lampenlicht in der Mitte |
| `--color-felt-raised`                                   | `#12391f`                                     | Flächen auf dem Filz (Platz, dunkle Tafel)       |
| `--color-felt-line`                                     | `#3d7a52`                                     | Linien und Ränder auf Grün                       |
| `--color-wood` / `-dark`                                | `#4a2f1c` / `#2a1a0e`                         | Holzrand                                         |
| `--color-on-felt`                                       | `#f5f0e4`                                     | Schrift auf Grün                                 |
| `--color-on-felt-muted`                                 | `#d0dfd0`                                     | leise Schrift auf Grün                           |
| `--color-negative-on-felt`                              | `#ffc8bd`                                     | Minus auf Grün                                   |
| `--color-brass` / `--color-on-brass`                    | `#e9c46a` / `#2a1a08`                         | am Zug, spielbar, Marken; Schrift darauf         |
| `--color-paper` / `-raised`                             | `#fbf7ec` / `#ffffff`                         | Dialoge, Tafeln; Eingabefelder                   |
| `--color-paper-line` / `-line-soft`                     | `#d9d0bd` / `#e9e1cf`                         | Trennlinien auf Papier; gesperrte Felder         |
| `--color-paper-control`                                 | `#8a7d66`                                     | Rand von Eingabefeldern und sekundären Knöpfen   |
| `--color-on-paper` / `-muted`                           | `#1f1a14` / `#6b6355`                         | Schrift auf Papier                               |
| `--color-negative-on-paper`                             | `#b42318`                                     | Minus auf Papier, Fehler                         |
| `--color-accent` / `-hover` / `--color-on-accent`       | `#b45309` / `#9a4708` / `#fff`                | Hauptknopf, Auswahl                              |
| `--color-card-face` / `-edge` / `-back`                 | `#fff` / `#a8a29e` / `#1f4f8a`                | Karte                                            |
| `--color-suit-eichel` / `-gras` / `-herz` / `-schellen` | `#78350f` / `#166534` / `#b91c1c` / `#a16207` | Farbzeichen im schlichten Kartenbild             |

**Messing als Schrift** nur groß/fett auf Filz (≥ 3 : 1) oder auf dem dunklen Grund; kleine
Beschriftungen in Messing immer als Marke (Messing-Fläche, dunkle Schrift).

### Schrift, Abstände, Radien, Schatten, Bewegung

| Gruppe     | Variablen                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Schriftart | `--font-display` (Fraunces: Namen, Überschriften, Augenzahl), `--font-body` (Source Sans 3)                              |
| Größen     | `--text-xs` 12 · `-sm` 14 · `-md` 16 · `-lg` 20 · `-xl` 24 · `-2xl` 32 px                                                |
| Gewichte   | `--weight-regular` 400 · `-semibold` 600 · `-bold` 700 · `-display` 650 · `-display-light` 500                           |
| Abstände   | `--space-1` … `--space-7`: 4 · 8 · 12 · 16 · 24 · 32 · 48 px                                                             |
| Größen     | `--control-height` 44 px (Tippfläche), `-sm` 36 px, `--avatar-size`, `--card-w`, `--card-h`, `--card-ratio` 115 : 195    |
| Radien     | `--radius-sm` 6 · `-md` 10 · `-lg` 16 px · `-pill`; Karte `--card-radius`                                                |
| Schatten   | `--shadow-card`, `-raised` (Tafel), `-dialog`, `-turn` (Messing-Schein), `-playable`, `-rim` (Holzrand)                  |
| Bewegung   | `--duration-fast` 120 · `-base` 200 · `-slow` 360 ms, `--ease-out`, `--ease-in-out`; bei „Bewegung reduzieren“ alle 0 ms |

### Bausteine

| Baustein     | Komponente / Klasse                  | Zustände                                                                                                                  |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Schaltfläche | `<Button>` / `.btn`                  | `primary` (eine Hauptaktion je Ansicht), `secondary`, `small`, deaktiviert, Hover, Fokus                                  |
| Eingabefeld  | `<TextField>` / `.field`             | leer mit Platzhalter, gefüllt, Hinweis, Fehler, deaktiviert                                                               |
| Tafel        | `<Tafel>` / `.tafel`                 | Papier (Standard), `felt` (dunkle Fläche auf dem Filz)                                                                    |
| Dialog       | `<Dialog>` / `.dialog`               | mittig auf dem Tisch oder im Fluss; nicht modal, die Hand bleibt bedienbar                                                |
| Spielerplatz | `<PlayerSeat>` / `.player-seat`      | normal, am Zug (Messing-Schein + Marke), Geber („G“ am Bild), getrennt (gestrichelt + Marke), dazu Marken und Sprechblase |
| Karte        | `<CardView>`, `<CardBack>` / `.card` | offen, verdeckt, spielbar (Messingrand, hebt sich), gesperrt (abgedunkelt), sticht (heller Rand)                          |
| Marke        | `.marke`, `--brass`, `--paper`       | kleines Schild: „am Zug“, „Spieler“, „Mitspieler“, „getrennt“                                                             |

Karten laufen über die Schnittstelle `CardTheme`. Die Musterseite zeigt das schlichte Kartenbild
und die bayerischen SVG-Entwürfe aus D1 (`muster/entwurfTheme.tsx`); Letztere werden nur im
Entwicklungsserver geladen und landen nicht im Build, bis U2 und die Lizenzfrage erledigt sind.

### Kontraste (WCAG AA)

Automatisch geprüft in `apps/web/src/styles/contrast.test.ts` (Teil von `npm run check`) und auf
der Musterseite angezeigt. Schrift auf Grün wird gegen die hellste Stelle des Filzes geprüft.

| Paar                                                  | Wert                  | nötig   |
| ----------------------------------------------------- | --------------------- | ------- |
| Schrift auf Grund / auf Filz                          | 13,6 / 6,1            | 4,5     |
| Leise auf Filz / auf Platz                            | 5,0 / 9,3             | 4,5     |
| Minus auf Filz                                        | 4,7                   | 4,5     |
| Messing auf Filz (groß) / auf Grund                   | 4,2 / 9,2             | 3 / 4,5 |
| Schrift auf Messing                                   | 10,1                  | 4,5     |
| Schrift / leise auf Papier                            | 16,1 / 5,5            | 4,5     |
| Leise auf gesperrtem Feld                             | 4,6                   | 4,5     |
| Minus auf Papier                                      | 6,1                   | 4,5     |
| Akzent auf Papier                                     | 4,7                   | 4,5     |
| Hauptknopf / Hover                                    | 5,0 / 6,4             | 4,5     |
| Rand Eingabefeld                                      | 3,8                   | 3       |
| Fokusring auf Papier / auf Filz                       | 4,7 / 4,5             | 3       |
| Farbzeichen Eichel / Gras / Herz / Schellen auf Karte | 9,1 / 7,1 / 6,5 / 4,9 | 4,5     |

Ausnahme: deaktivierte Knöpfe (45 % Deckkraft) – WCAG nimmt inaktive Bedienelemente aus.

## Verworfene Richtungen

- **A · Stube** (`docs/entwuerfe/stube.html`): dunkles Nussholz mit Bernstein – „ok“, aber das
  Grün gefällt besser. ![Stube](entwuerfe/bilder/stube-stich-desktop.webp)
- **C · Schiefer** (`docs/entwuerfe/schiefer.html`): flaches Graphit mit Herzrot und
  Kreidetafel – nicht gewählt. ![Schiefer](entwuerfe/bilder/schiefer-stich-desktop.webp)
- **Rauten** (erste Runde): Nachtblau mit Rautenmuster – „geht gar nicht“, Entwurf gelöscht.
