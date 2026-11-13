# Ansage-Tabellen – Güte (B4)

Erzeugt von `packages/bots/scripts/ansage-schreiben.ts` am 2026-11-13. Seed 2026, 10000
Blätter je Spielart und Besetzung, je 64 Verteilungen, Gegenspieler Heuristik; Bettel:
4000 Blätter, je 32 Verteilungen, Gegenspieler „Stark“. Geprüft auf jedem fünften
Blatt, geschätzt auf den übrigen (die Tabelle selbst nutzt danach alle). Cent nach Standardtarif,
aus Sicht des Ansagers, gewichtet wie gezogen.

- **Mittel:** gemessener Wert des Spiels im Schnitt über die Blätter im Bereich der Tabelle.
- **lohnt:** Anteil der Blätter, mit denen das Spiel im Schnitt Gewinn bringt.
- **Rauschen:** Standardfehler der Messung je Blatt – so genau kennt man den „wahren“ Wert selbst.
- **RMSE, R²:** Abstand der Tabelle zur Messung je Blatt (enthält das Rauschen).
- **Treffer:** Anteil der Blätter, bei denen Tabelle und Messung gleich entscheiden (lohnt / lohnt nicht).
- **Verlust:** was die falschen Entscheidungen im Schnitt je Blatt kosten (Cent), mit der Tabelle bzw.
  mit der alten Heuristik (`rateContract`, Marge ≥ 0).

| Besetzung | Spielart          | Blätter | Mittel | lohnt | Rauschen | RMSE |   R² | Treffer | Verlust | Verlust Heuristik |
| --------- | ----------------- | ------: | -----: | ----: | -------: | ---: | ---: | ------: | ------: | ----------------: |
| lang/4    | sauspiel          |    2000 |    2,0 |  54 % |      3,0 |  7,0 | 0,72 |    87 % |    0,43 |              0,78 |
| lang/4    | arabischeHochzeit |    2000 |   11,7 |  97 % |      2,9 |  5,9 | 0,35 |    97 % |    0,08 |              8,11 |
| lang/4    | hochzeit          |    2000 |    8,2 |  95 % |      2,8 |  4,4 | 0,31 |    95 % |    0,08 |              4,83 |
| lang/4    | bettel            |     800 |   19,8 |  56 % |     19,4 | 42,4 | 0,79 |    88 % |    3,34 |             46,40 |
| lang/4    | eisenbahner       |    2000 |  −60,1 |  33 % |     11,5 | 35,2 | 0,93 |    95 % |    2,32 |             12,13 |
| lang/4    | geier             |    2000 | −110,4 |  14 % |     11,7 | 35,7 | 0,88 |    95 % |    2,10 |              3,51 |
| lang/4    | hawaii            |    2000 | −188,5 |   3 % |      6,5 | 23,7 | 0,91 |    98 % |    0,72 |              1,79 |
| lang/4    | farbwenz          |    2000 | −202,7 |   4 % |      5,3 | 16,3 | 0,97 |    99 % |    0,22 |              2,70 |
| lang/4    | wenz              |    2000 | −115,5 |  13 % |     11,6 | 36,5 | 0,87 |    95 % |    2,18 |              3,93 |
| lang/4    | solo              |    2000 | −196,0 |   4 % |      6,1 | 18,2 | 0,97 |    99 % |    0,35 |              1,22 |
| kurz/4    | sauspiel          |    2000 |   −3,6 |  38 % |      3,0 |  8,1 | 0,67 |    89 % |    0,40 |              1,84 |
| kurz/4    | arabischeHochzeit |    2000 |   15,7 |  99 % |      2,8 |  6,6 | 0,34 |    99 % |    0,01 |             11,54 |
| kurz/4    | hochzeit          |    2000 |   10,6 | 100 % |      2,6 |  4,2 | 0,25 |   100 % |    0,01 |              6,52 |
| kurz/4    | bettel            |     800 |   16,5 |  55 % |     20,7 | 40,3 | 0,77 |    88 % |    3,35 |             39,91 |
| kurz/4    | eisenbahner       |    2000 | −143,5 |  15 % |      7,1 | 26,2 | 0,96 |    98 % |    0,70 |              1,28 |
| kurz/4    | geier             |    2000 | −154,3 |   9 % |      8,5 | 26,7 | 0,94 |    97 % |    1,47 |              2,71 |
| kurz/4    | farbwenz          |    2000 | −195,8 |   5 % |      6,3 | 19,3 | 0,97 |    99 % |    0,25 |              3,19 |
| kurz/4    | wenz              |    2000 | −156,9 |   9 % |      8,2 | 25,8 | 0,94 |    97 % |    0,99 |              3,51 |
| kurz/4    | solo              |    2000 | −205,1 |   4 % |      6,0 | 19,0 | 0,97 |    99 % |    0,32 |              3,46 |
| kurz/3    | bettel            |     800 |  −30,8 |  27 % |     11,8 | 29,4 | 0,76 |    89 % |    3,05 |             10,14 |
| kurz/3    | eisenbahner       |    2000 |    2,0 |  50 % |      8,6 | 27,5 | 0,92 |    92 % |    1,83 |             10,59 |
| kurz/3    | geier             |    2000 |  −21,3 |  35 % |     11,1 | 32,5 | 0,83 |    89 % |    2,78 |              6,56 |
| kurz/3    | hawaii            |    2000 |  −94,2 |  11 % |      6,7 | 25,0 | 0,87 |    96 % |    1,40 |              5,44 |
| kurz/3    | farbwenz          |    2000 |  −91,7 |  14 % |      5,9 | 18,0 | 0,95 |    96 % |    0,90 |              9,91 |
| kurz/3    | wenz              |    2000 |  −16,6 |  37 % |     11,3 | 33,9 | 0,82 |    90 % |    2,88 |              7,26 |
| kurz/3    | solo              |    2000 |  −91,8 |  13 % |      5,9 | 20,5 | 0,93 |    97 % |    0,66 |              3,83 |
