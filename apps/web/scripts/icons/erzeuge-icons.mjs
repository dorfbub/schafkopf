/* eslint-disable no-undef -- Node-Skript, nicht Teil der App */
// Erzeugt die App-Symbole (`public/icons/*.png`) und das Favicon aus dem Eichel-Zeichen der Karten.
// Aufruf: node apps/web/scripts/icons/erzeuge-icons.mjs  (braucht `rsvg-convert`, Teil von librsvg)
// Die PNGs sind eingecheckt; das Skript nur bei Änderung am Entwurf neu laufen lassen.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, 'public/icons');
mkdirSync(out, { recursive: true });

// Farben aus src/styles/tokens.css
const felt = '#17603a';
const feltDeep = '#0f4428';
const paper = '#fbf7ec';
const paperLine = '#d9d0bd';

// Farbzeichen (Fabian Bally, CC0) ohne den äußeren <svg>-Rahmen
const zeichen = readFileSync(join(root, 'src/assets/karten/zeichen-eichel.svg'), 'utf8');
const viewBox = /viewBox="([^"]+)"/.exec(zeichen)[1];
const inner = zeichen.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

// Alles liegt in der Schutzzone (Kreis mit 40 % Durchmesser-Rand), damit das Symbol auch
// als „maskable“ (Android beschneidet rund oder abgerundet) vollständig sichtbar bleibt.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="filz" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="${felt}"/>
      <stop offset="1" stop-color="${feltDeep}"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#filz)"/>
  <rect x="146" y="106" width="220" height="300" rx="24" fill="${paper}" stroke="${paperLine}" stroke-width="4"/>
  <svg x="166" y="166" width="180" height="180" viewBox="${viewBox}">${inner}</svg>
</svg>`;

const quelle = join(out, 'icon.svg');
writeFileSync(quelle, svg);

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  execFileSync('rsvg-convert', ['-w', size, '-h', size, quelle, '-o', join(out, name)]);
}
console.info(`Symbole geschrieben nach ${out}`);
