"""Baut faustregeln.html für das PDF der Faustregeln (Werte aus docs/STRATEGIEN.md).

Aufruf: npm run faustregeln:pdf
"""
import html, pathlib
D = pathlib.Path(__file__).parent
ROOT = D.parent.parent

# (Titel, Wann, Was/Warum, Wert, Fehler, Urteil)  Urteil: n=nützlich, k=kein messbarer Nutzen, s=zu selten
G = [
 ("Ansage", "Hier steckt das meiste Geld: Die Ansage-Regeln bringen 17 bis 65 Cent je Fall.", [
  ("Wenz nur mit Untern und Farben", "Wenz erlaubt.", "Drei Unter oder zwei mit dem Eichel-Unter, dazu mindestens zwei Sauen. Die Stiche kommen aus den Farben: Zwei Unter mit zwei Sauen, aber kurzen Farben kosten im Schnitt Geld.", 65.1, 3.3, "n"),
  ("Tout nur, wo es mehr bringt", "Ein sehr starkes Spiel, Tout erlaubt.", "Das Spiel ansagen, das am meisten bringt – mit oder ohne Tout. Ein einziger abgegebener Stich verliert beim Tout alles; sieben Trümpfe mit drei Obern sind als Tout ein Verlust, ohne Tout ein gutes Solo.", 56.4, 4.3, "n"),
  ("Solo braucht Trumpflänge", "Ein Farbsolo ist denkbar.", "Sechs Trümpfe mit zwei Obern oder sieben Trümpfe. Fünf Trümpfe mit zwei Obern und zwei Sauen bringen aber genauso viel – die Regel ist eher vorsichtig.", 55.1, 3.2, "n"),
  ("Sauspiel mit Grundblatt", "Sauspiel erlaubt.", "Fünf Trümpfe mit einem der drei höchsten Ober und eine freie Farbe oder Sau; oder vier Trümpfe mit zwei Obern, freier Farbe und Sau; oder sechs Trümpfe mit zwei freien Farben oder einer Sau. Merksatz: zwei Farben im Griff. Selbst ein gutes Sauspiel bringt nur rund 10 Cent.", 31.1, 2.5, "n"),
  ("Bettel nur, wenn er sich lohnt", "Bettel erlaubt.", "Von unten gedeckt ist ein Bettel sehr gut. Eine einzelne hohe Karte geht, wenn man sie früh abwerfen kann; mehrere oder ein blanker König bzw. eine blanke Sau nicht.", 25.3, 2.1, "n"),
  ("Im Zweikampf nur mit eigenem Wert", "Man fordert oder hält.", "Ein höheres Spiel lohnt nur, wenn es mit dem eigenen Blatt gewinnt. Wer nur überbietet, um dem anderen das Spiel wegzunehmen, verliert mehr als als Gegenspieler.", 17.0, 2.6, "n"),
  ("Hochzeit mit zwei Sauen", "Genau ein Trumpf, Hochzeit erlaubt.", "Mit zwei Sauen anbieten – aber auch ohne Sau kostet es nichts, wenn keiner annimmt.", 7.0, 1.1, "n"),
  ("Hochzeit mit schwachem Blatt ablehnen", "Man wird gefragt.", "Mit dem geschenkten Trumpf weniger als fünf Trümpfe oder kaum Sauen: ablehnen. Der Hochzeiter bringt keinen Trumpf mit.", 5.6, 0.9, "n"),
  ("Bei der Rückgabe eine Farbe frei machen", "Man hat angenommen.", "Die einzelne Karte einer Farbe zurückgeben, dann sticht man die Farbe später mit Trumpf. Eine Sau behält man lieber.", 1.9, 0.5, "n"),
  ("Sonst klein zurückgeben", "Keine Farbe wird frei.", "Die kleinste Karte ohne Augen zurückgeben, keine Sau und keinen Zehner.", 1.6, 0.5, "n"),
  ("Zu schwach: weiter", "Kein Spiel lohnt sich.", "„Weiter“ kostet nichts, und als Gegenspieler hilft man trotzdem mit. Seit die Bots nach Tabelle ansagen, unterscheidet die Regel nichts mehr – gutes Grundwissen.", -0.3, 0.3, "k"),
 ]),
 ("Kontra und Re", "Gegen Einzelspiele lohnt ein gut begründetes Kontra am meisten.", [
  ("Kontra gegen ein Einzelspiel", "Solo, Wenz oder Geier.", "Erst, wenn man etwa die halbe Trumpfstärke des Spielers und dazu Sauen hält. Ohne Unter gegen einen Wenz ist Kontra ein Geschenk.", 30.3, 1.4, "n"),
  ("Kontra gegen ein Partnerspiel", "Sauspiel oder Hochzeit.", "Nur mit einem Blatt, das selbst ein gutes Sauspiel wäre. Sonst verdoppelt man vor allem den eigenen Verlust.", 13.2, 0.6, "n"),
  ("Re nur mit Reserve", "Gegen das eigene Spiel kam Kontra.", "Re nur mit deutlich mehr, als das Spiel braucht – wer Kontra gibt, hat meist Gründe.", None, None, "s"),
 ]),
 ("Kartenspiel: Spielerpartei", "Trumpf ziehen, dann die Farben heimbringen.", [
  ("Farbe nach dem Trumpf", "Keiner hat mehr Trumpf.", "Jetzt sticht niemand mehr ein: erst Sauen und sichere Farbkarten, dann die Spatzen. Jeder weitere Trumpf wäre verschenkt.", 15.8, 2.5, "n"),
  ("Trumpf ziehen", "Man kommt heraus, die Gegner können noch Trumpf haben.", "Solange die Gegner Trumpf haben, stechen sie die eigenen Sauen. Trumpf zwingt sie zum Bedienen.", 11.8, 2.2, "n"),
  ("Im Solo von oben", "Man hält den höchsten Trumpf im Spiel.", "Der höchste Trumpf ist ein sicherer Stich und zieht jedem Gegner einen Trumpf.", 3.4, 3.0, "k"),
  ("Rufsau nicht selbst suchen", "Sauspiel-Ansager kommt heraus.", "Wer seine Ruffarbe selbst anspielt, zeigt seine Schwäche; Suchen ist Sache der Gegner.", 0.6, 0.5, "k"),
  ("Als Partner Trumpf spielen", "Man hat die Rufsau und kommt heraus.", "Mit Trumpf gibt man sich zu erkennen und hilft dem Ansager beim Ziehen.", 0.4, 0.4, "k"),
 ]),
 ("Kartenspiel: Gegenspieler", "Farben spielen, den Spieler zum Stechen zwingen.", [
  ("Keinen Trumpf anspielen", "Man hat Trumpf und Farben.", "Trumpf nimmt dem Spieler die Arbeit ab. Farben zwingen ihn, seine Trümpfe zum Stechen zu verbrauchen.", 4.8, 0.9, "n"),
  ("Kurzer Weg lang, langer Weg kurz", "Gegen ein Einzelspiel, man kommt heraus.", "Sitzt der Spieler direkt hinter einem, die lange Farbe spielen; sitzt er als Letzter, die kurze – dann ist man bald frei und sticht vor ihm ein.", 2.5, 1.2, "n"),
  ("Rufsau suchen", "Sauspiel, die Rufsau ist noch draußen.", "Mit der Ruffarbe zwingt man die Sau heraus, oft in einen kleinen Stich. Nicht mit einer Zehn suchen, die dann verloren ist.", 1.0, 0.4, "n"),
  ("Sau, solange die Farbe frisch ist", "Man hat eine Sau in einer noch nicht gespielten Farbe.", "Beim ersten Anspielen bedienen meist alle.", 0.1, 0.9, "k"),
 ]),
 ("Zugeben", "Volle Stiche holen, leere billig verloren geben.", [
  ("Stechen, wenn es sich lohnt", "Gegner vorn, zehn Augen oder mehr im Stich, man sticht sicher.", "Ein voller Stich ist die halbe Miete zum Schneider. Wer ihn sicher holen kann, holt ihn.", 26.4, 2.6, "n"),
  ("Schmieren", "Der Partner hält den Stich sicher.", "Augen dazu: Sau oder Zehn – aber keine Ober oder Unter, die später selbst stechen.", 2.4, 0.6, "n"),
  ("Nicht vorschnell schmieren", "Der Partner liegt vorn, hinter einem kann noch ein Gegner stechen.", "Geschmierte Augen, die der Gegner holt, zählen doppelt gegen einen. Lieber billig zugeben.", 2.4, 0.7, "n"),
  ("Abspatzen", "Der Stich ist verloren.", "Einen Spatz ohne Augen zugeben, keine Trümpfe, keine Sauen.", 1.9, 0.8, "n"),
  ("Mit Trumpf abspatzen", "Verloren, aber man darf nur Trumpf geben.", "Den Trumpf mit den wenigsten Augen, bei Gleichstand den schwächsten. Ober und Unter für eigene Stiche aufheben.", 1.2, 0.4, "n"),
  ("Farbe frei machen", "Man kann nicht bedienen und schmiert nicht.", "Eine einzelne billige Karte abwerfen – dann ist man frei und sticht später ein.", 1.3, 1.3, "k"),
  ("Hinten billig stechen", "Als Letzter, Gegner vorn, mindestens 14 Augen im Stich.", "Der kleinste Trumpf, der sticht, reicht – niemand kann mehr überstechen. Unter 14 Augen lohnt der Trumpf nicht.", -0.5, 1.3, "k"),
 ]),
 ("Bettel und Ramsch", "", [
  ("Im Bettel drunter bleiben", "Man spielt Bettel.", "Heraus mit der niedrigsten Karte; beim Zugeben die höchste, die noch drunter bleibt. So wird man gefährliche Karten gefahrlos los.", 20.1, 4.6, "n"),
  ("Gegen den Bettel klein spielen", "Man spielt gegen einen Bettel.", "Je niedriger die angespielte Karte, desto schwerer bleibt der Spieler drunter. Hohe Karten abwerfen, die kleinen zum Anspielen behalten.", 2.7, 0.7, "n"),
  ("Im Ramsch hoch drunter", "Man kann unter dem Stich bleiben.", "Unter einer höheren Karte die eigenen gefährlichen Karten loswerden – Zehner und hohe Karten.", 2.7, 0.8, "n"),
  ("Durchmarsch verhindern", "Ein anderer hat alle bisherigen Stiche.", "Ein einziger Stich, auch ohne Augen, verhindert den Durchmarsch.", None, None, "s"),
 ]),
]

