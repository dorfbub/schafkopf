import { type Page, expect, test } from '@playwright/test';
import { collectErrors, hostOpens, newTisch } from './helpers';

/** Neue Mitspieler bestätigen (N6): Der Gastgeber lässt Unbekannte erst nach einem Klick herein. */

async function hostWithApproval(host: Page): Promise<string> {
  const link = await hostOpens(host, 'Hanni');
  await host.getByRole('checkbox', { name: 'Neue Mitspieler bestätigen' }).check();
  return link;
}

/** Gast öffnet den Link und fragt an; er wartet, ohne den Tisch zu sehen. */
async function guestAsks(guest: Page, link: string, name: string): Promise<void> {
  await guest.goto(link);
  await guest.getByLabel('Dein Name').fill(name);
  await guest.getByRole('button', { name: 'Beitreten' }).click();
  await expect(guest.getByRole('heading', { name: 'Warte auf Zusage von Hanni …' })).toBeVisible();
  await expect(guest.getByRole('heading', { name: /^Tisch / })).toHaveCount(0);
}

test('Zulassen: der Gast wartet, bis der Gastgeber klickt, und sitzt dann am Tisch', async ({
  context,
}) => {
  const table = await newTisch(context);
  const errors = [...collectErrors(table.host), ...collectErrors(table.guest)];
  const link = await hostWithApproval(table.host);
  await guestAsks(table.guest, link, 'Sepp');

  const requests = table.host.getByRole('region', { name: 'Beitrittsanfragen' });
  await expect(requests).toContainText('Sepp möchte an den Tisch.');
  // Noch nicht am Tisch: kein Platz für Sepp beim Gastgeber.
  await expect(table.host.getByRole('group', { name: /^Sepp/ })).toHaveCount(0);

  await requests.getByRole('button', { name: 'Sepp an den Tisch lassen' }).click();
  await expect(table.guest.getByRole('heading', { name: /^Tisch / })).toBeVisible();
  await expect(table.host.getByRole('group', { name: /^Sepp/ })).toBeVisible();
  await expect(table.host.getByText('Sepp möchte an den Tisch.')).toHaveCount(0);

  // Wer zugelassen ist, kommt nach dem Neuladen ohne Rückfrage zurück.
  await table.guest.reload();
  await table.guest.getByRole('button', { name: 'Beitreten' }).click();
  await expect(table.guest.getByRole('heading', { name: /^Tisch / })).toBeVisible();
  await expect(table.host.getByText('Sepp möchte an den Tisch.')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Abweisen: der Gast erfährt es und kommt nicht an den Tisch', async ({ context }) => {
  const table = await newTisch(context);
  const link = await hostWithApproval(table.host);
  await guestAsks(table.guest, link, 'Sepp');
  await table.host.getByRole('button', { name: 'Sepp abweisen' }).click();
  await expect(table.guest.getByRole('heading', { name: 'Nicht zugelassen' })).toBeVisible();
  await expect(table.host.getByRole('group', { name: /^Sepp/ })).toHaveCount(0);
  await table.guest.getByRole('button', { name: 'Zurück zum Start' }).click();
  await expect(table.guest.getByRole('heading', { name: 'Schafkopf', level: 1 })).toBeVisible();
});

test('Im laufenden Spiel erscheint die Anfrage, ohne dass der Tisch springt', async ({
  context,
}) => {
  const table = await newTisch(context);
  const link = await hostWithApproval(table.host);
  await table.host.getByRole('button', { name: 'Spiel starten' }).click();
  const hand = table.host.getByRole('group', { name: 'Deine Karten' });
  await expect(hand).toBeVisible();
  const before = await hand.boundingBox();

  await guestAsks(table.guest, link, 'Sepp');
  const requests = table.host.getByRole('region', { name: 'Beitrittsanfragen' });
  await expect(requests).toContainText('Sepp möchte an den Tisch.');
  expect(await hand.boundingBox()).toEqual(before);

  await requests.getByRole('button', { name: 'Sepp an den Tisch lassen' }).click();
  // Sepp schaut zu: Er sieht den Tisch, aber keine eigenen Karten.
  await expect(table.guest.locator('.tisch-leiste')).toBeVisible();
  await expect(table.guest.getByRole('group', { name: 'Deine Karten' })).toHaveCount(0);
  expect(await hand.boundingBox()).toEqual(before);
});
