import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative Pfade, damit die App unter jedem Unterverzeichnis läuft (GitHub Pages).
  base: './',
  plugins: [react()],
  // Der Port lässt sich von außen setzen (PORT=…), Standard ist 5180.
  server: { port: Number(process.env.PORT) || 5180, strictPort: true },
  // Die Vermittlungswege werden erst beim Verbinden nachgeladen; vorab bündeln,
  // sonst lädt der Entwicklungsserver beim ersten Beitritt neu („Outdated Optimize Dep“).
  optimizeDeps: { include: ['@trystero-p2p/nostr', '@trystero-p2p/torrent', '@trystero-p2p/mqtt'] },
});
