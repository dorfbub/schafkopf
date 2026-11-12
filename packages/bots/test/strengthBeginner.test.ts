import { describe, expect, it } from 'vitest';
import { createBeginnerBot, createHeuristicBot } from '../src';
import { duel } from './duel';

/**
 * „Normal“ gegen „Anfänger“ (B2), gepaart ausgewertet (siehe `duel`). Großer Lauf mit
 * `BOTS_FULL=1`. Gemessen (Stand B2): 4000 Spiele ≈ −7,7 ct je Spiel für den Anfänger
 * (Standardfehler ≈ 0,9); 1000 Spiele ≈ −8,5 ct (≈ 1,9).
 */
const FULL = Boolean(process.env.BOTS_FULL);

describe('Spielstärken: Anfänger gegen Normal', () => {
  it('Normal schlägt Anfänger deutlich', { timeout: 120_000 }, () => {
    const r = duel(FULL ? 4000 : 1000, createBeginnerBot, createHeuristicBot);
    console.log(`Anfänger gegen Normal: ${JSON.stringify(r)}`);
    expect(r.paired).toBeLessThan(FULL ? -5 : -4);
    // Deutlich heißt: mehr als drei Standardfehler vom Gleichstand entfernt.
    expect(-r.paired).toBeGreaterThan(3 * r.stdError);
  });
});
