import { expect, test } from '@playwright/test';
import { act, startSolo } from './helpers';

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
    await startSolo(page);

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
        // Gemessen wird nur das gespielte Spiel; zusammengeworfene davor zählen nicht mit.
        await next.click();
        await page.evaluate(() => {
          (window as unknown as { __raum: unknown[] }).__raum = [];
        });
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

test('Der letzte Stich liegt als Stapel auf dem Tisch und öffnet sich per Tastatur', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await startSolo(page);
  const pile = page.getByRole('button', { name: /^Letzter Stich: .* hat gestochen/ });
  // Spielen, bis ein Stich weggeräumt ist; dann warten, bis man selbst dran ist (der Tisch ruht).
  const myTurn = page.getByText('Du bist dran');
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const next = page.getByRole('button', { name: 'Nächstes Spiel' });
    if (await next.isVisible()) await next.click();
    else if (await pile.isVisible()) {
      if (await myTurn.isVisible()) break;
      await page.waitForTimeout(30);
    } else if (!(await act(page))) await page.waitForTimeout(30);
  }
  await pile.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Letzter Stich' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img')).toHaveCount(4);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(pile).toBeFocused();
});
