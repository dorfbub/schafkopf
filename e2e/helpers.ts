import { type BrowserContext, type Page, expect } from '@playwright/test';

/** Verkürzte Zeiten und der Transport ohne Relays; gilt nur im E2E-Build (`VITE_E2E=1`). */
export const E2E_QUERY = 'transport=broadcast&botDelay=0&standIn=3000&kontraWindow=4000';

export interface Tisch {
  host: Page;
  guest: Page;
}

/** Konsolenfehler und unbehandelte Ausnahmen einer Seite sammeln. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

export async function openStart(page: Page, query = E2E_QUERY): Promise<void> {
  await page.goto(`/?${query}`);
  await expect(page.getByRole('heading', { name: 'Schafkopf', level: 1 })).toBeVisible();
}

/** Gastgeber eröffnet einen Tisch mit Einladungslink; gibt den Link zurück. */
export async function hostOpens(page: Page, name: string, query = E2E_QUERY): Promise<string> {
  await openStart(page, query);
  await page.getByLabel('Dein Name').fill(name);
  await page.getByRole('button', { name: 'Mit Freunden spielen' }).click();
  const link = page.getByLabel('Einladungslink');
  await expect(link).toBeVisible();
  return link.inputValue();
}

export async function guestJoins(page: Page, link: string, name: string): Promise<void> {
  await page.goto(link);
  await page.getByLabel('Dein Name').fill(name);
  await page.getByRole('button', { name: 'Beitreten' }).click();
  await expect(page.getByRole('heading', { name: /^Tisch / })).toBeVisible();
}

/** Allein gegen Bots: Tisch eröffnen und das erste Spiel starten. */
export async function startSolo(page: Page, name = 'Hanni'): Promise<void> {
  await openStart(page);
  await page.getByLabel('Dein Name').fill(name);
  await page.getByRole('button', { name: 'Allein gegen Bots' }).click();
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(page.getByRole('group', { name: 'Deine Karten' })).toBeVisible();
}

/** Zwei Tabs im selben Browser (nur dort sprechen sie über BroadcastChannel). */
export async function newTisch(context: BrowserContext): Promise<Tisch> {
  return { host: await context.newPage(), guest: await context.newPage() };
}

/** Gastgeber und Gast sitzen in der Lobby; der Gast hat einen Platz genommen. */
export async function seatedLobby(table: Tisch, query = E2E_QUERY): Promise<void> {
  const link = await hostOpens(table.host, 'Hanni', query);
  await guestJoins(table.guest, link, 'Sepp');
  await table.guest
    .getByRole('button', { name: /Platz \d ist frei – hier sitzen/ })
    .first()
    .click();
  await expect(table.host.getByRole('group', { name: /^Sepp/ })).toBeVisible();
}

export async function startGame(table: Tisch): Promise<void> {
  await table.host.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(table.host.getByRole('group', { name: 'Deine Karten' })).toBeVisible();
  await expect(table.guest.getByRole('group', { name: 'Deine Karten' })).toBeVisible();
}

const PASS = ['weiter', 'Weiter', 'Gut', 'Aufgeben'];

/**
 * Ein Zug für einen menschlichen Spieler: aussteigen, wenn angesagt wird, sonst die erste
 * erlaubte Karte spielen. Gibt zurück, ob etwas getan wurde.
 */
export async function act(page: Page): Promise<boolean> {
  for (const name of PASS) {
    const button = page.getByRole('dialog').getByRole('button', { name, exact: true });
    if (await button.isVisible()) {
      await button.click();
      return true;
    }
  }
  const card = page.getByRole('group', { name: 'Deine Karten' }).getByRole('button').first();
  if (await card.isVisible()) {
    await card.click();
    return true;
  }
  return false;
}

export interface Ergebnis {
  title: string;
  rows: string[];
}

/** Liest das Ergebnis eines Spiels: Überschrift und die Zeilen der Tabelle ohne „(du)“. */
export async function readResult(page: Page): Promise<Ergebnis> {
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('table') });
  const title = (await dialog.getByRole('heading').innerText()).trim();
  const rows = await dialog.getByRole('row').evaluateAll((els) =>
    els.map((r) =>
      (r.textContent ?? '')
        .replace(/\s*\(du\)/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    ),
  );
  return { title, rows };
}

/**
 * Spielt, bis ein Spiel mit Ergebnis (nicht „zusammengeworfen“) fertig ist. Die Spieler
 * wirken abwechselnd; ist bei beiden das Ergebnis da, kommt es zurück. Wurde zusammengeworfen,
 * gibt der Gastgeber das nächste Spiel.
 */
export async function playUntilResult(
  table: Tisch,
  humans: Page[] = [table.host, table.guest],
): Promise<{ host: Ergebnis; guest: Ergebnis | null }> {
  const deadline = Date.now() + 70_000;
  while (Date.now() < deadline) {
    const hostDone = await table.host.getByRole('button', { name: 'Nächstes Spiel' }).isVisible();
    const guestDone =
      !humans.includes(table.guest) ||
      (await table.guest.getByText('Der Gastgeber gibt das nächste Spiel.').isVisible());
    if (hostDone && guestDone) {
      const host = await readResult(table.host);
      if (!/zusammengeworfen/.test(host.title))
        return { host, guest: humans.includes(table.guest) ? await readResult(table.guest) : null };
      await table.host.getByRole('button', { name: 'Nächstes Spiel' }).click();
      continue;
    }
    const moved = [];
    for (const page of humans) moved.push(await act(page));
    if (!moved.some(Boolean)) await table.host.waitForTimeout(50);
  }
  throw new Error('Kein Spielergebnis innerhalb der Frist');
}

/**
 * Spielt (beide steigen aus der Ansage aus), bis einer der beiden Menschen Kontra sagen darf, und
 * sagt es. Gibt die Seite zurück, die Kontra gesagt hat.
 */
export async function playUntilKontra(table: Tisch): Promise<Page> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    for (const page of [table.host, table.guest]) {
      const kontra = page.getByRole('button', { name: /^Kontra geben/ });
      if (await kontra.isVisible()) {
        await kontra.click();
        return page;
      }
    }
    await nextIfThrownIn(table.host);
    // Liegt schon eine Karte, ist das Fenster zu: dieses Spiel zu Ende spielen.
    const moved = [await act(table.host), await act(table.guest)];
    if (!moved.some(Boolean)) await table.host.waitForTimeout(50);
  }
  throw new Error('Nie Kontra möglich');
}

/** Spielt, bis im Stich mindestens eine Karte liegt (das Spiel ist dann im Gang, mitten im Stich). */
export async function playUntilCardOnTable(table: Tisch): Promise<void> {
  const trick = table.host.getByRole('group', { name: 'Stich', exact: true }).getByRole('img');
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if ((await trick.count()) > 0) return;
    // Alle weiter: zusammengeworfen, der Gastgeber gibt neu.
    await nextIfThrownIn(table.host);
    const moved = [await act(table.host), await act(table.guest)];
    if (!moved.some(Boolean)) await table.host.waitForTimeout(50);
  }
  throw new Error('Keine Karte im Stich');
}

async function nextIfThrownIn(host: Page): Promise<void> {
  const next = host.getByRole('button', { name: 'Nächstes Spiel' });
  if (await next.isVisible()) await next.click();
}
