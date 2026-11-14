# Strategien und Faustregeln

Grundlage des Trainers (Pakete T1 und T2). Hier steht, was ein guter Schafkopfspieler in welcher
Lage tut und warum – in eigenen Worten, mit Quelle. Der Tutor (`packages/tutor`) erkennt diese
Faustregeln in der Lage, begründet damit seine Empfehlung und stellt Denkanstöße. Kennungen hier
und im Code (`RULE_IDS` in `packages/tutor/src/rules.ts`) sind dieselben; ein Test prüft das.

Inhalt:

1. [Was die Bots schon wissen](#was-die-bots-schon-wissen)
2. [Quellen](#quellen)
3. [Widersprüche und Entscheidungen](#widersprüche-und-entscheidungen)
4. [Der Katalog](#der-katalog) – 34 Faustregeln
5. [Messung der Faustregeln](#messung-der-faustregeln-t4) – Wert je Regel in Cent
6. [Didaktik](#didaktik) – wie der Tutor fragt, rät und bewertet
7. [Wie der Tutor rechnet](#wie-der-tutor-rechnet) – Schwellen, Automatikmodus, Grenzen
8. [Gewichtete Verteilungen (B5)](#gewichtete-verteilungen-b5) – was die Suche aus dem Verhalten der anderen schließt
9. [Textvorschläge für die Oberfläche](#textvorschläge-für-die-oberfläche)

---

## Was die Bots schon wissen

Ausgewertet: `packages/bots/src/heuristicBot.ts`, `hochzeit.ts`, `doubling.ts`, `strongBot.ts` und
die Bot-Annahmen 70–74 in `docs/REGELN.md`.

**Ansage (Heuristik, B4).** Jedes am Tisch erlaubte Spiel bekommt seinen erwarteten Wert in Cent aus
den Ansage-Tabellen (siehe [unten](#ansage-tabellen-b4)); gewünscht sind Spiele, die mehr als die
Schwelle bringen. Im Zweikampf nennt der Bot das niedrigste gewünschte Spiel, das überbietet, und
hält nur mit einem gewünschten Spiel mindestens dieser Höhe; in Stufe 3 sagt er das wertvollste an.
Vor B4 (B1/B3, heute noch `ansage: 'faustregel'` und Grundlage einiger Faustregeln): eine
Punktzahl aus dem Blatt minus einer Schwelle („Marge“) – Trümpfe nach ihrer Höhe, Sauen (mit Zehn
mehr), freie Farben; Sauspiel ab vier Trümpfen, Solo und Farbwenz ab sechs, Wenz/Geier mit zwei
Trümpfen nur mit dem höchsten; Bettel nur „von unten gedeckt“, Tout nur praktisch sicher.

**Hochzeit (B3, B4).** Ansagen nach der Ansage-Tabelle – mit genau einem Trumpf fast immer (vor
B4: nur mit zwei Sauen oder Sau mit Zehn und einer weiteren Sau). Annehmen nur mit einem Blatt, das mit dem geschenkten Trumpf ein starkes Sauspiel
wäre. Zurückgeben so, dass eine Farbe frei wird; eine Sau behält man lieber (Annahme 72).

**Kontra und Re (B3, Annahme 71).** Kontra gegen ein Partnerspiel nur mit einem Blatt, das selbst
ein gutes Sauspiel wäre; gegen eine Hochzeit etwas mehr. Gegen ein Einzelspiel: die Hälfte der
Trumpfstärke des Spiels plus Sauen. Re nur mit deutlich mehr, als das Spiel braucht. Im Bettel nie.

**Kartenspiel (Heuristik).** Der Bot merkt sich gefallene Karten und erkannte Fehlfarben.

- Spielerpartei am Ausspiel: Trumpf ziehen, solange Gegner welche haben können – allein von oben,
  im Sauspiel klein (der Partner sticht mit); dann sichere Sauen heimbringen; im Sauspiel sonst die
  Ruffarbe anspielen, um den Partner zu finden; zuletzt die billigste Karte.
- Gegenspieler am Ausspiel: im Sauspiel die Rufsau suchen (billigste Karte der Ruffarbe); sonst
  eine Sau, solange die Farbe frisch ist; sonst eine billige Farbkarte in einer Farbe, die der
  Spieler noch hat; Trumpf nur, wenn nichts anderes bleibt.
- Zugeben: Hält der Partner den Stich sicher, schmieren (viele Augen, aber keine hohen Trümpfe).
  Ist es unsicher, mit einem sicheren Stecher übernehmen, wenn mindestens vierzehn Augen drin sind,
  sonst billig. Liegt der Gegner vorn: mit dem sicheren Stecher stechen, wenn es lohnt; bei zehn
  oder mehr Augen auch unsicher mit dem höchsten Stecher; sonst abspatzen.
- „Billig“ heißt: wenig Augen, keine Trümpfe, keine sicheren Stiche, eher aus kurzen Farben.
- Bettel: Der Spieler bleibt mit der höchsten möglichen Karte drunter, spielt niedrig an. Die
  Gegner spielen die Karte an, unter die er am schwersten drunter kommt (möglichst wenige
  ungesehene kleinere Karten derselben Farbe, in einer Farbe, die er noch haben kann), bleiben
  niedrig, solange er noch kommt, und werfen hohe Karten ab, wenn sie nicht bedienen können –
  die kleinen brauchen sie zum Anspielen (seit B4).
- Ramsch (Annahme 74): Stiche und Augen vermeiden, unter einer höheren Karte die eigenen hohen
  Karten loswerden; Durchmarsch nur mit fast sicherem Blatt; hat ein anderer alle Stiche, einen
  sicheren Stich nehmen.

**Stark (B2, B5).** Bewertet jede erlaubte Karte mit Probespielen: Die ungesehenen Karten werden passend
zu allem Bekannten (Kartenzahlen, Fehlfarben, Rufsau) verteilt und mit der Heuristik zu Ende
gespielt; gezählt werden die Cent am Ende. Seit B5 sind die Verteilungen nicht mehr gleich
wahrscheinlich: Bevorzugt werden die, die zu Ansage, Kontra und den gespielten Karten der anderen
passen (siehe [unten](#gewichtete-verteilungen-b5)). Angesagt wird nach der Ansage-Tabelle wie bei
der Heuristik. Diese Suche ist die Rechnung des Tutors (siehe [unten](#wie-der-tutor-rechnet)).

## Quellen

| Kürzel | Quelle                                                                                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1     | Stefan Dillig: _Schafkopf – Mit Taktik zum Erfolg_, Band 1 (3. Aufl. 2017). Inhaltsverzeichnis und Leseprobe, schafkopfschule.de. Kapitelangaben wie „D1 1.5“ beziehen sich auf die Kapitelnummern dort. |
| D2     | Stefan Dillig: _Schafkopf – Mit Taktik zum Erfolg_, Band 2 (2021). Inhaltsverzeichnis und Leseprobe, schafkopfschule.de.                                                                                 |
| WB     | Wikibooks, „Kartenspiele: Schafkopf“ (Abschnitte zu Ansage, Spieler, Gegenspieler).                                                                                                                      |
| SKS    | Schafkopfschule: „Schafkopfregeln aktuell“ – Begriffe „kurzer Weg“ und „langer Weg“.                                                                                                                     |
| SZ     | Interview mit Stefan Aldenhoven (Schafkopfschule), Süddeutsche Zeitung, 25.10.2019 – häufige Fehler, u. a. die Rufsau selbst suchen.                                                                     |
| PG     | pagat.com, Schafkopf und Ramsch – ein einziger Stich, auch ohne Augen, verhindert den Durchmarsch.                                                                                                       |
| BOT    | Die eigenen Bots (B1–B3), siehe oben; über viele Simulationen grob abgestimmt.                                                                                                                           |
| WT     | Verbreitetes Wissen am Wirtshaustisch, ohne einzelne schriftliche Quelle. So gekennzeichnet, wo nichts anderes vorliegt.                                                                                 |

Alle Texte hier sind eigene Zusammenfassungen; zitiert wird nichts. Von D1 und D2 waren nur
Inhaltsverzeichnis und Leseprobe zugänglich – die Kapitelüberschriften nennen die Technik, die
Begründungen hier sind eigene.

## Widersprüche und Entscheidungen

1. **Rufsau als Spieler selbst suchen.** Die Heuristik spielt als Sauspieler die Ruffarbe an, wenn
   kein Trumpf zu ziehen ist und keine sichere Sau mehr bleibt. D1 (1.5) und das Interview SZ nennen
   genau das einen typischen Fehler: Der Ansager verrät seine Schwäche, und die Gegner sind am
   Zug, bevor der Partner etwas tun kann. **Entscheidung:** Der Tutor lehrt D1
   (`spieler.rufsau.nicht.selbst.suchen`). Die Heuristik bleibt, wie sie ist (sie tut es nur spät
   im Spiel, und eine Änderung wäre ein Bot-Paket); die Suche entscheidet im Einzelfall.
2. **Wie Trumpf ziehen?** WB rät, hoch und niedrig abzuwechseln, um nichts zu verraten; die
   Heuristik zieht allein von oben, im Sauspiel klein; D2 hat sowohl „mit Laufenden anziehen“
   (4.5) als auch „Solo mit kleinem Trumpf beginnen“ (4.7). **Entscheidung:** zwei Regeln. Hat der
   Solospieler den höchsten noch draußen befindlichen Trumpf, zieht er von oben
   (`spieler.solo.von.oben`); sonst sagt die Regel nur „Trumpf“ (`spieler.trumpf.ziehen`), und die
   Höhe bestimmt die Rechnung.
3. **Gegenspieler und Trumpf.** Allgemein gilt (WT, BOT): Gegenspieler spielen keinen Trumpf an.
   D1 (3.14, 3.22) und D2 (5.29) kennen Ausnahmen: gegen einen Spieler, der selbst sucht, nach einem
   Davonlaufen, oder um dem Alleinspieler einen hohen Trumpf zu ziehen. **Entscheidung:** Die Regel
   gilt (`gegner.kein.trumpf.anspielen`); widerspricht die Rechnung deutlich, zeigt der Tutor sie
   als Ausnahme („hier passt die übliche Regel nicht“). Gerade das sind lehrreiche Momente.
4. **Zeitpunkt des Kontra.** WB beschreibt Kontra nach dem ersten Stich; bei uns gilt (Annahmen
   18, 20–22): bis zur ersten Karte. Das ist eine Regel, keine Strategie – maßgeblich ist
   `docs/REGELN.md`.
5. **Mindestblatt fürs Sauspiel.** WB: ab etwa fünf Trümpfen. D1 (1.1, 1.10): fünf Trümpfe mit
   einem der drei höchsten Ober und eine freie Farbe oder Sau; auch vier hohe Trümpfe mit freier
   Farbe und Sau; oder sechs Trümpfe ohne die hohen Ober, dafür zwei freie Farben oder eine Sau.
   Die Heuristik verlangt vier Trümpfe und gewichtet. **Entscheidung:** Der Tutor nimmt die
   Varianten aus D1 (`ansage.sauspiel.grundblatt`) – sie lassen sich als „zwei Farben im Griff“
   merken.
6. **Wenz.** WB: zwei Unter und Farben, die etwa sechs Stiche erwarten lassen; günstiger, wenn man
   herauskommt. Heuristik: zwei Unter nur mit dem höchsten, Farben als Folgen von oben.
   **Entscheidung:** drei Unter oder zwei mit dem Eichel-Unter, dazu zwei Sauen
   (`ansage.wenz.unter.und.farben`); die Lage „man kommt heraus“ steht als Platzhalter (`first`)
   im Text.
7. **Wo die Suche anders rechnet als jede Faustregel.** Die Suche sieht Ausnahmen, die keine
   Faustregel kennt, rechnet aber mit Stichproben und einer Heuristik als Gegner, also mit
   Rauschen. **Entscheidung:** Sind zwei Möglichkeiten im Rahmen des Rauschens gleich gut, gewinnt
   die Faustregel (sie lässt sich lernen); ist eine deutlich besser, gewinnt die Rechnung, und die
   Regel erscheint als Ausnahme.
8. **Was der Ansager hat.** Die Suche des starken Bots verteilte die verdeckten Karten, als hätte
   der Ansager irgendein Blatt. Gegen ein Solo rechnete sie dann mit einem viel zu schwachen
   Spieler und riet etwa, Sauen anzuspielen, die längst gestochen würden. **Entscheidung (T1):** Der
   Tutor verwarf Verteilungen, in denen der Ansager sein Spiel nach der Heuristik nicht angesagt
   hätte (`respectBids`). **Seit B5** geht das in der Gewichtung der Verteilungen auf: Ansage aller
   anderen (auch „weiter“), Kontra und gespielte Karten zählen als weiche Wahrscheinlichkeit, beim
   starken Bot am Tisch wie bei Max; auch Bettel und die Mitspieler eines Hochzeitsspiels sind
   eingeschlossen (siehe [Gewichtete Verteilungen](#gewichtete-verteilungen-b5)).

## Der Katalog

Jede Faustregel: **Kennung**, Bereich, wann sie greift, die Begründung für Spieler, die die Regeln
kennen, Ausnahmen, Quelle. Die Reihenfolge ist die des Codes und zugleich die Priorität: Spezielle
Regeln stehen vor allgemeinen. Der Denkanstoß (`denkanstoss.<kennung>`) steht im
[Textvorschlag](#textvorschläge-für-die-oberfläche).

### Ansage

#### `ansage.zu.schwach`

- **Bereich:** Ansage (Stufe 1 und Zweikampf).
- **Wann:** Kein am Tisch erlaubtes Spiel bringt laut Ansage-Tabelle (B4) mehr als die Schwelle –
  dieselbe Prüfung wie bei der Heuristik am Tisch. (Bis T5: „Marge unter −1,5“ der alten
  Heuristik, die mit der Tabelle nicht mehr übereinstimmte.)
- **Begründung:** Wer mit einem schwachen Blatt spielt, verliert meist das Spiel und oft dazu
  Schneider. „Weiter“ kostet nichts, und als Gegenspieler hilft man trotzdem mit.
- **Ausnahmen:** Muss (dann ist „weiter“ nicht erlaubt).
- **Quelle:** BOT, WT.

#### `ansage.sauspiel.grundblatt`

- **Bereich:** Ansage.
- **Wann:** Sauspiel erlaubt und eines dieser Blätter: fünf Trümpfe mit einem der drei höchsten
  Ober und dazu eine freie Farbe oder eine Farbsau; vier Trümpfe, davon zwei Ober, mit freier
  Farbe und Farbsau; sechs Trümpfe mit zwei freien Farben oder einer Sau.
- **Begründung:** Ein Sauspiel trägt, wenn die Spielerpartei mindestens zwei Farben im Griff hat:
  die Ruffarbe (dort sitzt die Sau des Partners) und eine Farbe, die man frei ist oder mit der
  Sau hält. Mit den Trümpfen holt man die ersten Trumpfrunden.
- **Ausnahmen:** Mit einem Blatt für ein Solo spielt man das höhere Spiel. Mit lauter kleinen
  Trümpfen kann „sich rufen lassen“ besser sein (D1 1.7).
- **Ansage-Tabelle (B4):** Zwei typische Grundblätter bringen etwa +9 bis +11 Cent; vier kleine
  Trümpfe mit einer Sau etwa −2 Cent, drei Trümpfe etwa −3 Cent. Das Sauspiel ist knapp.
- **Quelle:** D1 1.1, 1.10; WB; BOT.

#### `ansage.solo.trumpflaenge`

- **Bereich:** Ansage.
- **Wann:** In einer Farbe sechs Trümpfe mit mindestens zwei Obern, oder sieben Trümpfe (mit
  kurzer Karte entsprechend weniger).
- **Begründung:** Allein gegen drei braucht man die Mehrheit der Trümpfe: Zieht man sie, bleiben
  den Gegnern nur Farbkarten, und die eigenen Sauen stechen. Hohe Ober bringen dazu Laufende.
- **Ausnahmen:** Mit vielen Trümpfen, aber lauter Spatzen in den Farben, ist ein Wenz oder ein
  Sauspiel oft sicherer; welche Farbe Trumpf wird, überlegt man (D2 4.1, D1 4.7).
- **Ansage-Tabelle (B4):** Sechs Trümpfe mit zwei Obern und einer Sau etwa +75 Cent, sieben mit drei
  Obern etwa +270 Cent; aber auch fünf Trümpfe mit zwei Obern und zwei Sauen etwa +75 Cent und sechs
  mit nur einem Ober etwa +17 bis +24 Cent. Die Regel ist eher zu vorsichtig.
- **Quelle:** WB; D1 4.1, 4.3; D2 4.1; BOT.

#### `ansage.wenz.unter.und.farben`

- **Bereich:** Ansage.
- **Wann:** Wenz erlaubt; drei Unter oder zwei mit dem Eichel-Unter, und mindestens zwei Sauen.
- **Begründung:** Im Wenz gibt es nur vier Trümpfe. Wer die hohen Unter hat, holt sich das
  Ausspiel zurück, und die Stiche kommen aus den Farben – also aus Sauen und langen Farben von
  oben. Wer selbst herauskommt, kann seine Farben gleich spielen.
- **Ausnahmen:** Mit nur einem Unter fast nie (D2 4.13); Farbwenz oder Solo abwägen (D1 4.14).
- **Ansage-Tabelle (B4):** Drei Unter, zwei Sauen und eine lange Farbe etwa +250 Cent; zwei Unter
  mit dem Eichel-Unter und zwei Sauen, aber kurzen Farben etwa −65 bis −68 Cent – auf die Farbstiche kommt es an.
- **Quelle:** WB; D1 4.14; D2 4.13, 4.15; BOT.

#### `ansage.bettel.nur.sicher`

- **Bereich:** Ansage.
- **Wann:** Bettel erlaubt. Spricht dafür, wenn die Ansage-Tabelle (B4, mit „Stark“ simuliert) den
  Bettel höher als die Schwelle bewertet; dagegen, wenn das Blatt nur verlockend aussieht (kaum
  hohe Karten), die Tabelle ihn aber nicht lohnend nennt und kein anderes Spiel lohnt. (Bis T5:
  „jede Farbe von unten gedeckt“ – strenger als die Tabelle, nach B4 gemessen schädlich. Die
  Kennung blieb, der Titel heißt jetzt „Bettel nur, wenn er sich lohnt“.)
- **Begründung:** Im Bettel reicht ein einziger Stich zum Verlieren, und die Gegner suchen genau
  die Farbe, in der man nicht drunter kommt. Eine einzelne hohe Karte ist tragbar, wenn man sie
  früh abwerfen kann; mehrere nicht.
- **Ausnahmen:** keine; der Tutor meldet ein lückenhaftes Bettel-Blatt aber nur, wenn kein anderes
  Spiel lohnt.
- **Ansage-Tabelle (B4):** Von unten gedeckt etwa +130 Cent; mit blankem Schellen-Ober und -Zehner
  etwa −43 bis −5 Cent, mit blankem König oder blanker Sau etwa −70 bis −100 Cent. Eine hohe Karte
  über der Sieben ist tragbar, wenn man sie früh abwerfen kann (einzelne Sieben daneben: gemessen
  +26 bis +54 Cent). Genau das übernimmt die Regel jetzt aus der Tabelle.
- **Quelle:** BOT, WT.

#### `ansage.tout.nur.sicher`

- **Bereich:** Ansage (Zweikampf und Stufe 3, nur mit „Tout erlaubt“).
- **Wann:** Ein Spiel ist sehr stark (sein Tabellenwert ohne Tout liegt bei mindestens fünf
  Sauspiel-Tarifen). Spricht für das Spiel, das die Ansage-Tabelle am höchsten bewertet – mit
  oder ohne Tout. (Bis T5: Tout nur bei „praktisch sicher alle Stiche“ – Solo nur mit den vier
  Obern und Trümpfen, Wenz nur mit allen Trümpfen und Farben von oben –, nach B4 gemessen
  schädlich, weil die Tabelle auch bei weniger sicheren Blättern Tout vorn sieht. Kennung und
  Titel „Tout nur, wo es mehr bringt“.)
- **Begründung:** Tout verdoppelt den Gewinn, aber ein einziger abgegebener Stich verliert alles.
  Es lohnt nur mit einem Blatt, das praktisch jeden Stich macht – sonst ist das Spiel ohne Tout
  mehr wert.
- **Ausnahmen:** keine.
- **Ansage-Tabelle (B4):** Sicheres Tout (alle Ober, dazu zwei Unter) etwa +660 statt +390 Cent;
  sieben Trümpfe mit drei Obern als Tout etwa −300 Cent, ohne Tout etwa +270 Cent.
- **Quelle:** D2 4.6; BOT.

#### `zweikampf.eigener.wert`

- **Bereich:** Zweikampf.
- **Wann:** Man fordert oder hält im Zweikampf.
- **Begründung:** Ein höheres Spiel lohnt sich nur, wenn es mit dem eigenen Blatt gewinnt. Nur um
  einem anderen sein Spiel wegzunehmen, verliert man mehr: Als Gegenspieler hat man noch Chancen,
  mit einem überreizten Solo kaum.
- **Ausnahmen:** keine.
- **Quelle:** BOT, WT.

#### `hochzeit.zwei.sauen`

- **Bereich:** Hochzeit (nur, wenn am Tisch erlaubt).
- **Wann:** Genau ein Trumpf und dazu zwei Sauen (oder Sau, Zehn und eine weitere Sau).
- **Begründung:** Wer die Hochzeit annimmt, hat viele Trümpfe; der Hochzeiter bringt die
  Farbstiche mit. Ohne Sauen trägt er nichts bei. Nimmt keiner an, kostet es nichts.
- **Ausnahmen:** Ein anderes, gutes Spiel geht vor.
- **Ansage-Tabelle (B4):** Mit zwei Sauen etwa +7 Cent, ohne Sau immer noch etwa +2 Cent: Anbieten
  kostet nichts, wenn keiner annimmt.
- **Quelle:** BOT (Annahme 72).

Die vier folgenden Regeln gelten im Vorspiel, wenn man selbst gefragt ist (T3). Sie stammen aus
dem Heuristik-Bot (`hochzeit.ts`, B3) und werden – wie alles – von der Rechnung geprüft: Der Tutor
spielt die Hochzeit durch (siehe „Wie der Tutor rechnet“) und empfiehlt, was im Schnitt mehr bringt.
Die Zahl der getauschten Karten ist bei der arabischen Hochzeit zwei statt eins; sonst gilt dasselbe.

#### `hochzeit.ablehnen.schwach`

- **Bereich:** Hochzeit (Ablehnen).
- **Wann:** Mit dem geschenkten Trumpf hätte man weniger als fünf Trümpfe oder kaum Sauen und
  hohe Karten.
- **Begründung:** Wer die Hochzeit annimmt, spielt mit einem Partner, der selbst keinen Trumpf
  hat – ein schwaches Blatt reicht dann nicht, und man verliert mit. Ablehnen kostet nichts: Nimmt
  keiner an, gilt der Hochzeiter als „weiter“.
- **Ausnahmen:** Mit sehr guten Farben (mehrere Sauen und Zehner) kann auch ein Blatt mit wenigen
  Trümpfen tragen – das sieht die Rechnung.
- **Quelle:** BOT (Annahme 72).

#### `hochzeit.zurueckgeben.farbe.frei`

- **Bereich:** Hochzeit (Rückgabe, man hat angenommen).
- **Wann:** Man hat eine Farbe mit nur einer (bei der arabischen Hochzeit zwei) Karten, die man
  zurückgeben kann.
- **Begründung:** Wer die Farbe frei macht, sticht sie später mit einem Trumpf. Der Hochzeiter
  bekommt die Karte und spielt sie selbst aus; der Partner hat die Trümpfe, um zu stechen.
- **Ausnahmen:** Eine Sau behält man lieber (sie ist ein sicherer Stich); Trümpfe darf man nur
  zurückgeben, wenn man nichts anderes hat.
- **Quelle:** BOT (Annahme 72); WT.

#### `hochzeit.zurueckgeben.klein`

- **Bereich:** Hochzeit (Rückgabe, man hat angenommen).
- **Wann:** Keine Farbe lässt sich mit der Rückgabe frei machen.
- **Begründung:** Dann die kleinste Karte, die keine Augen kostet: Sie bleibt in der Partei, und
  man behält die guten Karten für die eigenen Stiche. Keine Sau und keinen Zehner abgeben, die
  zählen für die Partei am meisten, wenn man sie selbst ausspielt.
- **Ausnahmen:** Eine blanke Sau als einzige Karte der Farbe: erst die Farbe frei machen.
- **Quelle:** BOT (Annahme 72).

### Kontra und Re

#### `kontra.gegen.partnerspiel`

- **Bereich:** Kontra.
- **Wann:** Man darf Kontra geben, gegen ein Sauspiel oder eine Hochzeit.
- **Begründung:** Zwei gegen zwei: Kontra lohnt, wenn man selbst ein gutes Sauspiel-Blatt hat
  (vier Trümpfe und mehr, Sauen, freie Farben). Dann gewinnt die eigene Partei meist, und der
  doppelte Wert kommt einem selbst zugute. Ohne dieses Blatt verdoppelt man vor allem den eigenen
  Verlust.
- **Ausnahmen:** Gegen eine Hochzeit braucht es etwas mehr, denn der Partner hat sie nur mit
  starkem Trumpfblatt angenommen.
- **Quelle:** BOT (Annahme 71); D2 (Kapitel zum Kontra, Klappentext).

#### `kontra.gegen.einzelspiel`

- **Bereich:** Kontra.
- **Wann:** Man darf Kontra geben, gegen ein Solo, einen Wenz oder einen Geier.
- **Begründung:** Drei gegen einen, aber der Spieler hat meist die besten Trümpfe. Kontra lohnt
  erst, wenn man selbst etwa die Hälfte der Trumpfstärke und dazu Sauen hält. Ohne Unter gegen
  einen Wenz ist Kontra nur ein Geschenk.
- **Ausnahmen:** Im Bettel doppelt der Tutor nicht (Bots ebenso).
- **Quelle:** BOT (Annahme 71).

#### `re.mit.reserve`

- **Bereich:** Re.
- **Wann:** Gegen das eigene Spiel ist Kontra gesagt; man ist Spieler oder Partner.
- **Begründung:** Re verdoppelt noch einmal. Es lohnt nur mit deutlich mehr als dem Nötigen –
  wer Kontra sagt, hat meist Gründe. Als Partner verrät man sich mit Re außerdem (Annahme 23).
- **Ausnahmen:** keine.
- **Quelle:** BOT (Annahme 71).

### Kartenspiel: Spielerpartei

#### `spieler.solo.von.oben`

- **Bereich:** Spieler (Einzelspiel, man kommt heraus).
- **Wann:** Man spielt allein, die Gegner können noch Trumpf haben, und der eigene höchste Trumpf
  ist der höchste, der noch im Spiel ist.
- **Begründung:** Der höchste Trumpf ist ein sicherer Stich und zieht jedem Gegner einen Trumpf.
  So bleiben ihnen weniger Möglichkeiten, die eigenen Sauen zu stechen.
- **Ausnahmen:** In einem sehr starken Spiel kann ein kleiner Trumpf oder ein Spatz zuerst besser
  sein, damit die Gegner ihre Schmierkarten nicht zurückhalten (D2 4.7, 4.18).
- **Quelle:** WB; D2 4.5; BOT.

#### `spieler.trumpf.ziehen`

- **Bereich:** Spieler (man kommt heraus).
- **Wann:** Man gehört zur Spielerpartei, und die Gegner können noch Trumpf haben.
- **Begründung:** Solange die Gegner Trümpfe haben, stechen sie die eigenen Sauen. Trumpf zwingt
  sie zum Bedienen; danach gehören die Farben einem selbst.
- **Ausnahmen:** Nach einer Spritze (Kontra) oft nicht (D1 2.10). Im Sauspiel nicht immer den
  höchsten (D1 2.7).
- **Quelle:** WB; D1 1.4, 2.1; BOT.

#### `spieler.rufsau.nicht.selbst.suchen`

- **Bereich:** Spieler (Sauspiel, Ansager kommt heraus).
- **Wann:** Man ist Ansager, die Rufsau ist noch nicht gefallen, und man hat Karten der Ruffarbe
  und andere.
- **Begründung:** Spielt der Ansager seine Ruffarbe selbst an, zeigt er seine Schwäche: Der
  Partner muss die Sau zugeben, kann nicht davonlaufen, und die Gegner wissen sofort Bescheid.
  Suchen ist Sache der Gegenspieler.
- **Ausnahmen:** Spät im Spiel, wenn nichts anderes bleibt.
- **Quelle:** D1 1.5; SZ. (Die Heuristik macht es anders, siehe Widerspruch 1.)

#### `spieler.farbe.nach.trumpf`

- **Bereich:** Spieler (man kommt heraus).
- **Wann:** Kein anderer kann noch Trumpf haben.
- **Begründung:** Jetzt sticht niemand mehr ein. Erst die Sauen und andere sichere Farbkarten
  heimbringen, dann die Spatzen; jeder weitere Trumpf wäre verschenkt.
- **Ausnahmen:** keine.
- **Quelle:** WB; D1 4.8; BOT.

#### `mitspieler.trumpf.spielen`

- **Bereich:** Spieler (gerufener Partner kommt heraus, die Sau ist noch nicht gefallen).
- **Wann:** Man hat die Rufsau.
- **Begründung:** Mit Trumpf (oder mit der Rufsau) gibt man sich als Partner zu erkennen und hilft
  dem Ansager, die Trümpfe der Gegner zu ziehen. Eine Farbe anzuspielen, nützt eher den Gegnern.
- **Ausnahmen:** Ohne Trumpf, oder um eine freie Farbe anzuzeigen, ist eine Farbe richtig (D1
  1.12, 2.6; D2 2.1–2.3).
- **Quelle:** D1 2.1, 2.8; D2 2.1–2.3.

### Kartenspiel: Gegenspieler

#### `gegner.rufsau.suchen`

- **Bereich:** Gegenspieler (Sauspiel, man kommt heraus).
- **Wann:** Die Rufsau ist noch nicht gefallen, und man hat eine Karte der Ruffarbe.
- **Begründung:** Mit der Ruffarbe zwingt man die Sau heraus: Die Parteien sind dann klar, die
  Sau fällt oft in einen kleinen Stich, und der Partner kann nicht mehr davonlaufen.
- **Ausnahmen:** Nicht suchen, wenn der eigene Partner keinen Trumpf hat oder man selbst mit einer
  Zehn suchen müsste, die dann verloren ist (D1 3.1, 3.3, 3.24).
- **Quelle:** WB; D1 3.1–3.4; BOT.

#### `gegner.sau.frisch`

- **Bereich:** Gegenspieler (man kommt heraus).
- **Wann:** Man hat eine Farbsau in einer Farbe, die noch nicht angespielt wurde.
- **Begründung:** Beim ersten Anspielen einer Farbe bedienen meist alle – die Sau bringt ihre Augen
  sicher heim. Je später, desto eher ist jemand frei und sticht.
- **Ausnahmen:** Nicht gegen einen Alleinspieler, der in Hinterhand sitzt und frei sein kann (D1
  5.18, 5.19). Gegen einen Wenz ist die Sau besonders gut (D1 5.7).
- **Quelle:** WB; D1 5.7; BOT.

#### `gegner.kurzer.weg.lange.farbe`

- **Bereich:** Gegenspieler (Einzelspiel, man kommt heraus).
- **Wann:** Der Alleinspieler sitzt direkt hinter einem („kurzer Weg“) oder als Letzter („langer
  Weg“), und die eigenen Farben sind unterschiedlich lang.
- **Begründung:** Kurzer Weg: Eine lange Farbe hat der Spieler bald nicht mehr, und die Partner
  hinter ihm können sie schmieren oder überstechen. Langer Weg: Eine kurze Farbe macht einen selbst
  bald frei, und man sticht später vor dem Spieler ein.
- **Ausnahmen:** Mit einer Sau zuerst die Sau (`gegner.sau.frisch`).
- **Quelle:** D1 5.1, 5.2; SKS.

#### `gegner.kein.trumpf.anspielen`

- **Bereich:** Gegenspieler (man kommt heraus).
- **Wann:** Man hat Trumpf und Farbkarten.
- **Begründung:** Trumpf anzuspielen nimmt dem Spieler die Arbeit ab: Er wollte die Trümpfe ohnehin
  ziehen. Farben zwingen ihn dagegen, seine Trümpfe zum Stechen einzusetzen.
- **Ausnahmen:** Gegen einen Spieler, der selbst sucht oder davongelaufen ist, und um einem
  Alleinspieler einen hohen Trumpf zu ziehen (D1 3.14, 3.22, 5.29; D2 5.29). Siehe Widerspruch 3.
- **Quelle:** WT; BOT.

### Zugeben

#### `karte.schmieren`

- **Bereich:** Zugeben.
- **Wann:** Ein Partner hält den Stich, und keiner der Gegner hinter einem kann ihn noch schlagen.
- **Begründung:** Was in diesem Stich liegt, gehört der eigenen Partei. Also Augen dazu: Sau oder
  Zehn, notfalls einen König – aber keine Ober oder Unter, die später selbst stechen.
- **Ausnahmen:** Die Trumpf-Sau nicht vorschnell schmieren (D1 3.8, 3.9, 5.14); nach einer Spritze
  Schmierkarten schonen (D1 5.30, D2 3.4).
- **Quelle:** WB; D1 5.10, 5.13, 5.21; D2 5.8, 5.12; BOT.

#### `karte.nicht.vorschnell.schmieren`

- **Bereich:** Zugeben.
- **Wann:** Ein Partner liegt vorn, aber ein Gegner hinter einem kann noch stechen oder übernehmen.
- **Begründung:** Geschmierte Augen in einem Stich, den der Gegner noch holt, zählen doppelt
  gegen einen. Lieber billig zugeben – oder den Stich mit einer sicheren Karte selbst übernehmen.
- **Ausnahmen:** Auf Verdacht schmieren, wenn der Partner wahrscheinlich hält (D1 5.10).
- **Quelle:** D1 5.13; D2 5.12; BOT.

#### `karte.hinten.billig.stechen`

- **Bereich:** Zugeben (als Letzter im Stich).
- **Wann:** Man sitzt hinten, ein Gegner liegt vorn, im Stich liegen schon mindestens vierzehn Augen
  (seit T5; vorher ohne Untergrenze, gemessen schädlich), und man kann mit mehreren Karten
  stechen.
- **Begründung:** Als Letzter kann einem niemand mehr überstechen. Also reicht der kleinste Trumpf,
  der sticht, oder eine höhere Farbkarte; die hohen Trümpfe hebt man für später auf. Für ein
  paar Augen lohnt der Trumpf nicht.
- **Ausnahmen:** keine.
- **Quelle:** D1 4.6; BOT.

#### `karte.stechen.lohnt`

- **Bereich:** Zugeben.
- **Wann:** Ein Gegner liegt vorn, im Stich liegen schon zehn Augen oder mehr, und man hat eine
  Karte, die sicher sticht.
- **Begründung:** Ein voller Stich ist die Hälfte dessen, was man für Schneider braucht. Wer ihn
  sicher holen kann, holt ihn.
- **Ausnahmen:** In Mittelhand nicht leichtfertig mit dem höchsten Trumpf (D2 4.8, 5.15).
- **Quelle:** D1 3.11, 3.13; D2 3.1; BOT.

#### `karte.farbe.freimachen`

- **Bereich:** Zugeben (man kann nicht bedienen und schmiert nicht).
- **Wann:** Man hat eine einzelne, billige Karte einer Farbe.
- **Begründung:** Wirft man sie ab, ist man in dieser Farbe frei. Spielt sie später jemand an,
  sticht man ein oder schmiert dem Partner.
- **Ausnahmen:** Eine Farbe, in der man die höchste Karte hat, hält man.
- **Quelle:** D2 5.9, 5.20; D1 4.5, 4.6; WT.

#### `karte.abspatzen`

- **Bereich:** Zugeben.
- **Wann:** Ein Gegner liegt vorn, man kann den Stich nicht (oder nicht lohnend) holen und hat
  eine Farbkarte, die man zugeben darf.
- **Begründung:** Was man in einen verlorenen Stich legt, zählt für die Gegner. Also einen Spatz –
  eine Karte ohne Augen –, keine Trümpfe und keine Sauen.
- **Ausnahmen:** Gegen einen Solospieler nicht immer null Augen (D2 5.5). Hat man nur Trümpfe
  zu geben, gilt `karte.abspatzen.trumpf`.
- **Quelle:** D2 (Klappentext: Zeitpunkt zum Abwerfen von Spatzen); BOT.

#### `karte.abspatzen.trumpf`

- **Bereich:** Zugeben (Abspatzen mit lauter Trümpfen; ab T3, vorher Teil von `karte.abspatzen`).
- **Wann:** Der Stich ist verloren wie bei `karte.abspatzen`, aber man darf nur Trümpfe zugeben –
  weil Trumpf angespielt ist oder weil die ganze Hand aus Trümpfen besteht.
- **Begründung:** Auch hier zählt, was man hineinlegt, für die Gegner. Also den Trumpf mit den
  wenigsten Augen und, bei Gleichstand, den schwächsten: einen Siebener oder Neuner statt der
  Sau oder der Zehn. Die hohen Trümpfe hebt man für Stiche auf, die man selbst holt; der Ober ist
  später mehr wert als die Augen, die man ihm jetzt erspart.
- **Ausnahmen:** Ist im Stich schon wenig drin und der Spieler hat noch viele Trümpfe, kann ein
  höherer Trumpf, der den Stich noch dreht, besser sein – dann ist es kein verlorener Stich.
- **Quelle:** D2 (Klappentext: Zeitpunkt zum Abwerfen von Spatzen); BOT.

### Bettel

#### `bettel.spieler.drunter`

- **Bereich:** Bettel (Spieler).
- **Wann:** Man spielt Bettel.
- **Begründung:** Kommt man heraus, die niedrigste Karte. Gibt man zu, die höchste, die noch
  drunter bleibt: So wird man gefährliche hohe Karten los, solange es gefahrlos geht.
- **Ausnahmen:** keine.
- **Quelle:** BOT; WT.

#### `bettel.gegner.klein`

- **Bereich:** Bettel (Gegenspieler).
- **Wann:** Gegen einen Bettel.
- **Begründung:** Je niedriger die angespielte Karte, desto schwerer bleibt der Spieler drunter.
  Kommt er noch, bleibt man klein; liegt er vorn, bleibt man drunter und wirft eigene hohe Karten
  ab.
- **Ausnahmen:** Eine Farbe, in der der Spieler schon frei ist, bringt nichts.
- **Quelle:** BOT; WT.

### Ramsch

#### `ramsch.durchmarsch.verhindern`

- **Bereich:** Ramsch (mit Durchmarsch).
- **Wann:** Ein anderer hat alle bisherigen Stiche (mindestens zwei).
- **Begründung:** Ein Durchmarsch kostet alle viel. Ein einziger Stich, auch ohne Augen, verhindert
  ihn – den nimmt man, wenn es sicher geht.
- **Ausnahmen:** keine.
- **Quelle:** PG; BOT (Annahme 74).

#### `ramsch.hoch.drunter`

- **Bereich:** Ramsch.
- **Wann:** Man gibt zu und kann unter dem Stich bleiben.
- **Begründung:** Wer im Ramsch Augen sammelt, verliert. Unter einer höheren Karte wirft man die
  eigenen gefährlichen Karten ab – Zehner und hohe Karten, die später selbst stechen würden.
- **Ausnahmen:** Wer auf Durchmarsch spielt, macht das Gegenteil.
- **Quelle:** BOT (Annahme 74); WT.

## Messung der Faustregeln (T4)

Jede der 34 Regeln hat einen gemessenen Wert (oder ist begründet „zu selten“): Wie viele Cent bringt es im Schnitt, sie in einer Lage zu
befolgen, statt die beste andere Möglichkeit zu nehmen? Max nennt bei mehreren greifenden Regeln
die mit dem höheren Wert zuerst und darf den Wert in der Begründung nennen („Gemessen bringt sie im
Schnitt etwa 8 Cent“) – aber nur, wenn er sicher über null liegt (mehr als zwei Standardfehler).

### Verfahren

Gepaarter Vergleich wie in B2 (Code: `packages/tutor/scripts/messen.ts`):

1. Alle vier Sitze spielen den **Heuristik-Bot** (feste Seeds; Spiel _i_ hat Seed _i_, Geber _i_ mod 4,
   Bots Seed 2000 + 4*i* + Sitz). Heuristik statt „Stark“, weil sie schnell und über den Seed
   vollständig reproduzierbar ist und weil die Regeln großteils aus ihr stammen; „Stark“ würde die
   Messung um ein Vielfaches verlangsamen.
2. Im Grundlauf wird bei jeder Entscheidung geprüft, welche Regeln greifen (`ruleHits`). Vorkommen
   werden gezählt (alle Sitze, daraus „Vorkommen je Spiel“).
3. Beim **ersten Vorkommen je Regel, Sitz und Spiel** wird das Spiel zweimal von vorn gespielt,
   mit denselben Karten und Bots, nur an dieser einen Stelle verschieden:
   - Arm **folgt**: die Möglichkeit, für die die Regel spricht, die der Tutor (`advise`, Suche)
     am höchsten bewertet;
   - Arm **widerspricht**: die höchstbewertete Möglichkeit, für die die Regel _nicht_ spricht –
     die beste Alternative.
     Danach spielt wieder die Heuristik. Das Maß ist die Zahlung des Sitzes am Spielende.
4. **Wert** = Mittel von (Zahlung folgt − Zahlung widerspricht) über die Lagen, in Cent;
   **Fehler** = Standardfehler dieses Mittels. Je Regel höchstens 1500 Lagen, gesucht wird in
   20 000 Spielen. Weniger als 30 Lagen gelten als „zu selten“.
5. Regelsätze: Standard; für Kontra/Re mit eingeschaltetem Kontra, für Ramsch mit „Alle weiter →
   Ramsch“, für die Hochzeit mit erlaubter Hochzeit (`regelsatzFuer`).

Einschränkungen: Die Mitspieler spielen Heuristik, nicht wie Menschen. Die Bewertung der beiden
Arme stammt aus der Suche des Tutors; gemessen wird aber, was nach der Wahl tatsächlich am Spielende
herauskommt. Bei Regeln, die den Heuristik-Bot selbst beschreiben, ist der Unterschied klein, weil
der Bot ihnen ohnehin folgt – der Wert zeigt dann, was ein Abweichen kostet.
**`re.mit.reserve`** ließ sich nicht messen: Heuristik-Gegner sagen nie Kontra, also entsteht keine
Lage für ein Re (0 Vorkommen in 20 000 Spielen). Auch **`bettel.spieler.drunter`**,
**`bettel.gegner.klein`** und **`ramsch.durchmarsch.verhindern`** sind selten (39, 117 und 83 Lagen)
– die Zahlen stehen mit großem Fehler in der Tabelle, ein Wert wird dafür nicht genannt.
Die Hochzeitsregeln und `karte.abspatzen`/`karte.abspatzen.trumpf` sind nach dem Merge von T3 neu gemessen; alle übrigen Regeln hat T3 nicht verändert (Vergleich von `rules.ts`).

### Ergebnis (Stand: 20 000 Spiele, 34 Regeln, nach B4 und T5)

| Regel                                | Wert (ct) | ± Fehler | Lagen | Vorkommen je Spiel | Urteil                |
| ------------------------------------ | --------: | -------: | ----: | -----------------: | --------------------- |
| `ansage.wenz.unter.und.farben`       |      65,1 |      3,3 |  1500 |              0,281 | nützlich              |
| `ansage.tout.nur.sicher`             |      56,4 |      4,3 |  1500 |              0,593 | nützlich              |
| `ansage.solo.trumpflaenge`           |      55,1 |      3,2 |  1500 |              1,152 | nützlich              |
| `ansage.sauspiel.grundblatt`         |      31,1 |      2,5 |  1500 |              1,276 | nützlich              |
| `kontra.gegen.einzelspiel`           |      30,3 |      1,4 |  1500 |              0,326 | nützlich              |
| `karte.stechen.lohnt`                |      26,4 |      2,6 |  1500 |              0,797 | nützlich              |
| `ansage.bettel.nur.sicher`           |      25,3 |      2,1 |  1500 |              0,220 | nützlich              |
| `bettel.spieler.drunter`             |      20,1 |      4,6 |   626 |              0,160 | nützlich              |
| `zweikampf.eigener.wert`             |      17,0 |      2,6 |  1500 |              2,416 | nützlich              |
| `spieler.farbe.nach.trumpf`          |      15,8 |      2,5 |  1500 |              0,623 | nützlich              |
| `kontra.gegen.partnerspiel`          |      13,2 |      0,6 |  1500 |              0,189 | nützlich              |
| `spieler.trumpf.ziehen`              |      11,8 |      2,2 |  1500 |              2,688 | nützlich              |
| `hochzeit.zwei.sauen`                |       7,0 |      1,1 |  1113 |              0,135 | nützlich              |
| `hochzeit.ablehnen.schwach`          |       5,6 |      0,9 |  1217 |              0,061 | nützlich              |
| `gegner.kein.trumpf.anspielen`       |       4,8 |      0,9 |  1500 |              1,671 | nützlich              |
| `spieler.solo.von.oben`              |       3,4 |      3,0 |  1500 |              0,719 | kein messbarer Nutzen |
| `bettel.gegner.klein`                |       2,7 |      0,7 |  1500 |              0,360 | nützlich              |
| `ramsch.hoch.drunter`                |       2,7 |      0,8 |   785 |              0,115 | nützlich              |
| `gegner.kurzer.weg.lange.farbe`      |       2,5 |      1,2 |  1500 |              0,547 | nützlich              |
| `karte.schmieren`                    |       2,4 |      0,6 |  1500 |              1,476 | nützlich              |
| `karte.nicht.vorschnell.schmieren`   |       2,4 |      0,7 |  1500 |              0,816 | nützlich              |
| `karte.abspatzen`                    |       1,9 |      0,8 |  1500 |              4,192 | nützlich              |
| `hochzeit.zurueckgeben.farbe.frei`   |       1,9 |      0,5 |  1121 |              0,056 | nützlich              |
| `hochzeit.zurueckgeben.klein`        |       1,6 |      0,5 |  1287 |              0,064 | nützlich              |
| `karte.farbe.freimachen`             |       1,3 |      1,3 |  1500 |              1,640 | kein messbarer Nutzen |
| `karte.abspatzen.trumpf`             |       1,2 |      0,4 |  1500 |              2,424 | nützlich              |
| `gegner.rufsau.suchen`               |       1,0 |      0,4 |  1500 |              0,410 | nützlich              |
| `spieler.rufsau.nicht.selbst.suchen` |       0,6 |      0,5 |  1500 |              0,519 | kein messbarer Nutzen |
| `mitspieler.trumpf.spielen`          |       0,4 |      0,4 |  1500 |              0,243 | kein messbarer Nutzen |
| `gegner.sau.frisch`                  |       0,1 |      0,9 |  1500 |              0,781 | kein messbarer Nutzen |
| `ansage.zu.schwach`                  |      -0,3 |      0,3 |  1500 |              2,147 | kein messbarer Nutzen |
| `karte.hinten.billig.stechen`        |      -0,5 |      1,3 |  1500 |              0,159 | kein messbarer Nutzen |
| `re.mit.reserve`                     |         – |        – |     0 |              0,000 | zu selten             |
| `ramsch.durchmarsch.verhindern`      |         – |        – |    11 |              0,001 | zu selten             |

„Vorkommen je Spiel“ zählt alle vier Sitze zusammen, jedes Vorkommen. „Kein messbarer Nutzen“
heißt: Der Wert liegt innerhalb von zwei Standardfehlern um null.

### Einordnung

Stand nach B4 (Ansage-Tabellen und Bettel-Korrektur): Die Heuristik spielt und sagt jetzt anders an,
darum wurden alle Regeln neu gemessen. Zwischenstand vor B4 (nur zum Vergleich): Spalte „vorher“.

- **Ganz vorn: die Ansage.** Wenz (65 ct, vorher 50), Solo (55, vorher 44), Sauspiel-Grundblatt (31, vorher 26),
  Zweikampf (17, vorher 22) und Kontra gegen ein Einzelspiel (30) bzw. Partnerspiel (13). Mit
  stärkerer Heuristik wiegt „Wenz/Solo/Sauspiel nur mit solidem Blatt“ noch mehr.
- **Kartenspiel: oft klein, zwei Ausreißer nach oben.** Stechen, wenn es lohnt: 26 ct (vorher 17);
  Farbe nach dem Trumpf: 16 ct (vorher 6); Trumpf ziehen: 12 ct (vorher 4). Das Spielen mit der
  Heuristik als Mitspieler macht diese Regeln wertvoller. Die übrigen Kartenregeln bringen 1–5 ct.
- **Bettel jetzt messbar:** `bettel.spieler.drunter` 20 ± 5 ct (626 Lagen, vorher 39 Lagen),
  `bettel.gegner.klein` 2,7 ± 0,7 ct. Grund: Die Bettel-Korrektur (B4) lässt die Heuristik deutlich
  weniger Bettel-Spiele ansagen, die verbleibenden sind besser – und kommen öfter vor als vorher gemessen.
- **Vorzeichen gekippt, schadet jetzt – überarbeitet in T5:**
  - **`ansage.bettel.nur.sicher` (−9,5 ± 1,7 → +25,3 ± 2,1).** Die Regel verlangte „jede Farbe von
    unten gedeckt“ und war damit strenger als die Ansage-Tabelle. Entscheidung: Die Tabelle (mit
    „Stark“ simuliert) ist die belegte Grundlage. Die Regel empfiehlt Bettel jetzt genau dann, wenn
    die Tabelle ihn über der Schwelle sieht; ein Test (`ansageTabelle.test.ts`) prüft das an
    3000 Blättern, darunter solchen, die nicht gedeckt sind und trotzdem lohnen.
  - **`ansage.tout.nur.sicher` (−13,6 ± 3,7 → +56,4 ± 4,3).** Die Regel erlaubte Tout nur bei
    „praktisch sicher alle Stiche“. Die Tabelle sieht Tout schon bei weniger sicheren Blättern
    vorn. Jetzt: das Spiel mit dem höchsten Tabellenwert, mit oder ohne Tout.
  - **`karte.hinten.billig.stechen` (−6,4 ± 1,6 → −0,5 ± 1,3).** Mit weniger als 14 Augen im Stich
    lohnt der Trumpf nicht; bei zehn Augen als Grenze lag der Wert noch bei −2,9 ± 1,5, bei 20
    bei +0,4 ± 1,7. Die Regel gilt jetzt ab 14 Augen und hat damit keinen sicheren Schaden, aber
    auch keinen messbaren Nutzen mehr.
  - **`ansage.ruffarbe.kurz` – gestrichen.** (−13,6 ± 2,0.) Ohne die Zehn-Vorliebe blieb sie bei
    −13,0 ± 2,7; „längste Ruffarbe“ −18,7, „kürzeste“ −18,1, „höchster Tabellenwert“ −13,6
    (je 800 Lagen). Welche Sau man ruft, hängt von zu vielen Merkmalen ab (Länge, Zehn, Trümpfe,
    Farben daneben), als dass eine einzelne Regel es träfe; die Suche und die Ansage-Tabelle
    entscheiden besser. Die Regel ist samt Text, Denkanstoß und Messung entfernt.
  - **`hochzeit.annehmen.trumpf` – gestrichen.** (−1,7 ± 0,7.) Auch mit strengerer Bedingung nie
    besser als Ablehnen (Schwelle +0,5: −2,0 ± 2,1; +1,5: −3,5 ± 3,2 bei nur 43 Lagen; +3: keine
    Lage). Max empfiehlt das Annehmen weiter, wenn die Suche es rechnet, nennt aber keine Regel;
    `hochzeit.ablehnen.schwach` (+5,6 ct) bleibt.
- **Nutzen entfallen:** `ansage.zu.schwach` (−0,6 ± 0,8, vorher 1,6 ± 0,5; nach T5 −0,3 ± 0,3).
  Mit der Tabelle sagt die Heuristik schwache Blätter ohnehin nicht mehr an, die Regel
  unterscheidet nichts mehr. In T5 an die Tabelle angeglichen (Bedingung „kein Spiel über der
  Schwelle“); sie bleibt als Lehrstoff, Max nennt keinen Wert.
- **Nutzen entstanden:** `spieler.farbe.nach.trumpf`, `spieler.trumpf.ziehen`, `bettel.spieler.drunter`,
  `bettel.gegner.klein`, `hochzeit.ablehnen.schwach` (5,6 ct, vorher 3,0) sind jetzt sicher positiv.
- **Weiter ohne messbaren Nutzen:** `gegner.sau.frisch`, `mitspieler.trumpf.spielen`,
  `spieler.rufsau.nicht.selbst.suchen`, `karte.farbe.freimachen`, `spieler.solo.von.oben` (3,4 ± 3,0),
  `gegner.kurzer.weg.lange.farbe` (2,5 ± 1,2). Sie bleiben als Lehrstoff im Katalog, Max nennt keinen
  Wert dazu und ordnet sie hinter die gemessenen. Kandidaten zum Umformulieren oder Streichen nach
  Prüfung mit anderen Mitspielern als der Heuristik.
- **Zu selten:** `re.mit.reserve` (keine Lage mit Heuristik-Gegnern) und
  `ramsch.durchmarsch.verhindern` (11 Lagen in 20 000 Spielen, vorher 83: Die Heuristik lässt den
  Durchmarsch kaum noch zu).

Max nennt nur Werte, die sicher über null liegen; Regeln ohne sicheren Nutzen ordnet er hinter die
positiven, ohne Wert. Seit T5 ist keine Regel im Katalog sicher negativ (Wert + 2 Fehler ≥ 0). Die Messung benutzt Heuristik-Mitspieler; wie weit die Zahlen auf Menschen
übertragbar sind, ist offen.

### Messung wiederholen

Läuft nicht in CI und kostet Rechenzeit. Ergebnis je Regel liegt in `packages/tutor/messungen/<regel>.json`;
daraus entstehen `packages/tutor/src/werte.ts` (liest Max) und `messungen/tabelle.md`.

```bash
# alles messen (16 Prozesse parallel, je ein Teil der Regeln); Dauer etwa 15 Minuten
for i in $(seq 0 15); do
  TUTOR_MESSEN=1 TUTOR_MESSEN_SPIELE=20000 TUTOR_MESSEN_LAGEN=1500 TUTOR_MESSEN_TEIL=$i/16 \
    npx vitest run packages/tutor/test/messen.test.ts &
done; wait
# Tabelle und werte.ts erzeugen
TUTOR_MESSEN_ZUSAMMEN=1 npx vitest run packages/tutor/test/messen.test.ts
```

Einzelne Regeln: `TUTOR_MESSEN_REGELN=karte.schmieren,… TUTOR_MESSEN=1 npx vitest run …`.
Gemessen auf AMD Ryzen 7 7800X3D (8 Kerne, 16 Threads), Node 22. Ohne Parameter sind es 3000 Spiele
und 300 Lagen je Regel. Die Messung ist über die Seeds reproduzierbar (gleiche Zahlen bei gleichem Stand
des Codes). Nach einer Regeländerung die betroffene Regel neu messen.

## Ansage-Tabellen (B4)

Ob sich ein Spiel mit einem Blatt lohnt, steht jetzt als **Erwartungswert in Cent** fest statt als
handgesetzte Schwelle. Heuristik, Anfänger, Stark und Max fragen dafür dieselbe Funktion:
`ansageWert(hand, spiel, regeln, position)` in `packages/bots/src/ansage.ts`. Die gemessenen
Modelle liegen in `packages/bots/src/ansageTabelle.ts` (erzeugt, etwa 10 kB Quelltext; Gewichte als ganze Zahlen in Hundertsteln), die
Gütemaße in `packages/bots/messungen/ansage/tabelle.md`.

### Verfahren

Code: `packages/bots/scripts/ansage-tabellen.ts` (Erzeugung und Schätzung) und
`ansage-schreiben.ts` (Tabelle und Bericht).

1. **Blätter ziehen.** Je Besetzung (lang/4, kurz/4, kurz/3) und jeder ansagbaren Spielart der
   Besetzung 10 000 Blätter: zufällige Hand, zufällige Position am Tisch (Vorhand bis Geber), dazu
   eine zufällige Farbe bzw. ein Farbpaar unter denen, mit denen das Blatt im **Bereich der Tabelle**
   liegt (`imBereich`: Sauspiel ab drei Trümpfen, Solo ab vier, Wenz/Geier/Eisenbahner ab zwei,
   Farbwenz ab drei, Hawaii-Habicht ab vier, Bettel mit höchstens zwei Lücken; kurze Karte zu viert
   eins weniger). Darunter lohnt sich kein Spiel; dort gibt es keinen Wert (`null`), und die Bots
   behandeln das wie „lohnt nicht“. Blätter, die nach der alten Heuristik hoffnungslos wären (Marge
   unter −4), kommen nur mit Wahrscheinlichkeit ¼ in die Stichprobe und zählen dafür vierfach: So
   liegen mehr Blätter nahe der Entscheidung, ohne die Verteilung zu verzerren.
2. **Durchspielen.** Jedes Blatt auf **64 zufälligen Verteilungen** der übrigen Karten bis zum Ende,
   alle Sitze nach der Heuristik (`playOutHand`, derselbe Kern wie die Ansage-Suche von „Stark“).
   Heuristik statt „Stark“ als Spielweise, weil Stark an allen Sitzen etwa 2000-mal teurer wäre
   (rund 15 Millionen Probespiele hätten Wochen gedauert) und weil Stark selbst in seinen
   Probespielen ebenfalls mit der Heuristik rechnet. **Ausnahme Bettel** (`STARK_VERTEIDIGT`):
   Sein Wert hängt fast nur an der Verteidigung, und die Heuristik verteidigte zu schwach – die
   Tabelle hatte das als Wert gelernt (Fund bei der Abnahme: ein Bettel mit blankem Schellen-Ober
   und -Zehner stand bei +9 bis +19 Cent). Darum spielen beim Bettel die Gegenspieler „Stark“
   (der Ansager Heuristik), mit 4000 Blättern je Besetzung und 32 Verteilungen je Blatt. Hochzeiten mit Vorspiel: Die anderen nehmen an
   wie der Heuristik-Bot, der Partner gibt zurück wie er; nimmt keiner an, zählt es 0 (wie „weiter“).
   Ohne Kontra und Re.
3. **Zählen.** Je Probespiel: gewonnen, mit Schneider, mit Schwarz, verloren mit Schneider (und für
   die Hochzeit „verloren“, weil das Vorspiel scheitern kann).
4. **Verdichten.** Je Besetzung, Spielart und Zielgröße eine **logistische Regression** über die
   Merkmale (gewichtete Likelihood über die Anteile je Blatt, kleiner Ridge-Term, Newton-Verfahren
   mit Schrittweitenhalbierung). Geprüft auf jedem fünften Blatt, geschätzt auf den übrigen; die
   ausgelieferte Tabelle nutzt danach alle Blätter.
5. **In Cent umrechnen** – erst beim Abfragen, mit dem Tarif der Tischregeln: je Probespiel zahlt die
   Abrechnung Grundtarif + Aufschlag je Schneider, Schwarz und Laufendem (`scoring.ts`), allein von
   jedem Gegner. Also ist der Erwartungswert
   `Gegner × (Grundtarif × (P(gewonnen) − P(verloren)) + Aufschlag × (P(Schneider/Schwarz, gewonnen) − P(Schneider, verloren) + Laufende × (P(gewonnen) − P(verloren))))`.
   Laufende rechnet `ansageWert` aus der eigenen Hand und der Laufenden-Schwelle der Tischregeln (allein
   steht die Folge fest; mit Partner zählen nur die eigenen „mit“). Tout: doppelter Wert, gewonnen
   nur mit allen Stichen – geschätzt als „schwarz gewonnen“. „Sie“ zählt den vierfachen Grundtarif.
   Eigene Tarife und Laufenden-Schwellen stimmen damit, ohne neu zu messen.
6. **Sichere Blätter.** Macht ein Blatt sicher alle Stiche (nur Trümpfe mit einer Folge von oben,
   die länger ist als alle Trümpfe der Gegner; im Wenz alle Unter und jede Farbe von oben), setzt
   `alleSticheSicher` die Chancen fest auf 1 – solche Ecken kommen in den Daten kaum vor.

**Merkmale** (`MERKMALE`, für alle Spielarten gleich, nach der Ordnung des Spiels): Zahl der Trümpfe
und ihr Quadrat, höchster und zweithöchster Trumpf, Zahl der vier höchsten Trümpfe und der Plätze 5–8,
eigene Laufende von oben, Sauen, Sau mit Zehn, blanke Zehner, freie Farben, einzelne Karten, sichere
Farbstiche (Folgen von oben), längste Farbe, Augen, Vorhand, Hinterhand; dazu je Spielart Länge und
Zehner der Ruffarbe (Sauspiel), Trümpfe ab Stich 5 und ihr Quadrat (Hawaii-Habicht).

**Bettel** hat eigene Merkmale (`BETTEL_MERKMALE`), denn dort zählt nur, ob man überall drunter
kommt. Je Farbe: die eigenen Karten von unten sortiert; die k-te (ab 0) ist gefährdet, wenn ihr
Rang über 2k liegt (wie `bettelSafe`), die **Gefahr** der Farbe ist das größte Rang − 2k – wie
viele Karten der Gegner unter ihr liegen, die man nicht abfangen kann. Merkmale sind die Zahl der
Farben je Gefahr (1 bis 6), zusätzlich je Farbe, ob schon die niedrigste Karte offen liegt (über 1,
2, ab 3 Karten der Gegner – jedes kleine Anspiel fängt sofort), Farben mit zwei gefährdeten
Karten, einzelne sichere Karten (dort wird man bald frei und kann abwerfen), freie Farben, die
Gefahr ohne jede Abwurfmöglichkeit, Lücken abzüglich der Abwurfmöglichkeiten und die Position.
Ein erster Versuch mit summierten Merkmalen (Lücken, ihre Tiefe, Sauen und Könige) lag in den
Gruppen der Daten deutlich daneben; mit den Merkmalen je Farbe stimmen die Gruppen (z. B. Gefahr 6:
beobachtet 23 % gewonnen, Modell 27 %).

### Ergebnis

Güte auf zurückgelegten Blättern (Auszug aus `messungen/ansage/tabelle.md`; „Verlust“: was falsche
Entscheidungen „spielen oder nicht“ im Schnitt je Blatt im Bereich kosten, in Cent):

| Besetzung | Spielart       |   R² | Treffer | Verlust Tabelle | Verlust alte Heuristik |
| --------- | -------------- | ---: | ------: | --------------: | ---------------------: |
| lang/4    | Sauspiel       | 0,72 |    87 % |            0,43 |                   0,78 |
| lang/4    | Solo           | 0,97 |    99 % |            0,35 |                   1,22 |
| lang/4    | Wenz           | 0,87 |    95 % |            2,18 |                   3,93 |
| lang/4    | Geier          | 0,88 |    95 % |            2,10 |                   3,51 |
| lang/4    | Farbwenz       | 0,97 |    99 % |            0,22 |                   2,70 |
| lang/4    | Bettel         | 0,79 |    88 % |            3,34 |                  46,40 |
| lang/4    | Eisenbahner    | 0,93 |    95 % |            2,32 |                  12,13 |
| lang/4    | Hawaii-Habicht | 0,91 |    98 % |            0,72 |                   1,79 |
| lang/4    | Hochzeit       | 0,31 |    95 % |            0,08 |                   4,83 |
| lang/4    | Arab. Hochzeit | 0,35 |    97 % |            0,08 |                   8,11 |
| kurz/4    | Sauspiel       | 0,67 |    89 % |            0,40 |                   1,84 |
| kurz/4    | Solo           | 0,97 |    99 % |            0,32 |                   3,46 |
| kurz/4    | Wenz           | 0,94 |    97 % |            0,99 |                   3,51 |
| kurz/3    | Solo           | 0,93 |    97 % |            0,66 |                   3,83 |
| kurz/3    | Wenz           | 0,82 |    90 % |            2,88 |                   7,26 |
| kurz/3    | Bettel         | 0,76 |    89 % |            3,05 |                  10,14 |

In allen 26 Zellen entscheidet die Tabelle besser als die alten Schwellen. Das R² enthält das
Rauschen der Messung selbst (64 Verteilungen je Blatt, Standardfehler 3–13 Cent je Blatt, beim
Bettel mit 32 Verteilungen 12–21 Cent); bei den
Hochzeiten ist es niedrig, weil fast jedes Blatt sich lohnt und die Werte eng beieinander liegen.

**Beispiele** (Standardtarif, Vorhand / Hinterhand, Cent für den Ansager):

| Blatt                                                                  | Spiel               | Wert        |
| ---------------------------------------------------------------------- | ------------------- | ----------- |
| E-Ober, H-Ober, S-Unter, H-Sau, H-9, G-Sau, E-9, S-7                   | Sauspiel (Schellen) | +11 / +10   |
| E-Ober, G-Ober, H-Unter, H-9, E-Sau, E-9, E-8, G-7 (Schellen frei)     | Sauspiel (Gras)     | +9 / +9     |
| H-Unter, S-Unter, H-9, H-8, E-Sau, E-9, G-9, S-9 (vier kleine Trümpfe) | Sauspiel (Gras)     | −2 / −2     |
| E-Ober, G-Ober, H-Unter, H-Sau, H-9, G-Sau, S-Sau, S-7 (fünf Trümpfe)  | Herz-Solo           | +76 / +81   |
| E-Ober, G-Ober, S-Unter, H-Sau, H-9, H-8, S-Sau, G-7 (sechs Trümpfe)   | Herz-Solo           | +75 / +81   |
| E-Ober, E-Unter, S-Unter, H-Sau, H-10, H-9, G-Sau, S-7                 | Herz-Solo           | +17 / +24   |
| E-, G-, S-Unter, E-Sau, E-10, E-König, G-Sau, G-10                     | Wenz                | +250 / +253 |
| E-Unter, H-Unter, E-Sau, E-10, G-Sau, G-9, S-7, H-8                    | Wenz                | −65 / −68   |
| E-7, E-8, G-7, G-8, H-7, H-9, S-7, S-8                                 | Bettel              | +127 / +136 |
| G-Ober, S-Ober, G-Unter, H-7, G-Sau, G-9, G-7, S-10                    | Bettel              | −43 / −5    |
| H-König (blank), E-7, E-8, G-7, G-8, G-9, S-7, S-8                     | Bettel              | −96 / −68   |
| S-Unter, E-Sau, E-10, G-Sau, G-9, S-7, S-8, E-7                        | Hochzeit            | +7 / +7     |
| alle vier Ober, E-Unter, G-Unter, H-Sau, H-10                          | Herz-Solo Tout      | +660        |
| E-, G-, H-Ober, E-, G-Unter, H-Sau, H-10, E-Sau                        | Herz-Solo Tout      | −330 / −265 |

Was daraus folgt (und was die Bots jetzt anders machen):

- **Einzelspiele lohnen früher als gedacht:** Ein Solo mit fünf Trümpfen, zwei Obern und zwei Sauen
  bringt im Schnitt so viel wie eines mit sechs Trümpfen. Die alte Schwelle (sechs Trümpfe) ließ
  viel liegen.
- **Sauspiel ist knapp:** Selbst ein gutes Sauspiel bringt nur rund +10 Cent; mit vier kleinen
  Trümpfen ist es leicht im Minus. Hier ist die Faustregel richtig.
- **Wenz lebt von den Unter und den Farben:** Drei Unter mit zwei Sauen und langer Farbe sind ein
  sehr gutes Spiel; zwei Unter mit zwei Sauen kosten im Schnitt Geld.
- **Hochzeit fast immer:** Mit genau einem Trumpf lohnt das Anbieten fast immer (95 % der Blätter),
  denn annehmen tut nur, wer ein starkes Blatt hat, und scheitert es, kostet es nichts.
- **Bettel:** Von unten gedeckt sehr gut (+130 Cent); jede offene hohe Karte, die man nicht früh
  abwerfen kann, macht ihn zum Verlust. Gemessen gegen „Stark“ als Verteidigung.
- **Position:** Vorhand oder Hinterhand macht nur wenige Cent aus.
- **Hawaii-Habicht:** Entscheidend sind die Trümpfe _nach_ dem Wechsel. Mit allen vier Königen,
  drei Gras und der Herz-Sau bringt Herz zuerst, Gras ab Stich 5 etwa +326 Cent, umgekehrt etwa
  −154 Cent (je 20 000 Verteilungen): Die Könige sind bis zum Wechsel verbraucht. Die alte Regel
  „die längere Farbe zuerst“ war hier falsch.

### Einbau

- **Heuristik** (`createHeuristicBot`, also auch Anfänger und Stark): „Ich würde“, wenn ein am Tisch
  erlaubtes Spiel mehr als `ANSAGE_SCHWELLE` bringt (in Vielfachen des Sauspiel-Tarifs, gemessen,
  siehe unten); im Zweikampf halten bzw. die niedrigste Spielart nennen, die überbietet und sich
  lohnt; in Stufe 3 das wertvollste erlaubte Spiel, auch Tout, wenn es mehr bringt. Den
  Hawaii-Habicht sagt er weiter nie als Tout an (Annahme 73). Die alten Schwellen gibt es als
  `ansage: 'faustregel'` – für den Vergleich; Kontra/Re und das „Überreizen“ des Anfängers nutzen
  weiter `rateContract`.
- **Stark** sagt an wie die Heuristik (mit Tabelle). Seine eigene Ansage-Suche hatte bei 2000
  simulierten Karten nur ein gutes Dutzend Verteilungen je Spiel (Standardfehler 25–30 Cent); die
  Tabelle beruht auf 64 je Blatt und Zehntausenden Blättern. Mit `ansage: 'faustregel'` rechnet er
  wie vor B4.
- **Max** (`adviseBid`): Die Werte der Spiele bei der Ansage kommen aus der Tabelle, auch für die
  Hochzeit (früher eine grobe Schätzung). Nur wenn in Stufe 3 kein erlaubtes Spiel in der Tabelle
  liegt (Muss mit schwachem Blatt), spielt er wie bisher durch. `Advice.ansage` nennt das
  wertvollste Spiel samt Wert; in der Begründung sagt Max etwa „Mit diesem Blatt bringt ein Wenz im
  Schnitt etwa +18 Cent.“
- **Laufzeit:** Eine Abfrage ist eine Handvoll Multiplikationen. „Normal“ entscheidet weiter in
  etwa 0,1–0,2 ms je Entscheidung, höchstens rund 2 ms (unter Last bis etwa 20 ms; Test: unter
  50 ms). Max wird bei der Ansage schneller, weil er nicht mehr simuliert (Test: unter 300 ms).

### Gepaarter Vergleich und Schwelle

Stand nach der Bettel-Korrektur (Bettel mit „Stark“ gemessen, bessere Bettel-Verteidigung der
Heuristik, eigene Bettel-Merkmale); vorher lagen die Werte innerhalb von 0,2 Cent gleich.

Wie in B2 (`packages/bots/test/strengthTabelle.test.ts`): Ein Bot mit Tabelle sitzt unter Bots mit
den alten Schwellen; dieselbe Verteilung wird ein zweites Mal ganz ohne Tabelle gespielt. Gemessen
wird der Unterschied seiner Zahlung (Cent je Spiel). Platz und Geber wandern, sodass jede Position
vorkommt (vor B4 war der Prüfling in `duel` immer Geber). „Stark“ wird anders verglichen
(`compare`): beide Fassungen auf demselben Platz, mit denselben Karten, gegen dieselben Normal-Bots.

| Vergleich                               | Spiele | Vorteil der Tabelle (ct je Spiel) |
| --------------------------------------- | -----: | --------------------------------: |
| Normal, lang/4, Standardregeln          | 20 000 |                      +4,93 ± 0,39 |
| Normal, lang/4, alle Hausregeln erlaubt | 20 000 |                       +11,3 ± 0,5 |
| Normal, kurz/4                          | 20 000 |                       +14,9 ± 0,6 |
| Normal, kurz/3                          | 20 000 |                       +13,4 ± 0,4 |
| Stark mit gegen Stark ohne Tabelle      |   4000 |                        +2,9 ± 0,8 |

(± ist der Standardfehler.) Die Schwellen der großen Läufe (`BOTS_FULL=1`): mindestens +3 Cent
(lang/4) bzw. +8 Cent (übrige) und mehr als drei Standardfehler; Stark mindestens +1 Cent. Im
normalen Lauf (`npm run check`) nur die Richtung mit 1000 Spielen je Besetzung; Stark nur im großen
Lauf (etwa 30 Minuten).

**Schwelle.** `ANSAGE_SCHWELLE` (Mindestwert eines Spiels in Vielfachen des Sauspiel-Tarifs) wurde
mit denselben Läufen (vor der Bettel-Korrektur) bei −1, −½, 0 und +½ gemessen: In allen Besetzungen liegen die Ergebnisse
innerhalb von 0,5 Cent je Spiel beieinander (lang/4: +4,95 / +5,05 / +5,01 / +4,79), also im
Rauschen. Gewählt ist **0** – spielen, sobald das Spiel im Schnitt mehr bringt als „weiter“.

### Grenzen

- Gespielt wird in den Probespielen wie die **Heuristik** (beim Bettel verteidigt „Stark“), nicht
  wie Menschen. Bei der Hochzeit (angenommen wird nach festen Regeln) gelten die Werte zuerst
  gegen Bots.
- **Bettel, einzelne Blätter:** Die Gruppen stimmen, einzelne Blätter können deutlich abweichen.
  Bekannt: Bei der Verteilung 2-2-2-2 ohne freie Farbe (E-7, E-9, G-7, G-8, H-7, H-König, S-7, S-8)
  sagt die Tabelle +46 bis +78 Cent, gemessen sind −33 bis −11 Cent (diese Verteilung kommt in den
  Daten kaum vor). Auf zufälligen Blättern liegt die direkte Messung im Schnitt etwas unter der
  Messung in den Daten (64 % statt 69 % gewonnen, acht Blätter, etwa 1,6 Standardfehler) – die
  Bettel-Werte sind eher etwas zu hoch.
- Die **Ansage der anderen** fließt in die Tabelle nicht ein: Hat vorher jemand „Ich würde“ gesagt,
  sind die Gegner stärker als im Schnitt; haben alle „weiter“ gesagt, schwächer. Ebenso fehlen
  Kontra und Re. (Im Kartenspiel nutzt die Suche das seit B5, siehe
  [Gewichtete Verteilungen](#gewichtete-verteilungen-b5).)
- „Weiter“ zählt 0 (wie bisher beim starken Bot und bei Max).
- Laufende mit Partner: nur die eigenen „mit“; dass der Partner sie verlängert, ist nicht geschätzt.
- Seltene Ecken (Hawaii mit vier Königen, Tout ohne sichere Folge) schätzt die Tabelle unsicherer;
  sichere Tout-Blätter regelt `alleSticheSicher` exakt.
- „Schwarz verloren“ fehlt als Zielgröße (bei Blättern im Bereich sehr selten; zählt 0).
- Die Faustregel-Werte aus T4 sind mit dem Bot vor B4 gemessen.

### Tabellen neu erzeugen

Läuft nicht in CI. Rohdaten landen in `packages/bots/messungen/ansage/roh/` (nicht eingecheckt, über
den Seed reproduzierbar), daraus entstehen `packages/bots/src/ansageTabelle.ts` und
`packages/bots/messungen/ansage/tabelle.md`.

```bash
# messen: 16 Prozesse parallel, je jedes 16. Stück; Dauer etwa 16 Minuten
for i in $(seq 0 15); do
  ANSAGE_MESSEN=1 ANSAGE_TEIL=$i/16 npx vitest run packages/bots/test/ansageTabellen.test.ts &
done; wait
# Modelle schätzen, Tabelle und Bericht schreiben (etwa 15 Sekunden)
ANSAGE_ZUSAMMEN=1 npx vitest run packages/bots/test/ansageTabellen.test.ts
```

Standard (`STANDARD_PARAMETER`): Seed 2026, 10 000 Blätter je Spielart und Besetzung, 64
Verteilungen je Blatt, Stücke zu 250 Blättern – zusammen 14,7 Millionen Probespiele, rund 250
CPU-Minuten (16 Threads, AMD Ryzen 7 7800X3D, Node 26). Bettel mit „Stark“ als Verteidigung:
4000 Blätter × 32 Verteilungen je Besetzung, rund 775 CPU-Minuten (50 Minuten auf 16 Threads);
die Rohdaten tragen dafür eigene Dateinamen (`…_bettel_stark-4000-32_…`). Jedes Stück hat einen eigenen, aus dem Seed
abgeleiteten Seed; die Aufteilung auf Prozesse ändert nichts am Ergebnis, abgebrochene Läufe setzen
fort. Andere Werte: `ANSAGE_BLAETTER`, `ANSAGE_VERTEILUNGEN`, `ANSAGE_SEED`,
`ANSAGE_BETTEL_BLAETTER`, `ANSAGE_BETTEL_VERTEILUNGEN` (bei beiden Befehlen gleich setzen). Nach
einer Änderung an der Bettel-Verteidigung genügt es, die Bettel-Dateien zu löschen und neu zu messen. Neu erzeugen nach Änderungen am Kartenspiel der Heuristik oder an den Regeln einer
Spielart; nach einer Änderung nur der Merkmale reicht der zweite Befehl.

---

## Didaktik

Der Trainer ist für Leute, die Schafkopf schon können. Sie wollen besser werden, nicht belehrt.
Daraus folgen diese Entscheidungen:

1. **Fragen vor Sagen.** Jede Antwort hat drei Stufen: erst ein **Denkanstoß** (eine Frage zur
   Lage, die auf die Faustregel hinführt, ohne Karte oder Lösung zu nennen), dann auf Wunsch die
   **Empfehlung**, dann die **Begründung** mit Faustregel. Wer selbst draufkommt, behält es; wer
   nicht, bekommt die Antwort, sobald er will. Der Tutor liefert alle drei Stufen auf einmal
   (`Advice.hint`, `recommended`, `reasons`), T2 zeigt sie nacheinander.
2. **Wenige, klare Regeln je Moment.** Höchstens zwei Faustregeln begründen eine Empfehlung; die
   speziellere zuerst (Reihenfolge des Katalogs). Eine Regel spricht nur, wenn sie zwischen den
   Möglichkeiten unterscheidet – eine Regel, die für alle Karten gilt, sagt nichts.
3. **Bei Gleichstand gewinnt die Regel.** Kann die Rechnung zwei Möglichkeiten nicht sicher
   unterscheiden, empfiehlt der Tutor die, für die eine Faustregel spricht. Eine Regel kann man
   lernen und am Tisch wieder anwenden; einen Zufallsvorsprung der Stichprobe nicht.
4. **Ausnahmen zeigen.** Spricht die übliche Regel für etwas, das hier deutlich schlechter ist,
   nennt der Tutor sie als Ausnahme (`overruled`) und stellt statt der Lösung die Frage, was hier
   anders ist (`denkanstoss.ausnahme`). Das sind die lehrreichsten Momente.
5. **Fehler nur melden, wenn sie wirklich etwas kosten.** Hinterher heißt ein Zug „gut“, wenn er
   höchstens 0,2 Tarife (2 Cent beim Standardtarif) schlechter ist oder der Unterschied im
   Rauschen der Stichprobe liegt; „vertretbar“ bis 0,6 Tarife; erst darüber „Fehler“, und nur
   dann spricht der Tutor es von sich aus an (`Review.mention`). Wer ständig kleine Korrekturen
   hört, hört bald nicht mehr hin.
6. **Der Automatikmodus ist ein Lehrer, kein Souffleur.** Von selbst meldet er sich nur, wenn ein
   naheliegender Fehlgriff – eine Möglichkeit, für die eine Faustregel oder die Bauchentscheidung
   spricht – deutlich etwas kostet (Wichtigkeit „hoch“, siehe unten), und dann zuerst mit dem
   Denkanstoß. In T2 so umgesetzt: höchstens einmal je Stich (Ansage und Kontra je einmal) und
   nicht zweimal hintereinander mit derselben Faustregel. Bewertungen hinterher spricht er nur im
   Automatikmodus von selbst an; ohne Automatik antwortet er nur auf Fragen.
7. **Rückblick knapp.** Nach dem Spiel markiert „So wurde gespielt“ nur die Fehler, am besten die
   teuersten drei, jeweils mit einem Satz und der Faustregel.
8. **Ton.** Du-Form, kurze Sätze, Schafkopf-Wörter statt Fachchinesisch. Nicht „falsch“, sondern
   „das kostet“ oder „das bringt mehr“. Cent nennt der Tutor erst in der Begründung und im
   Rückblick, nie im Denkanstoß.

## Wie der Tutor rechnet

**Eingabe:** `TutorInput` mit der eigenen Sicht (`HandView`), den Tischregeln, dem eigenen Sitz und
den gesehenen Stichen (`history`) – alles, was der Mensch am Tisch selbst weiß. Fremde Karten bekommt
er nie; ein Test prüft, dass dieselbe Sicht mit anderen verdeckten Karten dieselbe Antwort gibt.
Fehlen Stiche (etwa nach dem Neuladen), rechnet er nicht, sondern rät nur mit Faustregeln und der
Heuristik (`basis: 'faustregel'`).

**Rechnung:** die Suche des starken Bots, seit B5 mit gewichteten Verteilungen und demselben
Aufwand wie er (`TUTOR_BUDGET`; vor B5 das Zweieinhalbfache),
über die Bot-Funktionen `evaluateCards`, `evaluateContracts` und `evaluateDouble`. Werte sind
erwartete Cent für den Fragenden. „Weiter“ zählt bei der Ansage 0 (Näherung wie beim starken Bot);
eine _angesagte_ Hochzeit (Ansage) wird nicht simuliert, sondern aus der Heuristik geschätzt
(`estimated`). Kontra und Re
rechnen dasselbe Probespiel einmal mit, einmal ohne Doppeln; dass auf ein Kontra ein Re folgen kann,
ist nicht berücksichtigt.

**Rauschen:** Ein Unterschied zählt erst, wenn er größer ist als 0,15 Tarife und als zwei
Standardfehler (gepaart über dieselben Verteilungen, `SIGNIFICANCE`). Alles darunter ist
Gleichstand.

**Wichtigkeit (Automatikmodus):** Der Einsatz ist, was der teuerste plausible Fehlgriff kostet –
plausibel heißt: Eine greifende Faustregel oder die Heuristik spricht dafür. Ab 0,4 Tarifen
„mittel“, ab einem Tarif (10 Cent beim Standardtarif) „hoch“. **Schwelle des Automatikmodus:
„hoch“.** Klare Entscheidungen, bei denen Regel, Heuristik und Rechnung übereinstimmen, haben
keinen Einsatz – da braucht es keinen Lehrer.

**Laufzeit:** unter 300 ms je Frage auf einem Entwicklerrechner (Test; gemessen nach B5 im Schnitt
45 ms, höchstens etwa 120 ms).
Für langsame Geräte nimmt `TutorOptions` eine Uhr und ein Zeitbudget wie der starke Bot; T2 rechnet
bei Bedarf in einem Web Worker.

**Grenzen:** Gegner und Partner spielen in den Probespielen wie die Heuristik, nicht wie Menschen.
Was Ansage, Kontra und Kartenspiel der anderen verraten, gewichtet die Suche seit B5 mit der
Heuristik als Modell (siehe [Gewichtete Verteilungen](#gewichtete-verteilungen-b5)); spielt jemand
ganz anders, rechnet sie wie ohne Gewichtung.

**Hochzeit annehmen und zurückgeben (T3):** über die Bot-Funktionen `evaluateWeddingOffer` und
`evaluateWeddingGive`. Der Fragende kennt nur seine Karten; der Hochzeiter ist eine Stichprobe:
genau `n` Trümpfe (`n` = 1 bzw. 2), dazu Farbkarten, mit denen er laut Heuristik angesagt hätte
(`rateWedding`); wer vor einem abgelehnt hat, hätte nicht angenommen (`rateAcceptWedding`).
_Annehmen_ spielt das Spiel mit der Rückgabe des Heuristik-Bots durch, _ablehnen_ zählt 0 (Näherung
wie „weiter“: spielt danach doch jemand mit, kann man gewinnen oder verlieren). _Zurückgeben_
rechnet die höchstens sechs Rückgaben durch, die die Heuristik am besten findet (bei der arabischen
Hochzeit sind es sonst bis zu 45), alle auf denselben Verteilungen. Die Frage „annehmen?“ stellt
sich im Schritt `offer`, die Rückgabe im Schritt `exchange`; im Automatikmodus meldet sich Max hier
nicht, weil Ablehnen selten eine plausible Alternative ist, die viel kostet.

## Gewichtete Verteilungen (B5)

Bis B4 verteilte die Suche von „Stark“ (und damit Max) die verdeckten Karten gleich
wahrscheinlich, eingeschränkt nur durch harte Tatsachen: Kartenzahlen, erkannte Fehlfarben, Rufsau.
Was die anderen angesagt und gespielt haben, sagt aber viel mehr. Seit B5 werden die Verteilungen
danach gewichtet, wie gut sie dazu passen („policy-based inference“, beim Skat ein bekannter Hebel).

### Verfahren

Code: `packages/bots/src/inference.ts` (Gewicht einer Verteilung), `strongBot.ts` (`sampleWorlds`).

1. **Modell: die Heuristik selbst.** Für jede Beobachtung fragt die Gewichtung, wie wahrscheinlich
   sie mit dem Blatt wäre, das die Verteilung dem Sitz gibt (Blatt zu Spielbeginn = jetzige Karten
   plus die schon gespielten):
   - **Ansage** (alle anderen, Ansage-Tabelle aus B4): „weiter“ → kein Spiel über der Schwelle;
     „Ich würde“ → eines; im Zweikampf genannt oder gehalten → eines mindestens dieser Höhe;
     aufgegeben → keines; der Ansager → sein Spiel lohnt sich. Wahrscheinlichkeit
     `0,05 + 0,9 · σ(Wert / Tarif)` bzw. eins minus das (`bidFloor`, `bidTemp`). Im Muss verrät das
     erzwungene Spiel nichts; bei Hochzeiten fehlen Ansager und Partner (Karten getauscht).
   - **Kontra und Re:** wie der Heuristik-Bot doppelt (`kontraStrength`, Re-Marge), ebenso weich.
   - **Kartenspiel:** Alle Stiche werden mit den Händen der Verteilung vom ersten an nachgespielt;
     bei jeder Karte eines anderen (mit mehr als einer erlaubten) wird die Heuristik gefragt. Spielt
     sie dieselbe Karte, Faktor 1, sonst `cardMiss` = 0,2. Darin stecken Schmieren, Abwerfen,
     Davonlaufen, nicht Einstechen, das Ausspiel des Spielers (von oben, also hat er die höheren
     Trümpfe nicht) usw. – ohne dass jede Regel einzeln beschrieben werden muss.
2. **Weich statt Filter.** Keine Beobachtung schließt eine Verteilung aus. Spielt jemand ganz
   anders als die Heuristik (ein Mensch), kostet das alle Verteilungen etwa gleich, und die Suche
   rechnet wie ohne Gewichtung weiter – sie läuft nie leer. Ein Test spielt dafür mit
   „Wildfängen“, die zufällig ansagen, doppeln und spielen (`strengthLegality.test.ts`).
3. **Ziehen nach Gewicht.** Je benötigter Verteilung werden sechs Kandidaten gezogen
   (`candidateFactor`) und gewichtet; daraus wird die benötigte Zahl nach Gewicht gezogen
   (systematisches Resampling). Mehrfach gezogene Verteilungen werden nur einmal durchgespielt und
   zählen mit ihrem Gewicht; der Tutor rechnet den Standardfehler mit diesen Gewichten
   (effektive Zahl der Verteilungen). Kandidaten weit unter dem besten (Faktor 1/1000) werden
   nicht zu Ende gewichtet.
4. **Kosten.** Das Nachspielen zählt ins Budget der Suche (`inferCost`), die Ansage-Werte werden
   nur für Spiele mit genug Trümpfen berechnet. Der Kern merkt sich die Kartenordnung je Spiel samt
   Trumpf-Menge (`orderFor`), die Ansage-Merkmale ihre Spielgeometrie – beides ändert keine
   Entscheidung, macht aber Heuristik und Suche etwa 2,5-mal schneller. Das erlaubt „Stark“ das
   Budget von Max (5000 simulierte Karten, 10–60 Verteilungen statt 2000 und 6–40).

### Ergebnis

**Wie gut die Gewichtung die Karten trifft** (3200 Kartenwahlen in Spielen mit vier Normal-Bots,
Anteil der verdeckten Karten, die in der Stichprobe beim richtigen Sitz liegen):

| Verteilungen                                     | richtig | effektive Zahl |
| ------------------------------------------------ | ------: | -------------: |
| gleich wahrscheinlich (vor B5)                   |  40,2 % |             30 |
| nur Ansage gewichtet                             |  43,8 % |             24 |
| Ansage und Karten (3 Kandidaten)                 |  50,5 % |             14 |
| Ansage und Karten (6 Kandidaten, `cardMiss` 0,1) |  52,1 % |             16 |

Den größten Teil liefert das Kartenspiel. Strengere Gewichte treffen mehr Karten, lassen aber
weniger verschiedene Verteilungen übrig (effektive Zahl).

**Entscheidungsverlust gegen die wahre Verteilung** (`gewichtungVerlust.test.ts`, 20 250
Kartenwahlen, gepaart; Verlust = was die gewählte Karte auf der wahren Verteilung weniger bringt
als die beste, in Cent):

| Budget              | ohne Gewichtung |                  6 Kandidaten | 10 Kandidaten |
| ------------------- | --------------: | ----------------------------: | ------------: |
| Stark vor B5 (2000) |            5,86 | −0,01 ± 0,21 (`cardMiss` 0,1) |  −0,35 ± 0,20 |
| Max (5000, 10–60)   |            5,67 |                  −0,47 ± 0,18 |  −0,58 ± 0,18 |

Mit kleinem Budget frisst die geringere Zahl verschiedener Verteilungen den Gewinn fast auf; mit
dem Budget von Max sinkt der Verlust um gut 8 % (fast drei Standardfehler).

**Gepaarter Vergleich** (`strengthGewichtung.test.ts`, wie B2/B4: beide Fassungen auf demselben
Platz, dieselben Karten, Normal-Bots als Mitspieler, 16 000 Spiele):

| Vergleich                                                          | Vorteil (ct je Spiel) |
| ------------------------------------------------------------------ | --------------------: |
| Stark heute (Gewichtung, Budget 5000) gegen Stark vor B5           |          +2,03 ± 0,35 |
| nur das Budget (5000, ohne Gewichtung) gegen Stark vor B5          |          +1,57 ± 0,33 |
| nur die Gewichtung (beide Budget 5000)                             |          +0,46 ± 0,34 |
| zum Vergleich: Stark kennt die wahren Karten (Mogeln, 8000 Spiele) |           +10,0 ± 0,5 |

Ehrlich eingeordnet: Das neue „Stark“ ist messbar besser (Schwelle im großen Lauf: mehr als
1 Cent und drei Standardfehler). Der größte Teil kommt aber vom höheren Budget, das erst die
Beschleunigung bezahlbar macht. Die Gewichtung allein bringt im ganzen Spiel etwa einen halben
Cent – nicht sicher von null verschieden, obwohl sie deutlich mehr Karten richtig verteilt und den
Entscheidungsverlust messbar senkt. Volle Kenntnis der Karten wäre zehn Cent wert; die
Gewichtung schöpft davon wenig ab. Vermutlich, weil sie vor allem leicht zu erratende Karten
richtig setzt, während die entscheidenden (wo genau der eine hohe Trumpf sitzt) unsicher bleiben,
und weil sie die Zahl verschiedener Verteilungen senkt. Parameter (strenger, milder, mehr
Kandidaten, Ansage breiter oder schmaler) lagen in Läufen zu 4000 Spielen alle im Rauschen.

**Max** rechnet mit derselben Suche; die Gewichtung ersetzt `respectBids`. Bei seinem Budget ist
der Gewinn am klarsten (Entscheidungsverlust oben). Gegen Menschen, die anders spielen als die
Heuristik, wird die Gewichtung schwächer, schadet aber nicht (weich).

**Laufzeit** (AMD Ryzen 7 7800X3D, Node 26, je Entscheidung):

| Wer                                            | Kartenwahl im Schnitt | 95 % unter | längste |
| ---------------------------------------------- | --------------------: | ---------: | ------: |
| Stark vor B5 (Budget 2000)                     |                 34 ms |      60 ms |   74 ms |
| dasselbe mit den Beschleunigungen aus B5       |                 11 ms |      17 ms |   26 ms |
| Stark heute (5000, Gewichtung)                 |                 94 ms |     131 ms |  158 ms |
| Max, alle Testlagen (Bestwert aus drei Läufen) |                 45 ms |          – |  119 ms |

Damit bleiben beide unter 300 ms (Tests: Max jede Lage, Stark längste Entscheidung). Auf langsamen
Geräten schützt das Zeitbudget der Web-App (200 ms): Die Kandidaten bekommen höchstens die Hälfte
davon, die Probespiele brechen danach ab.

**Faustregelwerte** nach B5 neu gemessen: alle 23 Regeln, deren Wert von der Suche abhängt
(Kartenspiel, Zugeben, Kontra und Re, Bettel, Ramsch; 20 000 Spiele, bis 1500 Lagen, wie T4, 11
Minuten auf 16 Threads). Die Ansage- und Hochzeitsregeln rechnen mit der Ansage-Tabelle bzw. eigenen
Plausibilitätsprüfungen und sind unverändert. **Keine Regel verschiebt sich um mehr als zwei
Standardfehler** (Unterschied geteilt durch den gemeinsamen Fehler höchstens 0,9:
`gegner.rufsau.suchen` 1,0 → 1,5 ± 0,4; `bettel.gegner.klein` 2,7 → 3,5 ± 0,8;
`spieler.farbe.nach.trumpf` 15,8 → 14,7 ± 2,6; `spieler.trumpf.ziehen` 11,8 → 10,8 ± 2,3;
`gegner.kurzer.weg.lange.farbe` 2,5 → 1,5 ± 1,2). Die Kontra-Regeln kommen auf genau dieselben
Werte. `werte.ts` und die Tabelle oben bleiben deshalb beim Stand von T5. Knapp an der Grenze:
`gegner.kurzer.weg.lange.farbe` lag mit 2,5 ± 1,2 gerade über zwei Fehlern („nützlich“), neu
gemessen läge es darunter – im Rauschen, darum nicht geändert.

### Grenzen

- Das Modell ist die Heuristik. Gegen „Stark“, Max-Nutzer oder Menschen passt es schlechter; die
  Gewichte sind mit Normal-Bots als Mitspielern gewählt und gemessen.
- Die Gewichtung schaut nur, ob die Heuristik _genau diese_ Karte gespielt hätte. Wer „richtig
  schmiert“, aber die Zehn statt der Sau nimmt, zählt als Abweichung.
- „Weiter“ zählt bei der eigenen Ansage weiter 0; in die Ansage-Tabelle selbst fließt die Ansage
  der anderen nicht ein (Ansage von Stark und Max kommt weiter aus der Tabelle).
- Die Hochzeit-Bewertung (`evaluateWeddingOffer`, `evaluateWeddingGive`) nutzt weiter ihre eigenen
  Plausibilitätsprüfungen.

### Messung wiederholen

```bash
# Stärke: 16 Teile parallel (etwa 20 Minuten), dann zusammenrechnen
for i in $(seq 0 15); do B5_TEIL=$i/16 npx vitest run packages/bots/test/strengthGewichtung.test.ts & done; wait
B5_ZUSAMMEN=1 npx vitest run packages/bots/test/strengthGewichtung.test.ts
# Entscheidungsverlust je Variante (etwa 15 Minuten)
for i in $(seq 0 15); do B5_VERLUST=$i/16 npx vitest run packages/bots/test/gewichtungVerlust.test.ts & done; wait
B5_VERLUST_ZUSAMMEN=1 npx vitest run packages/bots/test/gewichtungVerlust.test.ts
```

Varianten über `B5_NEU`, `B5_ALT`, `B5_PARAMETER` bzw. `B5_VERLUST_VARIANTEN` (JSON, siehe Kopf der
Testdateien).

## Textvorschläge für die Oberfläche

Umgesetzt in T2 (`TUTOR_TEXT` in `apps/web/src/i18n/de.ts`, dort auch Kurztitel und gekürzte
Begründungen der Faustregeln); die Tabellen bleiben als Vorlage. Platzhalter in geschweiften Klammern; Sitze kommen als Zahl und
werden zu Namen, Farben und Spielarten zu ihren Wörtern.

### Auswahlfragen (`QUESTION_IDS`)

| Kennung                      | Text                                                             |
| ---------------------------- | ---------------------------------------------------------------- |
| `frage.ansage.spielen`       | Soll ich mit diesen Karten spielen?                              |
| `frage.ansage.welches.spiel` | Welches Spiel passt zu meinem Blatt?                             |
| `frage.ansage.zweikampf`     | {gegner} will spielen – lohnt sich ein höheres Spiel?            |
| `frage.ansage.halten`        | {gegner} will höher – soll ich halten?                           |
| `frage.karte.welche`         | Welche Karte ist sinnvoll, und welche Strategie steckt dahinter? |
| `frage.kontra`               | Soll ich gegen das {spiel} von {spieler} Kontra geben?           |
| `frage.re`                   | {kontra} hat Kontra gegeben – Re?                                |
| `frage.hochzeit.annehmen`    | {spieler} macht {spiel} – soll ich annehmen?                     |
| `frage.hochzeit.zurueck`     | Welche Karte(n) gebe ich zurück?                                 |
| `frage.rueckblick.zug`       | War mein letzter Zug gut?                                        |

### Denkanstöße (`denkanstoss.<kennung>`)

| Kennung                                          | Denkanstoß                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `denkanstoss.ansage.zu.schwach`                  | Wie viele Stiche machst du mit diesem Blatt sicher selbst?                                      |
| `denkanstoss.ansage.sauspiel.grundblatt`         | Welche zwei Farben hättest du mit deinem Partner im Griff?                                      |
| `denkanstoss.ansage.solo.trumpflaenge`           | Wie viele Trümpfe haben die drei anderen zusammen noch?                                         |
| `denkanstoss.ansage.wenz.unter.und.farben`       | Wie kommst du im Wenz ans Spiel zurück – und woher kommen die Stiche?                           |
| `denkanstoss.ansage.bettel.nur.sicher`           | Kommst du in jeder Farbe unter den Karten der Gegner durch – und wirst du hohe Karten früh los? |
| `denkanstoss.ansage.tout.nur.sicher`             | Kann dir irgendein Gegner einen Stich abnehmen?                                                 |
| `denkanstoss.zweikampf.eigener.wert`             | Gewinnst du das höhere Spiel – oder willst du nur {gegner} ausstechen?                          |
| `denkanstoss.hochzeit.zwei.sauen`                | Was bringst du deinem Partner mit, wenn er deinen Trumpf nimmt?                                 |
| `denkanstoss.hochzeit.ablehnen.schwach`          | Reicht dein Blatt für ein Spiel, in dem der Partner keinen Trumpf hat?                          |
| `denkanstoss.hochzeit.zurueckgeben.farbe.frei`   | Welche Farbe könntest du mit der Rückgabe frei machen?                                          |
| `denkanstoss.hochzeit.zurueckgeben.klein`        | Welche Karte kostet dich und deine Partei am wenigsten?                                         |
| `denkanstoss.kontra.gegen.partnerspiel`          | Wärst du mit diesem Blatt selbst gern Sauspieler?                                               |
| `denkanstoss.kontra.gegen.einzelspiel`           | Wie viel von der Trumpfstärke des Spielers hältst du?                                           |
| `denkanstoss.re.mit.reserve`                     | {kontra} glaubt, du verlierst. Hast du genug Reserve für das Doppelte?                          |
| `denkanstoss.spieler.solo.von.oben`              | Welcher Trumpf ist gerade der höchste im Spiel?                                                 |
| `denkanstoss.spieler.trumpf.ziehen`              | Womit stechen die Gegner deine Sauen?                                                           |
| `denkanstoss.spieler.rufsau.nicht.selbst.suchen` | Wer sollte die Rufsau suchen – du oder die Gegner?                                              |
| `denkanstoss.spieler.farbe.nach.trumpf`          | Kann jetzt noch jemand einstechen?                                                              |
| `denkanstoss.mitspieler.trumpf.spielen`          | Wie zeigst du {spieler}, dass du zu ihm gehörst?                                                |
| `denkanstoss.gegner.rufsau.suchen`               | Wie findest du heraus, wer mit dem Spieler spielt?                                              |
| `denkanstoss.gegner.sau.frisch`                  | Wann ist eine Sau am sichersten?                                                                |
| `denkanstoss.gegner.kurzer.weg.lange.farbe`      | Wo sitzt der Spieler – direkt hinter dir oder als Letzter?                                      |
| `denkanstoss.gegner.kein.trumpf.anspielen`       | Wem hilft es, wenn du Trumpf spielst?                                                           |
| `denkanstoss.karte.schmieren`                    | {partner} hält den Stich. Kann ihn noch jemand holen?                                           |
| `denkanstoss.karte.nicht.vorschnell.schmieren`   | {partner} liegt vorn – aber ist der Stich schon sicher?                                         |
| `denkanstoss.karte.hinten.billig.stechen`        | Du bist der Letzte. Wie viel Trumpf brauchst du wirklich?                                       |
| `denkanstoss.karte.stechen.lohnt`                | {augen} Augen liegen im Stich. Kannst du ihn sicher holen?                                      |
| `denkanstoss.karte.farbe.freimachen`             | Welche Farbe könntest du mit diesem Abwurf frei machen?                                         |
| `denkanstoss.karte.abspatzen`                    | Der Stich ist verloren. Was gibst du am wenigsten gern her?                                     |
| `denkanstoss.karte.abspatzen.trumpf`             | Du musst Trumpf zugeben. Welcher Trumpf kostet die wenigsten Augen?                             |
| `denkanstoss.hochzeit.annehmen`                  | Wie viele Stiche würdest du mit dem Trumpf deines Partners selbst machen?                       |
| `denkanstoss.hochzeit.zurueck`                   | Welche Karte wirst du am leichtesten los?                                                       |
| `denkanstoss.bettel.spieler.drunter`             | Welche Karte wirst du jetzt gefahrlos los?                                                      |
| `denkanstoss.bettel.gegner.klein`                | Wie zwingst du den Bettelspieler, einen Stich zu nehmen?                                        |
| `denkanstoss.ramsch.durchmarsch.verhindern`      | {spieler} hat alle Stiche. Was hält ihn auf?                                                    |
| `denkanstoss.ramsch.hoch.drunter`                | Du bleibst drunter. Welche Karte willst du später nicht mehr haben?                             |
| `denkanstoss.ausnahme`                           | Die übliche Faustregel passt hier nicht ganz. Was ist an dieser Lage anders?                    |
| `denkanstoss.ansage`                             | Wie viele Stiche traust du deinem Blatt zu?                                                     |
| `denkanstoss.kontra`                             | Wer hat hier die besseren Karten – der Spieler oder du?                                         |
| `denkanstoss.karte.anspielen`                    | Was soll dieser Stich für dich erreichen?                                                       |
| `denkanstoss.karte.zugeben`                      | Wer hält den Stich, und wie viele Augen liegen drin?                                            |

Die Begründungen (`regel.<kennung>`) sind die Absätze **Begründung** im Katalog, für die Sprechblase
auf ein, zwei Sätze gekürzt.
