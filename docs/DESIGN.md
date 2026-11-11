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
(Herkunft und Lizenz – CC0 seit 11.11.2026 – in `docs/entwuerfe/karten/LIZENZ.md`). Unter, Ober, König und Sau
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
- ~~**Handy, Ansage:** Der Dialog überdeckt die seitlichen Plätze~~ – in D3 gelöst (Dialog unten,
  Plätze oben).
- **Kartenrücken:** Platzhalter; endgültig mit U2.
- **Animationen** (Lukas, D2): Karte legen, Stich zum Gewinner wegräumen und Austeilen sind seit
  D3 umgesetzt (siehe „Spieltisch“).

## Gestaltungssystem (D2, freigegeben am 11.11.2026)

Aus der Richtung „Kartentisch“ abgeleitet. **Freigegeben von Lukas am 11.11.2026.**

### Dateien

| Datei                                | Inhalt                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `apps/web/src/styles/tokens.css`     | Alle Variablen – die einzige Stelle mit festen Farb-, Größen- und Zeitwerten |
| `apps/web/src/styles/base.css`       | Schriften, Zurücksetzen, Grundtypografie, Flächen `.surface-felt/-paper`     |
| `apps/web/src/styles/components.css` | Klassen der Bausteine (`.btn`, `.field`, `.tafel`, `.dialog`, …)             |
| `apps/web/src/styles/contrast.ts`    | Kontrastformel und die Farbpaare, die WCAG AA erreichen müssen               |
| `apps/web/src/ui/kit/`               | Bausteine als React-Komponenten                                              |
| `apps/web/src/styles.css`            | Start und Lobby, auf die Variablen umgestellt; Layout baut D4 neu            |
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

| Variable                                          | Wert                              | Verwendung                                       |
| ------------------------------------------------- | --------------------------------- | ------------------------------------------------ |
| `--color-ground`                                  | `#0d2a18`                         | Hintergrund um den Tisch, Leisten                |
| `--color-felt` / `-deep` / `-light`               | `#17603a` / `#0f4428` / `#1b663f` | Filz, Verlauf zum Rand, Lampenlicht in der Mitte |
| `--color-felt-raised`                             | `#12391f`                         | Flächen auf dem Filz (Platz, dunkle Tafel)       |
| `--color-felt-line`                               | `#3d7a52`                         | Linien und Ränder auf Grün                       |
| `--color-wood` / `-dark`                          | `#4a2f1c` / `#2a1a0e`             | Holzrand                                         |
| `--color-on-felt`                                 | `#f5f0e4`                         | Schrift auf Grün                                 |
| `--color-on-felt-muted`                           | `#d0dfd0`                         | leise Schrift auf Grün                           |
| `--color-negative-on-felt`                        | `#ffc8bd`                         | Minus auf Grün                                   |
| `--color-brass` / `--color-on-brass`              | `#e9c46a` / `#2a1a08`             | am Zug, spielbar, Marken; Schrift darauf         |
| `--color-paper` / `-raised`                       | `#fbf7ec` / `#ffffff`             | Dialoge, Tafeln; Eingabefelder                   |
| `--color-paper-line` / `-line-soft`               | `#d9d0bd` / `#e9e1cf`             | Trennlinien auf Papier; gesperrte Felder         |
| `--color-paper-control`                           | `#8a7d66`                         | Rand von Eingabefeldern und sekundären Knöpfen   |
| `--color-on-paper` / `-muted`                     | `#1f1a14` / `#6b6355`             | Schrift auf Papier                               |
| `--color-negative-on-paper`                       | `#b42318`                         | Minus auf Papier, Fehler                         |
| `--color-accent` / `-hover` / `--color-on-accent` | `#b45309` / `#9a4708` / `#fff`    | Hauptknopf, Auswahl                              |
| `--color-card-face` / `-edge` / `-back`           | `#fff` / `#a8a29e` / `#1f4f8a`    | Karte                                            |

**Messing als Schrift** nur groß/fett auf Filz (≥ 3 : 1) oder auf dem dunklen Grund; kleine
Beschriftungen in Messing immer als Marke (Messing-Fläche, dunkle Schrift).

### Schrift, Abstände, Radien, Schatten, Bewegung

