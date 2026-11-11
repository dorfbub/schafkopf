// Vorschläge für den Kartenrücken (bayerisches Motiv).
import { f, spirale, blatt, bereinigen } from './geo.mjs';
import { KARTE } from './rahmen.mjs';

const K = KARTE;
const BLAU = '#1f5fa8',
  HELL = '#ffffff',
  GOLD = '#d9a93a',
  NACHT = '#14305a';
const karte = (inhalt, defs = '') =>
  bereinigen(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125 205" width="125mm" height="205mm">
<defs><clipPath id="karte"><rect x="${K.x}" y="${K.y}" width="${K.w}" height="${K.h}" rx="${K.r}"/></clipPath>${defs}</defs>
<g clip-path="url(#karte)">${inhalt}</g>
<rect x="${K.x}" y="${K.y}" width="${K.w}" height="${K.h}" rx="${K.r}" fill="none" stroke="#1a1a1a" stroke-width="0.1"/>
</svg>`);

/** Rautenmuster (Wecken) in einem Rechteck. */
const rautenMuster = (id, w, h, a, b) =>
  `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse" patternTransform="translate(62.5 102.5)"><rect width="${w}" height="${h}" fill="${b}"/><path d="M${w / 2} 0L${w} ${h / 2}L${w / 2} ${h}L0 ${h / 2}Z" fill="${a}"/></pattern>`;

const innen = (rand, r) => ({
  x: K.x + rand,
  y: K.y + rand,
  w: K.w - 2 * rand,
  h: K.h - 2 * rand,
  r,
});

function rautenschild(cx, cy, w) {
  const h = w * 1.22;
  const d = `M${f(cx - w / 2)} ${f(cy - h / 2)}H${f(cx + w / 2)}V${f(cy + h * 0.1)}C${f(cx + w / 2)} ${f(cy + h * 0.38)} ${f(cx + w * 0.18)} ${f(cy + h * 0.46)} ${f(cx)} ${f(cy + h / 2)}C${f(cx - w * 0.18)} ${f(cy + h * 0.46)} ${f(cx - w / 2)} ${f(cy + h * 0.38)} ${f(cx - w / 2)} ${f(cy + h * 0.1)}Z`;
  return `<clipPath id="schild"><path d="${d}"/></clipPath><rect x="${f(cx - w / 2)}" y="${f(cy - h / 2)}" width="${f(w)}" height="${f(h)}" fill="url(#rautenK)" clip-path="url(#schild)"/><path d="${d}" fill="none" stroke="${GOLD}" stroke-width="1"/><path d="${d}" fill="none" stroke="#1a1a1a" stroke-width="0.25"/>`;
}

function ranke(cx, cy, s, farbe) {
  // symmetrische Ranken links und rechts eines Mittelpunkts
  let g = '';
  const S = `fill="none" stroke="${farbe}" stroke-width="${f(0.7 * s)}" stroke-linecap="round"`;
  for (const d of [1, -1]) {
    const X = (x) => cx + d * x * s;
    g += `<path d="M${f(X(0))} ${f(cy)}C${f(X(6))} ${f(cy - 6 * s)} ${f(X(14))} ${f(cy - 4 * s)} ${f(X(16))} ${f(cy + 2 * s)}" ${S}/>`;
    g += `<path d="${spirale(X(13), cy + 4 * s, 0.4 * s, 3 * s, d === 1 ? -0.6 : Math.PI + 0.6, 1.1, d)}" ${S}/>`;
    g += `<path d="M${f(X(0))} ${f(cy)}C${f(X(6))} ${f(cy + 6 * s)} ${f(X(12))} ${f(cy + 8 * s)} ${f(X(19))} ${f(cy + 5 * s)}" ${S}/>`;
    g += blatt([X(7), cy - 3.6 * s], [X(10), cy - 8 * s], 1.4 * s, farbe);
    g += blatt([X(9), cy + 6.4 * s], [X(13), cy + 10 * s], 1.4 * s, farbe);
  }
  return g;
}

/**
 * Kartenrücken (U2, Lukas' Wahl): Rautenfeld in goldener Rankenbordüre auf Nachtblau,
 * in der Mitte der Rautenschild im Ranken-Oval.
 */
export function ruecken() {
  const i = innen(4.5, 11);
  const f2 = innen(14, 6);
  const defs =
    rautenMuster('rauten', 7, 10.5, BLAU, HELL) + rautenMuster('rautenK', 4.2, 6.3, BLAU, HELL);
  let g = `<rect x="0" y="0" width="125" height="205" fill="${HELL}"/>`;
  g += `<rect x="${i.x}" y="${i.y}" width="${i.w}" height="${i.h}" rx="${i.r}" fill="${NACHT}"/>`;
  const S = `fill="none" stroke="${GOLD}" stroke-width="0.6" stroke-linecap="round"`;
  const seiten = [
    [i.x + 4.8, i.y + 14, i.y + i.h - 14, 'v'],
    [i.x + i.w - 4.8, i.y + 14, i.y + i.h - 14, 'v'],
    [i.y + 4.8, i.x + 14, i.x + i.w - 14, 'h'],
    [i.y + i.h - 4.8, i.x + 14, i.x + i.w - 14, 'h'],
  ];
  for (const [fest, a, b, o] of seiten) {
    const n = Math.round((b - a) / 9);
    const st = (b - a) / n;
    const P = (lauf, quer) => (o === 'v' ? [quer, lauf] : [lauf, quer]);
    let d = `M${P(a, fest).map(f).join(' ')}`;
    for (let k = 0; k < n; k++) {
      const s = k % 2 ? 2.4 : -2.4;
      d += `Q${P(a + st * (k + 0.5), fest + s)
        .map(f)
        .join(' ')} ${P(a + st * (k + 1), fest)
        .map(f)
        .join(' ')}`;
      const m = P(a + st * (k + 0.5), fest + s * 0.5);
      const q = P(a + st * (k + 0.5) - 2.6, fest + s * 0.5 - s * 0.9);
      g += blatt(m, q, 0.9, GOLD);
    }
    g += `<path d="${d}" ${S}/>`;
  }
  for (const [x, y] of [
    [i.x + 6.5, i.y + 6.5],
    [i.x + i.w - 6.5, i.y + 6.5],
    [i.x + 6.5, i.y + i.h - 6.5],
    [i.x + i.w - 6.5, i.y + i.h - 6.5],
  ])
    g += `<circle cx="${f(x)}" cy="${f(y)}" r="2.2" fill="${GOLD}"/><circle cx="${f(x)}" cy="${f(y)}" r="0.9" fill="${NACHT}"/>`;
  g += `<rect x="${f2.x}" y="${f2.y}" width="${f2.w}" height="${f2.h}" rx="${f2.r}" fill="url(#rauten)" stroke="${GOLD}" stroke-width="1"/>`;
  g += `<rect x="${f2.x}" y="${f2.y}" width="${f2.w}" height="${f2.h}" rx="${f2.r}" fill="none" stroke="#1a1a1a" stroke-width="0.25"/>`;
  // Emblem
  g += `<ellipse cx="62.5" cy="102.5" rx="31" ry="42" fill="${NACHT}" stroke="${GOLD}" stroke-width="1.2"/>`;
  g += `<ellipse cx="62.5" cy="102.5" rx="31" ry="42" fill="none" stroke="#1a1a1a" stroke-width="0.25"/>`;
  g += `<ellipse cx="62.5" cy="102.5" rx="28.6" ry="39.6" fill="none" stroke="${GOLD}" stroke-width="0.35"/>`;
  g += ranke(62.5, 76, 1, GOLD);
  g += `<g transform="rotate(180 62.5 102.5)">${ranke(62.5, 76, 1, GOLD)}</g>`;
  g += rautenschild(62.5, 102.5, 24);
  return karte(g, defs);
}
