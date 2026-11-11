// Kleine Geometrie-Helfer für die Kartenzeichnungen (Einheit: mm, viewBox 0 0 125 205).

export const f = (n) => (Math.round(n * 100) / 100).toString();

export const LINIE =
  'stroke="#1a1a1a" stroke-width="0.45" stroke-linejoin="round" stroke-linecap="round"';
export const FEIN = 'fill="none" stroke="#1a1a1a" stroke-width="0.28" stroke-linecap="round"';

/** Punkt auf quadratischer Bézierkurve. */
export function quad(p0, c, p1, t) {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
    u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
  ];
}

export function cubic(p0, c0, c1, p1, t) {
  const u = 1 - t;
  const a = u * u * u,
    b = 3 * u * u * t,
    c = 3 * u * t * t,
    d = t * t * t;
  return [
    a * p0[0] + b * c0[0] + c * c1[0] + d * p1[0],
    a * p0[1] + b * c0[1] + c * c1[1] + d * p1[1],
  ];
}

/** Glatter geschlossener Pfad durch Punkte (Catmull-Rom → kubisch). */
export function glatt(pts, zu = true) {
  const n = pts.length;
  const p = (i) => (zu ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = zu ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = p(i - 1),
      p1 = p(i),
      p2 = p(i + 1),
      p3 = p(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return zu ? d + 'Z' : d;
}

/** Feder: Kiel als quadratische Kurve, Breite w; mit Fahnenstrichen. */
export function feder(p0, c, p1, w, fill, { striche = 14 } = {}) {
  const N = 26;
  const links = [],
    rechts = [],
    kiel = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = quad(p0, c, p1, t);
    const q = quad(p0, c, p1, Math.min(1, t + 0.01));
    const r = quad(p0, c, p1, Math.max(0, t - 0.01));
    let dx = q[0] - r[0],
      dy = q[1] - r[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const b = w * Math.pow(Math.sin(Math.PI * Math.min(t * 1.15, 1)), 0.6) * (0.35 + 0.65 * t);
    links.push([p[0] - dy * b, p[1] + dx * b]);
    rechts.push([p[0] + dy * b * 0.7, p[1] - dx * b * 0.7]);
    kiel.push(p);
  }
  const umriss = glatt([...links, ...rechts.reverse()]);
  let g = `<path d="${umriss}" fill="${fill}" ${LINIE}/>`;
  let s = '';
  for (let i = 2; i < striche + 2; i++) {
    const t = i / (striche + 3);
    const k = kiel[Math.round(t * N)];
    const a = links[Math.round(Math.min(1, t + 0.06) * N)];
    const b = rechts[N - Math.round(Math.min(1, t + 0.05) * N)];
    s += `M${f(k[0])} ${f(k[1])}L${f(k[0] + (a[0] - k[0]) * 0.85)} ${f(k[1] + (a[1] - k[1]) * 0.85)}`;
    if (b)
      s += `M${f(k[0])} ${f(k[1])}L${f(k[0] + (b[0] - k[0]) * 0.8)} ${f(k[1] + (b[1] - k[1]) * 0.8)}`;
  }
  g += `<path d="${s}" ${FEIN} stroke-width="0.2"/>`;
  g += `<path d="M${f(p0[0])} ${f(p0[1])}Q${f(c[0])} ${f(c[1])} ${f(p1[0])} ${f(p1[1])}" ${FEIN}/>`;
  return g;
}

/** Halskrause: Bogenkante um eine Ellipse. */
export function krause(cx, cy, rx, ry, n, fill = '#fff') {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const b = pts[(i + 1) % n];
    const m = ((i + 0.5) / n) * Math.PI * 2;
    const o = [cx + Math.cos(m) * rx * 1.12, cy + Math.sin(m) * ry * 1.25];
    d += `Q${f(o[0])} ${f(o[1])} ${f(b[0])} ${f(b[1])}`;
  }
  let g = `<path d="${d}Z" fill="${fill}" ${LINIE}/>`;
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    s += `M${f(cx + (a[0] - cx) * 0.55)} ${f(cy + (a[1] - cy) * 0.55)}L${f(a[0])} ${f(a[1])}`;
  }
  g += `<path d="${s}" ${FEIN}/>`;
  return g;
}

/** Spirale (Ranke) ab Mittelpunkt, a = Startradius, Windungen, Richtung. */
export function spirale(cx, cy, r0, r1, start, win, dir = 1) {
  const N = Math.ceil(win * 24);
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = start + dir * t * win * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return glatt(pts, false);
}

/** Blatt (spitzoval) von p nach q, Breite w. */
export function blatt(p, q, w, fill) {
  const mx = (p[0] + q[0]) / 2,
    my = (p[1] + q[1]) / 2;
  const dx = q[0] - p[0],
    dy = q[1] - p[1];
  const l = Math.hypot(dx, dy);
  const nx = (-dy / l) * w,
    ny = (dx / l) * w;
  return `<path d="M${f(p[0])} ${f(p[1])}Q${f(mx + nx)} ${f(my + ny)} ${f(q[0])} ${f(q[1])}Q${f(mx - nx)} ${f(my - ny)} ${f(p[0])} ${f(p[1])}Z" fill="${fill}" ${LINIE} stroke-width="0.3"/><path d="M${f(p[0])} ${f(p[1])}L${f(mx + dx * 0.3)} ${f(my + dy * 0.3)}" ${FEIN} stroke-width="0.2"/>`;
}

/** Punkte entlang einer Polylinie mit Abstand step. */
export function entlang(pts, step) {
  const out = [];
  let rest = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i],
      [x1, y1] = pts[i + 1];
    const l = Math.hypot(x1 - x0, y1 - y0);
    let d = rest;
    while (d <= l) {
      out.push([x0 + ((x1 - x0) * d) / l, y0 + ((y1 - y0) * d) / l]);
      d += step;
    }
    rest = d - l;
  }
  return out;
}

export function abtasten(fn, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(fn(i / n));
  return pts;
}

/** Doppelte Attribute in Tags entfernen; das letzte gewinnt. */
export function bereinigen(svg) {
  return svg.replace(/<([a-zA-Z]+)((?:\s+[a-zA-Z:-]+="[^"]*")+)\s*(\/?)>/g, (m, tag, attrs, zu) => {
    const map = new Map();
    for (const a of attrs.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
      map.delete(a[1]);
      map.set(a[1], a[2]);
    }
    return `<${tag}${[...map].map(([k, v]) => ` ${k}="${v}"`).join('')}${zu ? '/' : ''}>`;
  });
}
