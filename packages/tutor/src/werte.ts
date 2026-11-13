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
export const REGELWERTE: Partial<Record<RuleId, Messung>> = {};

/** Wie viele Standardfehler der Wert über null liegen muss, damit Max ihn nennt oder danach ordnet. */
export const WERT_SICHER = 2;

/** Der Wert einer Regel, wenn er gemessen und sicher positiv ist – sonst `null`. */
export function ruleValue(id: RuleId): RuleValue | null {
  const m = REGELWERTE[id];
  if (!m || m.cents <= WERT_SICHER * m.fehler || m.cents <= 0) return null;
  return { cents: m.cents, fehler: m.fehler, lagen: m.lagen };
}
