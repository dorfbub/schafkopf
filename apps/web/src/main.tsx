import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const root = document.getElementById('root')!;
// Messwerkzeug für den Verbindungsaufbau, nur im Entwicklungsserver (siehe dev/messung.ts).
const messung = import.meta.env.DEV ? new URLSearchParams(location.search).get('messung') : null;

if (messung) {
  void import('./dev/messung').then((m) => m.run(messung, root));
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
