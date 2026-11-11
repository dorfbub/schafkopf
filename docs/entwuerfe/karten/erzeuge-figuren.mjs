// Erzeugt die Bildkarten (Unter, Ober, König, Sau) als SVG im Stil der Zahlenkarten.
//
// Vorlage ist jeweils der Siebener derselben Farbe: Rahmen, Eckzeichen und Mittellinie
// werden übernommen, die großen Bildchen entfernt und durch eine Figur ersetzt.
// Die Figuren sind doppelbildig wie im Tarock-Schafkopf-Blatt: obere Hälfte gezeichnet,
// untere Hälfte um 180° gedreht. Beim Ober sitzt das Farbzeichen oben, beim Unter
// unten an der Mittellinie – daran erkennt man sie wie im echten Blatt.
//
// Aufruf: node docs/entwuerfe/karten/erzeuge-figuren.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FARBEN = ['eichel', 'gras', 'herz', 'schellen'];

// Lage des einzelnen oberen Bildchens im Siebener (mm, ausgemessen).
const PIP_BOX = {
  herz: [54.0, 36.3, 17.2, 16.9],
  schellen: [53.1, 25.5, 17.3, 18.6],
  gras: [53.5, 35.0, 17.2, 19.2],
  eichel: [54.0, 34.0, 15.6, 23.3],
};

// Kleidung je Farbe: [Rock, Besatz, Hut/Mütze]
const KLEID = {
  eichel: ['#008000', '#ffd400', '#d40000'],
  gras: ['#1f4fd1', '#d40000', '#008000'],
  herz: ['#d40000', '#ffd400', '#1f4fd1'],
  schellen: ['#ffd400', '#008000', '#d40000'],
};

const HAUT = '#f6cfa6';
const S = 'stroke="#000" stroke-width="0.35" stroke-linejoin="round"';

/** Top-Level-Gruppen eines Abschnitts (einfacher Tiefenzähler). */
function gruppen(body) {
  const out = [];
  const re = /<(\/?)g\b[^>]*?(\/?)>/gs;
  let depth = 0;
  let start = -1;
  let m;
  while ((m = re.exec(body))) {
    if (m[1] === '/') {
      depth--;
      if (depth === 0) out.push({ start, end: re.lastIndex });
      if (depth < 0) break;
    } else if (!m[2]) {
      if (depth === 0) start = m.index;
      depth++;
    }
  }
  return out;
}

function vorlage(farbe) {
  const s = fs.readFileSync(path.join(DIR, `${farbe}-7.svg`), 'utf8');
  const i3 = s.indexOf('id="layer3"');
  const bodyStart = s.indexOf('>', i3) + 1;
  const body = s.slice(bodyStart);
  const gs = gruppen(body);
  let pip = null;
  let behalten = '';
  let pos = 0;
  let bestY = Infinity;
  const [bx] = PIP_BOX[farbe];
  for (const g of gs) {
    const txt = body.slice(g.start, g.end);
    const t = /transform="matrix\(([^)]*)\)"/.exec(txt.slice(0, 400));
    const v = t ? t[1].split(/[ ,]+/).map(Number) : [1, 0, 0, 1, 0, 0];
    behalten += body.slice(pos, g.start);
    pos = g.end;
    if (Math.hypot(v[0], v[1]) >= 0.2) {
      // großes Bildchen: entfernen, das obere mittlere merken
      if (v[0] > 0 && v[1] === 0 && Math.abs(v[4] - bx) < 3 && v[5] < bestY) {
        bestY = v[5];
        pip = txt;
      }
    } else {
      behalten += txt; // Eckzeichen bleiben
    }
  }
  const ende = gs.length ? body.slice(pos) : body;
  const ohneBilder = s.slice(0, bodyStart) + behalten + ende;
  return { svg: ohneBilder, pip };
}

/** Farbzeichen an Stelle (x, y) mit Breite w (Höhe folgt dem Seitenverhältnis). */
const zeichen = (farbe, x, y, w, extra = '') => {
  const [, , bw, bh] = PIP_BOX[farbe];
  const h = (w * bh) / bw;
  return `<use href="#pip" x="${x}" y="${y}" width="${w}" height="${h.toFixed(2)}" ${extra}/>`;
};

/** Schraffur auf der rechten Hälfte einer Form, wie bei den Zahlenkarten. */
const schraffiert = (d) =>
  `<path d="${d}" fill="url(#schraffur)" clip-path="url(#rechts)" stroke="none"/>`;

