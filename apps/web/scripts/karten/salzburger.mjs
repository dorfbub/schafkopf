// Salzburger Bild (U9): eigene Zeichnung nach den überlieferten Motiven des Salzburger bzw.
// einfachdeutschen Blatts (Tiroler Wattkarten), im modernen Stil (klare Farben, schwarze Umrisse).
// Vorbild für Aufbau und Motive sind gemeinfreie Drucke (Salzburger Blätter um 1800, Columbia
// University, Albert Field Collection A0051/D0403; Anton Fuchs, Salzburg, um 1848); nichts ist
// abgepaust. Farbzeichen von Fabian Bally (CC0) wie im bayerischen Blatt, Linien und Farben aus U2.
//
// Einfachbildig: jede Karte zeigt die ganze Figur bzw. Szene. 36 Karten (6 bis Sau); die
// Schellen-Sechs ist der Weli (mit Aufschrift, für Watten).
//
// Aufruf: node apps/web/scripts/karten/salzburger.mjs
// Ausgabe: apps/web/src/assets/kartensets/salzburger/karten/{farbe}-{rang}.svg und weli.svg

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';
import { f, LINIE, FEIN, glatt, blatt, krause, spirale, feder, bereinigen } from './geo.mjs';
import { KARTE, pipSymbol, zeichen, pipHoehe } from './rahmen.mjs';
import { C, gesicht } from './figuren.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.resolve(HIER, '../../src/assets/kartensets/salzburger/karten');
const FARBEN = ['eichel', 'gras', 'herz', 'schellen'];

const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${LINIE} ${extra}/>`;
const fein = (d, w = 0.28) => `<path d="${d}" ${FEIN} stroke-width="${w}"/>`;
const knopf = (x, y, r = 0.8) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${C.gold}" stroke="#1a1a1a" stroke-width="0.2"/>`;
const kreis = (x, y, r, fill, w = 0.45) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" stroke="#1a1a1a" stroke-width="${w}"/>`;
const ellipse = (x, y, rx, ry, fill, w = 0.45) =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" stroke="#1a1a1a" stroke-width="${w}"/>`;

const FARBE = {
  creme: '#fff6dc',
  boden: '#7fb03a',
  bodenD: '#4f7d1f',
  holz: '#a0662a',
  holzD: '#6b3f14',
  fell: '#8a5a2b',
};

// ---------------------------------------------------------------------------
// Grundformen

/** Glied (Arm, Bein, Stab) als Schlauch entlang von Punkten [x, y, breite]. */
function glied(pts, fill, extra = '') {
  const L = [],
    R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0],
      dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const w = pts[i][2] / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  const first = pts[0],
    last = pts[pts.length - 1];
  return P(glatt([first.slice(0, 2), ...L, last.slice(0, 2), ...R.reverse()]), fill, extra);
}

const hand = (x, y, r = 2.3) => ellipse(x, y, r, r * 0.9, C.haut, 0.4);

/** Boden unter Figuren und Szenen. */
function boden(y = 182, x0 = 18, x1 = 107) {
  const d = `M${x0} ${y + 3}C${x0 + 6} ${y - 3} ${x1 - 6} ${y - 3} ${x1} ${y + 3}C${x1 - 10} ${y + 6} ${x0 + 10} ${y + 6} ${x0} ${y + 3}Z`;
  let g = P(d, FARBE.boden, 'stroke-width="0.35"');
  let gras = '';
  for (let x = x0 + 6; x < x1 - 4; x += 5)
    gras += `M${x} ${y + 1}l-0.8 -2.2M${x + 1.6} ${y + 1.4}l0.6 -2`;
  g += fein(gras, 0.25).replace('#1a1a1a', FARBE.bodenD);
  return g;
}

// ---------------------------------------------------------------------------
// Köpfe und Hüte

function zweispitz(cx, cy, farbe = C.schwarz) {
  const y = cy - 6;
  let g = P(
    `M${cx - 18} ${y + 3}C${cx - 15} ${y - 3} ${cx - 8} ${y - 13} ${cx} ${y - 14}C${cx + 8} ${y - 13} ${cx + 15} ${y - 3} ${cx + 18} ${y + 3}C${cx + 10} ${y} ${cx - 10} ${y} ${cx - 18} ${y + 3}Z`,
    farbe,
  );
  g += `<path d="M${cx - 17} ${f(y + 2.2)}C${cx - 9} ${y - 0.6} ${cx + 9} ${y - 0.6} ${cx + 17} ${f(y + 2.2)}" fill="none" stroke="${C.gold}" stroke-width="0.9" stroke-linecap="round"/>`;
  g += kreis(cx + 7, y - 5.5, 2.4, C.weiss, 0.35) + kreis(cx + 7, y - 5.5, 1.4, C.rot, 0.25);
  return g;
}

function barett(cx, cy, farbe, federFarbe = C.weiss) {
  const y = cy - 8;
  let g = feder([cx + 4, y - 3], [cx + 12, y - 12], [cx + 20, y - 8], 2.6, federFarbe);
  g += P(
    `M${cx - 10} ${y + 2}C${cx - 11} ${y - 5} ${cx - 4} ${y - 8} ${cx + 1} ${y - 8}C${cx + 7} ${y - 8} ${cx + 12} ${y - 5} ${cx + 11} ${y + 2}Z`,
    farbe,
  );
  g += P(
    `M${cx - 13} ${y + 2.6}C${cx - 8} ${y} ${cx + 8} ${y} ${cx + 14} ${y + 2.6}C${cx + 8} ${y + 4.6} ${cx - 8} ${y + 4.6} ${cx - 13} ${y + 2.6}Z`,
    farbe,
  );
  return g;
}

function krone(cx, cy, w = 18) {
  const y = cy - 8.4;
  const h = w * 0.55;
  const x0 = cx - w / 2,
    x1 = cx + w / 2;
  let g = P(
    `M${x0} ${y}L${x0 - 1} ${y - h}L${cx - w / 4} ${y - h * 0.55}L${cx} ${y - h * 1.15}L${cx + w / 4} ${y - h * 0.55}L${x1 + 1} ${y - h}L${x1} ${y}Z`,
    C.gold,
  );
  g += P(`M${x0} ${y - 2.4}H${x1}V${y + 0.6}H${x0}Z`, C.gelbD, 'stroke-width="0.35"');
  for (const [x, c] of [
    [cx - w / 3, C.rot],
    [cx, C.blau],
    [cx + w / 3, C.rot],
  ])
    g += kreis(x, y - 0.9, 0.9, c, 0.2);
  g += kreis(x0 - 1, y - h, 1, C.weiss, 0.25) + kreis(cx, y - h * 1.15, 1, C.weiss, 0.25);
  g += kreis(x1 + 1, y - h, 1, C.weiss, 0.25);
  return g;
}

function kappe(cx, cy, farbe) {
  const y = cy - 7;
  let g = P(
    `M${cx - 10} ${y + 1}C${cx - 10} ${y - 9} ${cx + 10} ${y - 9} ${cx + 10} ${y + 1}Z`,
    farbe,
  );
  g += P(
    `M${cx - 11.4} ${y + 2.6}C${cx - 11} ${y - 1} ${cx + 11} ${y - 1} ${cx + 11.4} ${y + 2.6}C${cx + 6} ${y + 4.4} ${cx - 6} ${y + 4.4} ${cx - 11.4} ${y + 2.6}Z`,
    FARBE.fell,
  );
  return g;
}

/** Kopf samt Hut; Haar bis zur Schulter wie im Salzburger Bild. */
function kopf(cx, cy, o) {
  const haar = o.haar ?? C.haar;
  let g = gesicht(cx, cy, { bart: o.bart ?? '', haar });
  if (o.schnurr && !o.bart) {
    g += P(
      `M${cx} ${cy + 4.3}Q${cx - 2.6} ${cy + 3.4} ${cx - 5} ${cy + 4.8}Q${cx - 3} ${cy + 5.6} ${cx} ${cy + 4.9}Q${cx + 3} ${cy + 5.6} ${cx + 5} ${cy + 4.8}Q${cx + 2.6} ${cy + 3.4} ${cx} ${cy + 4.3}Z`,
      haar,
      'stroke-width="0.3"',
    );
    g += P(
      `M${cx - 1} ${cy + 7}Q${cx} ${cy + 10} ${cx + 1} ${cy + 7}Z`,
      haar,
      'stroke-width="0.25"',
    );
  }
  if (o.hut === 'zweispitz') g += zweispitz(cx, cy, o.hutFarbe);
  else if (o.hut === 'barett') g += barett(cx, cy, o.hutFarbe, o.feder);
  else if (o.hut === 'krone') g += krone(cx, cy);
  else if (o.hut === 'kappe') g += kappe(cx, cy, o.hutFarbe);
  else
    g += P(
      `M${cx - 7.6} ${cy - 3}C${cx - 8} ${cy - 10} ${cx - 3} ${cy - 11.6} ${cx} ${cy - 11.4}C${cx + 4} ${cy - 11.6} ${cx + 8} ${cy - 10} ${cx + 7.6} ${cy - 3}C${cx + 5} ${cy - 7.6} ${cx - 5} ${cy - 7.6} ${cx - 7.6} ${cy - 3}Z`,
      haar,
    );
  return g;
}

