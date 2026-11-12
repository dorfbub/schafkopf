// Salzburger Bild, Entwurf (U9): zwei Musterkarten im Stil des bayerischen Blatts aus U2
// (gleicher Rahmen, gleiche Eckzeichen, gleiche Linien und Farben), aber mit den Merkmalen des
// Salzburger Bilds (IPCS Pattern Sheet 56; Scans Anton Fuchs, Salzburg, um 1848):
// - Herz-Ober: Zweispitz, blauer Rock mit roten Aufschlägen, glatt rasiert, zieht den Säbel.
// - Eichel-Sau: zwei Eicheln (die „Daus“ zeigt zwei Zeichen) und darunter Bacchus auf dem Fass.
//
// Aufruf: node apps/web/scripts/karten/salzburger.mjs
// Ausgabe: apps/web/src/assets/kartensets/salzburger/eigen/{herz-O,eichel-A}.svg

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';
import { f, LINIE, FEIN, blatt } from './geo.mjs';
import { bildkarte, zeichen, pipHoehe } from './rahmen.mjs';
import { C, gesicht } from './figuren.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.resolve(HIER, '../../src/assets/kartensets/salzburger/eigen');

const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${LINIE} ${extra}/>`;
const fein = (d, w = 0.28) => `<path d="${d}" ${FEIN} stroke-width="${w}"/>`;
const knopf = (x, y, r = 0.9) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${C.gold}" stroke="#1a1a1a" stroke-width="0.2"/>`;

/** Zweispitz von vorn, quer getragen, mit Kokarde und Goldborte. */
function zweispitz() {
  let g = '';
  const hut = 'M38 37C40.6 30 48 19 62.5 17C77 19 84.4 30 87 37C79 33.6 46 33.6 38 37Z';
  g += P(hut, C.schwarz);
  // Lichtkante und Falte
  g += `<path d="M44 33C49 26.6 55 23 62.5 22.2C70 23 76 26.6 81 33" fill="none" stroke="#5a5a5a" stroke-width="0.5" stroke-linecap="round"/>`;
  // Goldborte entlang der Krempe
  g += `<path d="M40.6 35.2C48 32.6 77 32.6 84.4 35.2" fill="none" stroke="${C.gold}" stroke-width="0.9" stroke-linecap="round"/>`;
  // Kokarde mit Schlaufe
  g += `<circle cx="73.4" cy="27.4" r="3" fill="${C.weiss}" ${LINIE} stroke-width="0.35"/>`;
  g += `<circle cx="73.4" cy="27.4" r="1.9" fill="${C.rot}" stroke="#1a1a1a" stroke-width="0.25"/>`;
  g += `<path d="M73.4 30.4L73.6 33.6" stroke="${C.gold}" stroke-width="1.2"/>`;
  return g;
}

/** Säbel: Korb, Griff in der Hand bei (x, y), Klinge gebogen nach oben. */
function saebel(x, y) {
  let g = '';
  const klinge = `M${f(x + 1)} ${f(y - 2)}C${f(x + 5)} ${f(y - 16)} ${f(x + 9)} ${f(y - 30)} ${f(x + 8.6)} ${f(y - 46)}C${f(x + 7.2)} ${f(y - 32)} ${f(x + 2.6)} ${f(y - 16)} ${f(x - 1.4)} ${f(y - 2.6)}Z`;
  g += P(klinge, C.silber);
  g += fein(
    `M${f(x + 0.4)} ${f(y - 4)}C${f(x + 4.6)} ${f(y - 16)} ${f(x + 9)} ${f(y - 28)} ${f(x + 13)} ${f(y - 40)}`,
    0.22,
  );
  // Bügel (Korb) und Parierstange
  g += `<path d="M${f(x - 4)} ${f(y - 1.4)}Q${f(x)} ${f(y - 4)} ${f(x + 4)} ${f(y - 2)}" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>`;
  g += `<path d="M${f(x - 4)} ${f(y - 1.4)}Q${f(x)} ${f(y - 4)} ${f(x + 4)} ${f(y - 2)}" fill="none" stroke="${C.gold}" stroke-width="0.8" stroke-linecap="round"/>`;
  g += `<path d="M${f(x + 4)} ${f(y - 2)}C${f(x + 7)} ${f(y + 1)} ${f(x + 6)} ${f(y + 6)} ${f(x + 2)} ${f(y + 7)}" fill="none" stroke="#1a1a1a" stroke-width="1.3" stroke-linecap="round"/>`;
  g += `<path d="M${f(x + 4)} ${f(y - 2)}C${f(x + 7)} ${f(y + 1)} ${f(x + 6)} ${f(y + 6)} ${f(x + 2)} ${f(y + 7)}" fill="none" stroke="${C.gold}" stroke-width="0.6" stroke-linecap="round"/>`;
  return g;
}

