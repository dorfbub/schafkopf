# Strategien und Faustregeln

Grundlage des Trainers (Pakete T1 und T2). Hier steht, was ein guter Schafkopfspieler in welcher
Lage tut und warum – in eigenen Worten, mit Quelle. Der Tutor (`packages/tutor`) erkennt diese
Faustregeln in der Lage, begründet damit seine Empfehlung und stellt Denkanstöße. Kennungen hier
und im Code (`RULE_IDS` in `packages/tutor/src/rules.ts`) sind dieselben; ein Test prüft das.

Inhalt:

1. [Was die Bots schon wissen](#was-die-bots-schon-wissen)
2. [Quellen](#quellen)
3. [Widersprüche und Entscheidungen](#widersprüche-und-entscheidungen)
4. [Der Katalog](#der-katalog) – 31 Faustregeln
5. [Messung der Faustregeln](#messung-der-faustregeln-t4) – Wert je Regel in Cent
6. [Didaktik](#didaktik) – wie der Tutor fragt, rät und bewertet
7. [Wie der Tutor rechnet](#wie-der-tutor-rechnet) – Schwellen, Automatikmodus, Grenzen
8. [Textvorschläge für die Oberfläche](#textvorschläge-für-die-oberfläche)

---

## Was die Bots schon wissen

Ausgewertet: `packages/bots/src/heuristicBot.ts`, `hochzeit.ts`, `doubling.ts`, `strongBot.ts` und
die Bot-Annahmen 70–74 in `docs/REGELN.md`.

**Ansage (Heuristik, B1/B3).** Jedes am Tisch erlaubte Spiel bekommt eine Punktzahl aus dem Blatt
minus einer Schwelle („Marge“); ab 0 wird es gewünscht. Gewichtet werden Trümpfe nach ihrer Höhe,
Sauen (mit Zehn dazu mehr) und freie Farben. Sauspiel nur ab vier Trümpfen, Solo und Farbwenz ab
sechs, Wenz/Geier mit zwei Trümpfen nur, wenn der höchste dabei ist; Nebenfarben zählen dort als
Folgen von oben. Bettel nur, wenn jede Farbe „von unten“ gedeckt ist; Tout nur praktisch sicher
(Solo: nur Trümpfe, die vier Ober). Bei der Ruffarbe kostet jede weitere Karte der Farbe etwas,
ebenso eine Zehn in der Ruffarbe. Im Zweikampf nennt der Bot das niedrigste gewünschte Spiel, das
überbietet; halten nur mit einem gewünschten Spiel mindestens dieser Höhe.

**Hochzeit (B3).** Ansagen mit genau einem Trumpf und zwei Sauen (oder Sau mit Zehn und einer
weiteren Sau). Annehmen nur mit einem Blatt, das mit dem geschenkten Trumpf ein starkes Sauspiel
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
  Gegner spielen niedrig an (in Farben, die der Spieler hat) und bleiben niedrig, solange er noch
  kommt.
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
- **Quelle:** WB; D1 4.1, 4.3; D2 4.1; BOT.

#### `ansage.wenz.unter.und.farben`

- **Bereich:** Ansage.
- **Wann:** Wenz erlaubt; drei Unter oder zwei mit dem Eichel-Unter, und mindestens zwei Sauen.
- **Begründung:** Im Wenz gibt es nur vier Trümpfe. Wer die hohen Unter hat, holt sich das
  Ausspiel zurück, und die Stiche kommen aus den Farben – also aus Sauen und langen Farben von
  oben. Wer selbst herauskommt, kann seine Farben gleich spielen.
- **Ausnahmen:** Mit nur einem Unter fast nie (D2 4.13); Farbwenz oder Solo abwägen (D1 4.14).
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
- **Quelle:** BOT, WT.

#### `ansage.tout.nur.sicher`

- **Bereich:** Ansage (Zweikampf und Stufe 3, nur mit „Tout erlaubt“).
- **Wann:** Ein Spiel ist sehr stark (Marge ab 2,5). Spricht für Tout, wenn es praktisch sicher
  alle Stiche macht (Solo: nur Trümpfe mit den vier Obern; Wenz/Geier: alle Trümpfe und Farben
  von oben); sonst für das Spiel ohne Tout.
- **Begründung:** Tout verdoppelt den Gewinn, aber ein einziger abgegebener Stich verliert alles.
  Mit einer Lücke kostet das im Schnitt mehr, als es bringt.
- **Ausnahmen:** keine.
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
- **Wann:** Ein Gegner liegt vorn, und man kann den Stich nicht (oder nicht lohnend) holen.
- **Begründung:** Was man in einen verlorenen Stich legt, zählt für die Gegner. Also einen Spatz –
  eine Karte ohne Augen –, keine Trümpfe und keine Sauen.
- **Ausnahmen:** Gegen einen Solospieler nicht immer null Augen (D2 5.5).
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

Jede Regel hat einen gemessenen Wert: Wie viele Cent bringt es im Schnitt, sie in einer Lage zu
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
`karte.abspatzen` und die Hochzeitsregeln sind so gemessen, wie sie in diesem Stand stehen; T3 ändert
beide (abspatzen getrennt, Hochzeit beraten), danach ist neu zu messen.

### Ergebnis (Stand: 20 000 Spiele)

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
| `karte.schmieren`                    |       2,7 |      0,6 |  1500 |              1,456 | nützlich              |
| `ramsch.hoch.drunter`                |       2,7 |      0,7 |  1500 |              0,497 | nützlich              |
| `karte.farbe.freimachen`             |       2,3 |      1,5 |  1500 |              1,556 | kein messbarer Nutzen |
| `karte.nicht.vorschnell.schmieren`   |       2,2 |      0,6 |  1500 |              0,867 | nützlich              |
| `karte.abspatzen`                    |       1,8 |      0,7 |  1500 |              6,319 | nützlich              |
| `ansage.zu.schwach`                  |       1,6 |      0,5 |  1500 |              1,895 | nützlich              |
| `spieler.solo.von.oben`              |       1,2 |      3,2 |  1500 |              0,415 | kein messbarer Nutzen |
| `ramsch.durchmarsch.verhindern`      |       1,1 |      3,3 |    83 |              0,004 | kein messbarer Nutzen |
| `gegner.rufsau.suchen`               |       1,0 |      0,4 |  1500 |              0,528 | nützlich              |
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
die Hochzeit wird nicht simuliert, sondern aus der Heuristik geschätzt (`estimated`). Kontra und Re
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
selbst (`respectBids`). Die Hochzeit (annehmen, zurückgeben) berät der Tutor noch nicht; am Tisch
sagt Max Weber das im Vorspiel ehrlich (T2, Folgepunkt in ARBEITSPAKETE.md).

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
