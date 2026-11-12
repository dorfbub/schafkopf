import { expect, test } from '@playwright/test';
import {
  E2E_QUERY,
  collectErrors,
  newTisch,
  playUntilResult,
  seatedLobby,
  startGame,
} from './helpers';

/**
 * Feste Karten (Seed 1472, Geberin Hanni auf Platz 1): Hanni hat genau einen Trumpf, und auf den
 * drei anderen Plätzen würde der Heuristik-Bot „weiter“ sagen – egal, wo Sepp sitzt. Gefunden
 * durch Durchprobieren; ändert sich die Ansage des Bots, muss ein neuer Seed her.
 */
const QUERY = `${E2E_QUERY}&seed=1472`;

test('Hochzeit: Hanni sagt sie an, Sepp nimmt an und gibt verdeckt eine Karte zurück', async ({
  context,
}) => {
  const table = await newTisch(context);
  const errors = [...collectErrors(table.host), ...collectErrors(table.guest)];
  await seatedLobby(table, QUERY);
  await table.host.getByRole('checkbox', { name: 'Hochzeit' }).check();
  await expect(table.guest.locator('dt', { hasText: 'Spielarten' }).locator('+ dd')).toContainText(
    'Hochzeit',
  );
  await startGame(table);

  const { host, guest } = table;
  await guest.getByRole('dialog').getByRole('button', { name: 'Weiter', exact: true }).click();
  await host.getByRole('dialog').getByRole('button', { name: 'Ich würde' }).click();
  await host.getByRole('dialog').getByRole('button', { name: 'Hochzeit', exact: true }).click();
  await host.getByRole('button', { name: 'Hochzeit ansagen' }).click();

  // Gefragt wird reihum ab links von Hanni; Bots lehnen ab, bis Sepp dran ist.
  const offer = guest.getByRole('dialog', { name: 'Hanni macht Hochzeit' });
  await expect(offer).toBeVisible();
  await offer.getByRole('button', { name: 'Ich nehme an' }).click();

  const exchange = guest.getByRole('dialog', { name: 'Welche Karte gibst du zurück?' });
  await expect(exchange).toBeVisible();
  await expect(host.locator('.tisch-leiste')).toContainText('Sepp nimmt an');
  // Neun Karten: acht eigene und Hannis Trumpf; zurückgeben darf er nur Nicht-Trümpfe.
  const cards = exchange.getByRole('group').getByRole('button');
  await expect(cards).toHaveCount(9);
  const give = exchange.getByRole('button', { name: 'Zurückgeben' });
  await expect(give).toBeDisabled();
  await cards.and(guest.locator(':enabled')).first().click();
  await give.click();

  // Das Spiel läuft: alle sehen, wer mit wem spielt.
  for (const page of [host, guest]) {
    await expect(page.locator('.tisch-leiste')).toContainText('Hanni spielt Hochzeit');
  }
  await expect(host.getByText('Mitspieler').first()).toBeVisible();

  const result = await playUntilResult(table);
  expect(result.host.title).toMatch(/^Hanni und Sepp haben (gewonnen|verloren)$/);
  expect(result.guest).toEqual(result.host);
  expect(errors).toEqual([]);
});
