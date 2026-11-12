import { expect, test } from '@playwright/test';
import { collectErrors, newTisch, seatedLobby, startGame } from './helpers';

test('Kartenbild: der Gastgeber wählt Salzburger, der Gast sieht es in der Lobby und am Tisch', async ({
  context,
}) => {
  const table = await newTisch(context);
  const errors = [...collectErrors(table.host), ...collectErrors(table.guest)];
  await seatedLobby(table);

  const cardSet = table.guest.locator('dt', { hasText: 'Kartenbild' }).locator('+ dd');
  await expect(cardSet).toContainText('Bayerisch');
  const ober = cardSet.getByRole('img', { name: 'Herz-Ober' }).locator('img');
  const bayerischOber = await ober.getAttribute('src');

  await table.host.getByRole('radio', { name: 'Salzburger (Entwurf)' }).check();
  await expect(table.host.getByText(/Entwurf: \d+ von 32 Karten/)).toBeVisible();
  await expect(cardSet).toContainText('Salzburger (Entwurf)');
  // Die Vorschau des Gasts zeigt jetzt den Salzburger Herz-Ober.
  await expect(ober).not.toHaveAttribute('src', bayerischOber ?? '');

  await startGame(table);
  await expect(table.guest.locator('main[data-kartenbild="salzburger"]')).toBeVisible();
  await expect(table.host.locator('main[data-kartenbild="salzburger"]')).toBeVisible();
  // Alle Karten der Hand haben ein Bild (eigenes oder bayerischer Rückfall).
  const hand = table.guest.getByRole('group', { name: 'Deine Karten' }).locator('img');
  await expect(hand.first()).toBeVisible();
  for (const src of await hand.evaluateAll((els) => els.map((e) => e.getAttribute('src')))) {
    expect(src).toBeTruthy();
  }
  expect(errors).toEqual([]);
});
