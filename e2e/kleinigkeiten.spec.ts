import { expect, test } from '@playwright/test';
import { E2E_QUERY, act, guestJoins, hostOpens, newTisch, openStart } from './helpers';

/** Arbeitspaket U8: Kleinigkeiten vom Testabend (Bot-Namen, Ramsch-Verlauf, Regel-Tafel). */

test('Bots heißen Saller Wolfe, Lengschwendtner Sepp und Ziegler Fritz', async ({ page }) => {
  await openStart(page);
  await page.getByLabel('Dein Name').fill('Hanni');
  await page.getByRole('button', { name: 'Allein gegen Bots' }).click();
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  for (const name of ['Saller Wolfe', 'Lengschwendtner Sepp', 'Ziegler Fritz']) {
    await expect(page.getByRole('group', { name: new RegExp(`^${name} \\(Bot\\)`) })).toBeVisible();
  }
  await expect(page.getByRole('group', { name: /^Weber Max/ })).toHaveCount(0);
});

test('Nach einem Ramsch gibt es „So wurde gespielt“', async ({ page }) => {
  await openStart(page, `${E2E_QUERY}&seed=1`);
  await page.getByLabel('Dein Name').fill('Hanni');
  await page.getByRole('button', { name: 'Allein gegen Bots' }).click();
  await page.getByRole('radio', { name: 'Ramsch', exact: true }).check();
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(page.getByRole('group', { name: 'Deine Karten' })).toBeVisible();

  const next = page.getByRole('button', { name: 'Nächstes Spiel' });
  const deadline = Date.now() + 80_000;
  while (Date.now() < deadline) {
    if (await next.isVisible()) {
      const title = await page.getByRole('dialog').getByRole('heading').first().innerText();
      if (/^(Ramsch|Durchmarsch)/.test(title)) break;
      await next.click();
      continue;
    }
    if (!(await act(page))) await page.waitForTimeout(30);
  }
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading').first()).toHaveText(/^(Ramsch|Durchmarsch)/);
  await dialog.getByText('So wurde gespielt').click();
  await expect(dialog.getByRole('listitem')).toHaveCount(8);
});

const SIZES = [
  { name: 'hochkant', width: 360, height: 740 },
  { name: 'quer', width: 740, height: 360 },
  { name: 'desktop', width: 1500, height: 900 },
];

for (const size of SIZES) {
  test(`Regel-Tafel des Gastes ragt nicht über ihren Rand (${size.name})`, async ({ context }) => {
    const table = await newTisch(context);
    await table.guest.setViewportSize(size);
    const link = await hostOpens(table.host, 'Hanni');
    // Alle Optionen an: Ramsch mit Unteroptionen, alle Spielarten, Kontra, Hausregeln.
    await table.host.getByRole('radio', { name: 'Ramsch', exact: true }).check();
    for (const box of await table.host.getByRole('checkbox').all()) {
      if (!(await box.isChecked())) await box.check();
    }
    await guestJoins(table.guest, link, 'Sepp');

    const tafel = table.guest.locator('section:has(#lobby-rules), div:has(> #lobby-rules)').first();
    await expect(table.guest.locator('#lobby-rules')).toBeVisible();
    const over = await table.guest.evaluate(() => {
      const heading = document.getElementById('lobby-rules')!;
      const box = heading.closest('section, div.tafel, .tafel') ?? heading.parentElement!;
      const rect = box.getBoundingClientRect();
      const bad: string[] = [];
      for (const el of box.querySelectorAll('.regeln dt, .regeln dd')) {
        const r = el.getBoundingClientRect();
        if (r.right > rect.right + 0.5 || r.left < rect.left - 0.5) bad.push(el.textContent ?? '');
      }
      return { bad, scroll: document.documentElement.scrollWidth - window.innerWidth };
    });
    void tafel;
    expect(over.bad).toEqual([]);
    expect(over.scroll).toBeLessThanOrEqual(0);
  });
}
