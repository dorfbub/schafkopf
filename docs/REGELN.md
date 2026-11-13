# Regeln

Dieses Dokument beschreibt, was der Kern (`packages/core`) umsetzt. Es ist die Referenz für Tests.
Wer eine Regel ändert, ändert zuerst dieses Dokument, dann Test und Code.

## Festgelegt

| Thema             | Entscheidung                                                     |
| ----------------- | ---------------------------------------------------------------- |
| Spieler, Blatt    | Tischregel: 4 mit langer Karte (Standard), 4 oder 3 mit kurzer   |
| Lange Karte       | 32 Karten, 8 je Spieler                                          |
| Kurze Karte       | 24 Karten ohne 7er und 8er; zu viert 6, zu dritt 8 je Spieler    |
| Spielarten        | Sauspiel, Wenz, Geier, Farbwenz, Farb-Solo, Bettel; Tout und Sie |
| Zu dritt          | Nur Einzelspiele, kein Sauspiel (siehe „Kurze Karte und Dreier“) |
| Alle „weiter“     | Tischregel: Zusammenwerfen (Standard), Ramsch, Stock oder Muss   |
| Kontra/Re         | Tischregel, Standard aus (siehe „Kontra und Re“)                 |
| Legen, Bockrunden | Nicht gespielt                                                   |
| Abrechnung        | Grundtarif, Schneider, Schwarz, Laufende                         |

## Karten

Farben: Eichel, Gras, Herz, Schellen. Augen: Sau 11, Zehner 10, König 4, Ober 3, Unter 2, sonst 0 –
zusammen 120.

## Spielarten

| Spielart  | Trümpfe (hoch → niedrig)                  | Farbkarten (hoch → niedrig) | Allein | Laufende ab |
| --------- | ----------------------------------------- | --------------------------- | ------ | ----------- |
| Sauspiel  | 4 Ober, 4 Unter, Herz A 10 K 9 8 7        | A 10 K 9 8 7                | nein   | 3           |
| Farb-Solo | 4 Ober, 4 Unter, Trumpffarbe A 10 K 9 8 7 | A 10 K 9 8 7                | ja     | 3           |
| Wenz      | 4 Unter                                   | A 10 K O 9 8 7              | ja     | 2           |
| Geier     | 4 Ober                                    | A 10 K U 9 8 7              | ja     | 2           |
| Farbwenz  | 4 Unter, Trumpffarbe A 10 K O 9 8 7       | A 10 K O 9 8 7              | ja     | 3           |
| Bettel    | keine                                     | A K O U 10 9 8 7            | ja     | –           |

Ober und Unter stechen untereinander in der Reihenfolge Eichel, Gras, Herz, Schellen.

## Ansage

Die Ansage läuft in zwei Stufen, wie am Wirtshaustisch (von Lukas so festgelegt).

**Stufe 1 – „Ich würde“ oder „weiter“.** Reihum ab dem Spieler links vom Geber sagt jeder genau
einmal „Ich würde“ (er möchte spielen) oder „weiter“. Wer „weiter“ sagt, ist für dieses Spiel
draußen und kann später nicht mehr einsteigen.

- Sagen alle „weiter“, wird zusammengeworfen.
- Will nur einer spielen, nennt er gleich sein Spiel (Stufe 3) – jedes, das er spielen darf.

**Stufe 2 – Zweikampf.** Wollen mehrere spielen, wird in Zweikämpfen ausgemacht, wer spielt. Der
früheste Interessent (in Sitzreihenfolge ab links vom Geber) **hält**, der nächste **fordert** ihn.

- Der Forderer nennt nur eine **Spielart** (z. B. „Wenz“, „Solo Tout“), keine Farbe. Sie muss höher
  sein als die zuletzt im Zweikampf genannte Spielart.
- Der Haltende antwortet „ich auch“ – er hält mit gleicher oder höherer Spielart, ohne sie zu
  verraten – oder „gut“ und gibt auf. Bei gleichem Rang hat also der Frühere Vorrang.
- Hält er, darf der Forderer eine höhere Spielart nennen oder aufgeben.
- Wer aufgibt, ist draußen. Der Sieger hält gegen den nächsten Interessenten, bis keiner mehr übrig
  ist.
- Genannt und gehalten werden darf nur eine Spielart, für die man selbst ein erlaubtes Spiel dieser
  oder höherer Spielart hat.

**Stufe 3 – Spiel nennen.** Wer übrig bleibt, nennt sein genaues Spiel mit Farbe. Es muss
mindestens so hoch sein wie die zuletzt im Zweikampf genannte Spielart; höher geht auch (Wenz
gehalten, Solo gespielt). Ohne Zweikampf ist er frei.

Für alle Stufen gilt:

- Alles Gesagte ist für alle hörbar; „ich auch“ verrät aber nicht, was man hat.
- Rangfolge: Sauspiel < Bettel < Geier < Farbwenz < Wenz < Solo. Jede Tout-Ansage schlägt jede
  Ansage ohne Tout. Die Farbe spielt für den Rang keine Rolle.
- Sauspiel: Gerufen werden darf jede Farbe außer Herz, von der man mindestens eine Farbkarte
  (kein Ober/Unter), aber nicht die Sau hat.
- Tout gibt es für Solo, Wenz, Geier und Farbwenz.

## Stiche

