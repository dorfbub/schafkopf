import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/table.css';
import './styles.css';

const element = document.getElementById('root')!;

// Messwerkzeug für den Verbindungsaufbau, nur im Entwicklungsserver (siehe dev/messung.ts).
const messung = import.meta.env.DEV ? new URLSearchParams(location.search).get('messung') : null;

// Nur im Entwicklungsserver: Musterseite der Bausteine (http://localhost:5180/#muster) und
// Tischprobe mit festen Spielständen (#tisch?szene=ansage|warten|stich|ergebnis|zuschauer).
// Einladungslinks (#tisch=code) gehören nicht dazu.
const devPage = (hash: string) =>
  hash.startsWith('#muster') ? 'muster' : /^#tisch(\?|$)/.test(hash) ? hash : null;

if (import.meta.env.DEV) {
  window.addEventListener('hashchange', (e) => {
    const before = devPage(new URL(e.oldURL).hash);
    const after = devPage(new URL(e.newURL).hash);
    if (before !== after) location.reload();
  });
}

if (messung) {
  void import('./dev/messung').then((m) => m.run(messung, element));
} else if (import.meta.env.DEV && devPage(location.hash) === 'muster') {
  const root = createRoot(element);
  void import('./muster/Muster').then(({ Muster }) =>
    root.render(
      <StrictMode>
        <Muster />
      </StrictMode>,
    ),
  );
} else if (import.meta.env.DEV && devPage(location.hash)) {
  const root = createRoot(element);
  void import('./muster/Tischprobe').then(({ Tischprobe }) =>
    root.render(
      <StrictMode>
        <Tischprobe />
      </StrictMode>,
    ),
  );
} else {
  createRoot(element).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