| Gruppe     | Variablen                                                                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schriftart | `--font-display` (Fraunces: Namen, Überschriften, Augenzahl), `--font-body` (Source Sans 3)                                                                                                    |
| Größen     | `--text-xs` 12 · `-sm` 14 · `-md` 16 · `-lg` 20 · `-xl` 24 · `-2xl` 32 px                                                                                                                      |
| Gewichte   | `--weight-regular` 400 · `-semibold` 600 · `-bold` 700 · `-display` 650 · `-display-light` 500                                                                                                 |
| Abstände   | `--space-1` … `--space-7`: 4 · 8 · 12 · 16 · 24 · 32 · 48 px                                                                                                                                   |
| Größen     | `--control-height` 44 px (Tippfläche), `-sm` 36 px, `--avatar-size`, `--card-w`, `--card-h`, `--card-ratio` 115 : 195                                                                          |
| Radien     | `--radius-sm` 6 · `-md` 10 · `-lg` 16 px · `-pill`; Karte `--card-radius`                                                                                                                      |
| Schatten   | `--shadow-card`, `-raised` (Tafel), `-dialog`, `-turn` (Messing-Schein), `-playable`, `-rim` (Holzrand)                                                                                        |
| Bewegung   | `--duration-fast` 120 · `-base` 200 · `-slow` 360 ms, `--ease-out`, `--ease-in-out`; bei „Bewegung reduzieren“ alle 0 ms; seit D3 dazu `--duration-sweep`, `--duration-deal-step`, `--ease-in` |

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

Karten laufen über die Schnittstelle `CardTheme`. **Einziges Kartenbild ist das bayerische Blatt**
(`bayerischTheme` in `ui/cardTheme.tsx`), auch in der App selbst; das frühere schlichte Text-Kartenbild
ist gestrichen, weil es nur verwirrt hat (Lukas, D2). Die SVGs liegen bis U2 weiter in
`docs/entwuerfe/karten/` und werden von dort eingebunden. Sie landen damit im Build; die Zahlenkarten hat
Fabian Bally unter CC0 freigegeben (siehe `karten/LIZENZ.md`).

### Kontraste (WCAG AA)

Automatisch geprüft in `apps/web/src/styles/contrast.test.ts` (Teil von `npm run check`) und auf
der Musterseite angezeigt. Schrift auf Grün wird gegen die hellste Stelle des Filzes geprüft.

| Paar                                | Wert       | nötig   |
| ----------------------------------- | ---------- | ------- |
| Schrift auf Grund / auf Filz        | 13,6 / 6,1 | 4,5     |
| Leise auf Filz / auf Platz          | 5,0 / 9,3  | 4,5     |
| Minus auf Filz                      | 4,7        | 4,5     |
| Messing auf Filz (groß) / auf Grund | 4,2 / 9,2  | 3 / 4,5 |
| Schrift auf Messing                 | 10,1       | 4,5     |
| Schrift / leise auf Papier          | 16,1 / 5,5 | 4,5     |
| Leise auf gesperrtem Feld           | 4,6        | 4,5     |
| Minus auf Papier                    | 6,1        | 4,5     |
| Akzent auf Papier                   | 4,7        | 4,5     |
| Hauptknopf / Hover                  | 5,0 / 6,4  | 4,5     |
| Rand Eingabefeld                    | 3,8        | 3       |
| Fokusring auf Papier / auf Filz     | 4,7 / 4,5  | 3       |

Ausnahme: deaktivierte Knöpfe (45 % Deckkraft) – WCAG nimmt inaktive Bedienelemente aus.

## Spieltisch (D3, freigegeben am 11.11.2026)

Der Tisch nach der Richtung „Kartentisch“, gebaut mit den Bausteinen und Variablen aus D2.
**Layout und Bewegung von Lukas freigegeben am 11.11.2026** (zwei Haltepunkte).

| Ansage                                                   | Laufender Stich                                        | Ergebnis                                                     |
| -------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| ![Ansage, Desktop](bilder/tisch/desktop-1-ansage.webp)   | ![Stich, Desktop](bilder/tisch/desktop-2-stich.webp)   | ![Ergebnis, Desktop](bilder/tisch/desktop-3-ergebnis.webp)   |
| ![Ansage, hochkant](bilder/tisch/hochkant-1-ansage.webp) | ![Stich, hochkant](bilder/tisch/hochkant-2-stich.webp) | ![Ergebnis, hochkant](bilder/tisch/hochkant-3-ergebnis.webp) |
| ![Ansage, quer](bilder/tisch/quer-1-ansage.webp)         | ![Stich, quer](bilder/tisch/quer-2-stich.webp)         | ![Ergebnis, quer](bilder/tisch/quer-3-ergebnis.webp)         |

