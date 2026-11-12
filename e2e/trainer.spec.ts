import { type Page, expect, test } from '@playwright/test';
import {
  act,
  collectErrors,
  newTisch,
  openStart,
  seatedLobby,
  startGame,
  startSolo,
  tutorBubble,
} from './helpers';

/*
 * Trainer Max Weber (T2): allein gegen Bots eine Frage stellen, die Antwort in drei Stufen
 * bekommen und nach dem Spiel den Rückblick in „So wurde gespielt“ sehen. Am Tisch mit Freunden
 * gibt es ihn nicht. Mit `BILDER=1` entstehen die Bilder für Lukas unter docs/bilder/tutor/.
 */

const BILDER = process.env.BILDER === '1';

const SIZES = [
  { name: 'hochkant', width: 360, height: 740 },
  { name: 'quer', width: 740, height: 360 },
  { name: 'desktop', width: 1440, height: 900 },
];

const figure = (page: Page) => page.getByRole('button', { name: /^Max Weber( fragen|:)/ });
const next = (page: Page) => page.getByRole('button', { name: 'Nächstes Spiel' });

/** Man selbst ist am Zug und hat mehr als eine erlaubte Karte. */
async function cardChoice(page: Page): Promise<boolean> {
  return (
    (await page.getByText('Du bist dran').isVisible()) &&
    (await page.locator('.hand .card--playable').count()) > 1
  );
}

/**
 * Auswahlfragen öffnen – auch wenn Max sich gerade von selbst gemeldet hat (dann „Andere Frage“).
 * Meldet er sich genau im Moment des Klicks, ginge die Blase wieder zu; deshalb bis es passt.
 */