- Es kommt immer der Spieler links vom Geber heraus, danach der Gewinner des letzten Stichs.
- **Bedienpflicht**: Wer die angespielte Farbe hat, muss sie zugeben. Trumpf gilt als eigene Farbe.
- Kein Stichzwang, kein Trumpfzwang.
- Der höchste Trumpf gewinnt den Stich, sonst die höchste Karte der angespielten Farbe.

### Rufsau

Für den Besitzer der gerufenen Sau gilt:

1. Wird die Ruffarbe angespielt, **muss** er die Sau zugeben.
2. Er darf die Ruffarbe nur mit der Sau anspielen – außer er hat vier oder mehr Karten der Ruffarbe
   („Davonlaufen“).
3. Er darf die Sau nicht abwerfen, solange die Ruffarbe nicht gespielt wurde (außer als letzte
   Karte).
4. Nach dem Davonlaufen ist die Sau frei.

Wer der Mitspieler ist, erfahren die anderen erst, wenn die Rufsau fällt.

## Abrechnung

Standardtarif (in `RuleSet.tariff` einstellbar): Sauspiel 10 Cent, Einzelspiele 50 Cent, jeder
Aufschlag 10 Cent.

- **Gewonnen** ist mit 61 Augen. Bei 60:60 verliert die Spielerpartei.
- **Schneider**: Gegner unter 30 Augen bzw. Spielerpartei unter 31. **Schwarz**: kein Stich.
  Schwarz schließt Schneider ein (zwei Aufschläge).
- **Laufende**: höchste Trümpfe in ununterbrochener Folge bei einer Partei, ab der Schwelle aus der
  Tabelle; ein Aufschlag je Laufendem.
- **Spielwert** = Grundtarif + Schneider + Schwarz + Laufende.
- **Tout**: gewonnen nur mit allen Stichen. Wert = (Grundtarif + Laufende) × 2, kein
  Schneider/Schwarz.
- **Sie** (alle Ober und Unter auf einer Hand, im Solo): Grundtarif × 4, immer gewonnen.
- **Bettel**: gewonnen, wenn der Spieler keinen Stich macht. Wert = Grundtarif Einzelspiel.
- **Zahlung**: Im Sauspiel zahlt jeder Verlierer den Spielwert an einen Gewinner. Im Einzelspiel
  zahlt bzw. bekommt der Spieler den Spielwert von jedem der drei Gegner (zu dritt: der zwei).

## Kurze Karte und Dreier

Lukas' Wunsch von Anfang an (Paket K6). Der Gastgeber wählt in der Lobby eine von drei
Besetzungen: **vier Spieler mit langer Karte** (Standard), **vier mit kurzer Karte** („Kurzer“,
6 Karten je Spieler) oder **drei mit kurzer Karte** („Dreier“, 8 Karten je Spieler). Lange Karte
zu dritt gibt es nicht (32 Karten gehen nicht auf drei auf). Die Festlegungen stehen unter
„Annahmen“, Nr. 50–59.

- **Kurze Karte:** Es fehlen die 7er und 8er. Sie zählen keine Augen, also bleiben es 120 Augen:
  gewonnen mit 61, Schneider- und Schwarz-Grenzen wie bei langer Karte. Trümpfe und Farben wie in
  den Tabellen oben, nur ohne 7 und 8; Laufende zählen über die Trümpfe des kurzen Blatts.
  Davonlaufen geht ab **drei** Karten der Ruffarbe, denn jede Farbe hat nur noch vier Farbkarten.
- **Zu dritt** spielt der Spieler immer allein gegen die zwei anderen. Es gibt **kein Sauspiel,
  keine Hochzeit und keine arabische Hochzeit**, weil es keinen Partner geben kann. Ansagbar sind
  die Einzelspiele: Bettel, Geier, Farbwenz, Wenz, Farb-Solo und, wenn eingeschaltet, Eisenbahner
  und Hawaii-Habicht – mit Tout wie zu viert. Mit kurzer Karte zu viert gibt es keinen
  Hawaii-Habicht (nur sechs Stiche, Annahme 58).
- **Abrechnung zu dritt:** Tarif wie im Einzelspiel zu viert; der Spieler zahlt bzw. bekommt den
  Spielwert von **jedem der zwei** Gegner.
- **Alle „weiter“ zu dritt:** Zusammenwerfen, Ramsch und Stock wie zu viert (Ramsch: der Verlierer
  zahlt an jeden der zwei anderen). **Muss gibt es zu dritt nicht.**
- **Sie** zu dritt wie gewohnt (alle vier Ober und vier Unter auf einer Hand im Solo); mit kurzer
  Karte zu viert hat niemand acht Karten, Sie kommt dort nicht vor.

## Varianten

Von Lukas im November 2026 festgelegt. **Umgesetzt** sind die Regeln für alle „weiter“
(Ramsch, Stock, Muss), Kontra/Re (K4) und die Hochzeit (K5). Schnittstellen dazu:
[entwurf-sonderspiele.md](entwurf-sonderspiele.md); Pakete K3a–K3d, K4, K5 in
[ARBEITSPAKETE.md](ARBEITSPAKETE.md). Alle Varianten sind Tischregeln, die der Gastgeber vor dem
ersten Spiel wählt; Standard ist „aus“ bzw. Zusammenwerfen. Ergänzende Festlegungen
stehen unter „Annahmen“ (Nr. 10–19, von Lukas bestätigt).

### Alle „weiter“

Der Gastgeber wählt genau eine der vier Möglichkeiten: Zusammenwerfen (Standard), Ramsch, Stock
oder Muss.

**Ramsch.** Es wird gespielt, jeder für sich. Trümpfe und Stichregeln wie im Sauspiel, ohne Rufsau.

