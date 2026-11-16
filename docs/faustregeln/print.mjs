/* global document */
// Druckt faustregeln.html als A4-PDF nach docs/Schafkopf-Faustregeln.pdf.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + path.join(dir, 'faustregeln.html'));
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: path.join(dir, '..', 'Schafkopf-Faustregeln.pdf'),
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