### Dateien

| Datei                                      | Inhalt                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `apps/web/src/ui/Table.tsx`                | verbindet den Tisch mit `ClientSession`/`HostSession`                                       |
| `apps/web/src/ui/table/TableBoard.tsx`     | der Tisch; arbeitet nur auf `TableView`, Aktionen über Rückrufe                             |
| `apps/web/src/ui/table/*`                  | `TableBar`, `Seats`, `TrickArea`, `OwnSeat`, `BidDialog`, `ResultDialog`, `LastTrickDialog` |
| `apps/web/src/ui/table/useTrickDisplay.ts` | hält den fertigen Stich fest und steuert das Wegräumen                                      |
| `apps/web/src/styles/table.css`            | Layout, Größenstufen und Bewegung des Tischs                                                |
| `apps/web/src/muster/Tischprobe.tsx`       | Tischprobe mit festen Spielständen, nur im Entwicklungsserver (siehe unten)                 |

**Tischprobe:** `http://localhost:5180/#tisch?szene=…` mit `ansage` („Ich würde“/„weiter“),
`zweikampf` (du forderst), `halten` (du wirst gefordert), `nennen` (Spiel nennen), `warten`,
`stich` (laufender Stich, du bist dran), `ergebnis`, `zuschauer`; mit `&auto=1` spielen die anderen
weiter. Die Spielstände kommen aus dem Kern (fester Seed), ohne Netz.

### Aufbau

- **Leiste:** Spielnummer und Stich („Stich 4 von 8“), was gespielt wird („Xaver spielt Sauspiel
  auf die Gras-Sau“, Spielart in Messing) bzw. wer ansagt, Knöpfe „Letzter Stich“ und „Verlassen“.
- **Plätze der anderen** (`PlayerSeat`): am Zug = Messingschein + Marke „am Zug“, Geber = „G“ am
  Bild, Marken „Spieler“/„Mitspieler“ (Papier), sobald bekannt; Stiche und Kontostand (Minus in
  Minusfarbe); in der Ansage das Gesagte als Sprechblase („weiter“ kursiv).
- **Stich:** mittig, jede Karte vor ihrem Spieler, leicht gedreht. Der fertige Stich bleibt liegen,
  die stechende Karte hat den hellen Rand, darüber „Lukas sticht · 14 Augen“.
- **Eigener Platz:** Bild, Name, Stiche, Stand, Marken, „Du bist dran“/„Du sagst an“ in Messing.
  Darunter die Hand als Fächer, Trümpfe zuerst; die Karten ragen unten aus dem Bild (sichtbar
  `--hand-visible`). Spielbar = Messingrand und hebt sich; nicht spielbar = abgedunkelt.
- **Ansage-Dialog** (zweistufig, K1), je Stufe ein eigener Inhalt:
  - „Würdest du spielen?“ – Knöpfe „Weiter“ und „Ich würde“.
  - Zweikampf, man fordert: „Gegen Xaver: Was hast du?“ – nur die Spielart (keine Farbe), Tout als
    Schalter; Knöpfe „Aufgeben“ und „„Wenz“ sagen“. Darunter, wer hält und was zu überbieten ist.
  - Zweikampf, man hält: „Resi sagt: Solo“ – Knöpfe „Gut“ und „Ich auch“.
  - Spiel nennen: erst Spielart, dann Farbe (mit Farbzeichen aus dem Kartenbild, `CardTheme.suit`),
    Tout als Schalter; oben „Mindestens: Wenz“. Geht eine Spielart nur noch als Tout, schaltet die
    Wahl Tout ein und sperrt den Schalter. Ist nur eine Farbe möglich, ist sie vorgewählt.

  Nur was `legalCalls` erlaubt ist wählbar, der Rest gesperrt. Oben: was die anderen zuletzt gesagt
  haben, in der ersten Runde auch, wer noch kommt. Nicht modal; der Fokus springt bei jedem neuen
  Schritt in den Dialog. Die Sprechblasen an den Plätzen zeigen den letzten Ruf („weiter“ und
  „gut“ kursiv).

- **Ergebnis-Dialog:** Spielart, „Xaver und Lukas haben gewonnen“, Augen groß mit Balken (Marke
  bei 61), Stiche/Schneider/Schwarz/Sie/Laufende als Stichworte, Betrag je Gegenspieler, Tabelle
  Spiel/Stand. Die Aufschlüsselung und der Verlauf folgen mit U4. Erscheint erst, wenn der letzte
  Stich weggeräumt ist.