- Wer am Ende die **meisten Augen** hat, verliert und zahlt den Ramsch-Tarif (Standard: wie
  Sauspiel, 10 Cent) an jeden der drei anderen.
- **Jungfrau:** Jeder Spieler ohne Stich verdoppelt, was der Verlierer zahlt (zwei Jungfrauen:
  vierfach). Abschaltbar.
- **Durchmarsch:** Wer **91 oder mehr Augen** hat, gewinnt stattdessen und bekommt den Ramsch-Tarif
  von jedem. Abschaltbar.
- Kein Schneider, kein Schwarz, keine Laufenden.
- Herauskommen wie immer: der Spieler links vom Geber. Es gibt keinen Spieler und keinen
  Mitspieler.

**Stock.** Es wird nicht gespielt. Jeder zahlt den Stock-Einsatz (Standard: wie Sauspiel, 10 Cent)
in den Pott; dann gibt der Nächste.

- Den Pott bekommt die Spielerpartei des **nächsten gewonnenen Spiels gleich welcher Art**
  (Sauspiel und Hochzeit: je zur Hälfte), zusätzlich zur normalen Abrechnung.
- Verliert die Spielerpartei, bleibt der Pott stehen. Sagen wieder alle „weiter“, wächst er.
- Kontostände und Pott ergeben zusammen immer 0. Den Pott sehen alle am Tisch und im Ergebnis.

**Muss.** Der Besitzer des Eichel-Obers muss ein Sauspiel spielen und nennt die Ruffarbe.

- Kann er nach den normalen Regeln nichts rufen („gesperrt“), darf er auch eine Sau rufen, von
  deren Farbe er keine Karte hat – nur nicht Herz und keine Sau, die er selbst hält.
- Hält er alle drei Farb-Säue selbst, wird zusammengeworfen.
- Gespielt und abgerechnet wird wie ein gewöhnliches Sauspiel; die Rufsau-Regeln gelten für den
  Mitspieler unverändert.
- „weiter“ kann er dabei nicht sagen. Herauskommen wie immer: der Spieler links vom Geber.

### Hochzeit

- **Wer:** Wer genau **einen Trumpf** hat (Trümpfe wie im Sauspiel), darf eine Hochzeit ansagen.
- **Rang:** über dem Sauspiel, unter dem Bettel. Angesagt wird sie in der normalen Ansage („Ich
  würde“, im Zweikampf „Hochzeit“). Kein Tout.
- **Ablauf nach der Ansage:** Reihum ab dem Spieler links vom Hochzeiter sagt jeder „nehme an“ oder
  „nein“. Der Erste, der annimmt, bekommt den Trumpf verdeckt und gibt dafür verdeckt eine Karte
  zurück, die kein Trumpf ist. Beide spielen zusammen gegen die anderen zwei; das wissen alle.
- **Spiel und Abrechnung:** wie Sauspiel (Trümpfe, Sauspiel-Tarif, Schneider, Schwarz, Laufende),
  ohne Rufsau-Regeln.
- **Nimmt keiner an,** gilt der Hochzeiter als „weiter“. Wer vorher im Zweikampf gegen ihn
  aufgegeben hat (z. B. ein Sauspieler), darf jetzt doch spielen. Gibt es niemanden, gilt die
  Regel für alle „weiter“.
- **Umgesetzt** (K5) als Spielart `hochzeit` in `contracts`, Standard aus. Der Annehmende bekommt
  den Trumpf zuerst und gibt dann eine Karte zurück; Laufende zählen nach dem Tausch, die
  Schwelle ist eigens einstellbar (Standard 3 wie im Sauspiel). Kontra und Re sind erst nach dem
  Tausch möglich (Annahmen 15, 16, 26–30).

### Kontra und Re

- **Kontra:** Jeder Gegenspieler darf Kontra sagen, solange die erste Karte des Spiels noch nicht
  liegt. Der Spielwert verdoppelt sich.
- **Re:** Die Spielerpartei darf darauf mit Re antworten; der Spielwert verdoppelt sich noch einmal.
- **Umgesetzt** (K4) als Tischregel `kontra`, Standard aus. Kontra und Re werden außerhalb der
  Reihe gesagt, jeweils höchstens einmal je Spiel; danach liegt das Fenster mit der ersten Karte
  zu. Der Faktor (×2 bzw. ×4) gilt für den ganzen Spielwert einschließlich Tout und Sie, nicht für
  den Pott (Annahmen 12, 18, 20–23).
- Legen und Bockrunden spielt Lukas' Runde nicht; sie bleiben mögliche spätere Tischregeln.

## Hausregeln

Spielarten aus Lukas' Runde, von ihm im November 2026 beschrieben. **Eisenbahner (H1), Hawaii-Habicht (H2) und Arabische Hochzeit (H3) sind umgesetzt.** Jede ist einzeln in `RuleSet.contracts` einschaltbar, Standard „aus“.

| Spielart           | Trümpfe (hoch → niedrig)                                      | Farbkarten (hoch → niedrig) | Allein | Tout | Laufende ab    |
| ------------------ | ------------------------------------------------------------- | --------------------------- | ------ | ---- | -------------- |
| Eisenbahner        | 4 Zehner                                                      | A K O U 9 8 7               | ja     | ja   | 2              |
| Hawaii-Habicht     | 4 Könige, dann die jeweils gültige Trumpffarbe A 10 O U 9 8 7 | A 10 O U 9 8 7              | ja     | ja   | 2 (nur Könige) |
| Arabische Hochzeit | wie Sauspiel                                                  | A 10 K 9 8 7                | nein   | nein | 3              |

