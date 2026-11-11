import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

// Musterseite der Bausteine, nur im Entwicklungsserver: http://localhost:5180/#muster
if (import.meta.env.DEV) {
  window.addEventListener('hashchange', (e) => {
    if (e.newURL.endsWith('#muster') !== e.oldURL.endsWith('#muster')) location.reload();
  });
}

if (import.meta.env.DEV && location.hash === '#muster') {
  void import('./muster/Muster').then(({ Muster }) =>
    root.render(
      <StrictMode>
        <Muster />
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