function kopf({ bart, schnurrbart = true, y = 40 }) {
  let k = `<ellipse cx="62.5" cy="${y}" rx="8" ry="9.5" fill="${HAUT}" ${S}/>`;
  k += `<circle cx="59.3" cy="${y - 1.5}" r="0.8"/><circle cx="65.7" cy="${y - 1.5}" r="0.8"/>`;
  k += `<path d="M62.5 ${y - 1} l-1.2 4 h2" fill="none" ${S}/>`;
  if (bart === 'voll') {
    k += `<path d="M54.6 ${y + 1} q0 11 7.9 13 q7.9 -2 7.9 -13 q-2 4 -7.9 4.5 q-5.9 -0.5 -7.9 -4.5z" fill="#f2f2f2" ${S}/>`;
  } else if (bart === 'spitz') {
    k += `<path d="M58 ${y + 6} q4.5 3 9 0 l-4.5 6z" fill="#7a4a1c" ${S}/>`;
  }
  if (schnurrbart)
    k += `<path d="M58.5 ${y + 4.6} q4 -2.4 8 0 q-4 1.2 -8 0z" fill="#5a3412" ${S}/>`;
  return k;
}

function rumpf(rock, besatz) {
  const d = 'M37 102.5 L40 60 Q50 54 62.5 54 Q75 54 85 60 L88 102.5 Z';
  let r = `<path d="${d}" fill="${rock}" ${S}/>` + schraffiert(d);
  r += `<path d="M58 55 L57 102.5 H68 L67 55 Z" fill="${besatz}" ${S}/>`;
  for (const y of [66, 76, 86, 96])
    r += `<circle cx="62.5" cy="${y}" r="1.1" fill="#ffd400" ${S}/>`;
  return r;
}

function ober(farbe) {
  const [rock, besatz, hut] = KLEID[farbe];
  let g = '';
  // Schwert rechts
  g += `<path d="M93 20 L95 23 L84 96 L82 95.5 Z" fill="#e8e8e8" ${S}/><path d="M86 86 h10" stroke="#000" stroke-width="2.2" stroke-linecap="round"/><path d="M86 86 h10" stroke="#ffd400" stroke-width="1.3" stroke-linecap="round"/>`;
  g += rumpf(rock, besatz);
  // Halskrause
  g += `<ellipse cx="62.5" cy="53" rx="13" ry="3.6" fill="#fff" ${S}/>`;
  g += kopf({ bart: 'spitz' });
  // hoher Hut mit Feder
  const hutD = 'M52 31 Q51 16 62.5 15 Q74 16 73 31 Z';
  g += `<path d="M73 18 Q86 6 96 9 Q86 12 75 22 Z" fill="#fff" ${S}/>`;
  g += `<path d="${hutD}" fill="${hut}" ${S}/>` + schraffiert(hutD);
  g += `<ellipse cx="62.5" cy="31" rx="15" ry="3.2" fill="#222" ${S}/>`;
  // erhobener Arm links, Farbzeichen oben
  g += `<path d="M41 62 Q32 52 30 40 L36 38 Q38 50 46 58 Z" fill="${besatz}" ${S}/>`;
  g += `<circle cx="32.5" cy="37.5" r="3" fill="${HAUT}" ${S}/>`;
  g += zeichen(farbe, 22, 14, 20);
  // rechte Hand am Schwert
  g += `<circle cx="85" cy="82" r="3" fill="${HAUT}" ${S}/>`;
  return g;
}

function unter(farbe) {
  const [rock, besatz, hut] = KLEID[farbe];
  let g = '';
  // Hellebarde links
  g += `<path d="M31 102 L33.5 102 L35 18 L32.5 18 Z" fill="#a0662a" ${S}/>`;
  g += `<path d="M33.8 14 L38 22 L44 20 Q42 28 35 28 L32 28 Q26 26 27 20 L31 22 Z" fill="#e8e8e8" ${S}/>`;
  // Rock in getauschten Farben, damit sich Unter und Ober unterscheiden
  g += rumpf(besatz, rock);
  g += `<path d="M38.3 82 L86.7 82 L87 87 L38 87 Z" fill="#5a3412" ${S}/>`;
  g += `<ellipse cx="62.5" cy="54" rx="10" ry="2.6" fill="#fff" ${S}/>`;
  g += kopf({ bart: null });
  // flache Mütze (Barett) mit kleiner Feder
  const mD = 'M49 30 Q50 22 62.5 21.5 Q75 22 76 30 Q62.5 33 49 30 Z';
  g += `<path d="M72 24 Q80 17 86 18 Q80 21 74 27 Z" fill="#fff" ${S}/>`;
  g += `<path d="${mD}" fill="${hut}" ${S}/>` + schraffiert(mD);
  // Arm links zur Hellebarde
  g += `<path d="M41 64 Q36 66 34.5 60 L38 56 Z" fill="${rock}" ${S}/><circle cx="34.2" cy="58.5" r="2.6" fill="${HAUT}" ${S}/>`;
  // Arm rechts hängt, Farbzeichen unten an der Mittellinie
  g += `<path d="M84 60 Q92 72 88 86 L83 85 Q86 74 80 64 Z" fill="${rock}" ${S}/>`;
  g += `<circle cx="86" cy="86" r="3" fill="${HAUT}" ${S}/>`;
  g += zeichen(farbe, 80, 80, 18);
  return g;
}