def badge(v, e, u):
    if u == "s": return '<span class="wert wert--selten">zu selten</span>'
    num = f"{v:+.1f}".replace(".", ",").replace("-", "−")
    if u == "n": return f'<span class="wert wert--gut"><b>{num}</b> ct</span>'
    return f'<span class="wert wert--null">kein messbarer Nutzen</span>'

def rule(r):
    t, wann, was, v, e, u = r
    return f'''<article class="regel regel--{u}"><header><h3>{html.escape(t)}</h3>{badge(v,e,u)}</header>
<p class="wann">{html.escape(wann)}</p><p>{html.escape(was)}</p></article>'''

sections = "".join(
  f'<section class="gruppe{" gruppe--klein" if len(rs)<=4 else ""}"><h2>{html.escape(n)}</h2>' + (f'<p class="lead">{html.escape(l)}</p>' if l else '') +
  '<div class="regeln">' + "".join(rule(r) for r in rs) + '</div></section>' for n, l, rs in G)

top = sorted([r for _,_,rs in G for r in rs if r[5]=="n"], key=lambda r: -r[3])[:8]
toprows = "".join(f'<li><span>{html.escape(r[0])}</span><b>{f"{r[3]:+.0f}".replace("-","−")} ct</b></li>' for r in top)

icon = (ROOT/"apps/web/public/icons/icon.svg").read_text()
css = (D/"style.css").read_text()
out = f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Schafkopf – Faustregeln</title><style>{css}</style></head><body>
<section class="cover">
  <div class="cover__icon">{icon}</div>
  <p class="cover__kicker">Schafkopf · Trainer Max Weber</p>
  <h1 class="brand">Die Faustregeln</h1>
  <p class="cover__sub">34 Regeln für Ansage, Kontra und Kartenspiel – jede mit gemessenem Wert in Cent</p>
  <div class="cover__box">
    <h2>Die wertvollsten Regeln</h2>
    <ol class="top">{toprows}</ol>
  </div>
  <p class="cover__foot">Stand 14.11.2026 · dorfbub.github.io/schafkopf</p>
