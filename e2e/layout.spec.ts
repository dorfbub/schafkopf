import { expect, test } from '@playwright/test';
import { act, openStart } from './helpers';

/**
 * Fehler vom Spielabend: Beim Legen der letzten Karte änderte der Tisch seine Größe, weil die
 * leere Handzeile wegfiel. Die Tischfläche (`.tisch__raum`) muss vom ersten bis zum letzten
 * Stich und auch nach dem Spiel gleich groß bleiben.
 */
const SIZES = [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 1440, height: 900 },
];

for (const size of SIZES) {
  test(`Tischfläche bleibt beim letzten Stich gleich (${size.width}×${size.height})`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await openStart(page);
    await page.getByLabel('Dein Name').fill('Hanni');
    await page.getByRole('button', { name: 'Allein gegen Bots' }).click();
    await page.getByRole('button', { name: 'Spiel starten' }).click();
    await expect(page.getByRole('group', { name: 'Deine Karten' })).toBeVisible();

    // Bei jedem Bild die Größe der Tischfläche und die Zahl der eigenen Karten mitschreiben.
    await page.evaluate(() => {
      const w = window as unknown as { __raum: [number, number, number][]; __schild: boolean };
      w.__raum = [];
      w.__schild = false;
      const step = () => {
        const tisch = document.querySelector('main.tisch');
        const raum = document.querySelector('.tisch__raum');
        // Im Spiel steht am Platz des Spielers das Spielschild.
        if (tisch?.classList.contains('tisch--playing') && document.querySelector('.spielschild'))
          w.__schild = true;
        if (tisch && raum && !tisch.classList.contains('tisch--bidding')) {
          const r = raum.getBoundingClientRect();
          const cards = document.querySelectorAll('.hand .card').length;
          const last = w.__raum.at(-1);
          if (!last || last[0] !== r.width || last[1] !== r.height || last[2] !== cards)
            w.__raum.push([r.width, r.height, cards]);
        }
        requestAnimationFrame(step);
      };
      step();
    });

    const next = page.getByRole('button', { name: 'Nächstes Spiel' });
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if (await next.isVisible()) {
        const title = await page.getByRole('dialog').getByRole('heading').first().innerText();
        if (!/zusammengeworfen/.test(title)) break;
        await next.click();
        continue;
      }
      if (!(await act(page))) await page.waitForTimeout(30);
    }
    await expect(next).toBeVisible();

    const samples = await page.evaluate(
      () => (window as unknown as { __raum: [number, number, number][] }).__raum,
    );
    expect(await page.evaluate(() => (window as unknown as { __schild: boolean }).__schild)).toBe(
      true,
    );
    // Es muss mit einer und ohne Karte gemessen worden sein (siebter → achter Stich → Ende).
    expect(samples.some(([, , cards]) => cards === 1)).toBe(true);
    expect(samples.some(([, , cards]) => cards === 0)).toBe(true);
    const sizes = new Set(samples.map(([w, h]) => `${Math.round(w)}×${Math.round(h)}`));
    expect([...sizes], JSON.stringify(samples)).toHaveLength(1);
  });
}