- **Letzter Stich:** Dialog mit den vier Karten und Namen; Escape schließt, der Fokus kehrt zurück.

### Größenstufen

Der Raum zwischen Leiste und Hand ist ein Größen-Container (`container: tisch`); Stichkarten
(`--trick-card-w`, `17cqmin`) und Plätze richten sich nach ihm. Die Grenzwerte stehen als feste
Werte in den Abfragen, weil dort keine Variablen gehen.

| Stufe           | Abfrage                        | Änderung                                                                    |
| --------------- | ------------------------------ | --------------------------------------------------------------------------- |
| breiter Tisch   | Container ≥ 40rem breit        | oberer Platz liegt quer (Bild, Name, Marken, Karten in einer Reihe)         |
| hochkant        | Container Seitenverhältnis < 1 | alle drei Plätze oben, Stich tiefer, Ansage unten über der Hand             |
| schmal          | Container ≤ 30rem breit        | Dialoge knapper (kleinere Wahlknöpfe, Farben in einer Zeile)                |
| niedrig (quer)  | Container ≤ 18rem hoch         | Plätze ohne verdeckte Karten, Ansage ohne Statuszeile, Ergebnis zweispaltig |
| Leiste schmal   | Fenster ≤ 40rem / ≤ 50rem      | Status in eigener Zeile / ohne Schriftzug                                   |
| Fenster niedrig | Fenster ≤ 30rem hoch           | eigene Infos links neben der Hand, Karten ragen weiter hinaus               |

Der Tisch hat `overflow: clip` (nicht `hidden`), damit der Fokus auf einer hinausragenden Karte
ihn nicht verschiebt. Kein horizontales Scrollen: Die Überlappung der Hand richtet sich nach
der Breite (`--hand-avail`).

### Bewegung

| Bewegung              | Dauer                                                 | Wie                                                          |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Karte legen           | `--duration-slow` 360 ms                              | gleitet vom Platz des Spielers in den Stich                  |
| Stich liegt           | 1 s (`TRICK_HOLD_MS`)                                 | ruhig; stechende Karte hebt sich (`scale`)                   |
| Stich wegräumen       | `--duration-sweep` 420 ms                             | wandert zum Gewinner, wird kleiner und blasser (`--ease-in`) |
| Austeilen             | 360 ms, Versatz `--duration-deal-step` 45 ms je Karte | Karten kommen nacheinander vom Tisch herunter                |
| Fächer zusammenrücken | `--duration-base` 200 ms                              | nach dem Ausspielen                                          |
| Dialoge, Sprechblasen | `--duration-slow` / `-base`                           | blenden ein und wachsen leicht (nur Deckkraft und `scale`)   |

Bei „Bewegung reduzieren“ sind alle Dauern 0: Alles steht sofort an seinem Platz; der fertige
Stich bleibt trotzdem 1 s liegen, damit man die vierte Karte sieht. `useTrickDisplay` liest
`--duration-sweep` aus dem CSS, damit Zeitgeber und Animation zusammenpassen.

![Karte legen](bilder/tisch/bewegung-1-karte-legen.webp)
![Stich wandert zum Gewinner](bilder/tisch/bewegung-3-stich-wandert.webp)

### Offen (für spätere Pakete)

- **Sichten:** Für den Tisch hat in `TableView`/`HandView` nichts gefehlt.
- **Hand umsortieren:** Wird nach der Ansage nach der Spielart neu sortiert, springen die Karten
  an ihren Platz (keine Bewegung).
- **Quer:** Die Ansage verdeckt den oberen Platz teilweise; das Gesagte steht im Dialog selbst.
- **Verdeckte Karten der anderen** werden nicht einzeln ausgeteilt, sondern blenden ein.

## Verworfene Richtungen

- **A · Stube** (`docs/entwuerfe/stube.html`): dunkles Nussholz mit Bernstein – „ok“, aber das
  Grün gefällt besser. ![Stube](entwuerfe/bilder/stube-stich-desktop.webp)
- **C · Schiefer** (`docs/entwuerfe/schiefer.html`): flaches Graphit mit Herzrot und
  Kreidetafel – nicht gewählt. ![Schiefer](entwuerfe/bilder/schiefer-stich-desktop.webp)
- **Rauten** (erste Runde): Nachtblau mit Rautenmuster – „geht gar nicht“, Entwurf gelöscht.
