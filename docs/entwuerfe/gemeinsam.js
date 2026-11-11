/*
 * Gemeinsame Logik der Entwürfe: Beispieldaten, Aufbau des Tisches als HTML,
 * Umschalter und die kleinen Klick-Abläufe (Ansage wählen, Karte spielen).
 * Jede Richtung liefert nur eigenes CSS; das Markup ist überall gleich, damit
 * die Entwürfe vergleichbar bleiben.
 */
(function () {
  'use strict';

  // ---------- Farben des Blatts (Bildchen) ----------
  const SVG = {
    herz: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.6-4.7-9.4-9.3C1.3 8.3 3.6 5 7 5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.7 3.3 4.4 6.7C19.6 16.3 12 21 12 21z" fill="#c8202f" stroke="#7d0f18" stroke-width="1"/></svg>',
    schellen:
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="4.3" r="1.6" fill="none" stroke="#6b4300" stroke-width="1.2"/><circle cx="12" cy="13" r="7.6" fill="#e9b420" stroke="#6b4300" stroke-width="1.1"/><path d="M4.8 10.6h14.4" stroke="#c8202f" stroke-width="2.4"/><path d="M8.6 16.2h6.8" stroke="#4a2e00" stroke-width="1.3" stroke-linecap="round"/><circle cx="12" cy="18" r="1" fill="#4a2e00"/></svg>',
    gras: '<svg viewBox="0 0 24 24"><path d="M12 1.8c5.2 4.1 7.2 9.4 4.6 14.2-1.3 2.5-2.9 3.9-4.6 6-1.7-2.1-3.3-3.5-4.6-6C4.8 11.2 6.8 5.9 12 1.8z" fill="#3c8a37" stroke="#1d4a1a" stroke-width="1"/><path d="M12 4.5v17.3M12 9l-3 2.5M12 9l3 2.5M12 13.5l-3.4 2.6M12 13.5l3.4 2.6" stroke="#1d4a1a" stroke-width=".9" fill="none"/></svg>',
    eichel:
      '<svg viewBox="0 0 24 24"><path d="M12.6 6.4c.3-1.8 1.2-3.2 2.6-4" stroke="#4b3212" stroke-width="1.2" fill="none"/><path d="M14.4 3.4c2.6-.9 5 .1 5.8 1.8-2.4 1.2-4.6.8-5.8-1.8z" fill="#3c8a37" stroke="#1d4a1a" stroke-width=".8"/><ellipse cx="12" cy="15.4" rx="4.9" ry="6.1" fill="#b8661e" stroke="#5a2e0a" stroke-width="1"/><path d="M6.4 12.2C6.4 8.6 8.9 6.4 12 6.4s5.6 2.2 5.6 5.8z" fill="#7a5a22" stroke="#3e2a08" stroke-width="1"/><path d="M7.6 10l8.8 0M7 11.2h10M8.6 8.6h6.8" stroke="#3e2a08" stroke-width=".6"/></svg>',
    krone:
      '<svg viewBox="0 0 24 14"><path d="M2 12 3 3l5 5 4-7 4 7 5-5 1 9z" fill="#d4a62a" stroke="#6b4300" stroke-width="1"/></svg>',
  };

  const FARBNAME = { eichel: 'Eichel', gras: 'Gras', herz: 'Herz', schellen: 'Schellen' };
  const RANGNAME = {
    A: 'Sau',
    10: 'Zehn',
    K: 'König',
    O: 'Ober',
    U: 'Unter',
    9: 'Neun',
    8: 'Acht',
    7: 'Sieben',
  };

  const k = (s, r) => ({ s, r: String(r) });
  const id = (c) => c.s + '-' + c.r;

  /** HTML einer Kartenvorderseite: SVG aus karten/ (Zahlen vom Freund, Bilder erzeugt). */
  function karte(c, extra) {
    return (
      '<div class="card card--' +
      c.s +
      (extra || '') +
      '" data-karte="' +
      id(c) +
      '" role="img" aria-label="' +
      FARBNAME[c.s] +
      '-' +
      RANGNAME[c.r] +
      '">' +
      '<img src="../../apps/web/src/assets/karten/' +
      c.s +
      '-' +
      c.r +
      '.svg" alt="" draggable="false"></div>'
    );
  }

  const ruecken = () => '<div class="card card--back" aria-hidden="true"></div>';

  // ---------- Beispielrunde ----------
  // Plätze im Uhrzeigersinn: 0 = du (unten), 1 = links, 2 = oben, 3 = rechts.
  const POS = ['unten', 'links', 'oben', 'rechts'];
  const NAMEN = ['Lukas', 'Resi', 'Xaver', 'Vroni'];

  function geld(c) {
    const v = (Math.abs(c) / 100).toFixed(2).replace('.', ',');
    return (c > 0 ? '+' : c < 0 ? '−' : '') + v + ' €';
  }

  const HAND8 = [
    k('eichel', 'O'),
    k('gras', 'O'),
    k('herz', 'U'),
    k('schellen', 'U'),
    k('herz', 'A'),
    k('herz', 9),
    k('gras', 10),
    k('schellen', 9),
  ];
  const HAND5 = [k('gras', 'O'), k('herz', 'U'), k('herz', 9), k('gras', 10), k('schellen', 9)];

  /** Alle Zustände als einfache Daten; der Aufbau daraus ist für alle Richtungen gleich. */
  const ZUSTAENDE = {
    ansage: {
      titel: 'Ansage',
      vertrag: null,
      geber: 2,
      dran: 0,
      stiche: [0, 0, 0, 0],
      stand: [120, -40, -60, -20],
      karten: [8, 8, 8, 8],
      blasen: { 3: 'weiter' },
      warten: [1, 2],
      hand: HAND8,
      legal: null,
      stich: null,
      letzter: null,
      spieler: null,
      partner: null,
      dialog: 'ansage',
    },
    stich: {
      titel: 'Stich 4 von 8',
      vertrag: 'Sauspiel auf die Schellen-Sau',
      geber: 2,
      dran: 0,
      stiche: [1, 1, 0, 1],
      stand: [120, -40, -60, -20],
      karten: [5, 4, 4, 4],
      blasen: {},
      hand: HAND5,
      legal: ['schellen-9'],
      stich: { anspiel: 1, karten: [k('schellen', 10), k('schellen', 'K'), k('schellen', 'A')] },
      letzter: {
        anspiel: 2,
        karten: [k('eichel', 'U'), k('herz', 'K'), k('herz', 'A'), k('gras', 'O')],
        sieger: 1,
      },
      spieler: 2,
      partner: 3,
      dialog: null,
    },
    ergebnis: {
      titel: 'Spiel beendet',
      vertrag: 'Sauspiel auf die Schellen-Sau',
      geber: 2,
      dran: null,
      stiche: [1, 1, 3, 3],
      stand: [90, -70, -30, 10],
      karten: [0, 0, 0, 0],
      blasen: {},
      hand: [],
      legal: null,
      stich: null,
      letzter: {
        anspiel: 3,
        karten: [k('herz', 'O'), k('herz', 7), k('eichel', 10), k('gras', 9)],
        sieger: 3,
      },
      spieler: 2,
      partner: 3,
      dialog: 'ergebnis',
      ergebnis: {
        sieger: [2, 3],
        augen: 91,
        zeilen: [
          ['Sauspiel', 20],
          ['Schneider', 10],
        ],
        zahlung: [-30, -30, 30, 30],
      },
    },
  };

  // ---------- Aufbau ----------
  function sitz(z, s) {
    const cls = ['seat', 'seat--' + POS[s]];
    if (z.dran === s) cls.push('ist-dran');
    if (z.spieler === s) cls.push('ist-spieler');
    if (z.partner === s) cls.push('ist-partner');
    const marken = [];
    if (z.geber === s) marken.push('<span class="marke marke--geber" title="Geber">Geber</span>');
    if (z.spieler === s) marken.push('<span class="marke marke--spieler">Spieler</span>');
    if (z.partner === s) marken.push('<span class="marke marke--partner">Mitspieler</span>');
    const blase = z.blasen[s]
      ? '<div class="blase">' + z.blasen[s] + '</div>'
      : z.warten && z.warten.includes(s)
        ? '<div class="blase blase--leer">…</div>'
        : '';
    return (
      '<div class="' +
      cls.join(' ') +
      '">' +
      '<div class="avatar">' +
      NAMEN[s][0] +
      '</div>' +
      '<div class="seat__text"><div class="seat__name">' +
      NAMEN[s] +
      '</div>' +
      '<div class="seat__info"><span class="seat__stiche">' +
      z.stiche[s] +
      ' ' +
      (z.stiche[s] === 1 ? 'Stich' : 'Stiche') +
      '</span><span class="seat__stand">' +
      geld(z.stand[s]) +
      '</span></div></div>' +
      '<div class="seat__marken">' +
      marken.join('') +
      '</div>' +
      blase +
      '<div class="seat__karten">' +
      ruecken().repeat(z.karten[s]) +
      '</div>' +
      (z.dran === s ? '<div class="seat__dran">ist dran</div>' : '') +
      '</div>'
    );
  }

  function stichHtml(st, sammeln) {
    if (!st) return '<div class="trick"></div>';
    const karten = st.karten
      .map((c, i) => {
        const s = (st.anspiel + i) % 4;
        return (
          '<div class="trick__karte trick__karte--' +
          POS[s] +
          '" style="--n:' +
          i +
          '">' +
          karte(c) +
          '</div>'
        );
      })
      .join('');
    return (
      '<div class="trick' +
      (sammeln != null ? ' trick--zu-' + POS[sammeln] : '') +
      '">' +
      karten +
      '</div>'
    );
  }

  function letzterHtml(z) {
    if (!z.letzter) return '<p class="leer">Noch kein Stich gespielt.</p>';
    return (
      '<div class="letzter">' +
      z.letzter.karten
        .map((c, i) => {
          const s = (z.letzter.anspiel + i) % 4;
          return (
            '<figure class="letzter__k' +
            (s === z.letzter.sieger ? ' letzter__k--sieger' : '') +
            '">' +
            karte(c) +
            '<figcaption>' +
            NAMEN[s] +
            '</figcaption></figure>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function standHtml(z) {
    const zeilen = [0, 1, 2, 3]
      .map((s) => {
        const z2 = z.ergebnis ? '<td class="zahl">' + geld(z.ergebnis.zahlung[s]) + '</td>' : '';
        return (
          '<tr><td>' +
          NAMEN[s] +
          (s === 0 ? ' <small>(du)</small>' : '') +
          '</td>' +
          z2 +
          '<td class="zahl' +
          (z.stand[s] < 0 ? ' minus' : '') +
          '">' +
          geld(z.stand[s]) +
          '</td></tr>'
        );
      })
      .join('');
    return (
      '<table class="stand"><thead><tr><th>Spieler</th>' +
      (z.ergebnis ? '<th class="zahl">Spiel</th>' : '') +
      '<th class="zahl">Stand</th></tr></thead><tbody>' +
      zeilen +
      '</tbody></table>'
    );
  }

  const SPIELARTEN = [
    { id: 'sauspiel', name: 'Sauspiel', farbe: 'ruf', tout: false },
    { id: 'solo', name: 'Solo', farbe: 'alle', tout: true },
    { id: 'wenz', name: 'Wenz', farbe: null, tout: true },
    { id: 'farbwenz', name: 'Farbwenz', farbe: 'alle', tout: true },
    { id: 'geier', name: 'Geier', farbe: null, tout: true },
    { id: 'bettel', name: 'Bettel', farbe: null, tout: false },
  ];
  // Rufbar ist nur eine Sau, deren Farbe man (ohne Trumpf) auf der Hand hat.
  const RUFBAR = { eichel: false, gras: true, herz: false, schellen: true };

  function ansageHtml(a) {
    const art = SPIELARTEN.find((x) => x.id === a.art);
    const arten = SPIELARTEN.map(
      (x) =>
        '<button type="button" class="wahl' +
        (a.art === x.id ? ' ist-gewaehlt' : '') +
        '" data-art="' +
        x.id +
        '">' +
        x.name +
        '</button>',
    ).join('');
    let farben = '';
    if (art && art.farbe) {
      farben =
        '<div class="ansage__schritt"><div class="ansage__label">' +
        (art.farbe === 'ruf' ? 'Auf welche Sau?' : 'Welche Farbe?') +
        '</div><div class="ansage__farben">' +
        ['eichel', 'gras', 'herz', 'schellen']
          .map((f) => {
            const aus = art.farbe === 'ruf' && !RUFBAR[f];
            return (
              '<button type="button" class="wahl wahl--farbe' +
              (a.farbe === f ? ' ist-gewaehlt' : '') +
              '" data-farbe="' +
              f +
              '"' +
              (aus ? ' disabled' : '') +
              '>' +
              SVG[f] +
              '<span>' +
              FARBNAME[f] +
              '</span></button>'
            );
          })
          .join('') +
        '</div></div>';
    }
    const bereit = art && (!art.farbe || a.farbe);
    let zusammen = '';
    if (bereit) {
      zusammen =
        art.farbe === 'ruf'
          ? 'Sauspiel auf die ' + FARBNAME[a.farbe] + '-Sau'
          : art.farbe
            ? FARBNAME[a.farbe] + '-' + art.name
            : art.name;
      if (a.tout && art.tout) zusammen += ' Tout';
    }
    return (
      '<div class="dialog dialog--ansage" role="dialog" aria-label="Ansage">' +
      '<div class="dialog__kopf"><h2>Was spielst du?</h2><span class="dialog__hinweis">Vroni sagt weiter · Resi und Xaver kommen noch</span></div>' +
      '<div class="ansage__schritt"><div class="ansage__label">Spielart</div><div class="ansage__arten">' +
      arten +
      '</div></div>' +
      farben +
      '<div class="ansage__fuss">' +
      (art && art.tout
        ? '<label class="schalter"><input type="checkbox" data-tout' +
          (a.tout ? ' checked' : '') +
          '><span class="schalter__bahn"></span>Tout</label>'
        : '<span></span>') +
      '<div class="ansage__knoepfe"><button type="button" class="knopf knopf--zweit" data-weiter>Weiter</button>' +
      '<button type="button" class="knopf knopf--haupt" data-ansagen' +
      (bereit ? '' : ' disabled') +
      '>' +
      (bereit ? zusammen + ' ansagen' : 'Ansagen') +
      '</button></div>' +
      '</div></div>'
    );
  }

  function ergebnisHtml(z) {
    const e = z.ergebnis;
    const pro = e.zeilen.reduce((n, r) => n + r[1], 0);
    return (
      '<div class="dialog dialog--ergebnis" role="dialog" aria-label="Ergebnis">' +
      '<div class="ergebnis__kopf"><div class="ergebnis__ueber">' +
      z.vertrag +
      '</div>' +
      '<h2>' +
      e.sieger.map((s) => NAMEN[s]).join(' und ') +
      ' haben gewonnen</h2>' +
      '<div class="ergebnis__augen"><span class="augen__zahl">' +
      e.augen +
      '</span><span class="augen__wort">Augen</span>' +
      '<span class="augen__balken"><span style="width:' +
      (e.augen / 120) * 100 +
      '%"></span><i style="left:' +
      (61 / 120) * 100 +
      '%"></i><i style="left:' +
      (91 / 120) * 100 +
      '%"></i></span></div></div>' +
      '<div class="ergebnis__rechnung">' +
      e.zeilen
        .map(
          (r) =>
            '<div class="rechnung__z"><span>' +
            r[0] +
            '</span><span>' +
            geld(r[1]).replace('+', '') +
            '</span></div>',
        )
        .join('') +
      '<div class="rechnung__z rechnung__z--summe"><span>je Spieler</span><span>' +
      geld(pro).replace('+', '') +
      '</span></div></div>' +
      standHtml(z) +
      '<div class="ergebnis__fuss"><button type="button" class="knopf knopf--zweit">Letzter Stich</button><button type="button" class="knopf knopf--haupt" data-naechstes>Nächstes Spiel</button></div>' +
      '</div>'
    );
  }

  function handHtml(z) {
    const n = z.hand.length;
    return z.hand
      .map((c, i) => {
        let extra = '';
        if (z.legal) extra = z.legal.includes(id(c)) ? ' card--spielbar' : ' card--gedimmt';
        const d = i - (n - 1) / 2;
        return (
          '<div class="hand__platz" style="--i:' +
          i +
          ';--n:' +
          n +
          ';--d:' +
          d +
          ';--d2:' +
          d * d +
          '">' +
          karte(c, extra) +
          '</div>'
        );
      })
      .join('');
  }

  function app(z, ui) {
    const vertrag = z.vertrag
      ? '<span class="bar__wer">' + NAMEN[z.spieler] + '</span> spielt <b>' + z.vertrag + '</b>'
      : '<b>Ansage</b> – du bist dran';
    let dialog = '';
    if (z.dialog === 'ansage') dialog = ansageHtml(ui.ansage);
    if (z.dialog === 'ergebnis') dialog = ergebnisHtml(z);
    const ichDran = z.dran === 0;
    return (
      '<div class="app app--' +
      ui.zustand +
      (z.dialog ? ' hat-dialog' : '') +
      '">' +
      '<header class="bar"><div class="bar__marke">Schafkopf</div><div class="bar__spiel">Spiel 7 · ' +
      z.titel +
      '</div>' +
      '<div class="bar__vertrag">' +
      vertrag +
      '</div>' +
      '<div class="bar__rechts"><button type="button" class="knopf knopf--leise">Verlassen</button></div></header>' +
      '<div class="tisch"><div class="tisch__platte"></div>' +
      [1, 2, 3].map((s) => sitz(z, s)).join('') +
      stichHtml(z.stich, ui.sammeln) +
      dialog +
      '</div>' +
      '<aside class="seite"><section class="seite__block seite__spiel"><h3>Spiel</h3><p>' +
      (z.vertrag
        ? NAMEN[z.spieler] +
          ' · ' +
          z.vertrag +
          (z.partner != null ? '<br>mit ' + NAMEN[z.partner] : '')
        : 'Ansage läuft') +
      '</p></section><section class="seite__block seite__letzter"><h3>Letzter Stich</h3>' +
      letzterHtml(z) +
      '</section><section class="seite__block seite__stand"><h3>Stand</h3>' +
      standHtml(z) +
      '</section></aside>' +
      '<footer class="eigen' +
      (ichDran ? ' ist-dran' : '') +
      '">' +
      '<div class="eigen__info"><div class="avatar">L</div><span class="eigen__name">Lukas</span>' +
      (z.geber === 0 ? '<span class="marke marke--geber">Geber</span>' : '') +
      '<span class="seat__stiche">' +
      z.stiche[0] +
      ' ' +
      (z.stiche[0] === 1 ? 'Stich' : 'Stiche') +
      '</span><span class="seat__stand">' +
      geld(z.stand[0]) +
      '</span>' +
      (ichDran
        ? '<span class="eigen__dran">' +
          (z.dialog === 'ansage' ? 'Du sagst an' : 'Du bist dran – Schellen bedienen') +
          '</span>'
        : '') +
      '</div><div class="hand">' +
      handHtml(z) +
      '</div></footer>' +
      '</div>'
    );
  }

  // ---------- Bühne und Abläufe ----------
  const params = new URLSearchParams(location.search);
  const ui = {
    zustand: params.get('zustand') || 'stich',
    geraet: params.get('geraet') || 'beide',
    ansage: { art: params.get('art') || null, farbe: params.get('farbe') || null, tout: false },
    sammeln: null,
    z: null,
  };
  if (params.get('nackt')) document.body.classList.add('nackt');

  function zustandDaten() {
    return ui.z || ZUSTAENDE[ui.zustand];
  }

  function zeichnen() {
    const flaeche = document.querySelector('.flaeche');
    const geraete = ui.geraet === 'beide' ? ['handy', 'desktop'] : [ui.geraet];
    flaeche.innerHTML = geraete
      .map(
        (g) =>
          '<div class="rahmen" data-g="' +
          g +
          '"><div class="rahmen__titel">' +
          (g === 'handy' ? 'Handy 360 × 740' : 'Desktop 1440 × 900') +
          '</div><div class="geraet geraet--' +
          g +
          '">' +
          app(zustandDaten(), ui) +
          '</div></div>',
      )
      .join('');
    skalieren();
    document
      .querySelectorAll('.leiste [data-zustand]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.zustand === ui.zustand)));
    document
      .querySelectorAll('.leiste [data-geraet]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.geraet === ui.geraet)));
  }

  function skalieren() {
    const flaeche = document.querySelector('.flaeche');
    const rahmen = [...flaeche.querySelectorAll('.rahmen')];
    const nackt = document.body.classList.contains('nackt');
    const maße = rahmen.map((r) => (r.dataset.g === 'handy' ? [360, 740] : [1440, 900]));
    let f = 1;
    if (!nackt) {
      const breite = flaeche.clientWidth - 40 - 32 * (rahmen.length - 1);
      const hoehe = flaeche.clientHeight - 40;
      const summeB = maße.reduce((n, m) => n + m[0], 0);
      const maxH = Math.max(...maße.map((m) => m[1]));
      f = Math.min(1, breite / summeB, hoehe / maxH);
    }
    rahmen.forEach((r, i) => {
      r.style.width = maße[i][0] * f + 'px';
      r.style.height = maße[i][1] * f + 'px';
      r.firstElementChild.nextElementSibling.style.transform = 'scale(' + f + ')';
    });
  }

  function setze(zustand) {
    ui.zustand = zustand;
    ui.z = null;
    ui.sammeln = null;
    ui.ansage = { art: null, farbe: null, tout: false };
    zeichnen();
  }

  /** Karte spielen: Karte wandert in den Stich, kurz liegen lassen, dann zu Vroni. */
  function spiele(kid) {
    const z0 = ZUSTAENDE.stich;
    const c = z0.hand.find((x) => id(x) === kid);
    const z1 = Object.assign({}, z0, {
      hand: z0.hand.filter((x) => x !== c),
      karten: [4, 4, 4, 4],
      legal: [],
      dran: null,
      stich: { anspiel: 1, karten: z0.stich.karten.concat([c]) },
    });
    ui.z = z1;
    zeichnen();
    setTimeout(() => {
      ui.sammeln = 3;
      zeichnen();
    }, 1100);
    setTimeout(() => {
      ui.sammeln = null;
      ui.z = Object.assign({}, z1, {
        titel: 'Stich 5 von 8',
        legal: null,
        dran: 3,
        stiche: [1, 1, 0, 2],
        stich: null,
        letzter: { anspiel: 1, karten: z1.stich.karten, sieger: 3 },
      });
      zeichnen();
    }, 1700);
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, .card--spielbar, input');
    if (!t) return;
    if (t.dataset.zustand) return setze(t.dataset.zustand);
    if (t.dataset.geraet) {
      ui.geraet = t.dataset.geraet;
      return zeichnen();
    }
    if (t.dataset.art) {
      ui.ansage = { art: t.dataset.art, farbe: null, tout: ui.ansage.tout };
      return zeichnen();
    }
    if (t.dataset.farbe) {
      ui.ansage.farbe = t.dataset.farbe;
      return zeichnen();
    }
    if (t.hasAttribute('data-tout')) {
      ui.ansage.tout = t.checked;
      return zeichnen();
    }
    if (t.hasAttribute('data-ansagen') || t.hasAttribute('data-weiter')) return setze('stich');
    if (t.hasAttribute('data-naechstes')) return setze('ansage');
    if (t.classList.contains('card--spielbar')) return spiele(t.dataset.karte);
  });

  window.addEventListener('resize', skalieren);

  // Leiste aufbauen
  const leiste = document.querySelector('.leiste');
  leiste.insertAdjacentHTML(
    'beforeend',
    '<div class="umschalter" role="group" aria-label="Zustand">' +
      '<button type="button" data-zustand="ansage">Ansage</button><button type="button" data-zustand="stich">Laufender Stich</button><button type="button" data-zustand="ergebnis">Ergebnis</button></div>' +
      '<div class="umschalter" role="group" aria-label="Gerät">' +
      '<button type="button" data-geraet="beide">Beide</button><button type="button" data-geraet="handy">Handy</button><button type="button" data-geraet="desktop">Desktop</button></div>' +
      '<span style="color:#777">Im Stich: die helle Karte unten anklicken.</span>',
  );

  zeichnen();
  if (document.fonts) document.fonts.ready.then(skalieren);
})();
