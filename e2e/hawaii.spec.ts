import { expect, test } from '@playwright/test';
import {
  E2E_QUERY,
  act,
  collectErrors,
  newTisch,
  playUntilResult,
  seatedLobby,
  startGame,
} from './helpers';

/**
 * Feste Karten (Seed 3, Geberin Hanni auf Platz 1): Auf den drei anderen Plätzen würde der
 * Heuristik-Bot „weiter“ sagen – egal, wo Sepp sitzt. Gefunden durch Durchprobieren; ändert sich
 * die Ansage des Bots, muss ein neuer Seed her.
 */
const QUERY = `${E2E_QUERY}&seed=3`;

test('Hawaii-Habicht: einschalten, mit zwei Farben ansagen, Trumpfwechsel sehen, zu Ende spielen', async ({
  context,
}) => {
  const table = await newTisch(context);
  const errors = [...collectErrors(table.host), ...collectErrors(table.guest)];
  await seatedLobby(table, QUERY);
  const kinds = table.guest.locator('dt', { hasText: 'Spielarten' }).locator('+ dd');
  await expect(kinds).not.toContainText('Hawaii-Habicht');
  await table.host.getByRole('checkbox', { name: 'Hawaii-Habicht' }).check();
  await expect(kinds).toContainText('Hawaii-Habicht');
  await startGame(table);

  const { host, guest } = table;
  await guest.getByRole('dialog').getByRole('button', { name: 'Weiter', exact: true }).click();
  const dialog = host.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Ich würde' }).click();
  await dialog.getByRole('button', { name: 'Hawaii-Habicht', exact: true }).click();

  // Zweiter Farbschritt erst nach der ersten Farbe; dieselbe Farbe ist dort gesperrt.
  const second = dialog.getByRole('group', { name: /^Trumpf ab Stich 5/ });
  await expect(second).toHaveCount(0);
  await dialog
    .getByRole('group', { name: 'Trumpf in Stich 1–4' })
    .getByRole('button', { name: 'Gras' })
    .click();
  await expect(second.getByRole('button', { name: 'Gras' })).toBeDisabled();
  // Ohne zweite Farbe ist noch nichts gewählt.
  await expect(dialog.getByRole('button', { name: 'Spielart wählen' })).toBeDisabled();
  await second.getByRole('button', { name: 'Herz' }).click();
  await host
    .getByRole('button', { name: 'Hawaii-Habicht (Gras, ab Stich 5 Herz) ansagen' })
    .click();

  // Beide sehen das Spiel und auf dem Schild die zweite Farbe.
  for (const page of [host, guest]) {
    await expect(page.locator('.tisch-leiste')).toContainText(
      'Hanni spielt Hawaii-Habicht (Gras, ab Stich 5 Herz)',
    );
    await expect(page.locator('.spielschild')).toContainText('ab Stich 5: Herz');
  }

  // Bis zum fünften Stich spielen: dann wechselt die Trumpffarbe für alle sichtbar.
  const deadline = Date.now() + 40_000;
  while (!(await host.locator('.tisch-leiste').innerText()).includes('Trumpf jetzt Herz')) {
    if (Date.now() > deadline) throw new Error('Kein Trumpfwechsel');
    const moved = [await act(host), await act(guest)];
    if (!moved.some(Boolean)) await host.waitForTimeout(50);
  }
  for (const page of [host, guest]) {
    await expect(page.locator('.tisch-leiste')).toContainText('Trumpf jetzt Herz');
    await expect(page.locator('.spielschild')).toContainText('Trumpf gewechselt');
  }

  const result = await playUntilResult(table);
  expect(result.host.title).toMatch(/^Hanni hat (gewonnen|verloren)$/);
  expect(result.guest).toEqual(result.host);
  expect(errors).toEqual([]);
});