// ---------------------------------------------------------------------------
// Waffen und Gerät

function saebelKlinge(x0, y0, x1, y1, bogen = 4) {
  const mx = (x0 + x1) / 2,
    my = (y0 + y1) / 2;
  const dx = x1 - x0,
    dy = y1 - y0;
  const l = Math.hypot(dx, dy);
  const nx = (-dy / l) * bogen,
    ny = (dx / l) * bogen;
  const wx = (-dy / l) * 1.3,
    wy = (dx / l) * 1.3;
  return P(
    `M${f(x0 + wx)} ${f(y0 + wy)}Q${f(mx + nx + wx)} ${f(my + ny + wy)} ${f(x1)} ${f(y1)}Q${f(mx + nx - wx)} ${f(my + ny - wy)} ${f(x0 - wx)} ${f(y0 - wy)}Z`,
    C.silber,
    'stroke-width="0.35"',
  );
}

function korb(x, y, s = 1) {
  const d = `M${f(x - 3 * s)} ${f(y)}Q${f(x)} ${f(y - 3)} ${f(x + 3 * s)} ${f(y)}C${f(x + 5 * s)} ${f(y + 3)} ${f(x + 4 * s)} ${f(y + 6)} ${f(x + 1 * s)} ${f(y + 7)}`;
  return (
    `<path d="${d}" fill="none" stroke="#1a1a1a" stroke-width="1.4" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${C.gold}" stroke-width="0.7" stroke-linecap="round"/>`
  );
}

/** Säbel in der Scheide, hängend von (x0, y0) nach (x1, y1). */
function scheide(x0, y0, x1, y1) {
  return (
    glied(
      [
        [x0, y0, 2.6],
        [(x0 + x1) / 2 + 2, (y0 + y1) / 2, 2.4],
        [x1, y1, 2],
      ],
      C.schwarz,
    ) +
    `<path d="M${f(x1)} ${f(y1)}l${f((x1 - x0) * 0.04)} ${f((y1 - y0) * 0.04)}" stroke="${C.gold}" stroke-width="2" stroke-linecap="round"/>`
  );
}

function hellebarde(x, yTop, yBot) {
  let g = glied(
    [
      [x, yTop + 8, 1.8],
      [x, yBot, 1.8],
    ],
    FARBE.holz,
  );
  g += P(
    `M${x} ${yTop}L${x + 3} ${yTop + 7}L${x} ${yTop + 9}L${x - 3} ${yTop + 7}Z`,
    C.silber,
    'stroke-width="0.35"',
  );
  g += P(
    `M${x - 1} ${yTop + 9}C${x - 8} ${yTop + 8} ${x - 9} ${yTop + 14} ${x - 7} ${yTop + 17}C${x - 4} ${yTop + 14} ${x - 2} ${yTop + 13} ${x - 1} ${yTop + 13}Z`,
    C.silber,
    'stroke-width="0.35"',
  );
  g += P(`M${x - 2} ${yTop + 13}H${x + 2}V${yTop + 15}H${x - 2}Z`, C.gold, 'stroke-width="0.3"');
  return g;
}

function rundschild(cx, cy, r) {
  let g = kreis(cx, cy, r, C.silber, 0.6);
  g += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.82)}" fill="none" stroke="${C.blau}" stroke-width="1.6"/>`;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g += blatt(
      [cx + Math.cos(a) * r * 0.18, cy + Math.sin(a) * r * 0.18],
      [cx + Math.cos(a) * r * 0.66, cy + Math.sin(a) * r * 0.66],
      r * 0.12,
      i % 2 ? C.blau : '#8fb4e8',
    );
  }
  g += kreis(cx, cy, r * 0.18, C.gold, 0.35);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g += kreis(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92, 0.55, C.gold, 0.15);
  }
  return g;
}

function trommel(cx, cy) {
  const rx = 13,
    ry = 4.6,
    h = 14;
  let g = P(`M${cx - rx} ${cy}V${cy + h}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy + h}V${cy}Z`, C.rot);
  for (const yy of [cy + 1.6, cy + h - 2.4])
    g += P(
      `M${cx - rx} ${yy}V${yy + 1.6}A${rx} ${ry} 0 0 0 ${cx + rx} ${yy + 1.6}V${yy}A${rx} ${ry} 0 0 1 ${cx - rx} ${yy}Z`,
      C.gelb,
      'stroke-width="0.3"',
    );
  let z = `M${cx - rx + 1} ${cy + 3.8}`;
  for (let i = 1; i <= 8; i++)
    z += `L${f(cx - rx + 1 + (i * (2 * rx - 2)) / 8)} ${i % 2 ? cy + h - 2.8 : cy + 3.8}`;
  g += `<path d="${z}" fill="none" stroke="${C.weiss}" stroke-width="0.6"/>`;
  g += ellipse(cx, cy, rx, ry, FARBE.creme, 0.5);
  return g;
}

// ---------------------------------------------------------------------------
// Stehende Figur (Ober, Unter)

/**
 * Ganze Figur von vorn. Haltungen: `saebel` (Hand am Säbelgriff), `hieb` (Säbel über dem Kopf),
 * `schild` (Rundschild links, Säbel rechts), `hellebarde`, `trommel`, `floete`.
 */