function koenig(farbe) {
  const [rock, besatz] = KLEID[farbe];
  let g = '';
  // Zepter links
  g += `<path d="M30 100 L32.4 100 L35 26 L32.6 26 Z" fill="#ffd400" ${S}/><circle cx="33.8" cy="23.5" r="3.4" fill="#ffd400" ${S}/><path d="M33.8 18 v3 M32.3 19.5 h3" stroke="#000" stroke-width="0.5"/>`;
  // Mantel mit Hermelin
  const mD = 'M34 102.5 L38 62 Q50 55 62.5 55 Q75 55 87 62 L91 102.5 Z';
  g += `<path d="${mD}" fill="${rock}" ${S}/>` + schraffiert(mD);
  g += `<path d="M56 56 L54 102.5 H71 L69 56 Z" fill="${besatz}" ${S}/>`;
  g += `<path d="M42 58 Q62.5 50 83 58 Q80 66 62.5 64 Q45 66 42 58 Z" fill="#fff" ${S}/>`;
  for (const [x, y] of [
    [48, 60],
    [55, 61],
    [62.5, 61.5],
    [70, 61],
    [77, 60],
  ])
    g += `<path d="M${x} ${y} l0.6 1.6 l-1.2 0z"/>`;
  g += kopf({ bart: 'voll', schnurrbart: false, y: 39 });
  // Krone
  const kD = 'M53 31 L52 20 L56.5 25 L59.5 17 L62.5 24 L65.5 17 L68.5 25 L73 20 L72 31 Z';
  g += `<path d="${kD}" fill="#ffd400" ${S}/>` + schraffiert(kD);
  for (const x of [56.5, 62.5, 68.5])
    g += `<circle cx="${x}" cy="28.5" r="1" fill="#d40000" ${S}/>`;
  // Hand am Zepter, Farbzeichen oben rechts
  g += `<circle cx="33.5" cy="70" r="3" fill="${HAUT}" ${S}/>`;
  g += zeichen(farbe, 84, 16, 17);
  return g;
}

function sau(farbe) {
  // großes Farbzeichen je Hälfte, umrahmt von einem Kranz
  let g = '';
  g += `<path d="M30 92 Q22 60 40 34 M95 92 Q103 60 85 34" fill="none" stroke="#008000" stroke-width="1.6"/>`;
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const yL = 90 - t * 52;
    const xL = 29 + Math.sin(t * Math.PI) * -3 + t * 10;
    g += `<ellipse cx="${xL.toFixed(1)}" cy="${yL.toFixed(1)}" rx="1.6" ry="3.4" fill="#008000" transform="rotate(-30 ${xL.toFixed(1)} ${yL.toFixed(1)})" ${S}/>`;
    const xR = 125 - xL;
    g += `<ellipse cx="${xR.toFixed(1)}" cy="${yL.toFixed(1)}" rx="1.6" ry="3.4" fill="#008000" transform="rotate(30 ${xR.toFixed(1)} ${yL.toFixed(1)})" ${S}/>`;
  }
  const w = 46;
  const [, , bw, bh] = PIP_BOX[farbe];
  const h = (w * bh) / bw;
  g += zeichen(farbe, 62.5 - w / 2, Math.max(16, 58 - h / 2), w);
  return g;
}

const FIGUR = { U: unter, O: ober, K: koenig, A: sau };
const BUCHSTABE = { U: 'U', O: 'O', K: 'K', A: 'A' };

for (const farbe of FARBEN) {
  const { svg, pip } = vorlage(farbe);
  if (!pip) throw new Error(`kein Bildchen gefunden: ${farbe}`);
  const [bx, by, bw, bh] = PIP_BOX[farbe];
  for (const rang of Object.keys(FIGUR)) {
    const defs =
      `<defs><symbol id="pip" viewBox="${bx} ${by} ${bw} ${bh}">${pip}</symbol>` +
      `<pattern id="schraffur" width="0.9" height="10" patternUnits="userSpaceOnUse"><path d="M0.2 0 V10" stroke="#000" stroke-width="0.22"/></pattern>` +
      `<clipPath id="rechts"><rect x="62.5" y="0" width="70" height="205"/></clipPath></defs>`;
    const haelfte = `<g id="haelfte">${FIGUR[rang](farbe)}</g>`;
    const figur = `<g id="figur" clip-path="url(#innen)">${haelfte}<use href="#haelfte" transform="rotate(180 62.5 102.5)"/></g>`;
    let out = svg.replace(/>7<\/tspan>/g, `>${BUCHSTABE[rang]}</tspan>`);
    // Figur unter die Eckzeichen legen: direkt vor Ebene 2 einfügen
    const i2 = out.lastIndexOf('<g', out.indexOf('id="layer2"'));
    const innen = `<clipPath id="innen"><rect x="17" y="12" width="91" height="181"/></clipPath>`;
    out = out.slice(0, i2) + defs.replace('</defs>', innen + '</defs>') + figur + out.slice(i2);
    fs.writeFileSync(path.join(DIR, `${farbe}-${rang}.svg`), out);
  }
}
console.log('16 Bildkarten geschrieben.');
