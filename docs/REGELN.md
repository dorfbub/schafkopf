# Regeln

Dieses Dokument beschreibt, was der Kern (`packages/core`) umsetzt. Es ist die Referenz für Tests.
Wer eine Regel ändert, ändert zuerst dieses Dokument, dann Test und Code.

## Festgelegt

| Thema                        | Entscheidung                                                     |
| ---------------------------- | ---------------------------------------------------------------- |
| Spieler                      | 4                                                                |
| Blatt                        | Lange Karte, 32 Karten, 8 je Spieler                             |
| Spielarten                   | Sauspiel, Wenz, Geier, Farbwenz, Farb-Solo, Bettel; Tout und Sie |
| Alle „weiter“                | Zusammenwerfen. Langfristig beim Eröffnen des Tisches wählbar    |
| Kontra/Re, Legen, Bockrunden | Nicht gespielt                                                   |
| Abrechnung                   | Grundtarif, Schneider, Schwarz, Laufende                         |

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
  zahlt bzw. bekommt der Spieler den Spielwert von jedem der drei Gegner.

## Annahmen – bitte prüfen

Diese Punkte wurden nicht abgefragt und nach gängiger Spielweise festgelegt. Jede Runde spielt
etwas anders; Abweichungen bitte hier korrigieren.

1. **Ansage zweistufig** (Ablauf oben von Lukas festgelegt). Angenommen: Im Zweikampf fordert der
   nächste Interessent in Sitzreihenfolge den bisherigen Sieger; „ich auch“ und das Nennen sind nur
   mit einem Blatt erlaubt, das ein Spiel dieser Spielart oder höher hergibt (kein Bluff ins Leere).
2. **Rangfolge der Spielarten**, vor allem die Einordnung von Bettel, Geier und Farbwenz.
3. **Tarif** 10 / 50 / 10 Cent.
4. **Laufende** ohne Obergrenze; Schwelle 2 bei Wenz und Geier, sonst 3.
5. **Bettel**: Zehner reiht sich zwischen Unter und Neuner ein; kein offener Bettel („Bettel
   ouvert“).
6. **Tout**: Laufende werden mitverdoppelt.
7. **Sie** wird automatisch erkannt und abgerechnet, muss nicht angesagt werden.
8. **Davonlaufen** ab vier Karten der Ruffarbe einschließlich der Sau.
9. **Herauskommen**: Auch im Solo kommt der Spieler links vom Geber heraus.