function stehend(o) {
  const cx = 62.5;
  let g = '';
  const rock = o.rock,
    aermel = o.aermel ?? rock;

  if (o.pose === 'saebel' || o.pose === 'schild' || o.pose === 'floete')
    g += scheide(72, 104, 96, 152);
  if (o.pose === 'hieb' || o.pose === 'hellebarde' || o.pose === 'trommel')
    g += scheide(53, 104, 30, 150);
  if (o.pose === 'hellebarde') g += hellebarde(88, 20, 182);

  // Beine: Strümpfe, Schuhe, Kniehosen
  for (const s of [-1, 1]) {
    const kx = cx + s * 8,
      fx = cx + s * 11;
    g += glied(
      [
        [kx, 138, 8.4],
        [cx + s * 9.6, 158, 7.4],
        [fx, 176, 5.8],
      ],
      C.weiss,
    );
    g += fein(`M${f(kx - 2)} 146l1 6M${f(kx + 2)} 147l-0.6 6`, 0.22);
    g += P(
      `M${f(fx - 4 + s)} 175C${f(fx - 5 + s * 2)} 181 ${f(fx + s * 8)} 182 ${f(fx + s * 9)} 179.6C${f(fx + s * 6)} 177 ${f(fx + 3)} 175 ${f(fx - 4 + s)} 175Z`,
      C.schwarz,
    );
    g += glied(
      [
        [cx + s * 6, 108, 12.6],
        [kx, 128, 10.6],
        [kx, 139, 9.6],
      ],
      o.hose,
    );
    g += P(
      `M${f(kx - 5)} 136.6H${f(kx + 5)}L${f(kx + 4.6)} 140H${f(kx - 4.6)}Z`,
      o.band ?? C.gelb,
      'stroke-width="0.35"',
    );
  }

  // Rock mit Schößen, Weste, Aufschläge, Gürtel
  g += P(
    `M${cx - 17} 57C${cx - 20} 70 ${cx - 15} 90 ${cx - 13} 104C${cx - 16} 110 ${cx - 18} 116 ${cx - 19} 122C${cx - 10} 124 ${cx - 6} 118 ${cx - 3} 110H${cx + 3}C${cx + 6} 118 ${cx + 10} 124 ${cx + 19} 122C${cx + 18} 116 ${cx + 16} 110 ${cx + 13} 104C${cx + 15} 90 ${cx + 20} 70 ${cx + 17} 57C${cx + 8} 53.4 ${cx - 8} 53.4 ${cx - 17} 57Z`,
    rock,
  );
  g += P(`M${cx - 6} 56L${cx + 6} 56L${cx + 7} 104L${cx} 108L${cx - 7} 104Z`, o.weste ?? C.rot);
  for (const y of [64, 72, 80, 88, 96]) g += knopf(cx, y, 0.75);
  for (const s of [-1, 1])
    g += P(
      `M${cx + s * 6} 56L${cx + s * 11} 58L${cx + s * 9} 88L${cx + s * 6.4} 96Z`,
      o.aufschlag ?? C.rot,
      'stroke-width="0.4"',
    );
  g += P(
    `M${cx - 13.6} 99H${cx + 13.6}L${cx + 13.4} 103H${cx - 13.4}Z`,
    o.guertel ?? C.braun,
    'stroke-width="0.35"',
  );
  g += P(`M${cx - 2} 99H${cx + 2}V103H${cx - 2}Z`, C.gold, 'stroke-width="0.3"');

  // Arme je nach Haltung
  const L = [cx - 16, 59],
    R = [cx + 16, 59];
  const arm = (pts) =>
    glied(
      pts.map(([x, y], i) => [x, y, i === 0 ? 8 : i === pts.length - 1 ? 5.4 : 6.6]),
      aermel,
    );
  const man = (x, y) => kreis(x, y, 2.4, C.weiss, 0.35);
  let vorn = '';
  switch (o.pose) {
    case 'saebel':
      g += arm([L, [cx - 22, 80], [cx - 18, 100]]) + man(cx - 18, 100) + hand(cx - 17.6, 102.6);
      g += arm([R, [cx + 21, 80], [cx + 12, 99]]) + man(cx + 12.6, 98.4);
      vorn += korb(cx + 10, 101) + hand(cx + 10.6, 101.4);
      break;
    case 'hieb':
      vorn += saebelKlinge(cx + 12, 22, cx - 26, 18, 6) + korb(cx + 14, 20.6, 1);
      g += arm([R, [cx + 27, 44], [cx + 14, 24]]) + man(cx + 15, 26);
      vorn += hand(cx + 14, 23);
      g += arm([L, [cx - 22, 80], [cx - 13, 100]]) + man(cx - 13.6, 99) + hand(cx - 12.6, 102);
      break;
    case 'schild':
      g += arm([R, [cx + 22, 80], [cx + 26, 98]]) + man(cx + 26, 97);
      vorn +=
        saebelKlinge(cx + 27, 102, cx + 40, 136, -3) + korb(cx + 27, 99) + hand(cx + 26.6, 100.6);
      g += arm([L, [cx - 24, 76], [cx - 16, 86]]);
      vorn += rundschild(cx - 18, 88, 15);
      break;
    case 'hellebarde':
      g += arm([R, [cx + 25, 78], [cx + 25, 66]]) + man(cx + 25, 68);
      vorn += hand(88, 65);
      g += arm([L, [cx - 22, 80], [cx - 13, 100]]) + man(cx - 13.6, 99);
      vorn += korb(cx - 15, 101, -1) + hand(cx - 12.6, 102);
      break;
    case 'trommel':
      vorn += trommel(cx + 4, 104);
      vorn += glied(
        [
          [cx - 10, 96, 1.2],
          [cx - 4, 82, 1],
        ],
        FARBE.holz,
      );
      vorn += glied(
        [
          [cx + 18, 94, 1.2],
          [cx + 14, 80, 1],
        ],
        FARBE.holz,
      );
      g += arm([L, [cx - 24, 80], [cx - 11, 97]]) + man(cx - 12, 96);
      g += arm([R, [cx + 24, 80], [cx + 18, 96]]) + man(cx + 19, 95);
      vorn += hand(cx - 10.4, 97.6) + hand(cx + 18.4, 96.4);
      break;
    case 'floete':
      g += arm([L, [cx - 24, 70], [cx - 8, 52]]) + man(cx - 9, 53.4);
      g += arm([R, [cx + 24, 70], [cx + 8, 52]]) + man(cx + 9, 53.4);
      vorn += glied(
        [
          [cx - 16, 50.4, 2],
          [cx + 18, 47, 2],
        ],
        C.gelbD,
      );
      vorn += hand(cx - 7, 50) + hand(cx + 7, 48.6);
      break;
  }
  if (o.epauletten)
    for (const s of [-1, 1]) g += ellipse(cx + s * 15.6, 57.6, 5, 2.4, C.gold, 0.35);

  // Hals, Kragen, Kopf
  g += P(`M${cx - 3} 48H${cx + 3}V56H${cx - 3}Z`, C.haut, 'stroke-width="0.35"');
  if (o.kragen === 'krause') g += krause(cx, 54.6, 7.6, 2.6, 14);
  else
    g += P(
      `M${cx - 4.6} 52Q${cx} 56 ${cx + 4.6} 52L${cx + 3} 62L${cx} 64L${cx - 3} 62Z`,
      C.weiss,
      'stroke-width="0.35"',
    );
  g += kopf(cx, 40, o);
  g += vorn;
  if (o.pip) g += zeichen(o.pip.farbe, o.pip.x, o.pip.y, o.pip.w);
  return boden() + g;
}

// ---------------------------------------------------------------------------
// Sitzender König

function wappen(art, cx, cy) {
  const w = 20,
    h = 26;
  const umriss = (m) =>
    `M${cx - w / 2 + m} ${cy - h / 2 + m}H${cx + w / 2 - m}V${cy + 2}C${cx + w / 2 - m} ${cy + h / 2 - 3 - m} ${cx + 3 - m} ${cy + h / 2 - m * 0.8} ${cx} ${cy + h / 2 + 1 - m}C${cx - 3 + m} ${cy + h / 2 - m * 0.8} ${cx - w / 2 + m} ${cy + h / 2 - 3 - m} ${cx - w / 2 + m} ${cy + 2}Z`;
  let g = P(umriss(0), C.gold, 'stroke-width="0.6"');
  if (art === 'anker') {
    g += P(umriss(2), C.weiss, 'stroke-width="0.35"');
    g += `<path d="M${cx} ${cy - 8}V${cy + 8}M${cx - 4} ${cy - 5}H${cx + 4}M${cx - 6} ${cy + 3}Q${cx - 5} ${cy + 9} ${cx} ${cy + 9}Q${cx + 5} ${cy + 9} ${cx + 6} ${cy + 3}" fill="none" stroke="#1a1a1a" stroke-width="1.6" stroke-linecap="round"/>`;
    g += `<circle cx="${cx}" cy="${cy - 9.4}" r="1.6" fill="none" stroke="#1a1a1a" stroke-width="1"/>`;
  } else if (art === 'burg') {
    g += P(umriss(2), '#e9b8b8', 'stroke-width="0.35"');
    g += P(`M${cx - 6} ${cy + 8}V${cy - 2}H${cx + 6}V${cy + 8}Z`, C.weiss, 'stroke-width="0.4"');
    for (const x of [cx - 6, cx + 3])
      g += P(`M${x} ${cy - 2}V${cy - 7}H${x + 3}V${cy - 2}Z`, C.weiss, 'stroke-width="0.4"');
    g += P(
      `M${cx - 6.6} ${cy - 7}L${cx - 4.5} ${cy - 10}L${cx - 2.4} ${cy - 7}ZM${cx + 2.4} ${cy - 7}L${cx + 4.5} ${cy - 10}L${cx + 6.6} ${cy - 7}Z`,
      C.rot,
      'stroke-width="0.35"',
    );
    g += P(
      `M${cx - 2} ${cy + 8}V${cy + 3}Q${cx} ${cy + 1} ${cx + 2} ${cy + 3}V${cy + 8}Z`,
      C.schwarz,
      'stroke-width="0.3"',
    );
  } else if (art === 'amor') {
    g += P(umriss(2), '#cfe0f5', 'stroke-width="0.35"');
    g += kreis(cx, cy - 3, 3, C.haut, 0.35);
    g += P(
      `M${cx - 3} ${cy}C${cx - 4} ${cy + 6} ${cx + 4} ${cy + 6} ${cx + 3} ${cy}Z`,
      C.haut,
      'stroke-width="0.35"',
    );
    g +=
      blatt([cx - 2.6, cy], [cx - 8, cy - 4], 2, C.weiss) +
      blatt([cx + 2.6, cy], [cx + 8, cy - 4], 2, C.weiss);
  }
  return g;
}

