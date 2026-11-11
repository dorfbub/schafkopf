// Rahmen, Eckzeichen und Farbzeichen-Vorlagen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { f, bereinigen } from './geo.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
export const VORLAGEN = path.join(HIER, 'vorlagen');
// Umrisse von Fraunces (SIL OFL 1.1), Gewicht 700, opsz 72 – ausgelesen aus @fontsource-variable/fraunces.
const GLYPHEN = JSON.parse(fs.readFileSync(path.join(HIER, 'glyphen.json'), 'utf8'));

// Lage des einzelnen oberen Bildchens im Siebener (mm, ausgemessen).
export const PIP_BOX = {
  herz: [54.0, 36.3, 17.2, 16.9],
  schellen: [53.1, 25.5, 17.3, 18.6],
  gras: [53.5, 35.0, 17.2, 19.2],
  eichel: [54.0, 34.0, 15.6, 23.3],
};

function gruppen(body) {
  const out = [];
  const re = /<(\/?)g\b[^>]*?(\/?)>/gs;
  let depth = 0,
    start = -1,
    m;
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

/** Das obere mittlere Bildchen des Siebeners als Symbol-Inhalt. */
export function pip(farbe) {
  const s = fs.readFileSync(path.join(VORLAGEN, `${farbe}-7.svg`), 'utf8');
  const i3 = s.indexOf('id="layer3"');
  const body = s.slice(s.indexOf('>', i3) + 1);
  const [bx] = PIP_BOX[farbe];
  let best = null,
    bestY = Infinity;
  for (const g of gruppen(body)) {
    const txt = body.slice(g.start, g.end);
    const t = /transform="matrix\(([^)]*)\)"/.exec(txt.slice(0, 400));
    const v = t ? t[1].split(/[ ,]+/).map(Number) : [1, 0, 0, 1, 0, 0];
    if (
      Math.hypot(v[0], v[1]) >= 0.2 &&
      v[0] > 0 &&
      v[1] === 0 &&
      Math.abs(v[4] - bx) < 3 &&
      v[5] < bestY
    ) {
      bestY = v[5];
      best = txt;
    }
  }
  return best.replace(/\s(id|inkscape:[a-z-]+|sodipodi:[a-z-]+)="[^"]*"/g, '');
}

export function pipSymbol(farbe, id = 'pip') {
  const [bx, by, bw, bh] = PIP_BOX[farbe];
  return `<symbol id="${id}" viewBox="${bx} ${by} ${bw} ${bh}">${pip(farbe)}</symbol>`;
}

/** Farbzeichen an (x, y) mit Breite w. */
export function zeichen(farbe, x, y, w, extra = '', id = 'pip') {
  const [, , bw, bh] = PIP_BOX[farbe];
  return `<use href="#${id}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f((w * bh) / bw)}" ${extra}/>`;
}
export const pipHoehe = (farbe, w) => (w * PIP_BOX[farbe][3]) / PIP_BOX[farbe][2];

/** Text als Pfad (Fraunces 700), Grundlinie bei y, zentriert um cx, Versalhöhe cap. */
export function schrift(text, cx, y, cap, { enger = 0.8 } = {}) {
  const s = cap / GLYPHEN.capHeight;
  const sx = text.length > 1 ? s * enger : s;
  const gl = [...text].map((c) => GLYPHEN.g[c]);
  const spur = text.length > 1 ? -60 : 0;
  const breite = gl.reduce((a, g) => a + g.adv + spur, -spur) * sx;
  let x = cx - breite / 2;
  let out = '';
  for (const g of gl) {
    out += `<path transform="translate(${f(x)} ${f(y)}) scale(${sx.toFixed(5)} ${s.toFixed(5)})" d="${g.d}"/>`;
    x += (g.adv + spur) * sx;
  }
  return out;
}

// Geometrie der Karte (wie Fabian Ballys Vorlagen)
export const KARTE = { x: 5, y: 5, w: 115, h: 195, r: 15.5 };
export const INNEN = { x: 12.16, y: 12.16, w: 100.67, h: 180.67, r: 15.6 };

// Eckzeichen: Kasten, der den Innenrahmen unterbricht
export const ECKE = { x: 5.8, y: 8.2, w: 21, h: 39.4, cap: 16, pipW: 17 };

export function eckzeichen(text, farbe) {
  const { x, y, w, h, cap, pipW } = ECKE;
  const cx = x + w / 2;
  let g = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="2" fill="#fff"/>`;
  g += `<g fill="#1a1a1a">${schrift(text, cx, y + 2 + cap, cap)}</g>`;
  // Farbzeichen wie auf den Zahlenkarten (Fabian Bally), so groß, wie der Kasten erlaubt
  const py = y + 2 + cap + 1.6;
  const maxH = y + h - 1 - py;
  const w2 = Math.min(pipW, (maxH * PIP_BOX[farbe][2]) / PIP_BOX[farbe][3]);
  g += zeichen(farbe, cx - w2 / 2, py, w2);
  return g;
}

/** Vier Eckzeichen: oben links/rechts aufrecht, unten gedreht. */
export function ecken(text, farbe) {
  const e = `<g id="ecke">${eckzeichen(text, farbe)}</g>`;
  const dx = 125 - 2 * ECKE.x - ECKE.w;
  return (
    e +
    `<use href="#ecke" x="${f(dx)}"/>` +
    `<use href="#ecke" transform="rotate(180 62.5 102.5)"/>` +
    `<use href="#ecke" x="${f(dx)}" transform="rotate(180 62.5 102.5)"/>`
  );
}

export function grund() {
  const { x, y, w, h, r } = KARTE;
  const i = INNEN;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff" stroke="#1a1a1a" stroke-width="0.1"/>` +
    `<rect x="${i.x}" y="${i.y}" width="${i.w}" height="${i.h}" rx="${i.r}" fill="none" stroke="#1a1a1a" stroke-width="0.33"/>`
  );
}