Zehner und Könige stechen untereinander wie Ober und Unter: Eichel, Gras, Herz, Schellen.

**Eisenbahner.** Wie ein Wenz, nur sind die vier Zehner die Trümpfe statt der Unter.
Einzelspiel-Tarif, Schneider, Schwarz, Laufende und Tout wie beim Wenz. Umgesetzt (H1): in der
Lobby unter „Hausregeln“ einschaltbar, Standard aus; Laufende ab 2 (`RuleSet.laufende.eisenbahner`).

**Hawaii-Habicht.** Wie ein Farbwenz, nur mit den vier Königen statt der Unter – und mit zwei
Trumpffarben: Der Spieler nennt beim Ansagen eine Trumpffarbe für die **Stiche 1–4** und eine
**andere** für die **Stiche 5–8**. Die Könige sind in allen acht Stichen die höchsten Trümpfe; nach
dem vierten Stich wird die erste Farbe wieder gewöhnliche Farbe und die zweite Trumpf.
Einzelspiel-Tarif, Schneider, Schwarz und Tout wie beim Farbwenz. Laufende zählen nur über die
vier Könige, ab zwei – also höchstens vier. Umgesetzt (H2): in der Lobby unter „Hausregeln“
einschaltbar, Standard aus; Laufende ab 2 (`RuleSet.laufende.hawaii`). Beim Ansagen wählt der
Spieler erst die Farbe für die Stiche 1–4, dann eine andere für die Stiche 5–8; am Tisch zeigt das
Spielschild die gerade gültige Trumpffarbe, und nach dem vierten Stich meldet die Tischleiste den
Wechsel (Annahmen 33–36).

**Arabische Hochzeit.** Wie die Hochzeit, nur mit genau **zwei Trümpfen**: Beide gehen verdeckt an
den, der annimmt; er gibt zwei Karten zurück, die keine Trümpfe sind. Sie steht im Rang über dem
Sauspiel und unter der Hochzeit. Umgesetzt (H3): in der Lobby unter „Hausregeln“ einschaltbar,
Standard aus; Laufende ab 3 (`RuleSet.laufende.arabischeHochzeit`). Ablauf, Vorspiel und Anzeige
sind die der Hochzeit (Annahmen 15, 16, 26–30), nur mit zwei Karten statt einer.

**Rangfolge mit allen Varianten und Hausregeln:**
Sauspiel < Arabische Hochzeit < Hochzeit < Bettel < Eisenbahner < Geier < Hawaii-Habicht <
Farbwenz < Wenz < Solo. Jede Tout-Ansage schlägt jede Ansage ohne Tout.

Weitere Hausregeln gibt es nicht (Lukas, 12.11.2026).

## Einstellbare Tischregeln

Der Gastgeber stellt in der Lobby ein, womit der Tisch spielt (`RuleSet`); nach Spielbeginn ist
nichts mehr änderbar. Alle Mitspieler sehen die Regeln (Lobby und Info-Knopf am Tisch). Die
Voreinstellung `DEFAULT_RULES` entspricht genau den Werten dieses Dokuments.

| Option (`RuleSet`)    | Bedeutung                                            | Standard         | Gültig                                      |
| --------------------- | ---------------------------------------------------- | ---------------- | ------------------------------------------- |
| `contracts`           | erlaubte Spielarten; Sauspiel ist immer an           | die sechs klass. | Sauspiel enthalten                          |
| `allowTout`           | Tout-Ansagen erlaubt                                 | an               | an/aus                                      |
| `tariff.sauspiel`     | Grundtarif Sauspiel (Cent)                           | 10               | ganzzahlig ≥ 0                              |
| `tariff.solo`         | Grundtarif Einzelspiele (Cent)                       | 50               | ganzzahlig ≥ 0                              |
| `tariff.extra`        | Aufschlag je Schneider, Schwarz, Laufendem (Cent)    | 10               | ganzzahlig ≥ 0                              |
| `laufende.<Spielart>` | Schwelle für Laufende je Spielart (ohne Bettel)      | 3/3/2/2/3/3      | ganzzahlig 1–8                              |
| `sie`                 | „Sie“ (alle Ober und Unter) wird erkannt und bezahlt | an               | an/aus                                      |
| `davonlaufen`         | Davonlaufen mit vier Karten der Ruffarbe erlaubt     | an               | an/aus                                      |
| `allPassed`           | Was bei alle „weiter“ passiert                       | `zusammenwerfen` | `zusammenwerfen`, `ramsch`, `stock`, `muss` |
| `tariff.ramsch`       | Ramsch-Tarif (Cent), zahlt der Verlierer an jeden    | 10               | ganzzahlig ≥ 0                              |
| `tariff.stock`        | Stock-Einsatz (Cent), zahlt jeder in den Pott        | 10               | ganzzahlig ≥ 0                              |
| `ramsch.durchmarsch`  | Durchmarsch ab 91 Augen gewinnt                      | an               | an/aus                                      |
| `ramsch.jungfrau`     | Jeder Spieler ohne Stich verdoppelt                  | an               | an/aus                                      |
| `kontra`              | Kontra und Re erlaubt                                | aus              | an/aus                                      |
| `players`             | Zahl der Spieler                                     | 4                | 3 oder 4                                    |
| `deck`                | Lange oder kurze Karte                               | `lang`           | `lang` (nur zu viert), `kurz`               |
| `botStrength`         | Spielstärke aller Bots (keine Spielregel, B2)        | `normal`         | `anfaenger`, `normal`, `stark`              |