async function openQuestions(page: Page): Promise<void> {
  const bubble = tutorBubble(page);
  const greeting = bubble.getByText('Servus! Was willst du wissen?');
  await expect(async () => {
    if (await greeting.isVisible()) return;
    const other = bubble.getByRole('button', { name: 'Andere Frage' });
    if (!(await bubble.isVisible())) await figure(page).click();
    else if (await other.isVisible()) await other.click();
    await expect(greeting).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
}

for (const size of SIZES) {
  test(`Mit Max Weber: Frage, drei Stufen und Rückblick (${size.name})`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(size);
    const errors = collectErrors(page);
    const shot = async (name: string) => {
      if (BILDER) await page.screenshot({ path: `docs/bilder/tutor/${size.name}-${name}.png` });
    };
    await startSolo(page);
    await expect(figure(page)).toBeVisible();
    // Der vierte Bot „Weber Max“ sitzt nur an einem Tisch ganz ohne Menschen.
    await expect(page.getByRole('group', { name: /^Weber Max/ })).toHaveCount(0);

    // Spielen, bis man selbst eine Karte wählen kann.
    const deadline = Date.now() + 60_000;
    while (!(await cardChoice(page)) && Date.now() < deadline) {
      if (await next(page).isVisible()) await next(page).click();
      else if (!(await act(page))) await page.waitForTimeout(30);
    }
    expect(await cardChoice(page)).toBe(true);

    // Frage stellen.
    await openQuestions(page);
    const bubble = tutorBubble(page);
    const question = bubble.getByRole('button', { name: /^Welche Karte ist sinnvoll/ });
    await expect(question).toBeVisible();
    await expect(bubble.getByRole('checkbox', { name: /Von selbst melden/ })).toBeChecked();
    await shot('1-fragen');
    await question.click();

    // Stufe 1: nur der Denkanstoß – keine Empfehlung, keine hervorgehobene Karte.
    const recommend = bubble.getByRole('button', { name: 'Und was empfiehlst du?' });
    await expect(recommend).toBeVisible();
    await expect(bubble.locator('.tutor-blase__anstoss')).toHaveText(/\?$/);
    await expect(bubble.getByText(/^Ich würde/)).toHaveCount(0);
    await expect(page.locator('.hand__platz--tipp')).toHaveCount(0);
    await shot('2-denkanstoss');

    // Stufe 2: die Empfehlung, am Tisch hervorgehoben.
    await recommend.click();
    await expect(bubble.getByText(/^Ich würde (die|den) .+ spielen\.$/)).toBeVisible();
    await expect(page.locator('.hand__platz--tipp')).toHaveCount(1);
    await shot('3-empfehlung');

    // Stufe 3: die Begründung mit Faustregel (oder ehrlich: ohne feste Regel).
    await bubble.getByRole('button', { name: 'Warum?' }).click();
    await expect(bubble.locator('.tutor-blase__gruende')).toBeVisible();
    await expect(bubble.getByRole('button', { name: 'Warum?' })).toHaveCount(0);
    await shot('4-begruendung');

    // Die empfohlene Karte spielen; der Rat ist damit erledigt.
    await page.locator('.hand__platz--tipp button').click();
    await expect(page.locator('.hand__platz--tipp')).toHaveCount(0);

    // Weiterspielen (immer die erste Karte – das gibt Max etwas zum Anmerken), bis ein Spiel
    // mit markierten Stellen endet. Unterwegs einmal die Bewertung hinterher festhalten.
    let marked = false;
    let reviewed = false;
    let autoSeen = false;
    for (let game = 0; game < 12 && !marked; game++) {
      const end = Date.now() + 60_000;
      while (!(await next(page).isVisible()) && Date.now() < end) {
        const hinterher = bubble.getByText(/^Kurz zu deinem Zug/);
        if (!reviewed && (await hinterher.isVisible())) {
          reviewed = true;
          await bubble.getByRole('button', { name: 'Was wäre besser gewesen?' }).click();
          await expect(bubble.getByText(/^Besser wäre/)).toBeVisible();
          await shot('5-hinterher');
        }
        // Automatikmodus: Max meldet sich von selbst, zuerst mit dem Denkanstoß.
        if (!autoSeen && (await bubble.locator('.tutor-blase__vorweg').isVisible())) {
          autoSeen = true;
          await expect(
            bubble.getByRole('button', { name: 'Und was empfiehlst du?' }),
          ).toBeVisible();
          await shot('0-automatik');
        }
        if (!(await act(page))) await page.waitForTimeout(30);
      }
      await expect(next(page)).toBeVisible();
      const dialog = page.getByRole('dialog').filter({ has: next(page) });
      if (/zusammengeworfen/.test(await dialog.getByRole('heading').first().innerText())) {
        await next(page).click();
        continue;
      }
      // Die Bewertung des letzten Zugs rechnet noch kurz nach.
      await page.waitForTimeout(800);
      await dialog.locator('summary.verlauf__knopf').click();
      await expect(dialog.locator('.verlauf__max')).toBeVisible();
      marked = await dialog.locator('.verlauf__max-zahl').isVisible();
      if (marked) {
        const first = dialog.locator('.verlauf__stich--max, .verlauf__max p strong').first();
        await expect(first).toBeVisible();
        await expect(dialog.getByText(/wäre besser gewesen als/).first()).toBeVisible();
        // Für das Bild: die erste markierte Stelle mit ihrem Hinweis in die Mitte holen.
        const hint = dialog.locator('.verlauf__hinweis');
        await ((await hint.count()) > 0 ? hint.first() : dialog.locator('.verlauf__max')).evaluate(
          (el) => el.scrollIntoView({ block: 'center' }),
        );
        await shot('6-rueckblick');
        await dialog
          .locator('.verlauf__max')
          .evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await shot('7-rueckblick-max');
      } else {
        await expect(
          dialog.getByText('Max Weber: kein teurer Fehler in diesem Spiel.'),
        ).toBeVisible();
        await next(page).click();
      }
    }
    expect(marked, 'In einem der Spiele hat Max eine Stelle markiert').toBe(true);
    expect(errors).toEqual([]);
  });
}

test('Am Tisch mit Freunden gibt es keinen Trainer', async ({ context }) => {
  const table = await newTisch(context);
  await seatedLobby(table);
  // Keine Einstellung in der Lobby …
  await expect(table.host.getByRole('heading', { name: 'Trainer' })).toHaveCount(0);
  await startGame(table);
  // … und keine Figur, keine Sprechblase am Tisch – bei Gastgeber und Gast.
  for (const page of [table.host, table.guest]) {
    await expect(page.getByRole('group', { name: 'Deine Karten' })).toBeVisible();
    await expect(page.locator('.tutor-figur')).toHaveCount(0);
    await expect(tutorBubble(page)).toHaveCount(0);
  }
});

test('Ausgeschaltet sitzt Max Weber nicht mit am Tisch', async ({ page }) => {
  await openStart(page);
  await page.getByLabel('Dein Name').fill('Hanni');
  await page.getByRole('button', { name: 'Allein gegen Bots' }).click();
  const on = page.getByRole('checkbox', { name: 'Max Weber schaut mir über die Schulter' });
  await expect(on).toBeChecked();
  await on.uncheck();
  await expect(page.getByRole('checkbox', { name: /Meldet sich/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(page.getByRole('group', { name: 'Deine Karten' })).toBeVisible();
  await expect(page.locator('.tutor-figur')).toHaveCount(0);
  // Die Wahl gilt für dieses Gerät; beim nächsten Tisch ist sie noch aus.
  expect(await page.evaluate(() => localStorage.getItem('schafkopf.tutor'))).toContain(
    '"on":false',
  );
});
