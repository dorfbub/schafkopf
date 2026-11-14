import type { RuleId } from './rules';
import type { RuleValue } from './types';

/** Ergebnis der Messung einer Faustregel (siehe `packages/tutor/scripts/messen.ts`). */
export interface Messung extends RuleValue {
  /** Wie oft die Lage je Spiel am Tisch vorkommt (alle Sitze zusammen). */
  haeufigkeit: number;
}

/**
 * Gemessene Werte der Faustregeln. Diese Datei erzeugt das Messskript; nicht von Hand ändern.
 * Fehlt eine Regel, war ihre Lage zu selten (oder sie ist noch nicht gemessen).
 */
export const REGELWERTE: Partial<Record<RuleId, Messung>> = {
  'ansage.zu.schwach': { cents: -0.27, fehler: 0.34, lagen: 1500, haeufigkeit: 2.147 },
  'ansage.sauspiel.grundblatt': { cents: 31.09, fehler: 2.51, lagen: 1500, haeufigkeit: 1.276 },
  'ansage.solo.trumpflaenge': { cents: 55.13, fehler: 3.21, lagen: 1500, haeufigkeit: 1.152 },
  'ansage.wenz.unter.und.farben': { cents: 65.1, fehler: 3.28, lagen: 1500, haeufigkeit: 0.281 },
  'ansage.bettel.nur.sicher': { cents: 25.32, fehler: 2.12, lagen: 1500, haeufigkeit: 0.22 },
  'ansage.tout.nur.sicher': { cents: 56.41, fehler: 4.32, lagen: 1500, haeufigkeit: 0.593 },
  'zweikampf.eigener.wert': { cents: 16.96, fehler: 2.56, lagen: 1500, haeufigkeit: 2.416 },
  'hochzeit.zwei.sauen': { cents: 7, fehler: 1.06, lagen: 1113, haeufigkeit: 0.135 },
  'hochzeit.ablehnen.schwach': { cents: 5.64, fehler: 0.89, lagen: 1217, haeufigkeit: 0.061 },
  'hochzeit.zurueckgeben.farbe.frei': {
    cents: 1.86,
    fehler: 0.49,
    lagen: 1121,
    haeufigkeit: 0.056,
  },
  'hochzeit.zurueckgeben.klein': { cents: 1.61, fehler: 0.45, lagen: 1287, haeufigkeit: 0.064 },
  'kontra.gegen.partnerspiel': { cents: 13.21, fehler: 0.55, lagen: 1500, haeufigkeit: 0.189 },
  'kontra.gegen.einzelspiel': { cents: 30.33, fehler: 1.4, lagen: 1500, haeufigkeit: 0.326 },
  'spieler.solo.von.oben': { cents: 3.4, fehler: 2.95, lagen: 1500, haeufigkeit: 0.719 },
  'spieler.trumpf.ziehen': { cents: 11.76, fehler: 2.19, lagen: 1500, haeufigkeit: 2.688 },
  'spieler.rufsau.nicht.selbst.suchen': {
    cents: 0.6,
    fehler: 0.45,
    lagen: 1500,
    haeufigkeit: 0.519,
  },
  'spieler.farbe.nach.trumpf': { cents: 15.79, fehler: 2.54, lagen: 1500, haeufigkeit: 0.623 },
  'mitspieler.trumpf.spielen': { cents: 0.37, fehler: 0.43, lagen: 1500, haeufigkeit: 0.243 },
  'gegner.rufsau.suchen': { cents: 0.99, fehler: 0.4, lagen: 1500, haeufigkeit: 0.41 },
  'gegner.sau.frisch': { cents: 0.14, fehler: 0.91, lagen: 1500, haeufigkeit: 0.781 },
  'gegner.kurzer.weg.lange.farbe': { cents: 2.53, fehler: 1.2, lagen: 1500, haeufigkeit: 0.547 },
  'gegner.kein.trumpf.anspielen': { cents: 4.84, fehler: 0.92, lagen: 1500, haeufigkeit: 1.672 },
  'karte.schmieren': { cents: 2.43, fehler: 0.58, lagen: 1500, haeufigkeit: 1.477 },
  'karte.nicht.vorschnell.schmieren': {
    cents: 2.35,
    fehler: 0.69,
    lagen: 1500,
    haeufigkeit: 0.816,
  },
  'karte.hinten.billig.stechen': { cents: -0.47, fehler: 1.29, lagen: 1500, haeufigkeit: 0.159 },
  'karte.stechen.lohnt': { cents: 26.44, fehler: 2.62, lagen: 1500, haeufigkeit: 0.797 },
  'karte.farbe.freimachen': { cents: 1.28, fehler: 1.3, lagen: 1500, haeufigkeit: 1.64 },
  'karte.abspatzen': { cents: 1.93, fehler: 0.78, lagen: 1500, haeufigkeit: 4.192 },
  'karte.abspatzen.trumpf': { cents: 1.24, fehler: 0.36, lagen: 1500, haeufigkeit: 2.424 },
  'bettel.spieler.drunter': { cents: 20.13, fehler: 4.58, lagen: 626, haeufigkeit: 0.16 },
  'bettel.gegner.klein': { cents: 2.73, fehler: 0.72, lagen: 1500, haeufigkeit: 0.36 },
  'ramsch.hoch.drunter': { cents: 2.69, fehler: 0.84, lagen: 785, haeufigkeit: 0.115 },
};

/** Wie viele Standardfehler der Wert über null liegen muss, damit Max ihn nennt oder danach ordnet. */
export const WERT_SICHER = 2;

/** Der Wert einer Regel, wenn er gemessen und sicher positiv ist – sonst `null`. */
export function ruleValue(id: RuleId): RuleValue | null {
  const m = REGELWERTE[id];
  if (!m || m.cents <= WERT_SICHER * m.fehler || m.cents <= 0) return null;
  return { cents: m.cents, fehler: m.fehler, lagen: m.lagen };
}