Reihenfolge der Schwellen: Sauspiel, Farb-Solo (`solo`), Wenz, Geier, Farbwenz, Hochzeit →
3, 3, 2, 2, 3, 3; dazu `eisenbahner` 2 und `arabischeHochzeit` 3. Die klassischen sechs Spielarten sind Sauspiel, Bettel, Geier, Farbwenz, Wenz
und Solo; die Hochzeit ist zusätzlich wählbar und standardmäßig aus.
Ist `sie` aus, wird ein Solo mit allen Obern und Unter wie jedes andere Solo abgerechnet
(Laufende zählen dann). Ist `davonlaufen` aus, darf die Ruffarbe nur mit der Sau angespielt werden.
Die Unteroptionen für Ramsch gelten nur bei `allPassed: 'ramsch'`, der Stock-Einsatz nur bei
`'stock'`; sie bleiben aber gespeichert.
Zu dritt gelten zusätzlich: kurze Karte, kein Muss, und mindestens eine Einzelspielart muss
eingeschaltet sein; die Partnerspiele (Sauspiel, Hochzeit, arabische Hochzeit) bleiben in
`contracts` gespeichert, sind aber nicht ansagbar. Die Spielerzahl lässt sich nur ändern, solange
nicht mehr Menschen am Tisch sitzen als Plätze bleiben.
Werte, die nicht passen, lehnt der Host ab; alles andere bleibt unverändert.

Alle Hausregeln (Eisenbahner, Hawaii-Habicht, Arabische Hochzeit) sind Optionen in `contracts`;
Eisenbahner und Hawaii-Habicht haben eine eigene Schwelle in `laufende`. Fest bleiben die
Bettel-Reihenfolge und die Rangfolge der Spielarten (feste Regeln).

## Annahmen

Diese Punkte wurden nicht abgefragt und nach gängiger Spielweise festgelegt. Jede Runde spielt
etwas anders; Abweichungen bitte hier korrigieren. Stand 13.11.2026: Alle Annahmen (1–75) hat Lukas
bestätigt.

1. **Ansage zweistufig** (Ablauf oben von Lukas festgelegt). Angenommen: Im Zweikampf fordert der
   nächste Interessent in Sitzreihenfolge den bisherigen Sieger; „ich auch“ und das Nennen sind nur
   mit einem Blatt erlaubt, das ein Spiel dieser Spielart oder höher hergibt (kein Bluff ins Leere).
2. **Rangfolge der Spielarten**, vor allem die Einordnung von Bettel, Geier und Farbwenz.
3. **Tarif** 10 / 50 / 10 Cent (einstellbar).
4. **Laufende** ohne Obergrenze; Schwelle 2 bei Wenz und Geier, sonst 3 (einstellbar).
5. **Bettel**: Zehner reiht sich zwischen Unter und Neuner ein; kein offener Bettel („Bettel
   ouvert“).
6. **Tout**: Laufende werden mitverdoppelt.
7. **Sie** wird automatisch erkannt und abgerechnet, muss nicht angesagt werden (abschaltbar).
8. **Davonlaufen** ab vier Karten der Ruffarbe einschließlich der Sau (abschaltbar).
9. **Herauskommen**: Auch im Solo kommt der Spieler links vom Geber heraus.

### Annahmen zu Varianten und Hausregeln

Beim Erfragen der Varianten offen geblieben und nach gängiger Spielweise bzw. in Analogie
vorgeschlagen. **Von Lukas am 11.11.2026 bestätigt** – sie gelten damit als festgelegt.

10. **Ramsch, Gleichstand:** Haben zwei Spieler gleich viele Augen, verliert, wer mehr Stiche hat;
    dann, wer mehr Trümpfe in seinen Stichen hat; dann, wer den höchsten Trumpf in seinen Stichen
    hat.
11. **Ramsch, Durchmarsch und Jungfrau:** Beim Durchmarsch zählen Jungfrauen nicht. Im Ramsch gibt
    es kein Kontra.
12. **Stock, Einsatz:** eigener Tarifwert, Standard gleich dem Sauspiel-Tarif. Kontra/Re
    verdoppeln den Pott nicht.
13. **Stock am Ende des Abends:** Ein stehengebliebener Pott wird in der Endabrechnung zu gleichen
    Teilen zurückgezahlt. Geht er nicht in ganzen Cent auf, bekommen die übrigen Cent die Spieler
    mit dem niedrigsten Stand (je einer, bei Gleichstand der niedrigere Sitz). Danach gleichen
    möglichst wenige Überweisungen die Stände aus (`settleUp`); die Überweisungen sind ein
    Vorschlag – bezahlt wird außerhalb der App.
14. **Muss:** keine Sonderabrechnung (kein „gewonnen mit 60“, kein doppelter Tarif). Wer den
    Eichel-Ober hat, wird dadurch bekannt.
15. **Hochzeit, Tausch:** Der Annehmende wählt die Karte, die er zurückgibt, selbst; hat er nur
    Trümpfe, darf er einen Trumpf zurückgeben. Laufende zählen nach dem Tausch.
16. **Hochzeit, keiner nimmt an:** Dürfen danach mehrere doch spielen, machen sie es im Zweikampf
    unter sich aus, wie in der normalen Ansage.