function sitzend(o) {
  const cx = 58;
  let g = boden();
  // Thron
  g += P('M70 46H100V170H70Z', o.thron ?? C.gelb);
  g += P('M74 52H96V120H74Z', o.thronFeld ?? C.gruen, 'stroke-width="0.35"');
  g += kreis(70, 44, 3, C.gold, 0.4) + kreis(100, 44, 3, C.gold, 0.4);
  g += P('M30 128H102V142H30Z', o.thron ?? C.gelb);
  g += P('M30 128H102V131H30Z', C.gold, 'stroke-width="0.35"');
  // Beine (sitzend)
  for (const s of [-1, 1]) {
    const kx = cx + s * 9;
    g += glied(
      [
        [kx, 146, 8],
        [kx + s, 162, 7],
        [kx + s * 2, 176, 5.8],
      ],
      C.weiss,
    );
    g += P(
      `M${f(kx + s * 2 - 4)} 175C${f(kx + s * 2 - 5)} 181 ${f(kx + s * 10)} 182 ${f(kx + s * 10)} 179.6C${f(kx + s * 7)} 177 ${f(kx + 3)} 175 ${f(kx + s * 2 - 4)} 175Z`,
      C.schwarz,
    );
    g += glied(
      [
        [cx + s * 6, 124, 14],
        [kx + s * 2, 136, 13],
        [kx, 147, 10.4],
      ],
      o.hose,
    );
    g += P(
      `M${f(kx - 5)} 144.6H${f(kx + 5)}L${f(kx + 4.6)} 148H${f(kx - 4.6)}Z`,
      C.gelb,
      'stroke-width="0.35"',
    );
  }
  // Mantel, Rumpf, Weste, Gürtel
  g += P(
    `M${cx - 19} 58C${cx - 30} 80 ${cx - 30} 110 ${cx - 28} 128C${cx - 22} 133 ${cx - 16} 132 ${cx - 13} 128L${cx + 13} 128C${cx + 16} 132 ${cx + 24} 133 ${cx + 30} 128C${cx + 31} 104 ${cx + 28} 80 ${cx + 19} 58Z`,
    o.mantel,
  );
  g += fein(
    `M${cx - 24} 90C${cx - 25} 104 ${cx - 25} 116 ${cx - 24} 126M${cx + 26} 92C${cx + 27} 106 ${cx + 27} 116 ${cx + 27} 126`,
    0.3,
  );
  g += P(
    `M${cx - 14} 57C${cx - 16} 76 ${cx - 14} 100 ${cx - 13} 122H${cx + 13}C${cx + 14} 100 ${cx + 16} 76 ${cx + 14} 57C${cx + 6} 54 ${cx - 6} 54 ${cx - 14} 57Z`,
    o.rock,
  );
  g += P(
    `M${cx - 4} 57H${cx + 4}L${cx + 5} 122H${cx - 5}Z`,
    o.weste ?? C.gelb,
    'stroke-width="0.4"',
  );
  for (const y of [66, 76, 86, 96, 114]) g += knopf(cx, y, 0.8);
  g += P(
    `M${cx - 13.4} 104H${cx + 13.4}L${cx + 13.4} 108H${cx - 13.4}Z`,
    C.gold,
    'stroke-width="0.35"',
  );
  // Hermelin- bzw. Pelzkragen
  g += P(
    `M${cx - 18} 56C${cx - 12} 64 ${cx + 12} 64 ${cx + 18} 56C${cx + 12} 51 ${cx - 12} 51 ${cx - 18} 56Z`,
    o.kragenFell ?? C.weiss,
  );
  if (!o.kragenFell)
    for (const [x, y] of [
      [cx - 12, 57],
      [cx - 6, 59.4],
      [cx, 60],
      [cx + 6, 59.4],
      [cx + 12, 57],
    ])
      g += `<path d="M${x} ${y}l0.6 1.6l0.6 -1.6Z" fill="#1a1a1a"/>`;
  // Arm mit Zepter (links), Arm auf dem Wappen (rechts)
  g += glied(
    [
      [cx - 15, 60, 8],
      [cx - 22, 82, 6.6],
      [cx - 16, 98, 5.4],
    ],
    o.aermel ?? o.rock,
  );
  g += glied(
    [
      [cx - 18, 42, 2],
      [cx - 16, 112, 2],
    ],
    C.gold,
  );
  g += kreis(cx - 18, 40, 2.6, C.gold, 0.4) + kreis(cx - 18, 40, 1.2, C.rot, 0.25);
  g += kreis(cx - 16.4, 97, 2.4, C.weiss, 0.35) + hand(cx - 16, 99.6);
  g += glied(
    [
      [cx + 15, 60, 8],
      [cx + 24, 84, 6.6],
      [cx + 26, 104, 5.4],
    ],
    o.aermel ?? o.rock,
  );
  if (o.wappen) g += wappen(o.wappen, cx + 30, 150);
  g += kreis(cx + 26, 103, 2.4, C.weiss, 0.35) + hand(cx + 26, 105.6);
  // Kopf
  g += P(`M${cx - 3} 48H${cx + 3}V54H${cx - 3}Z`, C.haut, 'stroke-width="0.35"');
  g += kopf(cx, 40, { ...o, hut: o.hut ?? 'krone' });
  if (o.pip) g += zeichen(o.pip.farbe, o.pip.x, o.pip.y, o.pip.w);
  return g;
}

// ---------------------------------------------------------------------------
// Kleine Szenen der Zahlkarten

function baum(x, y, s = 1) {
  return (
    glied(
      [
        [x, y, 2.2 * s],
        [x, y - 10 * s, 1.8 * s],
      ],
      FARBE.holz,
    ) +
    P(
      glatt([
        [x - 6 * s, y - 10 * s],
        [x - 7 * s, y - 16 * s],
        [x - 3 * s, y - 21 * s],
        [x + 3 * s, y - 21 * s],
        [x + 7 * s, y - 16 * s],
        [x + 6 * s, y - 10 * s],
        [x, y - 8 * s],
      ]),
      C.gruen,
      'stroke-width="0.35"',
    )
  );
}
function tanne(x, y, s = 1) {
  let g = glied(
    [
      [x, y, 1.8 * s],
      [x, y - 4 * s, 1.6 * s],
    ],
    FARBE.holz,
  );
  for (let i = 0; i < 3; i++) {
    const yy = y - 3 * s - i * 6 * s;
    const w = (7 - i * 1.6) * s;
    g += P(
      `M${f(x - w)} ${f(yy)}L${f(x)} ${f(yy - 9 * s)}L${f(x + w)} ${f(yy)}Z`,
      C.gruenD,
      'stroke-width="0.35"',
    );
  }
  return g;
}
function haus(x, y, s = 1) {
  const F = (v) => f(v);
  return (
    P(`M${x} ${y}V${F(y - 9 * s)}H${F(x + 12 * s)}V${y}Z`, C.weiss, 'stroke-width="0.35"') +
    P(
      `M${F(x - 1.6 * s)} ${F(y - 9 * s)}L${F(x + 6 * s)} ${F(y - 15 * s)}L${F(x + 13.6 * s)} ${F(y - 9 * s)}Z`,
      C.rot,
      'stroke-width="0.35"',
    ) +
    P(
      `M${F(x + 5 * s)} ${y}V${F(y - 5 * s)}H${F(x + 7.4 * s)}V${y}Z`,
      FARBE.holzD,
      'stroke-width="0.3"',
    )
  );
}
function schaf(x, y, s = 1, dir = 1) {
  const bein = (dx) =>
    glied(
      [
        [x + dx * s * dir, y - 3 * s, 1 * s],
        [x + dx * s * dir, y, 1 * s],
      ],
      C.schwarz,
    );
  return (
    bein(-2) +
    bein(2.6) +
    ellipse(x, y - 5 * s, 5 * s, 3.2 * s, C.weiss, 0.35) +
    ellipse(x + 5.2 * s * dir, y - 6.4 * s, 1.8 * s, 1.4 * s, C.schwarz, 0.3)
  );
}
function hund(x, y, s = 1, dir = 1, fell = FARBE.fell) {
  const X = (v) => f(x + v * s * dir);
  const Y = (v) => f(y + v * s);
  return P(
    `M${X(-5)} ${Y(0)}L${X(-4.6)} ${Y(-4)}C${X(-6)} ${Y(-5)} ${X(-7)} ${Y(-7)} ${X(-6.4)} ${Y(-8)}L${X(-4)} ${Y(-6)}H${X(3)}L${X(4.6)} ${Y(-9)}L${X(7)} ${Y(-8.6)}L${X(7.4)} ${Y(-7)}L${X(5.4)} ${Y(-6.2)}L${X(4.6)} ${Y(0)}H${X(3.4)}L${X(3.2)} ${Y(-3.4)}H${X(-3.4)}L${X(-3.8)} ${Y(0)}Z`,
    fell,
    'stroke-width="0.35"',
  );
}
/** Kleine Person (Bauer, Bäuerin, Jäger). */
function leut(x, y, s, o = {}) {
  const X = (v) => f(x + v * s);
  const Y = (v) => f(y + v * s);
  const bein = (a, b, w, c) =>
    glied(
      [
        [x + a * s, y + b * s, w * s],
        [x + a * s, y, w * s],
      ],
      c,
    );
  let g = '';
  if (o.rock) {
    g += bein(-1.6, -1, 1.2, C.schwarz) + bein(1.6, -1, 1.2, C.schwarz);
    g += P(
      `M${X(-2)} ${Y(-11)}L${X(-5)} ${Y(-1)}H${X(5)}L${X(2)} ${Y(-11)}Z`,
      o.rock,
      'stroke-width="0.35"',
    );
    g += P(
      `M${X(-1.2)} ${Y(-8)}L${X(-2.6)} ${Y(-1)}H${X(2.6)}L${X(1.2)} ${Y(-8)}Z`,
      o.schuerze ?? C.weiss,
      'stroke-width="0.25"',
    );
  } else {
    g += bein(-1.8, -7, 1.8, o.hose ?? FARBE.holzD) + bein(1.8, -7, 1.8, o.hose ?? FARBE.holzD);
  }
  g += P(
    `M${X(-2.8)} ${Y(-14)}H${X(2.8)}L${X(3)} ${Y(-7)}H${X(-3)}Z`,
    o.jacke ?? C.rot,
    'stroke-width="0.35"',
  );
  if (o.arm)
    g += glied(
      [
        [x + 2.6 * s, y - 13 * s, 1.4 * s],
        [x + o.arm[0] * s, y + o.arm[1] * s, 1.2 * s],
      ],
      o.jacke ?? C.rot,
    );
  g += kreis(x, y - 16.4 * s, 2.3 * s, C.haut, 0.3);
  g += P(
    `M${X(-3)} ${Y(-17.6)}H${X(3)}L${X(2)} ${Y(-19.6)}H${X(-2)}Z`,
    o.hut ?? C.schwarz,
    'stroke-width="0.25"',
  );
  return g;
}

