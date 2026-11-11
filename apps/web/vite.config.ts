import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { pwaPlugin } from './pwa-plugin.ts';

// Kennung dieses Builds; steht im Bündel, in `version.json` und im Service Worker.
const buildId = process.env.BUILD_ID ?? new Date().toISOString().replace(/\D/g, '').slice(0, 14);

export default defineConfig({
  // Relative Pfade, damit die App unter jedem Unterverzeichnis läuft (GitHub Pages).
  base: './',
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [react(), pwaPlugin(buildId)],
  // Der Port lässt sich von außen setzen (PORT=…), Standard ist 5180.
  server: { port: Number(process.env.PORT) || 5180, strictPort: true },
  // Die Vermittlungswege werden erst beim Verbinden nachgeladen; vorab bündeln,
  // sonst lädt der Entwicklungsserver beim ersten Beitritt neu („Outdated Optimize Dep“).
  optimizeDeps: { include: ['@trystero-p2p/nostr', '@trystero-p2p/torrent', '@trystero-p2p/mqtt'] },
});
