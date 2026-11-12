import { expect, test } from '@playwright/test';
import { E2E_QUERY, act, collectErrors, openStart, tutorBubble } from './helpers';

/*
 * Hochzeit mit Max Weber (T3): Allein gegen Bots bietet ein Bot eine Hochzeit an. Max beantwortet
 * „annehmen?“ und „welche Karte gebe ich zurück?“ in drei Stufen und hebt die Empfehlung im
 * Vorspiel-Dialog hervor.
 *
 * Feste Karten: Seed 39 mit Geber auf Platz 1 (man selbst); einer der Bots sagt die Hochzeit an,
 * die anderen lehnen ab, bis man selbst gefragt wird. Gefunden durch Durchprobieren mit den
 * Heuristik-Bots („Normal“); ändert sich deren Ansage, muss ein neuer Seed her.
 */
const QUERY = `${E2E_QUERY}&seed=39`;

test('Hochzeit: Max rät beim Annehmen und beim Zurückgeben, in drei Stufen', async ({ page }) => {
  const errors = collectErrors(page);
  await openStart(page, QUERY);
  await page.getByLabel('Dein Name').fill('Hanni');
  await page.getByRole('button', { name: 'Allein gegen Bots' }).click();
  await page.getByRole('checkbox', { name: 'Hochzeit', exact: true }).check();
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(page.getByRole('group', { name: 'Deine Karten' })).toBeVisible();

  // Aussteigen, bis der Bot die Hochzeit anbietet.
  const offer = page.getByRole('dialog', { name: /macht Hochzeit$/ });
  const pass = page.getByRole('dialog').getByRole('button', { name: 'Weiter', exact: true });
  const end = Date.now() + 30_000;
  while (!(await offer.isVisible()) && Date.now() < end) {
    if (await pass.isVisible()) await pass.click();
    else await page.waitForTimeout(30);
  }
  await expect(offer).toBeVisible();

  const bubble = tutorBubble(page);
  const figure = page.getByRole('button', { name: /^Max Weber( fragen|:)/ });
  if (!(await bubble.isVisible())) await figure.click();
  await bubble.getByRole('button', { name: /soll ich annehmen\?$/ }).click();

  // Stufe 1: Denkanstoß, noch keine Empfehlung und nichts hervorgehoben.
  await expect(bubble.locator('.tutor-blase__anstoss')).toHaveText(/\?$/);
  await expect(bubble.getByText(/^Ich würde/)).toHaveCount(0);
  await expect(offer.locator('.btn--tipp')).toHaveCount(0);

  // Stufe 2: die Empfehlung; der empfohlene Knopf bekommt den Rahmen.
  await bubble.getByRole('button', { name: 'Und was empfiehlst du?' }).click();
  const advice = bubble.getByText(/^Ich würde (die Hochzeit annehmen|ablehnen)/);
  await expect(advice).toBeVisible();
  const accept = /annehmen/.test(await advice.innerText());
  await expect(offer.locator('.btn--tipp')).toHaveCount(1);
  await expect(offer.locator('.btn--tipp')).toHaveText(accept ? 'Ich nehme an' : 'Nein');

  expect(accept, 'Mit diesem Blatt rät Max zum Annehmen').toBe(true);

  // Stufe 3: die Begründung.
  await bubble.getByRole('button', { name: 'Warum?' }).click();
  await expect(bubble.locator('.tutor-blase__gruende')).toBeVisible();

  // Der Rat gilt: wer ablehnt, wird nicht weiter beraten; wer annimmt, bekommt die Rückgabe.
  if (accept) {
    await offer.getByRole('button', { name: 'Ich nehme an' }).click();
    const exchange = page.getByRole('dialog', { name: 'Welche Karte gibst du zurück?' });
    await expect(exchange).toBeVisible();
    if (!(await bubble.isVisible())) await figure.click();
    await bubble.getByRole('button', { name: /Welche Karte gebe ich zurück\?$/ }).click();
    await bubble.getByRole('button', { name: 'Und was empfiehlst du?' }).click();
    await expect(bubble.getByText(/zurückgeben\.$/)).toBeVisible();
    const tipped = exchange.locator('.hochzeit__karte--tipp');
    await expect(tipped).toHaveCount(1);
    // Gibt es nur eine erlaubte Rückgabe, ist sie schon gewählt.
    if ((await tipped.getAttribute('aria-pressed')) !== 'true') await tipped.click();
    await exchange.getByRole('button', { name: 'Zurückgeben' }).click();
    await expect(page.locator('.tisch-leiste')).toContainText('spielt Hochzeit');
    // Das Spiel läuft zu Ende (Max darf sich dabei melden; `act` schließt seine Blase).
    const result = page.getByRole('dialog').filter({ has: page.getByRole('table') });
    const end = Date.now() + 70_000;
    while (!(await result.isVisible()) && Date.now() < end) {
      if (!(await act(page))) await page.waitForTimeout(30);
    }
    await expect(result.getByRole('heading')).toHaveText(/haben (gewonnen|verloren)$/);
  } else {
    await offer.getByRole('button', { name: 'Nein' }).click();
  }
  expect(errors).toEqual([]);
});