function loewe(x, y) {
  let g = boden(y - 2, 20, 105);
  g += P(
    `M${x + 22} ${y - 4}C${x + 24} ${y - 14} ${x + 18} ${y - 20} ${x + 8} ${y - 20}L${x - 10} ${y - 20}C${x - 14} ${y - 20} ${x - 16} ${y - 16} ${x - 16} ${y - 12}L${x - 16} ${y}H${x - 12}L${x - 11} ${y - 8}H${x + 12}L${x + 14} ${y}H${x + 18}Z`,
    C.gelbD,
  );
  g += `<path d="M${x + 22} ${y - 10}C${x + 28} ${y - 12} ${x + 28} ${y - 22} ${x + 24} ${y - 24}" fill="none" stroke="#1a1a1a" stroke-width="0.8"/>`;
  g += kreis(x + 24, y - 25, 1.6, FARBE.holzD, 0.3);
  g += P(
    glatt([
      [x - 16, y - 34],
      [x - 7, y - 32],
      [x - 4, y - 24],
      [x - 7, y - 14],
      [x - 16, y - 10],
      [x - 25, y - 14],
      [x - 28, y - 22],
      [x - 25, y - 31],
    ]),
    FARBE.holz,
  );
  g += ellipse(x - 17, y - 22, 6, 6.4, C.gelb, 0.4);
  g +=
    kreis(x - 19.6, y - 23.6, 0.6, '#1a1a1a', 0.1) + kreis(x - 14.4, y - 23.6, 0.6, '#1a1a1a', 0.1);
  g += fein(`M${x - 18.6} ${y - 19}Q${x - 17} ${y - 18} ${x - 15.4} ${y - 19}`, 0.35);
  return g;
}

function blumenvase(x, y) {
  let g = boden(y - 2, 30, 95);
  for (const [a, c] of [
    [-50, C.rot],
    [-20, C.blau],
    [10, C.rot],
    [40, C.gelb],
    [-35, C.gelb],
    [25, C.rot],
  ]) {
    const r = (a * Math.PI) / 180;
    const ex = x + Math.sin(r) * 18,
      ey = y - 22 - Math.cos(r) * 14;
    g += `<path d="M${x} ${y - 16}Q${f((x + ex) / 2)} ${f(ey + 6)} ${f(ex)} ${f(ey)}" fill="none" stroke="${C.gruenD}" stroke-width="0.8"/>`;
    for (let i = 0; i < 5; i++) {
      const b = (i / 5) * Math.PI * 2;
      g += kreis(ex + Math.cos(b) * 1.6, ey + Math.sin(b) * 1.6, 1.3, c, 0.25);
    }
    g += kreis(ex, ey, 0.9, C.gold, 0.2);
  }
  g += P(
    `M${x - 8} ${y - 16}H${x + 8}C${x + 9} ${y - 10} ${x + 4} ${y - 6} ${x + 3} ${y - 3}H${x + 6}V${y}H${x - 6}V${y - 3}H${x - 3}C${x - 4} ${y - 6} ${x - 9} ${y - 10} ${x - 8} ${y - 16}Z`,
    C.gold,
  );
  return g;
}

/** Szenen für 6 bis 10 je Farbe. */
const SZENE = {
  'herz-10': () =>
    baum(30, 184, 0.8) +
    leut(52, 184, 1, { rock: C.rot }) +
    leut(66, 184, 1, { jacke: C.gruen, hut: C.gruen }) +
    tanne(94, 184, 0.8),
  'herz-9': () =>
    tanne(28, 184, 0.9) +
    leut(56, 184, 1, { rock: C.blau }) +
    leut(70, 184, 1, { jacke: C.rot, arm: [7, -10] }) +
    haus(84, 184, 0.9),
  'herz-8': () =>
    baum(32, 184) +
    leut(62, 184, 1.05, { jacke: C.blau, hose: C.gelbD, arm: [6, -20] }) +
    baum(92, 184, 0.9),
  'herz-7': () =>
    haus(24, 184, 0.9) +
    leut(60, 184, 1, { rock: C.gruen }) +
    leut(74, 184, 1, { jacke: C.rot }) +
    tanne(98, 184, 0.7),
  'herz-6': () => loewe(62, 184),
  'schellen-10': () =>
    tanne(30, 184, 0.9) +
    leut(60, 184, 1, { jacke: C.gruen, arm: [8, -16] }) +
    schaf(82, 184, 0.9) +
    schaf(96, 184, 0.8),
  'schellen-9': () =>
    tanne(26, 184, 1) +
    leut(52, 184, 1, { rock: C.rot }) +
    leut(70, 184, 1, { jacke: C.blau, hose: C.gelbD }) +
    baum(96, 184, 0.8),
  'schellen-8': () =>
    leut(40, 184, 1, { jacke: C.rot, arm: [7, -9] }) + haus(64, 184, 1) + baum(96, 184, 0.8),
  'schellen-7': () =>
    baum(30, 184, 0.9) +
    leut(58, 184, 1, { rock: C.blau, schuerze: C.gelb }) +
    hund(84, 184, 0.9, -1),
  'eichel-10': () =>
    tanne(28, 184, 0.9) + leut(62, 184, 1, { jacke: C.rot, hose: C.gruen }) + baum(94, 184, 0.8),
  'eichel-9': () =>
    baum(26, 184, 0.9) +
    leut(48, 184, 1, { jacke: C.blau }) +
    hund(72, 184, 1, 1) +
    tanne(98, 184, 0.7),
  'eichel-8': () =>
    leut(36, 184, 1, { jacke: C.gelbD, arm: [7, -18] }) +
    baum(58, 184, 0.9) +
    hund(86, 184, 0.9, -1, C.weiss),
  'eichel-7': () =>
    tanne(30, 184, 0.8) +
    leut(56, 184, 1, { jacke: C.rot, arm: [7, -8] }) +
    leut(70, 184, 1, { rock: C.gruen }) +
    haus(84, 184, 0.8),
  'eichel-6': () =>
    tanne(32, 184, 0.8) +
    leut(62, 184, 1.2, { rock: C.rot, schuerze: C.gelb }) +
    tanne(94, 184, 0.8),
  'gras-10': () =>
    hund(36, 184, 0.9, 1, C.weiss) +
    leut(62, 184, 1, { jacke: C.gruen, hut: C.gruen, arm: [7, -16] }) +
    hund(88, 184, 0.9, -1),
  'gras-9': () =>
    baum(30, 184, 0.9) + leut(54, 184, 1, { jacke: C.rot }) + hund(80, 184, 0.9, -1, C.weiss),
  'gras-8': () =>
    tanne(28, 184, 0.9) +
    leut(56, 184, 1, { rock: C.rot }) +
    leut(70, 184, 1, { jacke: C.blau }) +
    haus(84, 184, 0.8),
  'gras-7': () =>
    baum(30, 184, 0.9) + leut(62, 184, 1, { jacke: C.blau, arm: [8, -20] }) + baum(94, 184, 0.8),
  'gras-6': () => blumenvase(62, 186),
};

