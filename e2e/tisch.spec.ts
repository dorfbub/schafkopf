import { expect, test } from '@playwright/test';
import {
  collectErrors,
  newTisch,
  openStart,
  playUntilCardOnTable,
  playUntilResult,
  seatedLobby,
  startGame,
} from './helpers';

test('Startseite und Tisch laufen ohne Konsolenfehler', async ({ context }) => {
  const table = await newTisch(context);
  const errors = [...collectErrors(table.host), ...collectErrors(table.guest)];
  await openStart(table.host);
  await seatedLobby(table);
  await startGame(table);
  expect(errors).toEqual([]);
});

test('Ein ganzes Spiel: beide sehen dasselbe Ergebnis und dieselben Kontostände', async ({
  context,
}) => {
  const table = await newTisch(context);
  await seatedLobby(table);
  await startGame(table);
  const { host, guest } = await playUntilResult(table);
  expect(host.title).toMatch(/gewonnen|verloren/);
  expect(guest).toEqual(host);
  // Vier Plätze plus Kopfzeile; die Kontostände summieren sich zu null.
  expect(host.rows).toHaveLength(5);
});

test('Der Gastgeber lädt mitten im Spiel neu und es geht weiter', async ({ context }) => {
  const table = await newTisch(context);
  await seatedLobby(table);
  await startGame(table);
  await playUntilCardOnTable(table);
  await table.host.reload();
  await expect(table.host.getByRole('group', { name: 'Deine Karten' })).toBeVisible();
  await expect(table.guest.getByRole('group', { name: 'Deine Karten' })).toBeVisible();
  const { host, guest } = await playUntilResult(table);
  expect(guest).toEqual(host);
});

test('Schließt der Gast den Tab, übernimmt nach der Frist ein Bot', async ({ context }) => {
  const table = await newTisch(context);
  await seatedLobby(table);
  await startGame(table);
  await table.guest.close();
  await expect(table.host.getByRole('group', { name: /^Sepp.*getrennt/ })).toBeVisible();
  await expect(table.host.getByRole('group', { name: /^Sepp.*Bot vertritt/ })).toBeVisible();
  // Der Bot spielt für Sepp mit: Der Gastgeber allein bringt das Spiel zu Ende.
  const { host } = await playUntilResult(table, [table.host]);
  expect(host.title).toMatch(/gewonnen|verloren/);
});

test('Lobby: Platz wechseln und Regel ändern sieht der Gast', async ({ context }) => {
  const table = await newTisch(context);
  await seatedLobby(table);
  const toutRow = table.guest.locator('dt', { hasText: 'Tout erlaubt' }).locator('+ dd');
  await expect(toutRow).toHaveText('ja');
  await table.host.getByRole('checkbox', { name: 'Tout erlaubt' }).uncheck();
  await expect(toutRow).toHaveText('nein');

  // Platz wechseln: Der Gastgeber setzt den Gast um; die freien Plätze des Gastes ändern sich.
  const free = table.guest.getByRole('button', { name: /ist frei – hier sitzen/ });
  const before = await free.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  await table.host
    .getByRole('button', { name: /Sepp einen Platz im Uhrzeigersinn weiter/ })
    .click();
  await expect
    .poll(async () => free.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))))
    .not.toEqual(before);
});