export const SCHRAFFUR = `<pattern id="schraffur" width="0.9" height="10" patternUnits="userSpaceOnUse"><path d="M0.2 0V10" stroke="#1a1a1a" stroke-width="0.24"/></pattern>`;

/** Ganze Karte: obere Hälfte gezeichnet, untere gedreht. */
export function bildkarte({ text, farbe, haelfte, defs = '', hintergrund = '' }) {
  const innen = `<clipPath id="innen"><rect x="${INNEN.x + 0.2}" y="${INNEN.y + 0.2}" width="${INNEN.w - 0.4}" height="${INNEN.h - 0.4}" rx="${INNEN.r}"/></clipPath>`;
  const karte = `<clipPath id="karte"><rect x="${KARTE.x}" y="${KARTE.y}" width="${KARTE.w}" height="${KARTE.h}" rx="${KARTE.r}"/></clipPath>`;
  const halb = `<clipPath id="halb"><rect x="0" y="0" width="125" height="102.5"/></clipPath>`;
  return bereinigen(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125 205" width="125mm" height="205mm">
<defs>${pipSymbol(farbe)}${SCHRAFFUR}${innen}${karte}${halb}${defs}</defs>
${grund()}
<g clip-path="url(#innen)">${hintergrund}<g id="haelfte"><g clip-path="url(#halb)">${haelfte}</g></g><use href="#haelfte" transform="rotate(180 62.5 102.5)"/></g>
<path d="M${INNEN.x} 102.5H${INNEN.x + INNEN.w}" stroke="#1a1a1a" stroke-width="0.3"/>
<g clip-path="url(#karte)">${ecken(text, farbe)}</g>
</svg>`);
}

/** Zahlenkarte: Bildchen aus Fabian Ballys Vorlage, Rahmen und Eckzeichen neu. */
export function zahlenkarte(farbe, rang) {
  const s = fs.readFileSync(path.join(VORLAGEN, `${farbe}-${rang}.svg`), 'utf8');
  const i3 = s.indexOf('id="layer3"');
  const body = s.slice(s.indexOf('>', i3) + 1);
  const ohneIds = (t) => t.replace(/\s(id|inkscape:[a-z-]+|sodipodi:[a-z-]+)="[^"]*"/g, '');
  let symbol = null;
  let bilder = '';
  for (const g of gruppen(body)) {
    const txt = ohneIds(body.slice(g.start, g.end));
    const kopf = /^<g\b[^>]*>/.exec(txt)[0];
    const t = /transform="matrix\(([^)]*)\)"/.exec(kopf);
    const v = t ? t[1].split(/[ ,]+/).map(Number) : [1, 0, 0, 1, 0, 0];
    if (Math.hypot(v[0], v[1]) < 0.2) continue; // alte kleine Eckzeichen
    const innen = txt.slice(kopf.length, txt.lastIndexOf('</g>'));
    symbol ??= innen;
    bilder +=
      innen === symbol
        ? `<use href="#bild" transform="matrix(${v.join(' ')})"/>`
        : `<g transform="matrix(${v.join(' ')})">${innen}</g>`;
  }
  const karte = `<clipPath id="karte"><rect x="${KARTE.x}" y="${KARTE.y}" width="${KARTE.w}" height="${KARTE.h}" rx="${KARTE.r}"/></clipPath>`;
  return bereinigen(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125 205" width="125mm" height="205mm">
<defs><g id="bild">${symbol}</g>${pipSymbol(farbe)}${karte}</defs>
${grund()}
<path d="M${INNEN.x} 102.5H${INNEN.x + INNEN.w}" stroke="#1a1a1a" stroke-width="0.3"/>
${bilder}
<g clip-path="url(#karte)">${ecken(rang, farbe)}</g>
</svg>`);
}

/** Einzelnes Farbzeichen als quadratisches SVG (für den Ansage-Dialog). */
export function farbzeichen(farbe) {
  const [bx, by, bw, bh] = PIP_BOX[farbe];
  const k = Math.max(bw, bh) * 1.04;
  const x = bx - (k - bw) / 2;
  const y = by - (k - bh) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x)} ${f(y)} ${f(k)} ${f(k)}">${pip(farbe)}</svg>`;
}