export function oberSalzburg(farbe) {
  let g = '';
  const cx = 62.5;
  // Rock: Schultern und Körper
  const rock =
    'M45 57C37 58.5 31 65 29.4 77C28.4 87 28.4 96 28.8 102.5H96.2C96.6 96 96.6 87 95.6 77C94 65 88 58.5 80 57C74 55.6 51 55.6 45 57Z';
  g += P(rock, C.blau);
  g += fein('M34 76C33.4 86 33.6 95 34 102M91 76C91.6 86 91.4 95 91 102', 0.3);
  // rote Weste mit Goldknöpfen
  g += P('M54 59H71L72.4 102.5H52.6Z', C.rot);
  for (const y of [66, 73, 80, 87, 94]) g += knopf(cx, y, 0.8);
  // Revers (Aufschläge), rot mit Goldkante
  const rl = 'M47 57.4C50 64 52.6 74 53 86L49 92C45.6 80 42.6 68 41.6 60.4Z';
  const rr = 'M78 57.4C75 64 72.4 74 72 86L76 92C79.4 80 82.4 68 83.4 60.4Z';
  g += P(rl, C.rot) + P(rr, C.rot);
  g += `<path d="M48.6 59.4C51 66 52.6 75 52.6 85M76.4 59.4C74 66 72.4 75 72.4 85" fill="none" stroke="${C.gold}" stroke-width="0.5"/>`;
  for (const y of [64, 71, 78])
    g += knopf(46 + (y - 64) * 0.18, y) + knopf(79 - (y - 64) * 0.18, y);
  // Stehkragen rot, Halsbinde weiß
  g += P('M51 52C55 55.4 70 55.4 74 52L76.4 57.6C70 60.6 55 60.6 48.6 57.6Z', C.rot);
  g += P('M56.6 53.2Q62.5 57 68.4 53.2L69 58Q62.5 61.6 56 58Z', C.weiss);
  g += P('M60.4 58.2L64.6 58.2L65.6 65L62.5 66.6L59.4 65Z', C.weiss, 'stroke-width="0.35"');
  // rechter Arm (vom Betrachter aus): angewinkelt, Hand am gezogenen Säbel
  g += saebel(88, 86);
  g += P(
    'M80 57.6C88 59 93.4 64 94 72C94.4 78 92 83 89.6 86.4L83.6 83.6C85.8 80 86.6 76 86 72C85.4 67 82.6 63 78 60.6Z',
    C.blau,
  );
  g += P('M83.2 82.4L90.4 85.6L89.4 88.6L82 85.4Z', C.rot, 'stroke-width="0.4"');
  g += P('M82.6 85.6C81.6 88.6 84 91.2 87.2 90.6C89.2 90 89.6 88 88.8 87.4Z', C.haut);
  // linker Arm erhoben mit Farbzeichen
  g += P('M45 57.6C38 59 33 64 32.4 70.6L38.6 72.6C39 67.6 41.6 63.6 46.6 61Z', C.blau);
  g += P('M32.4 70.6C31 64 31.2 58.6 33 53.6L38.4 54.4C37.2 59 37.4 65 38.6 70.4Z', C.blau);
  g += P(
    'M32.4 54.4Q35.4 52.6 38.8 54.6L38.4 51.8Q35.2 50.2 32.6 51.8Z',
    C.rot,
    'stroke-width="0.35"',
  );
  g += P('M32.8 51.8C31.6 49 33 46.4 35.4 46.2C38 46 39.4 48.4 38.6 51.4Z', C.haut);
  const pw = 16;
  g += zeichen(farbe, 35.6 - pw / 2, 47 - pipHoehe(farbe, pw), pw);
  // Kopf: glatt rasiert, dunkles Haar, Zweispitz
  g += gesicht(cx, 42.4, { bart: '', haar: '#3a2614' });
  g += zweispitz();
  return { g, defs: '' };
}

