import { type Page, expect, test } from '@playwright/test';
import { E2E_QUERY, act, openStart } from './helpers';

/**
 * Dreier mit kurzer Karte gegen zwei Bots (K6). Mit `BILDER=1` entstehen dabei die
 * Bildschirmfotos für `docs/bilder/tisch/dreier-*.png` in drei Größen.
 */
const SIZES = [
  { name: 'hochkant', width: 390, height: 844 },
  { name: 'quer', width: 844, height: 390 },
  { name: 'desktop', width: 1440, height: 900 },
];

const BILDER = process.env.BILDER === '1';

/** Allein gegen Bots, in der Lobby auf „Zu dritt, kurze Karte“ stellen und starten. */
async function startDreier(page: Page, seed?: number): Promise<void> {
  await openStart(page, seed === undefined ? E2E_QUERY : `${E2E_QUERY}&seed=${seed}`);
  await page.getByLabel('Dein Name').fill('Hanni');
  await page.getByRole('button', { name: 'Allein gegen Bots' }).click();
  await page.getByRole('radio', { name: 'Zu dritt, kurze Karte' }).check();
  await expect(page.getByRole('button', { name: /Platz \d ist frei/ })).toHaveCount(2);
  await expect(page.getByRole('checkbox', { name: /Sauspiel/ })).toBeDisabled();
  await expect(page.getByRole('radio', { name: 'Muss' })).toBeDisabled();
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(page.getByRole('group', { name: 'Deine Karten' })).toBeVisible();
}

test('Dreier gegen zwei Bots: acht Karten, zwei Gegner, ein Spiel bis zum Ergebnis', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await startDreier(page);
  const cards = page.getByRole('group', { name: 'Deine Karten' });
  await expect(cards.getByRole('img').or(cards.getByRole('button'))).toHaveCount(8);
  // Zwei Plätze außer dem eigenen: links und rechts.
  await expect(page.locator('.tisch-platz--left')).toHaveCount(1);
  await expect(page.locator('.tisch-platz--right')).toHaveCount(1);
  await expect(page.locator('.tisch-platz--top')).toHaveCount(0);
  // In der Regelübersicht steht die Besetzung.
  await page.getByRole('button', { name: 'Regeln' }).click();
  await expect(page.getByRole('dialog').getByText('Zu dritt, kurze Karte')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen' }).click();

  // Spielen, bis ein Spiel mit Ergebnis fertig ist (zusammengeworfen: neu geben).
  const next = page.getByRole('button', { name: 'Nächstes Spiel' });
  const deadline = Date.now() + 60_000;
  let title = '';
  while (Date.now() < deadline) {
    if (await next.isVisible()) {
      title = await page.getByRole('dialog').getByRole('heading').first().innerText();
      if (!/zusammengeworfen/.test(title)) break;
      await next.click();
      continue;
    }
    if (!(await act(page))) await page.waitForTimeout(30);
  }
  expect(title).toMatch(/gewonnen|verloren/);
  // Drei Zeilen im Ergebnis plus Kopf, die Beträge gehen auf.
  const rows = page.getByRole('dialog').getByRole('table').first().getByRole('row');
  await expect(rows).toHaveCount(4);
  expect(errors).toEqual([]);
});

for (const size of SIZES) {
  test(`Bildschirmfotos Dreier (${size.name})`, async ({ page }) => {
    test.skip(!BILDER, 'nur mit BILDER=1');
    await page.setViewportSize(size);
    await startDreier(page, 7);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: `docs/bilder/tisch/dreier-${size.name}-1-ansage.png` });

    // Bis zwei Karten im Stich liegen und man selbst dran ist.
    const trick = page.getByRole('group', { name: 'Stich', exact: true }).getByRole('img');
    const hand = page.getByRole('group', { name: 'Deine Karten' });
    const deadline = Date.now() + 40_000;
    while (Date.now() < deadline) {
      const mine = await hand.getByRole('button').count();
      if ((await trick.count()) === 2 && mine > 0 && !(await dialog.isVisible())) break;
      const next = page.getByRole('button', { name: 'Nächstes Spiel' });
      if (await next.isVisible()) await next.click();
      else if (!(await act(page))) await page.waitForTimeout(30);
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `docs/bilder/tisch/dreier-${size.name}-2-stich.png` });
  });
}
