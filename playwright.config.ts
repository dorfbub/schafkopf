import { defineConfig } from '@playwright/test';

const PORT = 4180;

/**
 * Ende-zu-Ende-Tests (Paket I2). Gebaut wird die App mit `VITE_E2E=1`; nur dieser Build
 * kennt den Transport ohne Relays (`?transport=broadcast`). Das ausgelieferte Bündel
 * enthält den Schalter nicht.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Keine Animationen abwarten.
    reducedMotion: 'reduce',
    // Der Service Worker würde Seiten zwischenspeichern und Neuladen verfälschen.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build -- --outDir dist-e2e --emptyOutDir && npm run preview -- --outDir dist-e2e --port ${PORT} --strictPort`,
    cwd: 'apps/web',
    env: { VITE_E2E: '1' },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
