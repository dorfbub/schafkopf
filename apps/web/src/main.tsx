import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/table.css';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

// Nur im Entwicklungsserver: Musterseite der Bausteine (http://localhost:5180/#muster) und
// Tischprobe mit festen Spielständen (#tisch?szene=ansage|warten|stich|ergebnis|zuschauer).
const devPage = (hash: string) =>
  hash.startsWith('#muster') ? 'muster' : hash.startsWith('#tisch') ? hash : null;

if (import.meta.env.DEV) {
  window.addEventListener('hashchange', (e) => {
    const before = devPage(new URL(e.oldURL).hash);
    const after = devPage(new URL(e.newURL).hash);
    if (before !== after) location.reload();
  });
}

if (import.meta.env.DEV && devPage(location.hash) === 'muster') {
  void import('./muster/Muster').then(({ Muster }) =>
    root.render(
      <StrictMode>
        <Muster />
      </StrictMode>,
    ),
  );
} else if (import.meta.env.DEV && devPage(location.hash)) {
  void import('./muster/Tischprobe').then(({ Tischprobe }) =>
    root.render(
      <StrictMode>
        <Tischprobe />
      </StrictMode>,
    ),
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
