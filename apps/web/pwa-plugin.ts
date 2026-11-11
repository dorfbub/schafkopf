import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));

/** Dateien aus `public/`, die offline gebraucht werden (Manifest und Symbole). */
const PUBLIC_FILES = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

/**
 * Schreibt beim Bauen `version.json` und `sw.js` (Service Worker mit der Dateiliste).
 * Jeder Build bekommt eine eigene Kennung (`buildId`, auch als `__BUILD_ID__` im Bündel);
 * die Seite vergleicht sie mit `version.json` auf dem Server und erkennt so neue Versionen.
 * Eigenes Plugin statt `vite-plugin-pwa`: die Aufgabe ist klein, und so bleibt die
 * Abhängigkeitsliste kurz.
 */
export function pwaPlugin(buildId: string): Plugin {
  return {
    name: 'schafkopf-pwa',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      // Relative Adressen: gelten unter jedem Unterverzeichnis (GitHub Pages: /schafkopf/).
      const precache = ['./', ...[...Object.keys(bundle), ...PUBLIC_FILES].map((f) => `./${f}`)];
      const template = readFileSync(join(here, 'src/sw.template.js'), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__VERSION__', buildId)
          .replace('__PRECACHE__', JSON.stringify(precache, null, 2)),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: buildId }),
      });
    },
  };
}
