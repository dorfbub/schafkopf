import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import {
  type Parameter,
  type Probe,
  type Stueck,
  STANDARD_PARAMETER,
  STARK_VERTEIDIGT,
  messeStueck,
  stuecke,
} from '../scripts/ansage-tabellen';
import { schreibeTabelle } from '../scripts/ansage-schreiben';

/**
 * Ansage-Tabellen erzeugen (B4) – läuft nur mit Umgebungsvariable, nie in CI. Anleitung:
 * docs/STRATEGIEN.md, Abschnitt „Ansage-Tabellen“.
 *
 *   ANSAGE_MESSEN=1 ANSAGE_TEIL=0/16 npx vitest run packages/bots/test/ansageTabellen.test.ts
 *   ANSAGE_ZUSAMMEN=1 npx vitest run packages/bots/test/ansageTabellen.test.ts
 *
 * Der erste Befehl misst jedes 16. Stück ab 0 (für 16 Prozesse parallel: TEIL=0/16 … 15/16) und
 * schreibt `messungen/ansage/roh/*.json` (nicht eingecheckt). Der zweite schätzt die Modelle und
 * schreibt `src/ansageTabelle.ts` und `messungen/ansage/tabelle.md`. Einstellungen (optional):
 * ANSAGE_BLAETTER, ANSAGE_VERTEILUNGEN, ANSAGE_SEED, ANSAGE_BETTEL_BLAETTER,
 * ANSAGE_BETTEL_VERTEILUNGEN (Bettel mit „Stark“ als Gegenspieler).
 */
const ROH = new URL('../messungen/ansage/roh/', import.meta.url);

function parameter(): Parameter {
  const env = process.env;
  return {
    ...STANDARD_PARAMETER,
    ...(env.ANSAGE_BLAETTER ? { blaetter: Number(env.ANSAGE_BLAETTER) } : {}),
    ...(env.ANSAGE_VERTEILUNGEN ? { verteilungen: Number(env.ANSAGE_VERTEILUNGEN) } : {}),
    ...(env.ANSAGE_SEED ? { seed: Number(env.ANSAGE_SEED) } : {}),
    ...(env.ANSAGE_BETTEL_BLAETTER ? { bettelBlaetter: Number(env.ANSAGE_BETTEL_BLAETTER) } : {}),
    ...(env.ANSAGE_BETTEL_VERTEILUNGEN
      ? { bettelVerteilungen: Number(env.ANSAGE_BETTEL_VERTEILUNGEN) }
      : {}),
  };
}

/** Rohdaten je Parametersatz in einem eigenen Ordner, damit Probeläufe nichts vermischen. */
const ordner = (p: Parameter) =>
  new URL(`${p.seed}-${p.blaetter}-${p.verteilungen}-${p.stueck}/`, ROH);
/** Mit „Stark“ verteidigte Spielarten tragen ihren eigenen Umfang im Namen (eigene Messung). */
const datei = (p: Parameter, s: Stueck) => {
  const extra = STARK_VERTEIDIGT.includes(s.kind)
    ? `_stark-${p.bettelBlaetter}-${p.bettelVerteilungen}`
    : '';
  return new URL(`${s.besetzung.replace('/', '-')}_${s.kind}${extra}_${s.teil}.json`, ordner(p));
};

describe.skipIf(!process.env.ANSAGE_MESSEN)('Ansage-Tabellen messen', () => {
  it('misst die Stücke dieses Teils', { timeout: 24 * 3_600_000 }, () => {
    const p = parameter();
    const [i, n] = (process.env.ANSAGE_TEIL ?? '0/1').split('/').map(Number) as [number, number];
    mkdirSync(ordner(p), { recursive: true });
    const meine = stuecke(p).filter((_, k) => k % n === i);
    for (const s of meine) {
      if (existsSync(datei(p, s))) continue; // abgebrochene Läufe setzen fort
      const start = performance.now();
      const proben = messeStueck(p, s);
      writeFileSync(datei(p, s), JSON.stringify({ parameter: p, stueck: s, proben }));
      const sek = Math.round((performance.now() - start) / 1000);
      console.log(`${s.besetzung} ${s.kind} Teil ${s.teil}: ${proben.length} Blätter, ${sek} s`);
    }
  });
});

describe.skipIf(!process.env.ANSAGE_ZUSAMMEN)('Ansage-Tabellen zusammenführen', () => {
  it('schätzt die Modelle und schreibt Tabelle und Bericht', { timeout: 3_600_000 }, () => {
    const p = parameter();
    const alle = new Map<string, Probe[]>();
    for (const s of stuecke(p)) {
      if (!existsSync(datei(p, s))) throw new Error(`Fehlt: ${datei(p, s).pathname}`);
      const roh = JSON.parse(readFileSync(datei(p, s), 'utf8') as string) as { proben: Probe[] };
      const key = `${s.besetzung}|${s.kind}`;
      alle.set(key, [...(alle.get(key) ?? []), ...roh.proben]);
    }
    schreibeTabelle(p, alle, console.log);
  });
});