function weliSzene() {
  // Trauerweiden und Denkmal
  let g = boden();
  g += P('M58 182V170H67V182Z', C.silber);
  g += P('M59.4 170L60.6 150H64.4L65.6 170Z', C.weiss);
  g += P('M60.6 150L62.5 146L64.4 150Z', C.gold, 'stroke-width="0.35"');
  for (const s of [-1, 1]) {
    const x = 62.5 + s * 22;
    g += glied(
      [
        [x, 182, 2.4],
        [x, 162, 2],
      ],
      FARBE.holz,
    );
    for (let i = 0; i < 7; i++)
      g += `<path d="M${x} 162Q${f(x + s * (i - 3) * 3)} ${150 + i} ${f(x + (i - 3) * 2.6)} ${172 - i}" fill="none" stroke="${C.gruen}" stroke-width="1.4" stroke-linecap="round"/>`;
  }
  return g;
}

// ---------------------------------------------------------------------------
// Zahlkarten

/** Römische X (Zehner), Mitte cx, Oberkante y, Höhe h. */
function roemischX(cx, y, h) {
  const w = h * 0.78,
    s = h * 0.17;
  const r = (x0, x1, t0, t1) =>
    `M${f(x0)} ${f(y)}H${f(x0 + t0)}L${f(x1 + t1)} ${f(y + h)}H${f(x1)}Z`;
  let d = r(cx - w / 2, cx + w / 2 - s * 1.5, s * 1.5, s * 1.5);
  d += `M${f(cx + w / 2 - s * 0.9)} ${f(y)}H${f(cx + w / 2)}L${f(cx - w / 2 + s * 0.9)} ${f(y + h)}H${f(cx - w / 2)}Z`;
  for (const [x, t] of [
    [cx - w / 2, s * 1.5],
    [cx + w / 2 - s * 0.9, s * 0.9],
  ])
    d += `M${f(x - 1.4)} ${f(y)}h${f(t + 2.8)}v1h${f(-(t + 2.8))}Z`;
  for (const [x, t] of [
    [cx - w / 2, s * 0.9],
    [cx + w / 2 - s * 1.5, s * 1.5],
  ])
    d += `M${f(x - 1.4)} ${f(y + h - 1)}h${f(t + 2.8)}v1h${f(-(t + 2.8))}Z`;
  return `<path d="${d}" fill="#1a1a1a"/>`;
}

/** Schriftzug „WELI“ aus einfachen Antiqua-Strichen. */
function weliSchrift(cx, y, h) {
  const s = h * 0.16;
  const lw = h * 0.95;
  const breite = lw + 2.2 + h * 0.55 + 2 + h * 0.5 + 2 + s;
  let x = cx - breite / 2;
  let d = '';
  const w = [
    [x, y],
    [x + lw * 0.25, y + h],
    [x + lw * 0.5, y + h * 0.3],
    [x + lw * 0.75, y + h],
    [x + lw, y],
  ];
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = w[i],
      [bx, by] = w[i + 1];
    const t = i % 2 ? s * 0.6 : s;
    d += `M${f(ax - t / 2)} ${f(ay)}L${f(ax + t / 2)} ${f(ay)}L${f(bx + t / 2)} ${f(by)}L${f(bx - t / 2)} ${f(by)}Z`;
  }
  x += lw + 2.2;
  const e = h * 0.55;
  d += `M${f(x)} ${f(y)}h${f(e)}v${f(s * 0.7)}h${f(-e + s)}v${f(h / 2 - s * 1.05)}h${f(e * 0.7)}v${f(s * 0.7)}h${f(-e * 0.7)}v${f(h / 2 - s * 0.35 - s * 0.7)}h${f(e - s)}v${f(s * 0.7)}h${f(-e)}Z`;
  x += e + 2;
  d += `M${f(x)} ${f(y)}h${f(s)}v${f(h - s * 0.7)}h${f(h * 0.5 - s)}v${f(s * 0.7)}h${f(-h * 0.5)}Z`;
  x += h * 0.5 + 2;
  d += `M${f(x)} ${f(y)}h${f(s)}v${f(h)}h${f(-s)}Z`;
  return `<path d="${d}" fill="#1a1a1a"/>`;
}

/**
 * Lage der Zeichen: Herz und Schellen im Raster, Eichel und Gras quer an einem Stängel.
 * Liefert [x, y, drehung] je Zeichen (Mitte).
 */
function lage(farbe, rang) {
  const n = Number(rang);
  const raster = farbe === 'herz' || farbe === 'schellen';
  const top = rang === '10' ? 38 : 26;
  const out = [];
  if (raster) {
    const spalten = { 10: [3, 4, 3], 9: [3, 3, 3], 8: [4, 0, 4], 7: [3, 1, 3], 6: [3, 0, 3] }[n];
    const breit = n === 6 || n === 8;
    const xs = breit ? [40, 0, 85] : [33, 62.5, 92];
    spalten.forEach((k, i) => {
      if (!k) return;
      if (k === 1) {
        out.push([xs[i], top + 2, 0]);
        return;
      }
      const dy = k === 4 ? 26 : 30;
      const y0 = top + (k === 4 ? 6 : 16);
      for (let j = 0; j < k; j++) out.push([xs[i], y0 + j * dy, 0]);
    });
  } else {
    const paare = Math.floor(n / 2);
    const dy = 23;
    const y0 = top + (n % 2 ? 24 : 12);
    for (let j = 0; j < paare; j++) {
      out.push([42, y0 + j * dy, -90]);
      out.push([83, y0 + j * dy, 90]);
    }
    if (n % 2) out.push([62.5, top + 4, 0]);
  }
  return out;
}

function zahlenkarte(farbe, rang, { weli = false } = {}) {
  let g = '';
  const raster = farbe === 'herz' || farbe === 'schellen';
  const punkte = lage(farbe, rang);
  if (!raster) {
    // Stängel mit Ranken
    const quer = punkte.filter((p) => p[2]);
    const yTop = Math.min(...punkte.map((p) => p[1])) + (punkte.some((p) => !p[2]) ? 8 : -6);
    const yBot = Math.max(...quer.map((p) => p[1])) + 12;
    g += glied(
      [
        [62.5, yTop, 2.6],
        [62.5, yBot, 2.6],
      ],
      farbe === 'eichel' ? C.gelb : C.rot,
      'stroke-width="0.4"',
    );
    for (const p of quer)
      g += `<path d="M62.5 ${p[1] + 4}Q${f((62.5 + p[0]) / 2)} ${p[1] + 6} ${f(p[0] + (p[2] > 0 ? -5 : 5))} ${p[1]}" fill="none" stroke="${C.gruenD}" stroke-width="1"/>`;
    for (let y = yTop + 8; y < yBot - 4; y += 22)
      g += blatt([62.5, y], [62.5, y + 6], 1.8, farbe === 'eichel' ? C.rot : C.gelb);
  }
  const w = raster ? (farbe === 'herz' ? 21 : 19) : farbe === 'eichel' ? 14.4 : 18.4;
  for (const [x, y, a] of punkte) {
    const h = pipHoehe(farbe, w);
    g += `<g transform="rotate(${a} ${f(x)} ${f(y)})">${zeichen(farbe, x - w / 2, y - h / 2, w)}</g>`;
  }
  if (rang === '10') g += roemischX(62.5, 12, 14);
  if (weli) g += weliSchrift(62.5, 11, 10);
  const roh = weli ? weliSzene() : SZENE[`${farbe}-${rang}`]();
  const szene = `<g transform="translate(62.5 184) scale(1.3) translate(-62.5 -184)">${roh}</g>`;
  const eigenerBoden = farbe === 'herz' && rang === '6';
  const grund = eigenerBoden || weli || (farbe === 'gras' && rang === '6') ? '' : boden();
  return (
    `<g transform="translate(62.5 184) scale(1.3) translate(-62.5 -184)">${grund}</g>` + g + szene
  );
}

// ---------------------------------------------------------------------------
// Sau-Karten (Daus): zwei Zeichen oben, darunter das Motiv der Farbe

