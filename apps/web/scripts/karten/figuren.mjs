// Figuren der Bildkarten. Jede Funktion liefert die obere Hälfte (y ≤ 102,5) als
// { g, defs }; die untere Hälfte entsteht durch Drehung (doppelbildig).
import { f, LINIE, FEIN, glatt, feder, krause, spirale, blatt } from './geo.mjs';
import { zeichen, pipHoehe } from './rahmen.mjs';

export const C = {
  rot: '#c8202f',
  rotD: '#8e1622',
  gelb: '#f2c230',
  gelbD: '#c48d14',
  gruen: '#2e7d32',
  gruenD: '#1b5220',
  blau: '#2456a6',
  blauD: '#163a72',
  haut: '#f7d5b5',
  wange: '#eaa08a',
  haar: '#6b3d1a',
  haarH: '#9a6230',
  weiss: '#ffffff',
  schwarz: '#1a1a1a',
  braun: '#7a4a1c',
  silber: '#e3e6e8',
  gold: '#e8b830',
  pelz: '#8a5a2b',
  pelzD: '#4e3015',
};

const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${LINIE} ${extra}/>`;
const fein = (d, w = 0.28) => `<path d="${d}" ${FEIN} stroke-width="${w}"/>`;
const schatten = (d, clip) =>
  `<path d="${d}" fill="url(#schraffur)" clip-path="url(#${clip})" stroke="none"/>`;
const clip = (id, d) => `<clipPath id="${id}"><path d="${d}"/></clipPath>`;

/** Gesicht von vorn. Mittelpunkt (cx, cy). */
export function gesicht(cx, cy, { bart = 'spitz', haar = C.haar, alt = false } = {}) {
  let g = '';
  // Haar hinter dem Kopf (Locken bis zum Kinn)
  const hl = glatt([
    [cx - 7.6, cy - 4],
    [cx - 9.6, cy + 2],
    [cx - 9.2, cy + 7],
    [cx - 10.4, cy + 10.5],
    [cx - 7.4, cy + 11.5],
    [cx - 6.2, cy + 6],
    [cx - 6.4, cy - 1],
  ]);
  const hr = hl.replace(
    /(-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/g,
    (m, x, _a, y) => `${f(2 * cx - Number(x))} ${y}`,
  );
  g += P(hl, haar) + P(hr, haar);
  g += fein(
    `M${f(cx - 8.6)} ${f(cy + 1)}q-0.8 3 0.2 6M${f(cx + 8.6)} ${f(cy + 1)}q0.8 3 -0.2 6`,
    0.22,
  );
  // Gesicht
  const face = glatt([
    [cx, cy - 8.8],
    [cx + 6.4, cy - 6],
    [cx + 7.2, cy + 0.5],
    [cx + 5.6, cy + 6.4],
    [cx, cy + 9],
    [cx - 5.6, cy + 6.4],
    [cx - 7.2, cy + 0.5],
    [cx - 6.4, cy - 6],
  ]);
  g += P(face, C.haut);
  // Wangen
  g += `<ellipse cx="${f(cx - 4)}" cy="${f(cy + 3)}" rx="1.6" ry="1" fill="${C.wange}" opacity="0.55"/>`;
  g += `<ellipse cx="${f(cx + 4)}" cy="${f(cy + 3)}" rx="1.6" ry="1" fill="${C.wange}" opacity="0.55"/>`;
  // Augen
  for (const s of [-1, 1]) {
    const ex = cx + s * 2.9,
      ey = cy - 0.6;
    g += `<path d="M${f(ex - 1.7)} ${f(ey)}Q${f(ex)} ${f(ey - 1.25)} ${f(ex + 1.7)} ${f(ey)}Q${f(ex)} ${f(ey + 0.9)} ${f(ex - 1.7)} ${f(ey)}Z" fill="#fff" stroke="#1a1a1a" stroke-width="0.25"/>`;
    g += `<circle cx="${f(ex + s * 0.15)}" cy="${f(ey - 0.05)}" r="0.55" fill="#2a2a2a"/>`;
    g += fein(
      `M${f(ex - 2)} ${f(ey - 2.1)}Q${f(ex)} ${f(ey - 3.1)} ${f(ex + 2)} ${f(ey - 2)}`,
      0.42,
    );
    if (alt) g += fein(`M${f(ex - 1.4)} ${f(ey + 1.4)}q1.4 0.7 2.8 0`, 0.18);
  }
  // Nase
  g += fein(
    `M${f(cx - 0.3)} ${f(cy - 1.2)}Q${f(cx - 1.3)} ${f(cy + 2.4)} ${f(cx - 1)} ${f(cy + 3.1)}Q${f(cx)} ${f(cy + 3.7)} ${f(cx + 1.1)} ${f(cy + 3)}`,
    0.3,
  );
  // Mund
  g += fein(
    `M${f(cx - 1.6)} ${f(cy + 5.6)}Q${f(cx)} ${f(cy + 6.3)} ${f(cx + 1.6)} ${f(cy + 5.6)}`,
    0.3,
  );
  // Bart
  if (bart === 'spitz') {
    g += P(
      `M${f(cx - 3.2)} ${f(cy + 6.4)}Q${f(cx)} ${f(cy + 8)} ${f(cx + 3.2)} ${f(cy + 6.4)}Q${f(cx + 2.4)} ${f(cy + 11)} ${f(cx)} ${f(cy + 14)}Q${f(cx - 2.4)} ${f(cy + 11)} ${f(cx - 3.2)} ${f(cy + 6.4)}Z`,
      haar,
    );
    g += fein(
      `M${f(cx)} ${f(cy + 8)}V${f(cy + 13)}M${f(cx - 1.2)} ${f(cy + 8)}Q${f(cx - 1)} ${f(cy + 11)} ${f(cx - 0.3)} ${f(cy + 13)}M${f(cx + 1.2)} ${f(cy + 8)}Q${f(cx + 1)} ${f(cy + 11)} ${f(cx + 0.3)} ${f(cy + 13)}`,
      0.18,
    );
  } else if (bart === 'voll') {
    const b = glatt([
      [cx - 6.6, cy + 2],
      [cx - 3, cy + 6.5],
      [cx, cy + 7.4],
      [cx + 3, cy + 6.5],
      [cx + 6.6, cy + 2],
      [cx + 7, cy + 8],
      [cx + 4.6, cy + 14],
      [cx + 1.6, cy + 17],
      [cx, cy + 18.4],
      [cx - 1.6, cy + 17],
      [cx - 4.6, cy + 14],
      [cx - 7, cy + 8],
    ]);
    g += P(b, haar);
    let s = '';
    for (let i = -4; i <= 4; i++)
      s += `M${f(cx + i * 1.3)} ${f(cy + 8)}q${f(i * 0.2)} 4 ${f(i * 0.1)} ${f(8 - Math.abs(i) * 0.9)}`;
    g += fein(s, 0.18);
    g += fein(
      `M${f(cx - 1.6)} ${f(cy + 5.6)}Q${f(cx)} ${f(cy + 6.3)} ${f(cx + 1.6)} ${f(cy + 5.6)}`,
      0.3,
    );
  }
  // Schnurrbart, an den Enden gezwirbelt
  if (bart) {
    g += P(
      `M${f(cx)} ${f(cy + 4.3)}Q${f(cx - 2.6)} ${f(cy + 3.6)} ${f(cx - 4.6)} ${f(cy + 5)}Q${f(cx - 6.2)} ${f(cy + 4.6)} ${f(cx - 6)} ${f(cy + 3.2)}Q${f(cx - 5.4)} ${f(cy + 5.6)} ${f(cx - 3)} ${f(cy + 5.4)}Q${f(cx - 1.2)} ${f(cy + 5.3)} ${f(cx)} ${f(cy + 4.9)}Q${f(cx + 1.2)} ${f(cy + 5.3)} ${f(cx + 3)} ${f(cy + 5.4)}Q${f(cx + 5.4)} ${f(cy + 5.6)} ${f(cx + 6)} ${f(cy + 3.2)}Q${f(cx + 6.2)} ${f(cy + 4.6)} ${f(cx + 4.6)} ${f(cy + 5)}Q${f(cx + 2.6)} ${f(cy + 3.6)} ${f(cx)} ${f(cy + 4.3)}Z`,
      haar,
      'stroke-width="0.3"',
    );
  }
  return g;
}

/** Puffärmel: ein Ärmel mit n Wülsten entlang p0→p1, Breite w; Schlitze zeigen Farbe b. */
export function puffe(p0, p1, w, a, b, n = 3) {
  const dx = p1[0] - p0[0],
    dy = p1[1] - p0[1];
  const l = Math.hypot(dx, dy);
  const ux = dx / l,
    uy = dy / l,
    nx = -uy,
    ny = ux;
  const pt = (t, s) => [p0[0] + dx * t + nx * s, p0[1] + dy * t + ny * s];
  const L = [],
    R = [];
  const M = n * 6;
  for (let i = 0; i <= M; i++) {
    const t = i / M;
    const seg = (t * n) % 1;
    const half = (w / 2) * (1 - t * 0.18) * (0.78 + 0.22 * Math.sin(Math.PI * seg));
    L.push(pt(t, half));
    R.push(pt(t, -half));
  }
  const umriss = glatt([pt(-0.04, 0), ...L, pt(1.04, 0), ...R.reverse()]);
  let g = `<path d="${umriss}" fill="${a}" ${LINIE}/>`;
  for (let k = 0; k < n; k++) {
    const tm = (k + 0.5) / n;
    const half = (w / 2) * (1 - tm * 0.18);
    // Schlitze
    for (const s of [-0.45, 0, 0.45]) {
      const q0 = pt(tm - 0.32 / n, s * half * 1.2),
        q1 = pt(tm + 0.32 / n, s * half * 1.2);
      const m = [(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2];
      const bw = 0.95;
      g += `<path d="M${f(q0[0])} ${f(q0[1])}Q${f(m[0] + nx * bw)} ${f(m[1] + ny * bw)} ${f(q1[0])} ${f(q1[1])}Q${f(m[0] - nx * bw)} ${f(m[1] - ny * bw)} ${f(q0[0])} ${f(q0[1])}Z" fill="${b}" stroke="#1a1a1a" stroke-width="0.22"/>`;
    }
    if (k > 0) {
      const t = k / n;
      const hb = (w / 2) * (1 - t * 0.18) * 0.8;
      const q0 = pt(t, hb),
        q1 = pt(t, -hb),
        m = pt(t + 0.05 / n, 0);
      g += `<path d="M${f(q0[0])} ${f(q0[1])}Q${f(m[0] + ux * 1.4)} ${f(m[1] + uy * 1.4)} ${f(q1[0])} ${f(q1[1])}" fill="none" stroke="#1a1a1a" stroke-width="0.4"/>`;
    }
  }
  return g;
}

/** Schlitz (Linse) senkrecht von y0 bis y1 bei x. */
const schlitz = (x, y0, y1, w, fill) =>
  `<path d="M${f(x)} ${f(y0)}Q${f(x + w)} ${f((y0 + y1) / 2)} ${f(x)} ${f(y1)}Q${f(x - w)} ${f((y0 + y1) / 2)} ${f(x)} ${f(y0)}Z" fill="${fill}" stroke="#1a1a1a" stroke-width="0.25"/>` +
  fein(`M${f(x)} ${f(y0 + 1)}V${f(y1 - 1)}`, 0.18);

/** Zierband: Zickzack oder Punkte entlang einer Linie. */
function zickzack(x0, x1, y, h, step = 1.6) {
  let d = `M${f(x0)} ${f(y)}`;
  let up = true;
  for (let x = x0 + step / 2; x <= x1; x += step / 2) {
    d += `L${f(x)} ${f(up ? y - h : y)}`;
    up = !up;
  }
  return fein(d, 0.25);
}

function schwertGriff(x, y, s = 1) {
  // Katzbalger: S-förmige Parierstange, Griff, Knauf; Scheide nach unten
  let g = '';
  g += P(
    `M${f(x + 1.4 * s)} ${f(y + 2)}L${f(x + 12 * s)} ${f(y + 18)}L${f(x + 9 * s)} ${f(y + 19.6)}L${f(x - 1.2 * s)} ${f(y + 3.6)}Z`,
    C.schwarz,
  );
  g += fein(
    `M${f(x + 3 * s)} ${f(y + 6)}l${f(1 * s)} 1.4M${f(x + 5 * s)} ${f(y + 9)}l${f(1 * s)} 1.4`,
    0.3,
  ).replace('#1a1a1a', C.gold);
  g += P(
    `M${f(x - 4 * s)} ${f(y + 3.4)}Q${f(x - 5 * s)} ${f(y)} ${f(x - 2.4 * s)} ${f(y - 0.2)}Q${f(x)} ${f(y + 1.6)} ${f(x + 2.4 * s)} ${f(y + 0.4)}Q${f(x + 5.2 * s)} ${f(y - 0.8)} ${f(x + 4.6 * s)} ${f(y + 2.6)}`,
    'none',
    'stroke-width="1.1"',
  );
  g += P(
    `M${f(x - 4 * s)} ${f(y + 3.4)}Q${f(x - 5 * s)} ${f(y)} ${f(x - 2.4 * s)} ${f(y - 0.2)}Q${f(x)} ${f(y + 1.6)} ${f(x + 2.4 * s)} ${f(y + 0.4)}Q${f(x + 5.2 * s)} ${f(y - 0.8)} ${f(x + 4.6 * s)} ${f(y + 2.6)}`,
    'none',
    `stroke="${C.gold}" stroke-width="0.55"`,
  ).replace('stroke="#1a1a1a" ', '');
  return g;
}

// Bildkarten nach Lukas' Wahl (U2, Haltepunkt a): Ober = Edelmann in der Schaube mit
// Barett, Federn und Katzbalger; Unter = Landsknecht mit Hellebarde; König im Hermelin
// mit Krone und Zepter; Sau = großes Farbzeichen mit Ranken und Schriftband.
// Gezeichnet nach den Motiven des traditionellen bayerischen Bilds, nicht nach einer Vorlage.

/** Barett mit Federn; dy verschiebt senkrecht. federn: Farben (1–3). */
export function barett(hut, federn, dy = 0, defsSammler) {
  let g = '';
  const T = (s) => (dy ? `<g transform="translate(0 ${dy})">${s}</g>` : s);
  const lagen = [
    [[72.5, 27.5], [80, 14], [95, 12.5], 3.6],
    [[71.5, 28.5], [84, 19], [97.5, 24], 3.2],
    [[71, 27], [74, 15], [86.5, 9.8], 3],
  ];
  federn.forEach((farbe, i) => {
    const [a, c, b, w] = lagen[i];
    g += feder(a, c, b, w, farbe);
  });
  const krone = glatt([
    [50, 31.6],
    [49.6, 27],
    [53, 23],
    [58.5, 21.4],
    [62.5, 21.8],
    [67, 21.2],
    [72.4, 23],
    [76, 27],
    [75.4, 31.6],
  ]);
  g += P(krone, hut);
  let puffen = '';
  for (const x of [55, 59.5, 64.5, 69.5])
    puffen += `M${f(x)} 31.4Q${f(x - 0.6)} 26 ${f(x + 0.6)} 22.3`;
  g += fein(puffen, 0.3);
  defsSammler.push(clip('kH', krone));
  g += schatten('M68 18H80V33H68Z', 'kH');
  const krempe =
    'M45 32.8C45.2 29.6 53 28.6 62.5 28.8C72 28.6 80 29.6 80.2 32.8C80 35.4 72 35.6 62.5 35C53 35.6 45 35.4 45 32.8Z';
  g += P(krempe, hut);
  g += fein('M47.6 32.6C54 31.2 71 31.2 77.6 32.6', 0.25);
  g += zickzack(49, 76, 33.9, 0.8, 1.8).replace('#1a1a1a', C.gold);
  g += `<circle cx="71.6" cy="28.6" r="1.7" fill="${C.gold}" ${LINIE} stroke-width="0.3"/><circle cx="71.6" cy="28.6" r="0.7" fill="${C.rot}"/>`;
  return T(g);
}

const brokat = (id, grund, muster = C.gold) =>
  `<pattern id="${id}" width="4.4" height="5.2" patternUnits="userSpaceOnUse"><rect width="4.4" height="5.2" fill="${grund}"/><path d="M2.2 0.4L4 2.6L2.2 4.8L0.4 2.6Z" fill="none" stroke="${muster}" stroke-width="0.35"/><circle cx="2.2" cy="2.6" r="0.5" fill="${muster}"/></pattern>`;

const KLEID_OBER = {
  herz: { schaube: C.gruen, wams: C.rot, hut: C.rot, federn: ['#fff', C.blau, C.gelb] },
  eichel: {
    schaube: C.rot,
    wams: C.gelb,
    hut: C.gruen,
    federn: ['#fff', C.rot, C.gelb],
    muster: C.rotD,
  },
  gras: { schaube: C.blau, wams: C.gruen, hut: C.rot, federn: ['#fff', C.gelb, C.gruen] },
  schellen: {
    schaube: C.gelb,
    wams: C.blau,
    hut: C.gruen,
    federn: ['#fff', C.rot, C.blau],
    pelz: C.braun,
  },
};

export function ober(farbe) {
  const k = KLEID_OBER[farbe];
  const defs = [brokat('brokat', k.wams, k.muster)];
  let g = '';
  const cx = 62.5;
  const sd =
    'M46 58C38 59 31 66 29 78C28 88 28 96 28.4 102.5H96.6C97 96 97 88 96 78C94 66 87 59 79 58C74 56.5 51 56.5 46 58Z';
  g += P(sd, k.schaube);
  defs.push(clip('kS', sd));
  g += schatten('M80 55H100V103H80Z', 'kS');
  g += fein(
    'M34 74C33 84 33 94 33.4 102M38 70C37 82 37.6 94 38.2 102M88 72C89.4 84 89.6 94 89.4 102M92 76C93 86 93 94 92.8 102',
    0.3,
  );
  g += P('M52 60H73L75 102.5H50Z', 'url(#brokat)');
  g += P('M50.6 92H74.4L74.8 96.4H50.2Z', C.braun, 'stroke-width="0.35"');
  const pl = 'M46.5 57.5C40 59 34.6 63 33 70C35 80 42 92 50.6 102.5H54C51 90 50.4 76 53.4 60Z';
  const pr = 'M78.5 57.5C85 59 90.4 63 92 70C90 80 83 92 74.4 102.5H71C74 90 74.6 76 71.6 60Z';
  const pelz = k.pelz ?? C.pelz;
  g += P(pl, pelz) + P(pr, pelz);
  let haare = '';
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const xl = 36 + t * 15 + Math.sin(t * 9) * 1.5,
      yl = 64 + t * 36;
    haare += `M${f(xl)} ${f(yl)}l-0.8 1.6M${f(xl + 3)} ${f(yl - 2)}l-0.6 1.6M${f(125 - xl)} ${f(yl)}l0.8 1.6M${f(122 - xl)} ${f(yl - 2)}l0.6 1.6`;
  }
  g += `<path d="${haare}" fill="none" stroke="${C.pelzD}" stroke-width="0.35" stroke-linecap="round"/>`;
  for (const [y, w] of [
    [66, 15],
    [74, 17.5],
  ]) {
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      g += `<ellipse cx="${f(cx - w + 2 * w * t)}" cy="${f(y + Math.sin(Math.PI * t) * 7)}" rx="0.9" ry="0.65" fill="${C.gold}" stroke="#1a1a1a" stroke-width="0.18"/>`;
    }
  }
  g += `<circle cx="${cx}" cy="85.5" r="3.2" fill="${C.gold}" ${LINIE} stroke-width="0.35"/><circle cx="${cx}" cy="85.5" r="1.6" fill="${C.rot}" ${LINIE} stroke-width="0.25"/>`;
  // Schwert an der rechten Hüfte, Hand am Griff
  g += schwertGriff(86, 84, 1);
  g += puffe(
    [79, 59],
    [91, 71],
    13,
    k.schaube,
    C.weiss === k.schaube ? C.rot : k.schaube === C.gelb ? C.rot : C.gelb,
    2,
  );
  g += P('M89 70C91.4 75 89.6 80 86.4 83.4L83 81.4C85.4 78.4 86 75.4 84.8 72Z', k.wams);
  g += P('M82.6 82.4Q85.4 81 87.6 83L87 84.6Q84.6 83.4 82.6 84.2Z', '#fff', 'stroke-width="0.3"');
  g += P('M82.8 84C82.4 86.8 85.8 88 87.8 86.2C88.4 85.2 87.8 84.2 86.8 84Z', C.haut);
  // linker Arm erhoben mit Farbzeichen
  g += puffe([46, 59], [34, 71], 13, k.schaube, k.schaube === C.gelb ? C.rot : C.gelb, 2);
  g += P('M36 70.6C32.6 66 31.8 60 33 55L37.8 55.4C37 60 37.8 65 40.4 69Z', k.wams);
  g += P('M32 55.6Q35.2 54 38.8 55.8L38.2 53.8Q35 52.4 32.4 53.8Z', '#fff', 'stroke-width="0.3"');
  g += P('M32.6 53.6C31.4 51 32.8 48.4 35.2 48.2C37.8 48 39.2 50.4 38.4 53.2Z', C.haut);
  const pw = 17;
  g += zeichen(farbe, 36.6 - pw / 2, 49.2 - pipHoehe(farbe, pw), pw);
  g += P('M55 53.6Q62.5 58.6 70 53.6L71 57Q62.5 61.4 54 57Z', '#fff');
  g += fein('M57 55.4l-0.4 2.6M60 56.4l-0.2 2.6M65 56.4l0.2 2.6M68 55.4l0.4 2.6', 0.2);
  g += gesicht(cx, 42.2, { bart: 'voll', haar: C.haarH });
  g += barett(k.hut, k.federn, 0, defs);
  return { g, defs: defs.join('') };
}

const KLEID_UNTER = {
  herz: { wams: C.rot, wamsD: C.rotD, futter: C.gelb, umhang: C.blau, hut: C.gruen, feder: '#fff' },
  eichel: {
    wams: C.gruen,
    wamsD: C.gruenD,
    futter: C.gelb,
    umhang: C.rot,
    hut: C.schwarz,
    feder: C.gelb,
  },
  gras: {
    wams: C.blau,
    wamsD: C.blauD,
    futter: C.gelb,
    umhang: C.rot,
    hut: C.gruen,
    feder: '#fff',
  },
  schellen: {
    wams: C.gelb,
    wamsD: C.gelbD,
    futter: C.rot,
    umhang: C.gruen,
    hut: C.blau,
    feder: C.rot,
  },
};

function hellebarde(x, yTop) {
  let g = '';
  g += P(
    `M${f(x - 0.9)} 102.5V${f(yTop + 14)}H${f(x + 0.9)}V102.5Z`,
    C.braun,
    'stroke-width="0.35"',
  );
  // Spitze, Beil und Haken
  g += P(
    `M${f(x)} ${f(yTop)}L${f(x + 1.6)} ${f(yTop + 9)}L${f(x + 1)} ${f(yTop + 15)}H${f(x - 1)}L${f(x - 1.6)} ${f(yTop + 9)}Z`,
    C.silber,
  );
  g += P(
    `M${f(x + 1)} ${f(yTop + 9.4)}C${f(x + 5)} ${f(yTop + 8)} ${f(x + 8.6)} ${f(yTop + 9.6)} ${f(x + 9.4)} ${f(yTop + 11.6)}C${f(x + 9.8)} ${f(yTop + 14.6)} ${f(x + 9)} ${f(yTop + 18)} ${f(x + 7.6)} ${f(yTop + 20.6)}C${f(x + 5.4)} ${f(yTop + 17.8)} ${f(x + 3)} ${f(yTop + 16.6)} ${f(x + 1)} ${f(yTop + 16.6)}Z`,
    C.silber,
  );
  g += P(
    `M${f(x - 1)} ${f(yTop + 11)}L${f(x - 6.4)} ${f(yTop + 9.4)}L${f(x - 1)} ${f(yTop + 15)}Z`,
    C.silber,
  );
  g += fein(
    `M${f(x + 2.2)} ${f(yTop + 11.6)}C${f(x + 5)} ${f(yTop + 11)} ${f(x + 7.2)} ${f(yTop + 12)} ${f(x + 7.8)} ${f(yTop + 14)}`,
    0.25,
  );
  // Quaste
  g += P(
    `M${f(x - 1)} ${f(yTop + 18.4)}H${f(x + 1)}L${f(x + 2.4)} ${f(yTop + 23)}H${f(x - 2.4)}Z`,
    C.rot,
    'stroke-width="0.3"',
  );
  return g;
}

export function unter(farbe) {
  const k = KLEID_UNTER[farbe];
  const defs = [];
  let g = '';
  const cx = 62.5;
  // kurzer Umhang hinter dem Rücken
  const um = 'M47 57C40 58 35 64 33.6 74C33 82 33.4 90 34.4 96H45L45 70Z';
  g += P(um, k.umhang);
  g += fein('M40 62C37.6 72 37.4 82 38.2 92M43.6 63C42.4 74 42.4 84 43 94');
  g += hellebarde(34.6, 14.5);
  // Wams
  const wd = 'M45 59.5C51 56 74 56 80 59.5L82 89H43Z';
  g += P(wd, k.wams);
  defs.push(clip('kW', wd));
  g += schatten('M71 55H90V92H71Z', 'kW');
  for (const x of [49, 54.2, 70.8, 76]) {
    g += schlitz(x, 62, 72.5, 1.7, k.futter);
    g += schlitz(x + (x < cx ? 0.3 : -0.3), 75, 85.5, 1.7, k.futter);
  }
  g += P('M60.4 57V89H64.6V57Z', k.wamsD);
  for (const y of [61, 66, 71, 76, 81, 86])
    g += `<circle cx="${cx}" cy="${y}" r="1" fill="${C.gold}" ${LINIE} stroke-width="0.25"/>`;
  // Kragen in Umhangfarbe mit Goldsaum
  g += P(
    'M45.4 59.4C51 56.4 74 56.4 79.6 59.4C78 64 72 66.6 62.5 66.6C53 66.6 47 64 45.4 59.4Z',
    k.umhang,
  );
  g += fein('M46.6 60.6C52 64.6 73 64.6 78.4 60.6', 0.5).replace('#1a1a1a', C.gold);
  g += P('M42.8 87.4H82.2L82.5 92H42.5Z', C.braun);
  g += P('M59.6 86.6H65.4V92.8H59.6Z', C.gold);
  g += `<rect x="61" y="88" width="3" height="3.4" fill="${C.braun}" ${LINIE} stroke-width="0.25"/>`;
  // Schoß in Falten
  g += P('M42.5 92H82.5L86 102.5H39Z', k.futter);
  let falten = '';
  for (let i = 1; i < 8; i++) falten += `M${f(42.5 + 5 * i)} 92L${f(39 + (47 * i) / 8)} 102.5`;
  g += fein(falten, 0.3);
  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8;
    g += P(
      `M${f(42.5 + 40 * t - 0.9)} 93L${f(39 + 47 * t - 1.1)} 102.5H${f(39 + 47 * t + 1.1)}L${f(42.5 + 40 * t + 0.9)} 93Z`,
      k.wams,
      'stroke-width="0.2"',
    );
  }
  // linker Arm (Betrachter links) zur Hellebarde
  g += puffe([45.5, 60.5], [38.5, 73], 10.5, k.futter, k.wams, 3);
  g += P('M38.6 72.4C37.4 75 37.2 77.4 37.6 79.6L41.6 79.2C41.2 77 41.6 75.4 42.6 73.6Z', k.wams);
  g += P('M36.4 79.4C35.4 81.6 36.4 84 38.6 84C40.6 84 41.6 82 41.4 80.2Z', C.haut);
  // rechter Arm hängt, hält das Farbzeichen unten
  g += puffe([80, 60], [86.5, 74], 10.5, k.futter, k.wams, 3);
  g += P('M84.6 73.6C86.6 76 87.2 79 86.8 81.4L83 81.4C83.2 79.4 82.8 77.4 81.6 75.6Z', k.wams);
  g += P('M82.4 81.2Q84.8 80.2 87.4 81.4L87 83Q84.6 82.2 82.6 82.8Z', '#fff', 'stroke-width="0.3"');
  g += P('M82.8 82.8C82 85.4 84 87 86.2 86.4C87.8 85.8 88.2 84 87.4 82.8Z', C.haut);
  const pw = 16;
  g += zeichen(farbe, 85.2 - pw / 2, 85.6, pw);
  g += krause(cx, 55, 11, 3.2, 20);
  g += gesicht(cx, 43, { bart: 'schnurr' });
  // flaches Barett mit einer Feder
  g += feder([71, 30], [80, 20], [92, 19], 3, k.feder);
  const hd =
    'M47 33.6C47 30.4 53 27 62.5 27C72 27 78 30.4 78 33.6C78 35.6 72 36.4 62.5 36C53 36.4 47 35.6 47 33.6Z';
  g += P(hd, k.hut);
  g += fein('M49.6 33.4C55 32 70 32 75.4 33.4', 0.25);
  g += zickzack(51, 74, 34.8, 0.7, 1.7).replace('#1a1a1a', C.gold);
  defs.push(clip('kH', hd));
  g += schatten('M68 25H80V37H68Z', 'kH');
  return { g, defs: defs.join('') };
}

const KLEID_KOENIG = {
  herz: { mantel: C.rot, tunika: C.gelb, muster: C.rotD },
  eichel: { mantel: C.gruen, tunika: C.rot },
  gras: { mantel: C.blau, tunika: C.gelb, muster: C.blauD },
  schellen: { mantel: C.rot, tunika: C.gruen },
};

export function koenig(farbe) {
  const k = KLEID_KOENIG[farbe];
  const defs = [brokat('brokat', k.tunika, k.muster)];
  let g = '';
  const cx = 62.5;
  // Zepter (Betrachter links)
  g += P('M34.4 102.5L35.4 30H37.6L38.6 102.5Z', C.gold, 'stroke-width="0.35"');
  for (const y of [44, 60, 76, 92])
    g += P(`M34.6 ${y}H38.4V${y + 1.6}H34.6Z`, C.gold, 'stroke-width="0.3"');
  g += `<circle cx="36.5" cy="27" r="3.4" fill="${C.gold}" ${LINIE}/>`;
  g += P('M36.5 15.6C38.6 18 38.6 20.4 36.5 23.4C34.4 20.4 34.4 18 36.5 15.6Z', C.gold);
  g += P('M36.5 23.4C38.4 20.6 41.4 20 42.6 21.4C41.6 23.6 39 24.4 36.5 23.4Z', C.gold);
  g += P('M36.5 23.4C34.6 20.6 31.6 20 30.4 21.4C31.4 23.6 34 24.4 36.5 23.4Z', C.gold);
  g += `<circle cx="36.5" cy="27" r="1.2" fill="${C.rot}"/>`;
  // Mantel
  const md =
    'M46 58C38 59 31 66 29 78C28 88 28 96 28.4 102.5H96.6C97 96 97 88 96 78C94 66 87 59 79 58C74 56.5 51 56.5 46 58Z';
  g += P(md, k.mantel);
  defs.push(clip('kM', md));
  g += schatten('M80 55H100V103H80Z', 'kM');
  g += fein(
    'M33 80C32.4 88 32.6 96 33 102M39 78C38.4 88 38.6 96 39.2 102M86 78C86.6 88 86.6 96 86.2 102M92 80C92.6 88 92.4 96 92 102',
    0.3,
  );
  // Tunika mit Brokat und Gürtel
  g += P('M51 62H74L77 102.5H48Z', 'url(#brokat)');
  g += P('M49.4 90H75.6L76 94.6H49Z', C.gold, 'stroke-width="0.35"');
  for (const x of [53, 58, 62.5, 67, 72])
    g += `<circle cx="${x}" cy="92.3" r="0.8" fill="${C.rot}" stroke="#1a1a1a" stroke-width="0.15"/>`;
  // Saum des Mantels mit Goldborte
  g += fein('M48 102.5L51 62M77 102.5L74 62', 0.9).replace('#1a1a1a', C.gold);
  // Hermelin-Pelerine über den Schultern
  const her =
    'M46.4 57.4C38.6 59 33 64.6 32 72C40 78 52 80 62.5 80C73 80 85 78 93 72C92 64.6 86.4 59 78.6 57.4C72 55.6 53 55.6 46.4 57.4Z';
  g += P(her, '#fff');
  for (const [x, y] of [
    [38, 68],
    [44, 73],
    [50, 64],
    [56, 75],
    [62.5, 68],
    [69, 75],
    [75, 64],
    [81, 73],
    [87, 68],
    [44, 62],
    [81, 62],
    [62.5, 77],
  ])
    g += `<path d="M${f(x)} ${f(y - 1.6)}l0.8 2.4l-0.8 -0.6l-0.8 0.6Z" fill="#1a1a1a"/>`;
  g += fein('M34 72C42 77 52 78.4 62.5 78.4C73 78.4 83 77 91 72', 0.25);
  // Kette mit Anhänger
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    g += `<ellipse cx="${f(cx - 12 + 24 * t)}" cy="${f(62 + Math.sin(Math.PI * t) * 10)}" rx="0.9" ry="0.65" fill="${C.gold}" stroke="#1a1a1a" stroke-width="0.18"/>`;
  }
  g += P(`M${cx} 71L${cx + 2.6} 74.6L${cx} 78.2L${cx - 2.6} 74.6Z`, C.gold, 'stroke-width="0.35"');
  // linke Hand am Zepter
  g += P('M33 76C31.6 72 32.6 68 35 66L39.4 68C38 70 37.6 72.6 38.6 75Z', k.mantel);
  g += P('M33.6 74.6C32.4 77.4 34 80 36.6 79.8C39 79.6 40 77.4 39.4 75.2Z', C.haut);
  // rechter Arm erhoben, Farbzeichen oben rechts
  g += P('M88.4 70C92 66 92.8 60 91.6 54.4L86.8 54.6C87.4 59.6 86.4 63.4 84 67Z', k.mantel);
  g += P('M86 55.4Q89.2 53.8 92.4 55.6L92 53.6Q89 52.2 86.4 53.6Z', '#fff', 'stroke-width="0.3"');
  g += P('M86.6 53.6C85.4 51 86.8 48.4 89.2 48.2C91.8 48 93.2 50.4 92.4 53.2Z', C.haut);
  const pw = 16;
  g += zeichen(farbe, 89.4 - pw / 2, 49.2 - pipHoehe(farbe, pw), pw);
  g += gesicht(cx, 42, { bart: 'voll', haar: '#e9e6df', alt: true });
  // Krone mit Samtmütze
  g += P('M51.4 31C51 25 54 19.4 62.5 18.8C71 19.4 74 25 73.6 31Z', C.rot);
  g += fein('M57 30C56.6 25 58.6 21 62.5 20M68 30C68.4 25 66.4 21 62.5 20', 0.3);
  const kd =
    'M50.6 34.6L49.4 22.4L54 27.6L57 19L60 26.4L62.5 16.8L65 26.4L68 19L71 27.6L75.6 22.4L74.4 34.6Z';
  g += P(kd, C.gold);
  defs.push(clip('kK', kd));
  g += schatten('M66 15H77V35H66Z', 'kK');
  g += P('M50.4 31.4H74.6L74.4 34.8H50.6Z', C.gold);
  for (const [x, c] of [
    [54, C.rot],
    [58.2, C.blau],
    [62.5, C.rot],
    [66.8, C.blau],
    [71, C.rot],
  ])
    g += `<circle cx="${x}" cy="33.1" r="0.8" fill="${c}" stroke="#1a1a1a" stroke-width="0.15"/>`;
  for (const [x, y] of [
    [49.4, 22.4],
    [57, 19],
    [62.5, 16.8],
    [68, 19],
    [75.6, 22.4],
  ])
    g += `<circle cx="${x}" cy="${y - 0.8}" r="1" fill="${C.gold}" ${LINIE} stroke-width="0.25"/>`;
  return { g, defs: defs.join('') };
}

function sauRanken() {
  let g = '';
  const S = `fill="none" stroke="${C.gruenD}" stroke-width="0.7" stroke-linecap="round"`;
  for (const d of [1, -1]) {
    const X = (x) => 62.5 + d * (x - 62.5);
    g += `<path d="M${X(62.5)} 99C${X(50)} 99 ${X(36)} 94 ${X(32)} 82C${X(29)} 72 ${X(31)} 60 ${X(38)} 50C${X(42)} 44 ${X(44)} 38 ${X(42)} 32" ${S}/>`;
    g += `<path d="${spirale(X(38.6), 30.6, 0.5, 3.6, d === 1 ? 0.2 : Math.PI - 0.2, 1.3, -d)}" ${S}/>`;
    g += `<path d="${spirale(X(37.8), 92.4, 0.5, 3.2, d === 1 ? -1.6 : Math.PI + 1.6, 1.2, d)}" ${S}/>`;
    for (const [p, q] of [
      [
        [X(32.4), 86],
        [X(26.6), 90],
      ],
      [
        [X(30.6), 74],
        [X(24.4), 75],
      ],
      [
        [X(31.6), 64],
        [X(26), 60.6],
      ],
      [
        [X(35.4), 55],
        [X(31.4), 49.6],
      ],
      [
        [X(31.2), 78],
        [X(36.4), 73.4],
      ],
      [
        [X(33), 66],
        [X(38.4), 63.2],
      ],
      [
        [X(46), 98],
        [X(43), 93.6],
      ],
    ])
      g += blatt(p, q, 1.6, C.gruen);
    // kleine Blüten
    for (const [x, y] of [
      [X(27.6), 68],
      [X(37), 46.6],
      [X(52), 97],
    ]) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g += `<circle cx="${f(x + Math.cos(a) * 1.1)}" cy="${f(y + Math.sin(a) * 1.1)}" r="0.9" fill="${C.rot}" stroke="#1a1a1a" stroke-width="0.18"/>`;
      }
      g += `<circle cx="${f(x)}" cy="${f(y)}" r="0.6" fill="${C.gold}"/>`;
    }
  }
  return g;
}

function sauBand(y) {
  // Schriftband (leer) über dem Zeichen
  let g = '';
  g += P(`M40 ${y}L44 ${y - 2}L44 ${y + 4}L40 ${y + 6}L42 ${y + 2}Z`, C.rotD, 'stroke-width="0.3"');
  g += P(`M85 ${y}L81 ${y - 2}L81 ${y + 4}L85 ${y + 6}L83 ${y + 2}Z`, C.rotD, 'stroke-width="0.3"');
  g += P(
    `M44 ${y - 2}Q62.5 ${y - 5} 81 ${y - 2}V${y + 4}Q62.5 ${y + 1} 44 ${y + 4}Z`,
    C.rot,
    'stroke-width="0.35"',
  );
  g += fein(`M46 ${y + 0.6}Q62.5 ${y - 2.2} 79 ${y + 0.6}`, 0.5).replace('#1a1a1a', C.gold);
  return g;
}

function sau(xs, y, s = 1) {
  // kleine Sau im Profil, nach rechts blickend
  const T = `transform="translate(${xs} ${y}) scale(${s})"`;
  let g = `<g ${T}>`;
  g += P(
    'M0 0C0 -5 4 -7.6 9 -7.6C13 -7.6 15.6 -6.4 17.6 -4.4L20.6 -4.6C21.6 -4 21.6 -2.4 20.8 -1.6L18.6 -0.8C18 1.8 16 3.4 14 3.8L14 7.4H12.2L11.4 4.2C9 4.4 6.6 4.4 4.6 4L4 7.4H2.2L2 3C0.6 2.2 0 1.2 0 0Z',
    '#f2b8b0',
  );
  g += P(
    'M15.4 -7C16.4 -9.2 18 -9.6 18.6 -8.8C18.6 -7.4 17.6 -6.4 16.6 -6Z',
    '#f2b8b0',
    'stroke-width="0.3"',
  );
  g += fein('M0 -1.4C-1.6 -2 -2 -3.6 -1 -4.2C-0.2 -3.4 -1.2 -2.6 -2.2 -2.4', 0.35);
  g += `<circle cx="17.4" cy="-4" r="0.5" fill="#1a1a1a"/>`;
  g += fein('M20.2 -3.4v1.4', 0.3);
  g += fein('M6 -6.4C8 -5 11 -5 13 -6.4', 0.22);
  return g + '</g>';
}

export function sauKarte(farbe) {
  let g = sauRanken();
  g += sauBand(22);
  const w = farbe === 'eichel' ? 36 : 44;
  const h = pipHoehe(farbe, w);
  const y = Math.max(30, 64 - h / 2);
  g += zeichen(farbe, 62.5 - w / 2, y, w);
  if (farbe === 'schellen') g += sau(66, 97.4, 0.9);
  return { g, defs: '' };
}
