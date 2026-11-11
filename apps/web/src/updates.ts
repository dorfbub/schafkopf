/*
 * Neue Version erkennen (U5). Drei Wege führen zum selben Hinweis „Neue Version – neu laden“:
 *  1. Ein neuer Service Worker wartet (`registration.waiting`).
 *  2. `version.json` auf dem Server nennt eine andere Kennung als dieses Bündel
 *     (greift auch ohne Service Worker, z. B. im Vorschau-Tab ohne HTTPS).
 *  3. Ein Kartenbild lässt sich nicht laden – die Seite fordert Dateien einer gelöschten Version an.
 * Nie wird von allein neu geladen: der Tisch läuft weiter, bis jemand den Hinweis annimmt.
 */

type Listener = () => void;

let available = false;
let waiting: ServiceWorker | null = null;
const listeners = new Set<Listener>();

function markAvailable(): void {
  if (available) return;
  available = true;
  listeners.forEach((l) => l());
}

export const updates = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): boolean => available,

  /** Für Bilder: ein Kartenbild fehlt, vermutlich weil die Seite veraltet ist. */
  reportMissingAsset: markAvailable,

  /** Neue Version übernehmen: wartenden Service Worker aktivieren, dann neu laden. */
  apply(): void {
    if (waiting) {
      // Neu geladen wird, sobald der neue Service Worker die Seite übernommen hat.
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {
        once: true,
      });
      waiting.postMessage('SKIP_WAITING');
      // Falls das Ereignis ausbleibt, trotzdem neu laden.
      setTimeout(() => location.reload(), 3000);
    } else {
      location.reload();
    }
  },
};

async function checkVersionFile(): Promise<void> {
  try {
    const url = new URL('version.json', document.baseURI);
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return;
    const { version } = (await response.json()) as { version?: unknown };
    if (typeof version === 'string' && version !== __BUILD_ID__) markAvailable();
  } catch {
    // offline oder nicht erreichbar: kein Hinweis, nächster Versuch später
  }
}

function watchWorker(registration: ServiceWorkerRegistration): void {
  const check = (worker: ServiceWorker | null) => {
    // Ohne aktuellen Controller ist es die allererste Installation, kein Update.
    if (worker && navigator.serviceWorker.controller) {
      waiting = worker;
      markAvailable();
    }
  };
  check(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') check(worker);
    });
  });
}

/** Wie oft nachgeschaut wird, solange die Seite offen ist. */
const POLL_MS = 10 * 60 * 1000;

/** Einmal beim Start der Seite aufrufen. Im Entwicklungsserver passiert nichts. */
export function startUpdateWatch(): void {
  if (import.meta.env.DEV) return;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        watchWorker(registration);
        const refresh = () => void registration.update().catch(() => undefined);
        setInterval(refresh, POLL_MS);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') refresh();
        });
      })
      .catch(() => undefined);
  }

  void checkVersionFile();
  setInterval(() => void checkVersionFile(), POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkVersionFile();
  });
}