</section>
<main class="papier"><section class="intro">
  <h2>So ist gemessen</h2>
  <p>Jede Regel wurde in 20 000 simulierten Spielen geprüft. Immer wenn eine Regel greift, wird das Spiel zweimal zu Ende gespielt – mit denselben Karten: einmal befolgt man die Regel, einmal nimmt man die beste andere Möglichkeit. Der <b>Wert</b> ist, was das Befolgen im Schnitt mehr einbringt, in Cent beim Standardtarif (Sauspiel 10&nbsp;ct). Höchstens 1500 Fälle je Regel.</p>
  <div class="legende">
    <span class="wert wert--gut"><b>+12,0</b> ct</span> sicher nützlich (mehr als zwei Standardfehler über null)
    <span class="wert wert--null">kein messbarer Nutzen</span> gutes Grundwissen, aber im Rauschen
    <span class="wert wert--selten">zu selten</span> kam in den Simulationen kaum vor
  </div>
  <p class="hinweis">Die Mitspieler in der Simulation sind Bots, keine Menschen. Gegen Menschen, die Zeichen lesen und bluffen, können einzelne Werte anders ausfallen.</p>
</section>
{sections}
<section class="gruppe gruppe--klein gestrichen"><h2>Gestrichen</h2><div class="regeln">
<article class="regel"><header><h3>Kurze Ruffarbe rufen</h3><span class="wert wert--neg">−13,6 ct</span></header><p>In jeder Fassung (kürzeste, längste, ohne Zehn, nach Tabelle) gemessen ein Verlust. Welche Sau man ruft, hängt von zu vielem zugleich ab – das entscheidet die Rechnung besser als eine Faustregel.</p></article>
<article class="regel"><header><h3>Hochzeit mit viel Trumpf annehmen</h3><span class="wert wert--neg">−1,7 ct</span></header><p>Auch mit strengeren Bedingungen nie messbar besser als Ablehnen. Max rät zum Annehmen nur noch, wenn die Rechnung es im Einzelfall zeigt.</p></article>
</div></section>
</main></body></html>'''
(D/"faustregeln.html").write_text(out)
print("ok", sum(len(rs) for _,_,rs in G))
