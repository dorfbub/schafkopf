import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, it } from 'vitest';
import { RULE_IDS, type RuleId } from '../src';
import { type Messergebnis, STANDARD_PARAMETER, messen, regelsatzFuer } from '../scripts/messen';
import { schreibeWerte } from '../scripts/werte';

/**
 * Faustregeln nachmessen (T4) – läuft nur mit Umgebungsvariable, nie in CI. Anleitung:
 * docs/STRATEGIEN.md, Abschnitt „Messung“.
 *
 *   TUTOR_MESSEN=1 npx vitest run packages/tutor/test/messen.test.ts          # messen
 *   TUTOR_MESSEN_ZUSAMMEN=1 npx vitest run packages/tutor/test/messen.test.ts # werte.ts + Tabelle
 *
 * Einstellungen (alle optional): TUTOR_MESSEN_TEIL=i/n (nur jede n-te Regel, ab i; zum
 * Parallelisieren), TUTOR_MESSEN_REGELN=a,b (nur diese Regeln), TUTOR_MESSEN_SPIELE,
 * TUTOR_MESSEN_LAGEN, TUTOR_MESSEN_DIR (Ausgabeordner statt messungen/, zum Vergleichen von Varianten).
 */
const DIR = process.env.TUTOR_MESSEN_DIR
  ? pathToFileURL(process.env.TUTOR_MESSEN_DIR.replace(/\/?$/, '/'))
  : new URL('../messungen/', import.meta.url);

describe.skipIf(!process.env.TUTOR_MESSEN)('Faustregeln messen', () => {
  it(
    'misst die gewählten Regeln und schreibt messungen/<regel>.json',
    { timeout: 3_600_000 },
    () => {
      const env = process.env;
      const parameter = {
        ...STANDARD_PARAMETER,
        ...(env.TUTOR_MESSEN_SPIELE ? { spiele: Number(env.TUTOR_MESSEN_SPIELE) } : {}),
        ...(env.TUTOR_MESSEN_LAGEN ? { lagen: Number(env.TUTOR_MESSEN_LAGEN) } : {}),
      };
      let ids: RuleId[] = [...RULE_IDS];
      if (env.TUTOR_MESSEN_REGELN) ids = env.TUTOR_MESSEN_REGELN.split(',') as RuleId[];
      if (env.TUTOR_MESSEN_TEIL) {
        const [i, n] = env.TUTOR_MESSEN_TEIL.split('/').map(Number) as [number, number];
        ids = ids.filter((_, k) => k % n === i);
      }
      mkdirSync(DIR, { recursive: true });
      for (const set of ['standard', 'kontra', 'ramsch', 'hochzeit'] as const) {
        const group = ids.filter((id) => regelsatzFuer(id) === set);
        if (group.length === 0) continue;
        const start = performance.now();
        for (const r of messen(group, set, parameter, console.log)) {
          writeFileSync(new URL(`${r.regel}.json`, DIR), JSON.stringify(r, null, 2) + '\n');
        }
        console.log(
          `${set}: ${group.length} Regeln in ${Math.round((performance.now() - start) / 1000)} s`,
        );
      }
    },
  );
});

describe.skipIf(!process.env.TUTOR_MESSEN_ZUSAMMEN)('Faustregeln: Messungen zusammenführen', () => {
  it('schreibt src/werte.ts und messungen/tabelle.md', () => {
    const results = readdirSync(DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(new URL(f, DIR), 'utf8')) as Messergebnis);
    schreibeWerte(results);
  });
});
