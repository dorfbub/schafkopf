import { readFileSync, writeFileSync } from 'node:fs';
import { RULE_IDS } from '../src';
import type { Messergebnis } from './messen';

const SRC = new URL('../src/werte.ts', import.meta.url);
const TABELLE = new URL('../messungen/tabelle.md', import.meta.url);

const fmt = (x: number | null, stellen = 1) =>
  x === null ? '–' : x.toFixed(stellen).replace('.', ',');

/** Urteil zu einer Messung für die Tabelle. */
export function urteil(r: Messergebnis): string {
  if (r.zuSelten || r.cents === null || r.fehler === null) return 'zu selten';
  if (r.cents > 2 * r.fehler) return 'nützlich';
  if (r.cents < -2 * r.fehler) return 'schadet';
  return 'kein messbarer Nutzen';
}

/** Schreibt `src/werte.ts` (nur gemessene Regeln) und `messungen/tabelle.md` (alle 31). */
export function schreibeWerte(results: readonly Messergebnis[]): void {
  const byId = new Map(results.map((r) => [r.regel, r]));
  const missing = RULE_IDS.filter((id) => !byId.has(id));
  if (missing.length > 0) throw new Error(`Nicht gemessen: ${missing.join(', ')}`);
  const measured = RULE_IDS.map((id) => byId.get(id)!).filter((r) => !r.zuSelten);

  const entries = measured
    .map((r) => {
      const freq = Math.round((r.vorkommen / r.spiele) * 1000) / 1000;
      return `  '${r.regel}': { cents: ${r.cents}, fehler: ${r.fehler}, lagen: ${r.lagen}, haeufigkeit: ${freq} },`;
    })
    .join('\n');
  const src = (readFileSync(SRC, 'utf8') as string).replace(
    /export const REGELWERTE: Partial<Record<RuleId, Messung>> = \{[\s\S]*?\n\};/,
    `export const REGELWERTE: Partial<Record<RuleId, Messung>> = {\n${entries}\n};`,
  );
  writeFileSync(SRC, src);

  const rows = RULE_IDS.map((id) => byId.get(id)!).sort(
    (a, b) => (b.cents ?? -Infinity) - (a.cents ?? -Infinity),
  );
  const lines = [
    '| Regel | Wert (ct) | ± Fehler | Lagen | Vorkommen je Spiel | Urteil |',
    '| ----- | --------: | -------: | ----: | -----------------: | ------ |',
    ...rows.map(
      (r) =>
        `| \`${r.regel}\` | ${fmt(r.cents)} | ${fmt(r.fehler)} | ${r.lagen} | ${fmt(r.vorkommen / r.spiele, 3)} | ${urteil(r)} |`,
    ),
  ];
  writeFileSync(TABELLE, lines.join('\n') + '\n');
}