/** Kleiner Bacchus auf dem Fass mit erhobenem Glas (Daus des Salzburger Bilds). */
function bacchus(x, y) {
  let g = `<g transform="translate(${f(x)} ${f(y)})">`;
  // Fass, liegend
  g += P('M-14 -6C-15.6 -2 -15.6 6 -14 10H14C15.6 6 15.6 -2 14 -6Z', C.braun);
  g += P('M14 -6C16.6 -6 17.4 10 14 10C12 10 12 -6 14 -6Z', '#a0662a');
  g += `<ellipse cx="14.4" cy="2" rx="0.9" ry="1.4" fill="#1a1a1a"/>`;
  for (const xr of [-9, -3, 3, 9])
    g += P(
      `M${xr - 0.6} -6.4H${xr + 0.6}L${xr + 0.9} 10.4H${xr - 0.9}Z`,
      C.gelbD,
      'stroke-width="0.3"',
    );
  g += fein('M-14.6 -1H13M-14.6 5H13', 0.25);
  // Beine über dem Fass
  g += P('M-6 -6.6C-6.4 -2 -5 2 -2.6 3.4L-1 1.2C-2.4 -0.4 -2.6 -3 -2 -6.6Z', C.haut);
  g += P('M2 -6.6C4 -3 6.4 -1 9 -0.6L9.6 -3C7.6 -3.6 6 -5 5.4 -6.6Z', C.haut);
  // Körper mit Weinlaub um die Hüfte
  g += P(
    'M-6.6 -6.4C-7.6 -12 -6 -17.6 -1.6 -19C2.6 -19.6 5.8 -16 5.6 -11C5.4 -8.6 5.6 -7.4 6 -6.4Z',
    C.haut,
  );
  g += blatt([-6.6, -7], [-2, -5], 2, C.gruen) + blatt([5.6, -7], [1, -5.2], 2, C.gruen);
  g += fein('M-3 -14.6Q-1 -13.4 1.6 -14.6', 0.25);
  // erhobener Arm mit Glas
  g += P('M4.6 -16C7.6 -18 9.4 -21.6 9.6 -25.4L7.4 -25.8C7 -22.6 5.6 -20 3.4 -18.6Z', C.haut);
  g += P('M6.6 -26.6L6.2 -32.6H11.4L11 -26.6Z', '#fff4d0', 'stroke-width="0.35"');
  g += `<path d="M6.5 -30.2H11.1L10.9 -26.8H6.8Z" fill="${C.gelb}" opacity="0.85"/>`;
  // Kopf mit Weinkranz
  g += `<circle cx="-0.4" cy="-23.4" r="4.6" fill="${C.haut}" ${LINIE}/>`;
  g += `<circle cx="-2" cy="-23.8" r="0.45" fill="#1a1a1a"/><circle cx="1.2" cy="-23.8" r="0.45" fill="#1a1a1a"/>`;
  g += fein('M-1.6 -21.2Q-0.4 -20.4 0.8 -21.2', 0.25);
  for (const [bx, by] of [
    [-4.4, -26.2],
    [-1.6, -28.4],
    [1.6, -28.2],
    [3.8, -25.8],
  ]) {
    g += `<circle cx="${bx}" cy="${by}" r="1.5" fill="${C.gruen}" stroke="#1a1a1a" stroke-width="0.25"/>`;
  }
  g += `<circle cx="-3.6" cy="-27.4" r="0.7" fill="#6a2a7a"/><circle cx="2.8" cy="-27.6" r="0.7" fill="#6a2a7a"/>`;
  return g + '</g>';
}

export function sauSalzburg(farbe) {
  let g = '';
  // Zweig mit Laub, über Kreuz; an den Enden die zwei Farbzeichen der „Daus“
  const S = `fill="none" stroke="${C.gruenD}" stroke-width="0.8" stroke-linecap="round"`;
  g += `<path d="M62.5 74C59 64 52 58 48 54M62.5 74C66 64 73 58 77 54" ${S}/>`;
  for (const [p, q] of [
    [
      [56.4, 62],
      [50, 65.4],
    ],
    [
      [68.6, 62],
      [75, 65.4],
    ],
    [
      [59.4, 67.6],
      [55.6, 71.6],
    ],
    [
      [65.6, 67.6],
      [69.4, 71.6],
    ],
  ])
    g += blatt(p, q, 2.2, C.gruen);
  const w = 22;
  const h = pipHoehe(farbe, w);
  for (const [x, a] of [
    [46, -14],
    [79, 14],
  ]) {
    g += `<g transform="rotate(${a} ${x} 55)">${zeichen(farbe, x - w / 2, 56 - h, w)}</g>`;
  }
  // Bacchus auf dem Fass
  g += bacchus(62.5, 91);
  return { g, defs: '' };
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
const karten = {
  'herz-O': bildkarte({ text: 'O', farbe: 'herz', haelfte: oberSalzburg('herz').g }),
  'eichel-A': bildkarte({ text: 'A', farbe: 'eichel', haelfte: sauSalzburg('eichel').g }),
};
for (const [name, svg] of Object.entries(karten)) {
  fs.writeFileSync(path.join(ZIEL, `${name}.svg`), optimize(svg, SVGO).data);
}
console.log(`2 SVGs geschrieben nach ${path.relative(process.cwd(), ZIEL)}.`);