function bacchus(x, y, s) {
  let g = `<g transform="translate(${f(x)} ${f(y)}) scale(${s})">`;
  g += P('M-14 -6C-15.6 -2 -15.6 6 -14 10H14C15.6 6 15.6 -2 14 -6Z', C.braun);
  g += P('M14 -6C16.6 -6 17.4 10 14 10C12 10 12 -6 14 -6Z', FARBE.holz);
  g += `<ellipse cx="14.4" cy="2" rx="0.9" ry="1.4" fill="#1a1a1a"/>`;
  for (const xr of [-9, -3, 3, 9])
    g += P(
      `M${xr - 0.6} -6.4H${xr + 0.6}L${xr + 0.9} 10.4H${xr - 0.9}Z`,
      C.gelbD,
      'stroke-width="0.3"',
    );
  g += P('M-6 -6.6C-6.4 -2 -5 2 -2.6 3.4L-1 1.2C-2.4 -0.4 -2.6 -3 -2 -6.6Z', C.haut);
  g += P('M2 -6.6C4 -3 6.4 -1 9 -0.6L9.6 -3C7.6 -3.6 6 -5 5.4 -6.6Z', C.haut);
  g += P(
    'M-6.6 -6.4C-7.6 -12 -6 -17.6 -1.6 -19C2.6 -19.6 5.8 -16 5.6 -11C5.4 -8.6 5.6 -7.4 6 -6.4Z',
    C.haut,
  );
  g += blatt([-6.6, -7], [-2, -5], 2, C.gruen) + blatt([5.6, -7], [1, -5.2], 2, C.gruen);
  g += blatt([-1, -6.4], [2, -4], 1.8, C.gruen);
  g += fein('M-3 -14.6Q-1 -13.4 1.6 -14.6', 0.25);
  g += P('M-5.6 -17C-9 -19 -10.4 -22 -10.6 -25.4L-8.4 -25.8C-8 -22.6 -6.6 -20 -4.4 -18.6Z', C.haut);
  g += P('M-11.4 -26.6L-12.2 -32.6H-6.6L-7.4 -26.6Z', C.gold, 'stroke-width="0.35"');
  g += `<circle cx="-0.4" cy="-23.4" r="4.6" fill="${C.haut}" ${LINIE}/>`;
  g += `<circle cx="-2" cy="-23.8" r="0.45" fill="#1a1a1a"/><circle cx="1.2" cy="-23.8" r="0.45" fill="#1a1a1a"/>`;
  g += fein('M-1.6 -21.2Q-0.4 -20.4 0.8 -21.2', 0.25);
  for (const [bx, by] of [
    [-4.4, -26.2],
    [-1.6, -28.4],
    [1.6, -28.2],
    [3.8, -25.8],
  ])
    g += `<circle cx="${bx}" cy="${by}" r="1.5" fill="${C.gruen}" stroke="#1a1a1a" stroke-width="0.25"/>`;
  g += `<circle cx="-3.6" cy="-27.4" r="0.7" fill="#6a2a7a"/><circle cx="2.8" cy="-27.6" r="0.7" fill="#6a2a7a"/>`;
  return g + '</g>';
}

function eber(x, y, s) {
  let g = `<g transform="translate(${f(x)} ${f(y)}) scale(${s})">`;
  g += P(
    'M-20 0L-19 -10C-22 -14 -21 -20 -16 -22C-8 -26 8 -26 16 -20C20 -17 22 -12 26 -12L30 -9C31 -7 30 -5 28 -5L24 -4C22 -2 20 -1 18 0L17 6H14L13 0C6 2 -4 2 -11 0L-12 6H-15Z',
    C.braun,
  );
  g += fein(
    'M-16 -21L-14 -24M-12 -23L-10 -26M-8 -24L-6 -27M-4 -25L-2 -27.6M0 -25L2 -27.6M4 -25L6 -27.4M8 -24L10 -26.6',
    0.5,
  );
  g += P('M14 -21C14 -25 16 -26 18 -24.6L17.6 -20Z', C.braun, 'stroke-width="0.35"');
  g += kreis(21, -15, 0.8, '#1a1a1a', 0.1);
  g += P('M25 -8Q27 -11 26 -13L27.4 -8.6Z', C.weiss, 'stroke-width="0.3"');
  g += fein('M-20 -6C-24 -6 -25 -10 -23 -11', 0.5);
  return g + '</g>';
}

function adler(x, y) {
  let g = '';
  for (const s of [-1, 1]) {
    g += P(
      `M${x} ${y - 4}C${x + s * 8} ${y - 16} ${x + s * 18} ${y - 18} ${x + s * 24} ${y - 12}C${x + s * 20} ${y - 10} ${x + s * 22} ${y - 6} ${x + s * 18} ${y - 4}C${x + s * 20} ${y - 1} ${x + s * 16} ${y + 1} ${x + s * 12} ${y}C${x + s * 10} ${y + 4} ${x + s * 6} ${y + 4} ${x} ${y + 2}Z`,
      C.blau,
    );
    g += fein(
      `M${x + s * 6} ${y - 6}L${x + s * 18} ${y - 13}M${x + s * 6} ${y - 3}L${x + s * 17} ${y - 7}M${x + s * 6} ${y}L${x + s * 13} ${y - 1}`,
      0.3,
    );
  }
  g += P(
    `M${x - 4} ${y - 6}C${x - 5} ${y + 6} ${x - 3} ${y + 12} ${x} ${y + 14}C${x + 3} ${y + 12} ${x + 5} ${y + 6} ${x + 4} ${y - 6}Z`,
    C.gelb,
  );
  g += P(
    `M${x - 3} ${y + 12}L${x - 6} ${y + 18}L${x} ${y + 15}L${x + 6} ${y + 18}L${x + 3} ${y + 12}Z`,
    C.gelb,
    'stroke-width="0.35"',
  );
  g += P(`M${x - 3} ${y - 6}C${x - 4} ${y - 12} ${x + 4} ${y - 13} ${x + 3} ${y - 6}Z`, C.rot);
  g += P(
    `M${x + 2} ${y - 10}L${x + 6} ${y - 9}L${x + 2.6} ${y - 7.6}Z`,
    C.gold,
    'stroke-width="0.3"',
  );
  g += kreis(x + 1, y - 10, 0.6, '#1a1a1a', 0.1);
  return g;
}

/** Steigendes Tier im Profil (Hirsch oder Pferd), dir = Blickrichtung. */
function steigend(x, y, dir, art) {
  const X = (v) => f(x + v * dir);
  const Y = (v) => f(y + v);
  let g = P(
    `M${X(-8)} ${Y(0)}L${X(-6)} ${Y(-10)}C${X(-8)} ${Y(-16)} ${X(-4)} ${Y(-24)} ${X(2)} ${Y(-28)}L${X(6)} ${Y(-38)}C${X(8)} ${Y(-40)} ${X(12)} ${Y(-38)} ${X(12)} ${Y(-36)}L${X(9)} ${Y(-32)}L${X(8)} ${Y(-26)}L${X(12)} ${Y(-22)}L${X(10)} ${Y(-20)}L${X(5)} ${Y(-22)}C${X(4)} ${Y(-16)} ${X(2)} ${Y(-12)} ${X(-1)} ${Y(-10)}L${X(-2)} ${Y(0)}Z`,
    art === 'hirsch' ? C.gelbD : C.weiss,
  );
  g += `<circle cx="${X(7.6)}" cy="${Y(-35.4)}" r="0.55" fill="#1a1a1a"/>`;
  if (art === 'hirsch')
    g += `<path d="M${X(7)} ${Y(-39)}C${X(4)} ${Y(-46)} ${X(6)} ${Y(-50)} ${X(2)} ${Y(-54)}M${X(5)} ${Y(-45)}L${X(0)} ${Y(-46)}M${X(5.4)} ${Y(-49)}L${X(9)} ${Y(-53)}" fill="none" stroke="${FARBE.holzD}" stroke-width="1.2" stroke-linecap="round"/>`;
  else
    g += `<path d="M${X(5)} ${Y(-37)}C${X(2)} ${Y(-34)} ${X(0)} ${Y(-30)} ${X(-1)} ${Y(-24)}M${X(-7)} ${Y(-8)}C${X(-12)} ${Y(-6)} ${X(-14)} ${Y(-2)} ${X(-13)} ${Y(4)}" fill="none" stroke="${C.gelbD}" stroke-width="1.6" stroke-linecap="round"/>`;
  return g;
}

