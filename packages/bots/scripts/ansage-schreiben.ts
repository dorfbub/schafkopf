import { writeFileSync } from 'node:fs';
import type { ContractKind } from '@schafkopf/core';
import type { AnsageModell } from '../src/ansage';
import {
  type Guete,
  type Parameter,
  type Probe,
  BESETZUNGEN,
  guete,
  passeAn,
  teile,
} from './ansage-tabellen';

const SRC = new URL('../src/ansageTabelle.ts', import.meta.url);
const BERICHT = new URL('../messungen/ansage/tabelle.md', import.meta.url);

const fmt = (x: number, stellen = 1) => x.toFixed(stellen).replace('.', ',').replace('-', '−');

/**
 * Schätzt alle Modelle, prüft sie auf zurückgelegten Blättern und schreibt `src/ansageTabelle.ts`
 * (Modelle aus allen Blättern) und `messungen/ansage/tabelle.md` (Gütemaße).
 */
export function schreibeTabelle(
  p: Parameter,
  alle: ReadonlyMap<string, Probe[]>,
  log: (s: string) => void,
): void {
  const modelle: Record<string, Partial<Record<ContractKind, AnsageModell>>> = {};
  const gueten: Guete[] = [];
  for (const b of BESETZUNGEN) {
    modelle[b.key] = {};
    for (const [key, proben] of alle) {
      const [besetzung, kind] = key.split('|') as [string, ContractKind];
      if (besetzung !== b.key) continue;
      const { lern, test } = teile(proben);
      const g = guete(test, b, kind, passeAn(lern, b, kind));
      gueten.push(g);
      log(
        `${b.key} ${kind}: R² ${g.r2}, Treffer ${g.treffer}, Verlust ${g.verlust} (Heuristik ${g.verlustHeuristik})`,
      );
      modelle[b.key]![kind] = passeAn(proben, b, kind);
    }
  }
  const stand = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  for (const [key, kinds] of Object.entries(modelle)) {
    lines.push(`    '${key}': {`);
    for (const [kind, model] of Object.entries(kinds)) {
      lines.push(`      ${kind}: {`);
      for (const [ziel, w] of Object.entries(model))
        lines.push(`        ${ziel}: [${w!.map((x) => (x === 0 ? '' : x)).join(',')}],`);
      lines.push('      },');
    }
    lines.push('    },');
  }
  const erzeugung = `{ seed: ${p.seed}, blaetter: ${p.blaetter}, verteilungen: ${p.verteilungen}, bettelBlaetter: ${p.bettelBlaetter}, bettelVerteilungen: ${p.bettelVerteilungen}, stand: '${stand}' }`;
  const body = `{\n  erzeugung: ${erzeugung},\n  modelle: {\n${lines.join('\n')}\n  },\n}`;
  writeFileSync(
    SRC,
    `import type { AnsageTabelle } from './ansage';

/**
 * Erzeugt von \`packages/bots/scripts/ansage-tabellen.ts\` (B4) – nicht von Hand ändern.
 * Anleitung: docs/STRATEGIEN.md, „Ansage-Tabellen“.
 */
// Gewichte 0 stehen als Lücke im Feld ([1,,2]); das liest \`ansage.ts\` als 0 und spart Platz im Bündel.
/* eslint-disable no-sparse-arrays */
// prettier-ignore
export const ANSAGE_TABELLE: AnsageTabelle = ${body};
`,
  );

  const rows = gueten.map(
    (g) =>
      `| ${g.besetzung} | ${g.kind} | ${g.blaetter} | ${fmt(g.mittel)} | ${fmt(100 * g.lohnt, 0)} % | ${fmt(g.rauschen)} | ${fmt(g.rmse)} | ${fmt(g.r2, 2)} | ${fmt(100 * g.treffer, 0)} % | ${fmt(g.verlust, 2)} | ${fmt(g.verlustHeuristik, 2)} |`,
  );
  writeFileSync(
    BERICHT,
    `# Ansage-Tabellen – Güte (B4)

Erzeugt von \`packages/bots/scripts/ansage-schreiben.ts\` am ${stand}. Seed ${p.seed}, ${p.blaetter}
Blätter je Spielart und Besetzung, je ${p.verteilungen} Verteilungen, Gegenspieler Heuristik; Bettel:
${p.bettelBlaetter} Blätter, je ${p.bettelVerteilungen} Verteilungen, Gegenspieler „Stark“. Geprüft auf jedem fünften
Blatt, geschätzt auf den übrigen (die Tabelle selbst nutzt danach alle). Cent nach Standardtarif,
aus Sicht des Ansagers, gewichtet wie gezogen.

- **Mittel:** gemessener Wert des Spiels im Schnitt über die Blätter im Bereich der Tabelle.
- **lohnt:** Anteil der Blätter, mit denen das Spiel im Schnitt Gewinn bringt.
- **Rauschen:** Standardfehler der Messung je Blatt – so genau kennt man den „wahren“ Wert selbst.
- **RMSE, R²:** Abstand der Tabelle zur Messung je Blatt (enthält das Rauschen).
- **Treffer:** Anteil der Blätter, bei denen Tabelle und Messung gleich entscheiden (lohnt / lohnt nicht).
- **Verlust:** was die falschen Entscheidungen im Schnitt je Blatt kosten (Cent), mit der Tabelle bzw.
  mit der alten Heuristik (\`rateContract\`, Marge ≥ 0).

| Besetzung | Spielart | Blätter | Mittel | lohnt | Rauschen | RMSE | R² | Treffer | Verlust | Verlust Heuristik |
| --------- | -------- | ------: | -----: | ----: | -------: | ---: | -: | ------: | ------: | ----------------: |
${rows.join('\n')}
`,
  );
}
