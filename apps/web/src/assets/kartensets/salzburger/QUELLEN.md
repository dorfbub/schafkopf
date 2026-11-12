# Salzburger Bild (Entwurf, U9) – Quellen und Lizenzen

Muster für Lukas' Entscheidung (siehe `docs/DESIGN.md`, Abschnitt „Mehrere Kartensets“). Alles
unter `fremd/` ist **fremdes Material**, unverändert von Wikimedia Commons heruntergeladen am
12.11.2026; es wird nur als Bild (`<img>`) eingebunden, nie ausgeführt. Die SVGs wurden vor dem
Einbinden auf Skripte und externe Verweise geprüft (keine gefunden).

## Weg 1 – Rasterbilder (`fremd/commons-raster/`)

Scans eines Blatts von **Anton Fuchs, Salzburg, um 1848–1850** (älteste vollständige Ausgabe des
Salzburger Bilds laut IPCS). Scan: Wolfgang Altfahrt, [mpcia.at](https://mpcia.at/). Lizenz auf
Commons: **gemeinfrei** (PD-old, Zeichner seit über 100 Jahren tot; „Public Domain Mark“).
Namensnennung nicht verlangt, wir nennen den Scan trotzdem. Nach § 68 UrhG sind Vervielfältigungen
gemeinfreier Bilder auch in Deutschland nicht durch ein Lichtbildrecht geschützt.

| Datei (Commons-Seite)                                                                                                                                | Karte im Spiel | Auflösung | Größe   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------- | ------- |
| [SPKW-Salzburg-Fuchs-Salzburg1-dt-herz-ober.jpg](https://commons.wikimedia.org/wiki/File:SPKW-Salzburg-Fuchs-Salzburg1-dt-herz-ober.jpg)             | nur Vergleich  | 100 × 189 | 9,1 kB  |
| [SPKW-Salzburg-Fuchs-Salzburg1-dt-eichel-daus.jpg](https://commons.wikimedia.org/wiki/File:SPKW-Salzburg-Fuchs-Salzburg1-dt-eichel-daus.jpg)         | nur Vergleich  | 101 × 186 | 10,2 kB |
| [SPKW-Salzburg-Fuchs-Salzburg1-dt-schellen-koenig.jpg](https://commons.wikimedia.org/wiki/File:SPKW-Salzburg-Fuchs-Salzburg1-dt-schellen-koenig.jpg) | Schellen-König | 101 × 188 | 10,9 kB |
| [SPKW-Salzburg-Fuchs-Salzburg1-dt-gruen-ober.jpg](https://commons.wikimedia.org/wiki/File:SPKW-Salzburg-Fuchs-Salzburg1-dt-gruen-ober.jpg)           | Gras-Ober      | 100 × 189 | 10,1 kB |
| [SPKW-Salzburg-Fuchs-Salzburg1-dt-eichel-unter.jpg](https://commons.wikimedia.org/wiki/File:SPKW-Salzburg-Fuchs-Salzburg1-dt-eichel-unter.jpg)       | Eichel-Unter   | 106 × 187 | 10,6 kB |
| [SPKW-Salzburg-Fuchs-Salzburg1-dt-gruen-koenig.jpg](https://commons.wikimedia.org/wiki/File:SPKW-Salzburg-Fuchs-Salzburg1-dt-gruen-koenig.jpg)       | nur Vergleich  | 100 × 190 | 10,6 kB |

Weitere gemeinfreie Salzburger Scans derselben Sammlung (Fuchs, Preisinger, Rauchmiller,
Traunwiser) stehen in der Kategorie
[Salzburg pattern](https://commons.wikimedia.org/wiki/Category:Salzburg_pattern), fast alle nur
etwa 100 × 190 Pixel groß; die größeren (bis 380 × 680) zeigen das Isarkreis-/altbayerische Bild.

**Nur verlinkt, nicht verwendet:**

- [Salzburg playing card with beer barrel by Anton Fuchs.JPG](https://commons.wikimedia.org/wiki/File:Salzburg_playing_card_with_beer_barrel_by_Anton_Fuchs.JPG) –
  als gemeinfrei markiert, aber ein Handyfoto eines Bildschirmfotos aus dem IPCS-Musterblatt,
  schwarz-weiß; taugt nicht als Karte.
- Fotos heutiger Piatnik-Karten von Bermicourt und Countakeshi (CC BY-SA 4.0, z. B.
  [Salzburg pattern.png](https://commons.wikimedia.org/wiki/File:Salzburg_pattern.png)): Das Foto
  ist frei, die abgebildeten **heutigen Zeichnungen** aber vermutlich geschützt. Nicht verwenden.

## Weg 2 – Vektordateien (`fremd/commons-vektor/`)

Ein SVG-Satz des **Salzburger** Bilds mit freier Lizenz wurde nicht gefunden (gesucht: Commons,
GitHub, OpenGameArt). Der einzige deutsche Vektorsatz auf Commons ist
[German Skat cards (SVG set by Mfrasca)](<https://commons.wikimedia.org/wiki/Category:German_Skat_cards_(SVG_set_by_Mfrasca)>):
Zeichnungen von **Gunter Gerhardt** für xskat (2004), als SVG umgesetzt von Mfrasca (2013).
Lizenz **CC BY-SA 3.0** – Namensnennung und Weitergabe unter gleichen Bedingungen nötig.
Laut Beschreibung „not a traditional deck“, also weder Salzburger noch bayerisches Bild.

| Datei (Commons-Seite)                                                                                                      | Karte im Spiel | Format    | Größe    |
| -------------------------------------------------------------------------------------------------------------------------- | -------------- | --------- | -------- |
| [Playing card-german-hart-12 ober.svg](https://commons.wikimedia.org/wiki/File:Playing_card-german-hart-12_ober.svg)       | nur Vergleich  | 158 × 246 | 118,1 kB |
| [Playing card-german-eichel-01 daus.svg](https://commons.wikimedia.org/wiki/File:Playing_card-german-eichel-01_daus.svg)   | nur Vergleich  | 158 × 246 | 28,6 kB  |
| [Playing card-german-blatt-13 king.svg](https://commons.wikimedia.org/wiki/File:Playing_card-german-blatt-13_king.svg)     | Gras-König     | 180 × 280 | 116,3 kB |
| [Playing card-german-eichel-13 konig.svg](https://commons.wikimedia.org/wiki/File:Playing_card-german-eichel-13_konig.svg) | Eichel-König   | 158 × 246 | 171,4 kB |

Namensnennung in der App: Hinweis in der Lobby, wenn „Salzburger (Entwurf)“ gewählt ist
(`credits` in `apps/web/src/ui/cardTheme.tsx`).

## Weg 3 – eigene Zeichnung (`eigen/`)

Herz-Ober und Eichel-Sau, selbst gezeichnet mit `apps/web/scripts/karten/salzburger.mjs` (Rahmen,
Eckzeichen und Figurenteile aus dem U2-Generator, Farbzeichen von Fabian Bally, CC0). Vorbild sind
die Merkmale des Salzburger Bilds (IPCS Pattern Sheet 56, Fuchs-Scans oben), nicht abgepaust.
Lizenz wie das Projekt.
