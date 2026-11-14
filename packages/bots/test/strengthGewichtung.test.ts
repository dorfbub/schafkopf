import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from '@schafkopf/core';
import {
  type InferenceParams,
  type StrongBotOptions,
  createHeuristicBot,
  createStrongBot,
} from '../src';
import { compare } from './duel';

/**
 * Gewichtete Verteilungen (B5): das heutige „Stark“ (Gewichtung, Budget 5000) gegen „Stark“ vor B5
 * (gleich wahrscheinliche Verteilungen, Budget 2000), beide auf demselben Platz mit denselben
 * Karten gegen dieselben Normal-Bots (`compare`). Positiv heißt: das neue ist besser.
 * Gemessen (16 000 Spiele): +2,03 ± 0,35 ct je Spiel; nur das Budget (`B5_NEU='{"inference":false}'`)
 * +1,57 ± 0,33; nur die Gewichtung (`B5_ALT='{"inference":false}'`) +0,46 ± 0,34.
 * Teuer (rund eine Sekunde je Spiel), daher nur im großen Lauf:
 *
 *   BOTS_FULL=1 npx vitest run packages/bots/test/strengthGewichtung.test.ts
 *
 * Parallel (16 Teile, dann zusammenrechnen; Messwerte: docs/STRATEGIEN.md, „Gewichtete
 * Verteilungen (B5)“):
 *
 *   for i in $(seq 0 15); do B5_TEIL=$i/16 npx vitest run packages/bots/test/strengthGewichtung.test.ts & done; wait
 *   B5_ZUSAMMEN=1 npx vitest run packages/bots/test/strengthGewichtung.test.ts
 *
 * `B5_SPIELE` (Standard 16 000), `B5_NEU`, `B5_ALT` (JSON, Optionen von Prüfling und Referenz)
 * und `B5_PARAMETER` (JSON, Teil von `InferenceParams`) bei beiden Befehlen gleich setzen;
 * Teilergebnisse liegen in `B5_ORDNER` (Standard: messungen/b5 im Paket, nicht eingecheckt).
 */
const FULL = Boolean(process.env.BOTS_FULL);
const TEIL = process.env.B5_TEIL;
const ZUSAMMEN = Boolean(process.env.B5_ZUSAMMEN);
const SPIELE = Number(process.env.B5_SPIELE ?? 16000);
const PARAMETER: Partial<InferenceParams> = JSON.parse(process.env.B5_PARAMETER ?? '{}');
const ORDNER = process.env.B5_ORDNER ?? fileURLToPath(new URL('../messungen/b5', import.meta.url));

/** Mindestvorteil im großen Lauf (Cent je Spiel), zusätzlich mehr als drei Standardfehler. */
const SCHWELLE = 1;

/** „Stark“ vor B5: gleich verteilte Verteilungen, Budget wie in B2. */
const VOR_B5: StrongBotOptions = {
  inference: false,
  playBudget: 2000,
  minSamples: 6,
  maxSamples: 40,
};
/** Weitere Optionen für den Prüfling (JSON), etwa `{"inference":false}` für nur das Budget. */
const NEU: StrongBotOptions = JSON.parse(process.env.B5_NEU ?? '{}');

const neu = (seed: number) => createStrongBot(seed, { inference: PARAMETER, ...NEU });
/** Referenz (JSON); Standard „Stark“ vor B5. `{"inference":false}`: heutiges Budget ohne Gewichtung. */
const ALT: StrongBotOptions = process.env.B5_ALT ? JSON.parse(process.env.B5_ALT) : VOR_B5;
const alt = (seed: number) => createStrongBot(seed, ALT);

function datei(): string {
  const key = Buffer.from(JSON.stringify({ SPIELE, PARAMETER, NEU, ALT })).toString('base64url');
  return join(ORDNER, key);
}

describe('Gewichtete Verteilungen: Stark heute gegen Stark vor B5', () => {
  it.skipIf(!TEIL)('Teil messen', { timeout: 7_200_000 }, () => {
    const [index, of] = TEIL!.split('/').map(Number) as [number, number];
    const r = compare(SPIELE, neu, alt, createHeuristicBot, DEFAULT_RULES, { index, of });
    mkdirSync(datei(), { recursive: true });
    writeFileSync(join(datei(), `${index}-${of}.json`), JSON.stringify(r));
  });

  it.skipIf(!ZUSAMMEN && !FULL)(
    'das neue Stark ist besser als das vor B5',
    { timeout: 7_200_000 },
    () => {
      let games = 0;
      let sum = 0;
      let sq = 0;
      if (ZUSAMMEN) {
        expect(existsSync(datei())).toBe(true);
        for (const f of readdirSync(datei())) {
          const r = JSON.parse(readFileSync(join(datei(), f), 'utf8'));
          games += r.games;
          sum += r.sum;
          sq += r.sq;
        }
      } else {
        const r = compare(SPIELE, neu, alt, createHeuristicBot);
        ({ games, sum, sq } = r);
      }
      const paired = sum / games;
      const stdError = Math.sqrt(Math.max(0, sq / games - paired ** 2) / games);
      const line = `Neu gegen Referenz (${games} Spiele, ${JSON.stringify({ PARAMETER, NEU, ALT })}): ${paired.toFixed(2)} ± ${stdError.toFixed(2)} ct je Spiel`;
      console.log(line);
      process.stderr.write(line + '\n');
      expect(games).toBe(SPIELE);
      expect(paired).toBeGreaterThan(SCHWELLE);
      expect(paired).toBeGreaterThan(3 * stdError);
    },
  );
});
