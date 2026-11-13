# Strategien und Faustregeln

Grundlage des Trainers (Pakete T1 und T2). Hier steht, was ein guter Schafkopfspieler in welcher
Lage tut und warum – in eigenen Worten, mit Quelle. Der Tutor (`packages/tutor`) erkennt diese
Faustregeln in der Lage, begründet damit seine Empfehlung und stellt Denkanstöße. Kennungen hier
und im Code (`RULE_IDS` in `packages/tutor/src/rules.ts`) sind dieselben; ein Test prüft das.

Inhalt:

1. [Was die Bots schon wissen](#was-die-bots-schon-wissen)
2. [Quellen](#quellen)
3. [Widersprüche und Entscheidungen](#widersprüche-und-entscheidungen)
4. [Der Katalog](#der-katalog) – 36 Faustregeln
5. [Messung der Faustregeln](#messung-der-faustregeln-t4) – Wert je Regel in Cent
6. [Didaktik](#didaktik) – wie der Tutor fragt, rät und bewertet
7. [Wie der Tutor rechnet](#wie-der-tutor-rechnet) – Schwellen, Automatikmodus, Grenzen
8. [Textvorschläge für die Oberfläche](#textvorschläge-für-die-oberfläche)

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
  Ist es unsicher, mit einem sicheren Stecher übernehmen, wenn mindestens zehn Augen drin sind,
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

**Stark (B2).** Bewertet jede erlaubte Karte mit Probespielen: Die ungesehenen Karten werden passend
zu allem Bekannten (Kartenzahlen, Fehlfarben, Rufsau) zufällig verteilt und mit der Heuristik zu
Ende gespielt; gezählt werden die Cent am Ende. Knappe Ansagen spielt er ebenso durch. Diese Suche
ist die Rechnung des Tutors (siehe [unten](#wie-der-tutor-rechnet)).

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
8. **Was der Ansager hat.** Die Suche des starken Bots verteilt die verdeckten Karten, als hätte
   der Ansager irgendein Blatt. Gegen ein Solo rechnet sie dann mit einem viel zu schwachen
   Spieler und rät etwa, Sauen anzuspielen, die längst gestochen würden. **Entscheidung:** Der Tutor
   verwirft Verteilungen, in denen der Ansager sein Spiel nach der Heuristik nicht angesagt hätte
   (`respectBids`, Marge unter −2, nicht bei Bettel und Hochzeit). Der starke Bot am Tisch bleibt
   unverändert.

## Der Katalog

Jede Faustregel: **Kennung**, Bereich, wann sie greift, die Begründung für Spieler, die die Regeln
kennen, Ausnahmen, Quelle. Die Reihenfolge ist die des Codes und zugleich die Priorität: Spezielle
Regeln stehen vor allgemeinen. Der Denkanstoß (`denkanstoss.<kennung>`) steht im
[Textvorschlag](#textvorschläge-für-die-oberfläche).

### Ansage

#### `ansage.zu.schwach`

- **Bereich:** Ansage (Stufe 1 und Zweikampf).
- **Wann:** Kein am Tisch erlaubtes Spiel kommt nach der Heuristik auch nur in die Nähe (Marge
  unter −1,5 für jedes).
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

#### `ansage.ruffarbe.kurz`

- **Bereich:** Ansage (Stufe 3, Farbe des Sauspiels).
- **Wann:** Mehrere Ruffarben sind möglich, und sie unterscheiden sich: In einer hat man die Zehn
  (ohne Sau), oder eine ist kürzer.
- **Begründung:** Ruft man die Sau zur eigenen Zehn, fällt die Zehn in den Stich des Partners statt
  in den der Gegner. Eine kurze Ruffarbe hält den Partner leicht auffindbar, und man ist dort bald
  frei und kann stechen.
- **Ausnahmen:** Mit drei oder mehr Karten in der Ruffarbe droht das Davonlaufen des Partners
  ins Leere; eine lange Ruffarbe ist dann die schlechtere Wahl.
- **Quelle:** D1 1.3; BOT.

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
- **Wann:** Bettel erlaubt. Spricht dafür, wenn jede Farbe von unten gedeckt ist (zu jeder hohen
  Karte genug kleinere); dagegen, wenn das Blatt nur verlockend aussieht (kaum hohe Karten), aber
  eine Lücke hat.
- **Begründung:** Im Bettel reicht ein einziger Stich zum Verlieren, und die Gegner suchen genau
  die Farbe, in der man nicht drunter kommt. Eine Lücke findet man selten rechtzeitig selbst.
- **Ausnahmen:** keine; der Tutor meldet ein lückenhaftes Bettel-Blatt aber nur, wenn kein anderes
  Spiel lohnt.
- **Ansage-Tabelle (B4):** Von unten gedeckt etwa +130 Cent; mit blankem Schellen-Ober und -Zehner
  etwa −43 bis −5 Cent, mit blankem König oder blanker Sau etwa −70 bis −100 Cent. Eine hohe Karte
  über der Sieben ist tragbar, wenn man sie früh abwerfen kann (einzelne Sieben daneben: gemessen
  +26 bis +54 Cent). Die Regel stimmt also, mit der Ausnahme „früh abwerfen“.
- **Quelle:** BOT, WT.

#### `ansage.tout.nur.sicher`

- **Bereich:** Ansage (Zweikampf und Stufe 3, nur mit „Tout erlaubt“).
- **Wann:** Ein Spiel ist sehr stark (Marge ab 2,5). Spricht für Tout, wenn es praktisch sicher
  alle Stiche macht (Solo: nur Trümpfe mit den vier Obern; Wenz/Geier: alle Trümpfe und Farben
  von oben); sonst für das Spiel ohne Tout.
- **Begründung:** Tout verdoppelt den Gewinn, aber ein einziger abgegebener Stich verliert alles.
  Mit einer Lücke kostet das im Schnitt mehr, als es bringt.
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

#### `hochzeit.annehmen.trumpf`

- **Bereich:** Hochzeit (Annehmen, man wird gefragt).
- **Wann:** Mit den geschenkten Trümpfen wäre das Blatt fast ein eigenes Sauspiel: mindestens fünf
  Trümpfe danach, dazu hohe Ober oder Sauen und möglichst eine freie Farbe (Heuristik des Bots,
  `rateAcceptWedding`).
- **Begründung:** Der Hochzeiter hat keine Trümpfe und bringt nur seine Sauen mit. Die Trümpfe
  muss der Partner haben; je stärker sein Blatt, desto sicherer holt die Partei die Stiche.
- **Ausnahmen:** Hat der Hochzeiter wenige Sauen, trägt auch ein starkes Blatt nicht immer –
  das sieht die Rechnung, die Faustregel kennt seine Karten nicht.
- **Quelle:** BOT (Annahme 72); WT.

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
- **Wann:** Man sitzt hinten, ein Gegner liegt vorn, und man kann mit mehreren Karten stechen.
- **Begründung:** Als Letzter kann einem niemand mehr überstechen. Also reicht der kleinste Trumpf,
  der sticht, oder eine höhere Farbkarte; die hohen Trümpfe hebt man für später auf.
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

Jede der 36 Regeln hat einen gemessenen Wert (oder ist begründet „zu selten“): Wie viele Cent bringt es im Schnitt, sie in einer Lage zu
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

### Ergebnis (Stand: 20 000 Spiele, alle 36 Regeln)

| Regel                                | Wert (ct) | ± Fehler | Lagen | Vorkommen je Spiel | Urteil                |
| ------------------------------------ | --------: | -------: | ----: | -----------------: | --------------------- |
| `ansage.wenz.unter.und.farben`       |      49,6 |      3,3 |  1500 |              0,254 | nützlich              |
| `ansage.solo.trumpflaenge`           |      44,4 |      3,0 |  1500 |              1,017 | nützlich              |
| `kontra.gegen.einzelspiel`           |      32,2 |      1,4 |  1500 |              0,215 | nützlich              |
| `ansage.sauspiel.grundblatt`         |      26,3 |      2,2 |  1500 |              1,324 | nützlich              |
| `zweikampf.eigener.wert`             |      22,1 |      2,5 |  1500 |              1,542 | nützlich              |
| `karte.stechen.lohnt`                |      17,1 |      2,2 |  1500 |              0,839 | nützlich              |
| `kontra.gegen.partnerspiel`          |      13,9 |      0,6 |  1500 |              0,273 | nützlich              |
| `bettel.spieler.drunter`             |       7,7 |      7,7 |    39 |              0,011 | kein messbarer Nutzen |
| `ansage.bettel.nur.sicher`           |       7,2 |      1,0 |  1223 |              0,066 | nützlich              |
| `hochzeit.zwei.sauen`                |       6,3 |      0,6 |  1113 |              0,147 | nützlich              |
| `spieler.farbe.nach.trumpf`          |       6,0 |      2,8 |  1500 |              0,563 | nützlich              |
| `spieler.trumpf.ziehen`              |       4,3 |      1,7 |  1500 |              2,688 | nützlich              |
| `gegner.kein.trumpf.anspielen`       |       3,7 |      0,8 |  1500 |              1,712 | nützlich              |
| `hochzeit.ablehnen.schwach`          |       3,0 |      1,1 |   815 |              0,041 | nützlich              |
| `karte.schmieren`                    |       2,7 |      0,6 |  1500 |              1,456 | nützlich              |
| `ramsch.hoch.drunter`                |       2,7 |      0,7 |  1500 |              0,497 | nützlich              |
| `karte.farbe.freimachen`             |       2,3 |      1,5 |  1500 |              1,556 | kein messbarer Nutzen |
| `karte.abspatzen`                    |       2,3 |      0,8 |  1500 |              3,916 | nützlich              |
| `karte.nicht.vorschnell.schmieren`   |       2,2 |      0,6 |  1500 |              0,867 | nützlich              |
| `hochzeit.annehmen.trumpf`           |       1,7 |      0,9 |   682 |              0,034 | kein messbarer Nutzen |
| `ansage.zu.schwach`                  |       1,6 |      0,5 |  1500 |              1,895 | nützlich              |
| `spieler.solo.von.oben`              |       1,2 |      3,2 |  1500 |              0,415 | kein messbarer Nutzen |
| `karte.abspatzen.trumpf`             |       1,2 |      0,4 |  1500 |              2,403 | nützlich              |
| `ramsch.durchmarsch.verhindern`      |       1,1 |      3,3 |    83 |              0,004 | kein messbarer Nutzen |
| `gegner.rufsau.suchen`               |       1,0 |      0,4 |  1500 |              0,528 | nützlich              |
| `hochzeit.zurueckgeben.farbe.frei`   |       1,0 |      0,6 |   577 |              0,029 | kein messbarer Nutzen |
| `hochzeit.zurueckgeben.klein`        |       0,9 |      0,6 |   675 |              0,034 | kein messbarer Nutzen |
| `spieler.rufsau.nicht.selbst.suchen` |       0,9 |      0,5 |  1500 |              0,632 | kein messbarer Nutzen |
| `gegner.sau.frisch`                  |       0,8 |      0,8 |  1500 |              0,764 | kein messbarer Nutzen |
| `mitspieler.trumpf.spielen`          |       0,6 |      0,5 |  1500 |              0,335 | kein messbarer Nutzen |
| `gegner.kurzer.weg.lange.farbe`      |       0,1 |      1,3 |  1500 |              0,342 | kein messbarer Nutzen |
| `bettel.gegner.klein`                |       0,0 |      0,0 |   117 |              0,022 | kein messbarer Nutzen |
| `karte.hinten.billig.stechen`        |      -1,7 |      1,3 |  1500 |              0,663 | kein messbarer Nutzen |
| `ansage.tout.nur.sicher`             |      -3,9 |      4,1 |  1500 |              0,165 | kein messbarer Nutzen |
| `ansage.ruffarbe.kurz`               |      -8,7 |      1,7 |  1500 |              0,307 | schadet               |
| `re.mit.reserve`                     |         – |        – |     0 |              0,000 | zu selten             |

„Vorkommen je Spiel“ zählt alle vier Sitze zusammen, jedes Vorkommen. „Kein messbarer Nutzen“
heißt: Der Wert liegt innerhalb von zwei Standardfehlern um null.

### Einordnung

- **Ganz vorn: die Ansage.** Wenz, Solo, Sauspiel-Grundblatt und Zweikampf bringen 20–50 Cent je
  Vorkommen, auch Kontra gegen ein Einzelspiel (32 Cent) und gegen ein Partnerspiel (14 Cent).
  Hier entscheidet sich der Gewinn eines Spiels – deshalb stehen diese Regeln bei Max vorn.
- **Kartenspiel: klein, aber messbar.** Stechen, wenn es lohnt (17 Cent), und Farbe nach dem Trumpf
  (6 Cent) tragen; die meisten übrigen Kartenregeln bringen 1–4 Cent je Vorkommen. Sie kommen dafür
  oft vor (`karte.abspatzen` mehr als sechsmal je Spiel am Tisch).
- **Schadet: `ansage.ruffarbe.kurz` (−8,7 ± 1,7).** Die Regel zieht die Sau zur eigenen Zehn vor;
  die Heuristik rechnet eine Zehn in der Ruffarbe als Kostenpunkt – und liegt nach der Messung
  richtig. **Kandidat zum Umformulieren:** die Zehn-Vorliebe streichen, nur „kurze Ruffarbe“ behalten.
  Bis dahin steht die Regel weiter im Katalog (nichts stillschweigend gelöscht).
- **Kein messbarer Nutzen:** `spieler.solo.von.oben`, `spieler.rufsau.nicht.selbst.suchen`,
  `gegner.sau.frisch`, `mitspieler.trumpf.spielen`, `gegner.kurzer.weg.lange.farbe`,
  `karte.farbe.freimachen`, `karte.hinten.billig.stechen` (−1,7 ± 1,3), `ansage.tout.nur.sicher`,
  `bettel.spieler.drunter`, `bettel.gegner.klein`, `ramsch.durchmarsch.verhindern`. Sie bleiben
  als Lehrstoff im Katalog, Max nennt keinen Wert dazu und ordnet sie hinter die gemessenen. **Kandidaten
  zum Streichen oder Umformulieren** nach Prüfung mit anderen Mitspielern als der Heuristik:
  `karte.hinten.billig.stechen` und `gegner.kurzer.weg.lange.farbe` (Wert ≈ 0 bei 1500 Lagen),
  `ansage.tout.nur.sicher` (bei den Tout-Entscheidungen liegt der Fehler bei über 4 Cent).
- **Hochzeit (T3):** „Zwei Sauen“ bringt 6 Cent; Annehmen, Ablehnen und Zurückgeben liegen bei 1–3 Cent, davon liegt nur `hochzeit.ablehnen.schwach` (3,0 ± 1,1) sicher über null. Die Lagen sind selten (0,03–0,04 je Spiel); zu den übrigen nennt Max keinen Wert.
- **Zu selten:** `re.mit.reserve` (keine Lage mit Heuristik-Gegnern).

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
- Die **Ansage der anderen** fließt nicht ein: Hat vorher jemand „Ich würde“ gesagt, sind die Gegner
  stärker als im Schnitt; haben alle „weiter“ gesagt, schwächer. Ebenso fehlen Kontra und Re.
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

**Rechnung:** die Suche des starken Bots mit etwa dem Zweieinhalbfachen an Aufwand (`TUTOR_BUDGET`),
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

**Laufzeit:** unter 300 ms je Frage auf einem Entwicklerrechner (Test; gemessen etwa 20–150 ms).
Für langsame Geräte nimmt `TutorOptions` eine Uhr und ein Zeitbudget wie der starke Bot; T2 rechnet
bei Bedarf in einem Web Worker.

**Grenzen:** Gegner und Partner spielen in den Probespielen wie die Heuristik, nicht wie Menschen.
Was die Ansage der anderen verrät („Ich würde“, Zweikampf), nutzt die Rechnung nur für den Ansager
selbst (`respectBids`).

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

| Kennung                                          | Denkanstoß                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `denkanstoss.ansage.zu.schwach`                  | Wie viele Stiche machst du mit diesem Blatt sicher selbst?                   |
| `denkanstoss.ansage.sauspiel.grundblatt`         | Welche zwei Farben hättest du mit deinem Partner im Griff?                   |
| `denkanstoss.ansage.ruffarbe.kurz`               | Wo landet deine {farbe}-Zehn, wenn du die passende Sau rufst?                |
| `denkanstoss.ansage.solo.trumpflaenge`           | Wie viele Trümpfe haben die drei anderen zusammen noch?                      |
| `denkanstoss.ansage.wenz.unter.und.farben`       | Wie kommst du im Wenz ans Spiel zurück – und woher kommen die Stiche?        |
| `denkanstoss.ansage.bettel.nur.sicher`           | Gibt es eine Farbe, in der du nicht sicher drunter bleibst?                  |
| `denkanstoss.ansage.tout.nur.sicher`             | Kann dir irgendein Gegner einen Stich abnehmen?                              |
| `denkanstoss.zweikampf.eigener.wert`             | Gewinnst du das höhere Spiel – oder willst du nur {gegner} ausstechen?       |
| `denkanstoss.hochzeit.zwei.sauen`                | Was bringst du deinem Partner mit, wenn er deinen Trumpf nimmt?              |
| `denkanstoss.hochzeit.annehmen.trumpf`           | Wie stark wäre dein Blatt mit dem geschenkten Trumpf?                        |
| `denkanstoss.hochzeit.ablehnen.schwach`          | Reicht dein Blatt für ein Spiel, in dem der Partner keinen Trumpf hat?       |
| `denkanstoss.hochzeit.zurueckgeben.farbe.frei`   | Welche Farbe könntest du mit der Rückgabe frei machen?                       |
| `denkanstoss.hochzeit.zurueckgeben.klein`        | Welche Karte kostet dich und deine Partei am wenigsten?                      |
| `denkanstoss.kontra.gegen.partnerspiel`          | Wärst du mit diesem Blatt selbst gern Sauspieler?                            |
| `denkanstoss.kontra.gegen.einzelspiel`           | Wie viel von der Trumpfstärke des Spielers hältst du?                        |
| `denkanstoss.re.mit.reserve`                     | {kontra} glaubt, du verlierst. Hast du genug Reserve für das Doppelte?       |
| `denkanstoss.spieler.solo.von.oben`              | Welcher Trumpf ist gerade der höchste im Spiel?                              |
| `denkanstoss.spieler.trumpf.ziehen`              | Womit stechen die Gegner deine Sauen?                                        |
| `denkanstoss.spieler.rufsau.nicht.selbst.suchen` | Wer sollte die Rufsau suchen – du oder die Gegner?                           |
| `denkanstoss.spieler.farbe.nach.trumpf`          | Kann jetzt noch jemand einstechen?                                           |
| `denkanstoss.mitspieler.trumpf.spielen`          | Wie zeigst du {spieler}, dass du zu ihm gehörst?                             |
| `denkanstoss.gegner.rufsau.suchen`               | Wie findest du heraus, wer mit dem Spieler spielt?                           |
| `denkanstoss.gegner.sau.frisch`                  | Wann ist eine Sau am sichersten?                                             |
| `denkanstoss.gegner.kurzer.weg.lange.farbe`      | Wo sitzt der Spieler – direkt hinter dir oder als Letzter?                   |
| `denkanstoss.gegner.kein.trumpf.anspielen`       | Wem hilft es, wenn du Trumpf spielst?                                        |
| `denkanstoss.karte.schmieren`                    | {partner} hält den Stich. Kann ihn noch jemand holen?                        |
| `denkanstoss.karte.nicht.vorschnell.schmieren`   | {partner} liegt vorn – aber ist der Stich schon sicher?                      |
| `denkanstoss.karte.hinten.billig.stechen`        | Du bist der Letzte. Wie viel Trumpf brauchst du wirklich?                    |
| `denkanstoss.karte.stechen.lohnt`                | {augen} Augen liegen im Stich. Kannst du ihn sicher holen?                   |
| `denkanstoss.karte.farbe.freimachen`             | Welche Farbe könntest du mit diesem Abwurf frei machen?                      |
| `denkanstoss.karte.abspatzen`                    | Der Stich ist verloren. Was gibst du am wenigsten gern her?                  |
| `denkanstoss.karte.abspatzen.trumpf`             | Du musst Trumpf zugeben. Welcher Trumpf kostet die wenigsten Augen?          |
| `denkanstoss.hochzeit.annehmen`                  | Wie viele Stiche würdest du mit dem Trumpf deines Partners selbst machen?    |
| `denkanstoss.hochzeit.zurueck`                   | Welche Karte wirst du am leichtesten los?                                    |
| `denkanstoss.bettel.spieler.drunter`             | Welche Karte wirst du jetzt gefahrlos los?                                   |
| `denkanstoss.bettel.gegner.klein`                | Wie zwingst du den Bettelspieler, einen Stich zu nehmen?                     |
| `denkanstoss.ramsch.durchmarsch.verhindern`      | {spieler} hat alle Stiche. Was hält ihn auf?                                 |
| `denkanstoss.ramsch.hoch.drunter`                | Du bleibst drunter. Welche Karte willst du später nicht mehr haben?          |
| `denkanstoss.ausnahme`                           | Die übliche Faustregel passt hier nicht ganz. Was ist an dieser Lage anders? |
| `denkanstoss.ansage`                             | Wie viele Stiche traust du deinem Blatt zu?                                  |
| `denkanstoss.kontra`                             | Wer hat hier die besseren Karten – der Spieler oder du?                      |
| `denkanstoss.karte.anspielen`                    | Was soll dieser Stich für dich erreichen?                                    |
| `denkanstoss.karte.zugeben`                      | Wer hält den Stich, und wie viele Augen liegen drin?                         |

Die Begründungen (`regel.<kennung>`) sind die Absätze **Begründung** im Katalog, für die Sprechblase
auf ein, zwei Sätze gekürzt.
