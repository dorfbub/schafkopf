import { type Page, expect, test } from '@playwright/test';
import { act, startSolo } from './helpers';

/** Spielt, bis `count` Spiele fertig sind, und gibt dann das nächste Spiel (es läuft nicht zu Ende). */
async function playGames(page: Page, count: number): Promise<void> {
  const next = page.getByRole('button', { name: 'Nächstes Spiel' });
  let done = 0;
  const deadline = Date.now() + 90_000;
  while (done < count && Date.now() < deadline) {
    if (await next.isVisible()) {
      await next.click();
      done++;
    } else if (!(await act(page))) await page.waitForTimeout(30);
  }
  expect(done).toBe(count);
}

test('Tabelle des Abends nach zwei Spielen, Endabrechnung beim Verlassen', async ({ page }) => {
  await startSolo(page);
  await playGames(page, 2);

  await page.getByRole('button', { name: 'Tabelle', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Der Abend' });
  await expect(dialog).toBeVisible();

  // Kopfzeile, zwei Spiele, Stand.
  const table = dialog.getByRole('table', { name: /Alle Spiele/ }).or(dialog.getByRole('table'));
  const rows = table.getByRole('row');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(1).getByRole('rowheader').first()).toHaveText('1');
  await expect(rows.nth(2).getByRole('rowheader').first()).toHaveText('2');

  // Die Kontostände in der letzten Zeile ergeben zusammen null (ohne Pott).
  const cents = await rows
    .nth(3)
    .getByRole('cell')
    .allInnerTexts()
    .then((texts) =>
      texts.map((t) => {
        const n = Number(t.replace(/[^\d,]/g, '').replace(',', '.'));
        return (t.includes('−') ? -n : n) * 100;
      }),
    );
  expect(Math.round(cents.reduce((a, b) => a + b, 0))).toBe(0);

  await expect(dialog.getByRole('heading', { name: 'Wer zahlt wem' })).toBeVisible();

  // Schließen geht, und das Spiel läuft weiter.
  await dialog.getByRole('button', { name: 'Schließen' }).click();
  await expect(dialog).toBeHidden();

  // Verlassen zeigt erst die Abrechnung.
  await page.getByRole('button', { name: 'Verlassen' }).click();
  const leave = page.getByRole('dialog', { name: 'Abrechnung vor dem Gehen' });
  await expect(leave).toBeVisible();
  await leave.getByRole('button', { name: 'Tisch verlassen' }).click();
  await expect(page.getByRole('heading', { name: 'Schafkopf', level: 1 })).toBeVisible();
});