17. **Arabische Hochzeit, Rang:** über dem Sauspiel (Lukas: „unter der Hochzeit“).
18. **Kontra/Re:** Re ist nur möglich, solange die erste Karte noch nicht liegt. Kontra darf jeder
    Gegenspieler sagen, Re jeder aus der Spielerpartei (der Mitspieler im Sauspiel verrät sich
    damit). Tout und Sie werden mitverdoppelt.
19. **Eisenbahner und Hawaii-Habicht:** Einzelspiel-Tarif; Tout rechnet wie bei den anderen
    Einzelspielen. Im Hawaii-Habicht gilt die Bedienpflicht je Stich nach der gerade gültigen
    Trumpffarbe.

### Annahmen aus der Umsetzung (K3b–K3d)

Bei der Umsetzung aufgetaucht, in REGELN.md bisher nicht entschieden; nach gängiger Spielweise
gewählt. **Von Lukas am 12.11.2026 bestätigt.**

20. **Ramsch, Gleichstand nach allen Stufen aus Annahme 10:** Haben die Gleichstehenden gleich viele
    Augen und Stiche und keiner von ihnen einen Trumpf in seinen Stichen (selten, aber möglich),
    verliert, wer von ihnen den späteren Stich gemacht hat.
21. **Stock, Pott lässt sich nicht glatt teilen:** Bekommt eine Partei aus mehreren Spielern den
    Pott, erhält jeder den gleichen ganzen Cent-Betrag; ein Rest bleibt im Pott stehen. (Mit vier
    Spielern ist der Pott immer ein Vielfaches von vier Einsätzen und teilt sich glatt; die Regel
    greift erst, wenn sich Spielerzahl oder Einsatz einmal ändern können.)

### Annahmen zum Eisenbahner (H1)

Bei der Umsetzung festgelegt, ohne Rückfrage. **Von Lukas am 12.11.2026 bestätigt** (31, 32).

31. **Eisenbahner, Farbkarten und Bedienen:** Die vier Zehner sind eine eigene Farbe beim Bedienen
    (wer einen Zehner hat, muss ihn auf einen angespielten Zehner zugeben; ein Zehner bedient
    keine Farbe). Ober und Unter sind gewöhnliche Farbkarten: A K O U 9 8 7. Laufende zählen
    über die Zehner in der Reihenfolge Eichel, Gras, Herz, Schellen, mit oder gegen die Zehner.
32. **Eisenbahner und Bots:** Der Heuristik-Bot sagt ihn an, wenn er am Tisch erlaubt ist und das
    Blatt reicht (bewertet wie Wenz und Geier, B3), und spielt ihn regelgerecht mit.

### Annahmen zum Hawaii-Habicht (H2)

Bei der Umsetzung festgelegt, ohne Rückfrage. **Von Lukas am 12.11.2026 bestätigt** (33–36).

33. **Hawaii-Habicht, Laufende gegen den Spieler:** Wie bei allen Spielen zählen Laufende auch
    „ohne“: Haben die Gegenspieler den Eichel- und den Gras-König, sind es zwei Laufende gegen den
    Spieler. Die Trümpfe der beiden Farben zählen nie mit.
34. **Hawaii-Habicht, Rang der Farbpaare:** Alle zwölf Paare (erste und zweite Farbe) sind gleich
    viel wert; im Zweikampf wird nur „Hawaii-Habicht“ genannt, die Farben erst beim Ansagen.
35. **Hawaii-Habicht, Bedienen beim Wechsel:** Ein Stich gehört immer ganz zu einer Phase. Ab
    Stich 5 ist die erste Farbe eine gewöhnliche Farbe (A 10 O U 9 8 7, ohne König); wer sie dann
    nicht mehr hat, muss nicht mit Trumpf bedienen. Hat ein Spieler in Stich 1–4 nicht Trumpf
    bedient, kann er ab Stich 5 trotzdem Trümpfe (Könige ausgeschlossen) der zweiten Farbe haben.
36. **Hawaii-Habicht und Bots:** Der Heuristik-Bot sagt ihn an, wenn er am Tisch erlaubt ist und
    das Blatt reicht; er wählt das beste der zwölf Farbpaare (B3, Annahme 73). Er rechnet ab
    Stich 5 mit der zweiten Farbe. Mit kurzer Karte zu viert gibt es den Hawaii-Habicht nicht
    (Annahme 58).

### Annahmen zu Kontra und Re (K4)

Bei der Umsetzung von K4 offen geblieben und ohne Rückfrage festgelegt. **Von Lukas am 12.11.2026
bestätigt.**

22. **Außerhalb der Reihe:** Kontra und Re sind an keinen Zug gebunden. Jeder Berechtigte darf sie
    sagen, solange die erste Karte nicht liegt – auch der Herauskommende, bevor er ausspielt.
    Kontra und Re gibt es je Spiel höchstens einmal; es zählt, wer zuerst sagt.
23. **Mitspieler im Sauspiel:** Sagt er Re, ist er ab da für alle als Mitspieler erkennbar
    (Annahme 18). Ein Kontra verrät nichts, denn jeder Gegenspieler darf es sagen.
24. **Kein Kontra ohne Spielerpartei:** Bei Zusammenwerfen (kein Spiel) und im Ramsch gibt es kein
    Kontra (Annahme 11). Im Bettel darf Kontra gegeben werden wie in jedem anderen Spiel.
25. **Zusammen mit Bock:** Sollten Bockrunden je kommen, multiplizieren sich die Faktoren
    (Kontra im Bock ×4, mit Re ×8).