function sauKarte(farbe) {
  let g = '';
  const w = farbe === 'eichel' ? 18 : 25;
  const h = pipHoehe(farbe, w);
  if (farbe === 'herz' || farbe === 'schellen') {
    g += zeichen(farbe, 62.5 - w / 2, 14, w) + zeichen(farbe, 62.5 - w / 2, 14 + h - 1, w);
  } else {
    g += `<path d="M62.5 70C60 54 52 44 46 38M62.5 70C65 54 73 44 79 38" fill="none" stroke="${C.gruenD}" stroke-width="1"/>`;
    for (const [x, a] of [
      [44, -16],
      [81, 16],
    ])
      g += `<g transform="rotate(${a} ${x} 30)">${zeichen(farbe, x - w / 2, 36 - h, w)}</g>`;
  }
  if (farbe === 'herz') {
    // Prunkgefäß mit Früchten, darunter Amor im Medaillon
    for (const s of [-1, 1]) {
      g += `<path d="${spirale(62.5 + s * 22, 150, 1, 9, s === 1 ? Math.PI : 0, 1.3, -s)}" fill="none" stroke="${C.rot}" stroke-width="2.4" stroke-linecap="round"/>`;
      g += `<path d="${spirale(62.5 + s * 26, 120, 1, 7, s === 1 ? Math.PI * 1.5 : -Math.PI * 0.5, 1.2, s)}" fill="none" stroke="${C.blau}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    g += P('M40 118C40 104 85 104 85 118C85 128 76 132 62.5 132C49 132 40 128 40 118Z', C.gold);
    for (const [x, y, c] of [
      [46, 100, C.rot],
      [54, 94, C.gelb],
      [62.5, 91, C.rot],
      [71, 94, C.gelb],
      [79, 100, C.rot],
      [50, 104, C.gruen],
      [75, 104, C.gruen],
    ])
      g += kreis(x, y, 4.4, c, 0.4);
    for (const s of [-1, 1])
      g +=
        blatt([62.5 + s * 8, 104], [62.5 + s * 24, 96], 3, C.gruen) +
        blatt([62.5 + s * 4, 104], [62.5 + s * 12, 88], 2.6, C.gruen);
    g += ellipse(62.5, 150, 15, 18, C.gold, 0.6) + ellipse(62.5, 150, 11.6, 14.4, '#cfe0f5', 0.45);
    g += blatt([58, 150], [50, 144], 2.6, C.weiss) + blatt([67, 150], [75, 144], 2.6, C.weiss);
    g += kreis(62.5, 145, 4.6, C.haut, 0.4);
    g += P('M57.6 150C56 160 69 160 67.4 150Z', C.haut, 'stroke-width="0.4"');
    g += P('M58 141C59 137.4 66 137.4 67 141C65 140 60 140 58 141Z', C.haarH, 'stroke-width="0.3"');
    g += P('M56 168H69L66 176H59Z', C.rot);
  } else if (farbe === 'eichel') {
    g += boden(184, 24, 101) + bacchus(62.5, 160, 2);
  } else if (farbe === 'schellen') {
    g += boden(182) + eber(60, 176, 1.5);
  } else {
    // Lebensbaum mit Adler, daneben Hirsch und Pferd
    g += glied(
      [
        [62.5, 182, 4],
        [62.5, 80, 2.6],
      ],
      FARBE.holz,
    );
    for (const [y, s] of [
      [96, -1],
      [104, 1],
      [126, -1],
      [136, 1],
    ])
      g +=
        blatt([62.5, y], [62.5 + s * 12, y - 6], 2.4, C.gruen) +
        kreis(62.5 + s * 13, y - 7, 1.8, C.rot, 0.3);
    g += adler(62.5, 112) + boden(182);
    g += steigend(36, 182, 1, 'hirsch') + steigend(89, 182, -1, 'pferd');
  }
  return g;
}

// ---------------------------------------------------------------------------
// Bildkarten je Farbe (Kleidung und Haltung nach dem Salzburger Bild)

const pipBreite = (farbe) => (farbe === 'eichel' ? 13 : 17);
const pipOben = (farbe) => ({ farbe, x: 14, y: 13, w: pipBreite(farbe) });
const pipUnten = (farbe, x) => ({
  farbe,
  x,
  y: 166 - pipHoehe(farbe, pipBreite(farbe)),
  w: pipBreite(farbe),
});

const BILD = {
  'herz-O': () =>
    stehend({
      pose: 'saebel',
      hut: 'zweispitz',
      rock: C.blau,
      weste: C.rot,
      aufschlag: C.rot,
      hose: C.gelb,
      band: C.rot,
      epauletten: true,
      haar: '#3a2614',
      schnurr: true,
      pip: pipOben('herz'),
    }),
  'herz-U': () =>
    stehend({
      pose: 'hellebarde',
      rock: C.rot,
      weste: C.gelb,
      aufschlag: C.gruen,
      aermel: C.gruen,
      hose: C.blau,
      kragen: 'krause',
      schnurr: true,
      pip: pipUnten('herz', 20),
    }),
  'herz-K': () =>
    sitzend({
      rock: C.rot,
      mantel: C.blau,
      hose: C.rot,
      weste: C.gelb,
      wappen: 'anker',
      bart: 'spitz',
      pip: pipOben('herz'),
    }),
  'eichel-O': () =>
    stehend({
      pose: 'schild',
      hut: 'barett',
      hutFarbe: C.gruen,
      feder: C.rot,
      rock: C.rot,
      weste: C.gelb,
      aufschlag: C.gelb,
      hose: C.gruen,
      kragen: 'krause',
      schnurr: true,
      pip: pipOben('eichel'),
    }),
  'eichel-U': () =>
    stehend({
      pose: 'saebel',
      rock: C.gruen,
      weste: C.rot,
      aufschlag: C.rot,
      aermel: C.rot,
      hose: C.gelb,
      band: C.rot,
      haar: C.haarH,
      schnurr: true,
      epauletten: true,
      pip: pipUnten('eichel', 52),
    }),
  'eichel-K': () =>
    sitzend({
      rock: C.rot,
      mantel: C.rot,
      hose: C.blau,
      weste: C.gelb,
      thronFeld: C.blau,
      wappen: 'amor',
      bart: 'spitz',
      pip: pipOben('eichel'),
    }),
  'schellen-O': () =>
    stehend({
      pose: 'saebel',
      rock: C.gruen,
      weste: C.rot,
      aufschlag: C.gelb,
      aermel: C.rot,
      hose: C.blau,
      kragen: 'krause',
      schnurr: true,
      pip: pipOben('schellen'),
    }),
  'schellen-U': () =>
    stehend({
      pose: 'hieb',
      rock: C.gruen,
      weste: C.rot,
      aufschlag: C.rot,
      aermel: C.rot,
      hose: C.rot,
      band: C.gelb,
      schnurr: true,
      pip: pipUnten('schellen', 70),
    }),
  'schellen-K': () =>
    sitzend({
      rock: C.rot,
      mantel: C.rot,
      hose: C.rot,
      weste: C.gelb,
      thronFeld: C.gruen,
      wappen: 'burg',
      bart: 'spitz',
      pip: pipOben('schellen'),
    }),
  'gras-O': () =>
    stehend({
      pose: 'trommel',
      hut: 'zweispitz',
      rock: C.blau,
      weste: C.gelb,
      aufschlag: C.rot,
      hose: C.rot,
      band: C.gelb,
      epauletten: true,
      schnurr: true,
      pip: pipOben('gras'),
    }),
  'gras-U': () =>
    stehend({
      pose: 'floete',
      hut: 'zweispitz',
      rock: C.rot,
      weste: C.gruen,
      aufschlag: C.gruen,
      aermel: C.gruen,
      hose: C.rot,
      band: C.gelb,
      schnurr: true,
      pip: pipUnten('gras', 20),
    }),
  'gras-K': () =>
    sitzend({
      hut: 'kappe',
      hutFarbe: C.gelb,
      rock: C.gruen,
      mantel: C.braun,
      kragenFell: FARBE.fell,
      hose: C.gruen,
      weste: C.gelb,
      thronFeld: C.rot,
      bart: 'voll',
      pip: pipOben('gras'),
    }),
};

// ---------------------------------------------------------------------------
// Karte zusammensetzen und schreiben

function karte(farbe, inhalt) {
  const { x, y, w, h, r } = KARTE;
  const clip = `<clipPath id="karte"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>`;
  return bereinigen(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125 205" width="125mm" height="205mm">
<defs>${pipSymbol(farbe)}${clip}</defs>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff" stroke="#1a1a1a" stroke-width="0.1"/>
<g clip-path="url(#karte)">${inhalt}</g>
</svg>`);
}

const SVGO = {
  multipass: true,
  floatPrecision: 2,
  plugins: [
    { name: 'preset-default', params: { overrides: { cleanupIds: { minify: true } } } },
    'removeDimensions',
  ],
};

fs.mkdirSync(ZIEL, { recursive: true });
let roh = 0,
  klein = 0,
  n = 0;
function schreibe(name, svg) {
  const out = optimize(svg, SVGO).data;
  roh += svg.length;
  klein += out.length;
  n++;
  fs.writeFileSync(path.join(ZIEL, `${name}.svg`), out);
}

for (const farbe of FARBEN) {
  for (const rang of ['6', '7', '8', '9', '10']) {
    const weli = farbe === 'schellen' && rang === '6';
    schreibe(weli ? 'weli' : `${farbe}-${rang}`, karte(farbe, zahlenkarte(farbe, rang, { weli })));
  }
  for (const rang of ['U', 'O', 'K'])
    schreibe(`${farbe}-${rang}`, karte(farbe, BILD[`${farbe}-${rang}`]()));
  schreibe(`${farbe}-A`, karte(farbe, sauKarte(farbe)));
}
console.log(
  `${n} SVGs geschrieben nach ${path.relative(process.cwd(), ZIEL)}: ${roh} → ${klein} Bytes.`,
);
