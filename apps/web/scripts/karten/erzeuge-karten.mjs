// Erzeugt das bayerische Blatt für die App: 32 Karten, den Rücken und die vier Farbzeichen
// (für den Ansage-Dialog) als SVG nach
// apps/web/src/assets/karten/. Zahlenkarten: Bildchen von Fabian Bally (CC0, vorlagen/);
// Bildkarten, Rahmen, Eckzeichen und Rücken: hier gezeichnet. Danach mit SVGO verkleinert.
//
// Aufruf: node apps/web/scripts/karten/erzeuge-karten.mjs

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';
import { bildkarte, farbzeichen, zahlenkarte } from './rahmen.mjs';
import { ober, unter, koenig, sauKarte } from './figuren.mjs';
import { ruecken } from './ruecken.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.resolve(HIER, '../../src/assets/karten');
const FARBEN = ['eichel', 'gras', 'herz', 'schellen'];
const BILD = { U: unter, O: ober, K: koenig, A: sauKarte };

const SVGO = {
  multipass: true,
  floatPrecision: 2,
  plugins: [
    {
      name: 'preset-default',
      params: { overrides: { cleanupIds: { minify: true } } },
    },
    'removeDimensions',
  ],
};

fs.mkdirSync(ZIEL, { recursive: true });
let roh = 0;
let klein = 0;
function schreibe(name, svg) {
  const out = optimize(svg, SVGO).data;
  roh += svg.length;
  klein += out.length;
  fs.writeFileSync(path.join(ZIEL, `${name}.svg`), out);
}

for (const farbe of FARBEN) {
  schreibe(`zeichen-${farbe}`, farbzeichen(farbe));
  for (const rang of ['7', '8', '9', '10']) schreibe(`${farbe}-${rang}`, zahlenkarte(farbe, rang));
  for (const [rang, zeichne] of Object.entries(BILD)) {
    const { g, defs } = zeichne(farbe);
    schreibe(`${farbe}-${rang}`, bildkarte({ text: rang, farbe, haelfte: g, defs }));
  }
}
schreibe('ruecken', ruecken());
console.log(
  `37 SVGs geschrieben nach ${path.relative(process.cwd(), ZIEL)}: ${roh} → ${klein} Bytes.`,
);