### Annahmen zur Hochzeit (K5)

Bei der Umsetzung von K5 offen geblieben und ohne Rückfrage nach gängiger Spielweise festgelegt.
**Von Lukas am 12.11.2026 bestätigt.**

26. **Tausch, Reihenfolge:** Der Annehmende bekommt den Trumpf des Hochzeiters zuerst auf die Hand
    und wählt danach die Karte, die er zurückgibt. Zurückgeben muss er eine Karte, die kein Trumpf
    ist, solange er eine hat; nur mit lauter Trümpfen gibt er einen Trumpf zurück (auch den
    erhaltenen). Welche Karten getauscht wurden, sehen nur die beiden.
27. **Nach gescheiterter Hochzeit, wer nachrückt:** Nur wer in einem Zweikampf **aufgegeben** hat,
    rückt nach – nicht, wer in der ersten Runde „weiter“ gesagt hat. Die Nachrücker fangen ohne
    Mindest-Spielart neu an (ein verdrängter Sauspieler darf wieder Sauspiel nennen), in
    Sitzreihenfolge ab links vom Geber. Die Hochzeit darf in diesem Spiel niemand mehr nennen,
    auch nicht ein anderer Spieler mit genau einem Trumpf. Wer nur die Hochzeit hätte spielen
    können, rückt nicht nach.
28. **Mehrere Hochzeiter:** Haben zwei Spieler je genau einen Trumpf, tragen sie es im Zweikampf
    aus wie jede andere Spielart; der Frühere hat bei Gleichstand Vorrang.
29. **Kontra und Re:** Das Fenster öffnet erst, wenn der Tausch erledigt ist und gespielt wird.
    Der Partner steht dann fest, Re sagen dürfen beide.
30. **Herauskommen:** Wie immer der Spieler links vom Geber, auch wenn er an der Hochzeit beteiligt
    ist (Annahme 9). Ist „alle weiter“ auf Muss gestellt und scheitert eine Hochzeit ohne
    Nachrücker, muss der Besitzer des Eichel-Obers spielen – auch wenn es der Hochzeiter ist.

### Annahmen zur Arabischen Hochzeit (H3)

Ohne Rückfrage nach gängiger Spielweise festgelegt. **Von Lukas am 12.11.2026 bestätigt** (40–42).

40. **Zu wenige Nicht-Trümpfe beim Zurückgeben:** Hat der Annehmende nach dem Erhalt der zwei
    Trümpfe weniger als zwei Karten, die keine Trümpfe sind, gibt er alle seine Nicht-Trümpfe und
    dazu so viele Trümpfe, wie zur zweiten Karte fehlen (Verallgemeinerung von Annahme 15: er gibt
    immer so wenige Trümpfe zurück wie möglich).
41. **Laufende:** Schwelle 3 wie bei Sauspiel und Hochzeit; gezählt wird nach dem Tausch wie bei
    der Hochzeit. Tarif wie Sauspiel, kein Tout.
42. **Bots:** Der Heuristik-Bot sagt die arabische Hochzeit an und nimmt sie an wie die Hochzeit
    (Annahme 72). Der Zufalls-Bot lehnt ab und gibt, wenn er als Vertretung annehmen musste, die
    zwei niedrigsten erlaubten Karten zurück.

### Annahmen zu kurzer Karte und Dreier (K6)

Ohne Rückfrage nach gängiger Spielweise beim „Kurzen“ und beim Dreier-Schafkopf festgelegt.
**Von Lukas am 12.11.2026 bestätigt.**

50. **Besetzungen:** Vier mit langer Karte (Standard), vier mit kurzer oder drei mit kurzer Karte.
    Der Gastgeber wählt in der Lobby; nach Spielbeginn ist nichts mehr änderbar. Wechselt er auf
    drei, rücken Sitzende von Platz 4 auf einen freien Platz; sitzen schon vier Menschen, geht es
    nicht.
51. **Spielarten zu dritt:** nur Einzelspiele (Bettel, Geier, Farbwenz, Wenz, Farb-Solo; Eisenbahner
    und Hawaii-Habicht, wenn eingeschaltet). Kein Sauspiel, keine Hochzeit, keine arabische
    Hochzeit. Rangfolge, Zweikampf und Tout wie zu viert. Einen Ersatz für das Sauspiel (etwa ein
    Pflicht-Herz-Solo) gibt es nicht; wer nichts Einzelnes spielen mag, sagt „weiter“.
52. **Abrechnung zu dritt:** Einzelspiel-Tarif, Aufschläge, Tout, Sie, Kontra und Re wie zu viert.
    Der Spieler zahlt bzw. bekommt den Spielwert von jedem der zwei Gegner. Kontra dürfen beide
    Gegenspieler sagen, Re der Spieler.
53. **Alle „weiter“ zu dritt:** Zusammenwerfen, Ramsch und Stock wie zu viert. Im Ramsch zahlt der
    Verlierer den Ramsch-Tarif an jeden der zwei anderen; Durchmarsch ab 91 Augen, Jungfrau wie
    gehabt. Beim Stock zahlt jeder den Einsatz; den Pott bekommt der Spieler des nächsten
    gewonnenen Spiels allein. Muss gibt es zu dritt nicht (ohne Sauspiel kein Pflichtspiel); die
    Lobby bietet es nicht an, der Host lehnt es ab.
54. **Augen und Schneider mit kurzer Karte:** 7er und 8er zählen keine Augen, es bleiben 120.
    Gewonnen mit 61, Schneider unter 30 bzw. 31, Schwarz ohne Stich – wie bei langer Karte.
