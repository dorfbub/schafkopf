import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import {
  type HandState,
  DEFAULT_RULES,
  applyAction,
  createRng,
  dealHand,
  handViewFor,
} from '@schafkopf/core';
import { type StrongBotOptions, createHeuristicBot, evaluateCards } from '../src';

/**
 * Entscheidungsverlust gegen die wahre Verteilung (B5): In Spielen mit vier Normal-Bots wird an
 * jeder Kartenwahl mit mehr als einer erlaubten Karte gefragt, welche Karte die Suche (je
 * Variante) wählt, und was diese Karte auf der wahren Verteilung bringt – im Vergleich zur besten
 * Karte dort (Probespiel mit den echten Händen, Heuristik überall). Viel weniger Rauschen als
 * ganze Spiele, weil alle Varianten dieselben Lagen sehen. Nur unter Node, nicht in CI:
 *
 *   for i in $(seq 0 15); do B5_VERLUST=$i/16 npx vitest run packages/bots/test/gewichtungVerlust.test.ts & done; wait
 *   B5_VERLUST_ZUSAMMEN=1 npx vitest run packages/bots/test/gewichtungVerlust.test.ts
 *
 * `B5_VERLUST_SPIELE` (Standard 960) und `B5_VERLUST_VARIANTEN` (JSON: [Name, StrongBotOptions][])
 * bei beiden Befehlen gleich setzen. Ergebnisse: docs/STRATEGIEN.md, „Gewichtete Verteilungen“.
 */
const TEIL = process.env.B5_VERLUST;
const ZUSAMMEN = Boolean(process.env.B5_VERLUST_ZUSAMMEN);
const SPIELE = Number(process.env.B5_VERLUST_SPIELE ?? 960);
const VARIANTEN: [string, StrongBotOptions][] = JSON.parse(
  process.env.B5_VERLUST_VARIANTEN ??
    JSON.stringify([
      ['vor B5', { inference: false, playBudget: 2000, minSamples: 6, maxSamples: 40 }],
      ['ohne Gewichtung', { inference: false }],
      ['mit Gewichtung', {}],
    ]),
);
const ORDNER = join(
  fileURLToPath(new URL('../messungen/b5-verlust', import.meta.url)),
  Buffer.from(JSON.stringify({ SPIELE, VARIANTEN })).toString('base64url'),
);

interface Summe {
  name: string;
  n: number;
  sum: number;
  /** Unterschied zur ersten Variante (gepaart). */
  dsum: number;
  dsq: number;
}

describe('Entscheidungsverlust gegen die wahre Verteilung', () => {
  it.skipIf(!TEIL)('Teil messen', { timeout: 7_200_000 }, () => {
    const [index, of] = TEIL!.split('/').map(Number) as [number, number];
    const acc: Summe[] = VARIANTEN.map(([name]) => ({ name, n: 0, sum: 0, dsum: 0, dsq: 0 }));
    for (let g = index; g < SPIELE; g += of) {
      const bots = [0, 1, 2, 3].map((s) => createHeuristicBot(7000 + 4 * g + s));
      let state: HandState = dealHand(DEFAULT_RULES, g % 4, 50000 + g);
      while (state.phase !== 'finished') {
        const view = handViewFor(state, state.turn);
        if (state.phase === 'playing' && view.legalCards.length > 1) {
          const hands = state.hands;
          const truth = evaluateCards(view, state.tricks, createRng(1), {
            rules: DEFAULT_RULES,
            peek: () => hands,
          });
          const best = Math.max(...truth.map((e) => e.cents));
          const seed = g * 1000 + state.tricks.length * 10 + state.currentTrick.cards.length;
          let first = 0;
          VARIANTEN.forEach(([, options], vi) => {
            const ev = evaluateCards(view, state.tricks, createRng(seed), {
              rules: DEFAULT_RULES,
              ...options,
            });
            let pick = 0;
            ev.forEach((e, j) => {
              if (e.cents > ev[pick]!.cents + 1e-9) pick = j;
            });
            const loss = best - truth[pick]!.cents;
            if (vi === 0) first = loss;
            const a = acc[vi]!;
            a.n++;
            a.sum += loss;
            a.dsum += loss - first;
            a.dsq += (loss - first) ** 2;
          });
        }
        const action = bots[state.turn]!.decide(view, DEFAULT_RULES);
        const r = applyAction(state, { ...action, seat: state.turn });
        if (!r.ok) throw new Error(r.error);
        state = r.state;
      }
    }
    mkdirSync(ORDNER, { recursive: true });
    writeFileSync(join(ORDNER, `${index}-${of}.json`), JSON.stringify(acc));
  });

  it.skipIf(!ZUSAMMEN)('zusammenrechnen', () => {
    const total = new Map<string, Summe>();
    for (const f of readdirSync(ORDNER)) {
      for (const a of JSON.parse(readFileSync(join(ORDNER, f), 'utf8')) as Summe[]) {
        const t = total.get(a.name) ?? { name: a.name, n: 0, sum: 0, dsum: 0, dsq: 0 };
        t.n += a.n;
        t.sum += a.sum;
        t.dsum += a.dsum;
        t.dsq += a.dsq;
        total.set(a.name, t);
      }
    }
    const first = VARIANTEN[0]![0];
    for (const t of total.values()) {
      const d = t.dsum / t.n;
      const se = Math.sqrt(Math.max(0, t.dsq / t.n - d * d) / t.n);
      const line = `${t.name}: Verlust ${(t.sum / t.n).toFixed(2)} ct je Entscheidung, gegen „${first}“ ${d.toFixed(2)} ± ${se.toFixed(2)} (${t.n} Entscheidungen)`;
      console.log(line);
      process.stderr.write(line + '\n');
    }
  });
});