55. **Laufende mit kurzer Karte:** gezählt über die Trümpfe des kurzen Blatts (Herz-7 und -8 gibt
    es nicht); die Schwellen bleiben, wie sie eingestellt sind (Standard wie bei langer Karte).
56. **Sie mit kurzer Karte:** Zu dritt (8 Karten) wie gewohnt. Kurz zu viert (6 Karten) kann
    niemand alle acht Ober und Unter halten; eine verkürzte Sie (etwa vier Ober und zwei Unter)
    gibt es nicht.
57. **Davonlaufen mit kurzer Karte:** ab drei Karten der Ruffarbe einschließlich der Sau, weil
    eine Farbe nur noch vier Farbkarten hat (A 10 K 9). Bei langer Karte bleibt es bei vier.
58. **Hochzeit und Hausregeln mit kurzer Karte zu viert:** Hochzeit (genau ein Trumpf) und
    arabische Hochzeit (genau zwei) wie bei langer Karte, mit Tausch wie gehabt; Eisenbahner wie
    gehabt. Den **Hawaii-Habicht gibt es mit kurzer Karte zu viert nicht**: Er lebt von zwei
    Hälften mit je vier Stichen, und mit sechs Stichen passt das nicht. Zu dritt (acht Stiche)
    wechselt die Trumpffarbe wie gewohnt nach dem 4. Stich.
59. **Ansage, Geben und Bots zu dritt:** Ansage, Herauskommen und Geberwechsel laufen reihum über
    drei Plätze wie über vier. Die Bots spielen alle Besetzungen mit; sie bewerten ihr Blatt nach
    der Kartenzahl und sagen zu dritt kein Partnerspiel an.

### Annahmen zu den Bots (B3)

Bei der Umsetzung von B3 ohne Rückfrage festgelegt. Spielregeln ändern sie nicht, nur wie die Bots
spielen. **Von Lukas am 12.11.2026 bestätigt.**

70. **Tischregeln:** Ein Bot kennt die Tischregeln wie jeder Mensch am Tisch (sie sind öffentlich)
    und sagt nur Spielarten an, die dort erlaubt sind, Tout nur mit „Tout erlaubt“. „Ich würde“
    sagt er nur, wenn eine erlaubte Spielart für sein Blatt reicht.
71. **Kontra und Re nur am Zug:** Bots sagen Kontra oder Re nur, wenn sie selbst am Zug sind und
    es noch dürfen – vor der ersten Karte ist das nur der Herauskommende. Außerhalb der Reihe
    (Annahme 22) sagen sie nichts. Kontra bei einem Blatt, das gegen ein Partnerspiel selbst ein
    gutes Sauspiel wäre (gegen eine Hochzeit etwas mehr), gegen ein Einzelspiel bei der Hälfte der
    Trumpfstärke und Sauen; Re mit deutlich mehr als dem Nötigen. Im Bettel doppeln sie nicht.
72. **Hochzeit und arabische Hochzeit:** Ein Bot sagt sie mit zwei Sauen (oder gleichwertigen
    Farbstichen) an. Er nimmt an, wenn er mit den erhaltenen Trümpfen ein starkes Sauspiel-Blatt
    hätte, und gibt die Karte(n) so zurück, dass eine Farbe frei wird; eine Sau behält er lieber.
    Als Vertretung eines Menschen, der angenommen hat, gibt er genauso zurück.
73. **Hawaii-Habicht ohne Tout:** Bots sagen den Hawaii-Habicht nie als Tout an – selbst mit
    allen Königen sticht ein Gegner mit einer hohen Karte der gerade gültigen Farbe.
74. **Ramsch:** Bots vermeiden Stiche und Augen (das hält auch die Jungfrau). Auf Durchmarsch
    spielen sie nur mit fast sicherem Blatt – mindestens sechs Trümpfe, darunter drei der vier
    Ober mit Eichel- und Gras-Ober, sonst nur Sauen – und geben auf, sobald die anderen zusammen
    mehr als 29 Augen haben. Hat ein anderer alle bisherigen Stiche (ab zwei) oder fast alle
    Augen, nehmen sie einen Stich, wenn es sicher geht, und schenken ihm sonst keine Augen.

### Annahmen zu den Bots (B4)

Bei der Umsetzung von B4 ohne Rückfrage festgelegt (Lukas war nicht erreichbar). Spielregeln ändern
sie nicht, nur wie die Bots ansagen. **Von Lukas am 13.11.2026 bestätigt.**

75. **Ansage nach Erwartungswert:** Bots (Normal, Anfänger, Stark) sagen ein Spiel an, wenn es laut
    Ansage-Tabelle im Schnitt mehr bringt als „weiter“ (`ANSAGE_SCHWELLE`, in Vielfachen des
    Sauspiel-Tarifs), und nennen in Stufe 3 das wertvollste erlaubte Spiel – auch Tout, wenn es mehr
    bringt (Hawaii-Habicht weiter nie, Annahme 73). Das ersetzt die handgesetzten Schwellen aus
    Annahme 70 und 72: Eine Hochzeit bieten sie nun mit fast jedem Blatt mit genau einem Trumpf an
    (gemessen lohnt sich das in 95 % der Fälle), nicht mehr nur mit zwei Sauen. Annehmen und
    Zurückgeben bleiben wie in Annahme 72. Verfahren und Zahlen: `docs/STRATEGIEN.md`,
    „Ansage-Tabellen“.
