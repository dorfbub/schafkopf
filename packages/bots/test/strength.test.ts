import { describe, expect, it } from 'vitest';
import {
  type CompletedTrick,
  type HandView,
  DEFAULT_RULES,
  applyAction,
  createRng,
  dealHand,
  handViewFor,
} from '@schafkopf/core';
import { createHeuristicBot, createStrongBot, evaluateCards } from '../src';
import { type DuelResult, duel } from './duel';
import { playHand } from './simulate';

/**
 * „Stark“ gegen „Normal“ (B2) mit festem Seed-Satz, gepaart ausgewertet (siehe `duel`). Im
 * normalen Lauf klein gehalten, damit `npm run check` schnell bleibt; der große Lauf mit den
 * eigentlichen Schwellen:
 *
 *   BOTS_FULL=1 npx vitest run packages/bots
 *
 * Gemessen (Stand B2, 1200 Spiele): Stark ≈ +9,5 ct je Spiel gegenüber Normal (Standardfehler
 * ≈ 1,6). Stand B4 (beide sagen nach der Ansage-Tabelle an, Geber wandert): ≈ +6,6 ct (≈ 1,5) –
 * der Vorsprung bei der Ansage ist weg, der im Kartenspiel bleibt. Stand B5 (gewichtete
 * Verteilungen, Budget 5000): Vergleich mit dem Stark vor B5 in `strengthGewichtung.test.ts`.
 * Der Vergleich Anfänger gegen Normal steht in `strengthBeginner.test.ts`.
 */
const FULL = Boolean(process.env.BOTS_FULL);

/** Ein Lauf Stark gegen Normal für Stärke und Laufzeit (teuer, daher nur einmal). */
let strongResult: DuelResult | null = null;
function strongVsNormal(): DuelResult {
  strongResult ??= duel(FULL ? 1200 : 60, (seed) => createStrongBot(seed), createHeuristicBot);
  return strongResult;
}

describe('Spielstärken: Stark gegen Normal', () => {
  it('Stark schlägt Normal deutlich', { timeout: 600_000 }, () => {
    const r = strongVsNormal();
    console.log(`Stark gegen Normal: ${JSON.stringify(r)}`);
    if (FULL) {
      expect(r.paired).toBeGreaterThan(5);
      expect(r.paired).toBeGreaterThan(3 * r.stdError);
    } else {
      // Kleiner Lauf: nur die Richtung (60 Spiele, gemessen ≈ +1,7 ± 2,0 ct je Spiel).
      expect(r.paired).toBeGreaterThan(0);
    }
  });
});

describe('Spielstärken: Laufzeit', () => {
  it('Stark entscheidet im Schnitt schnell und nie zu langsam', { timeout: 600_000 }, () => {
    // Zeitmessung nur hier im Test – der Bot selbst kennt keine Uhr.
    const r = strongVsNormal();
    // Entwicklerrechner (B5, gewichtete Verteilungen, Budget 5000): Schnitt aller Entscheidungen
    // ≈ 40 ms, Kartenwahl ≈ 95 ms, längste ≈ 160 ms. Hier nur einmal gemessen, im vollen Testlauf
    // also mit Wartezeit auf den Prozessor (bis über 400 ms) – die Grenze für die längste
    // Entscheidung prüft der nächste Test. Auf dem Handy schützt das Zeitbudget (`budgetMs`,
    // Web-App 200 ms).
    expect(r.msPerDecision).toBeLessThan(120);
    expect(r.maxMs).toBeLessThan(1000);
  });

  it('längste Kartenwahl unter 300 ms (Bestwert aus drei Läufen)', { timeout: 600_000 }, () => {
    // Dieselbe Suche wie am Tisch (`evaluateCards` ist der Kern von `search`), je Lage dreimal
    // gerechnet: Gemessen werden soll die Rechnung, nicht parallele Testdateien.
    const lagen: { view: HandView; tricks: CompletedTrick[] }[] = [];
    for (let i = 0; i < 12; i++) {
      const bots = [0, 1, 2, 3].map((s) => createHeuristicBot(300 + 4 * i + s));
      playHand(bots, 900 + i, i % 4, DEFAULT_RULES, (seat, _action, state) => {
        const view = handViewFor(state, seat);
        if (state.phase === 'playing' && seat === i % 4 && view.legalCards.length > 1) {
          lagen.push({ view, tricks: [...state.tricks] });
        }
      });
    }
    evaluateCards(lagen[0]!.view, lagen[0]!.tricks, createRng(1), { rules: DEFAULT_RULES });
    let longest = 0;
    for (const { view, tricks } of lagen) {
      let best = Infinity;
      for (let k = 0; k < 3; k++) {
        const start = performance.now();
        evaluateCards(view, tricks, createRng(k), { rules: DEFAULT_RULES });
        best = Math.min(best, performance.now() - start);
      }
      longest = Math.max(longest, best);
    }
    expect(lagen.length).toBeGreaterThan(40);
    expect(longest).toBeLessThan(300);
  });

  it('hält ein Zeitbudget über die injizierte Uhr ein', { timeout: 60_000 }, () => {
    // Eine Uhr, die bei jedem Ablesen 50 ms weiterspringt: Nach zwei Verteilungen ist Schluss.
    let t = 0;
    let reads = 0;
    const now = () => {
      reads++;
      return (t += 50);
    };
    const free = duel(8, (seed) => createStrongBot(seed), createHeuristicBot);
    reads = 0;
    const capped = duel(
      8,
      (seed) => createStrongBot(seed, { now, budgetMs: 60 }),
      createHeuristicBot,
    );
    expect(reads).toBeGreaterThan(0);
    expect(capped.msPerDecision).toBeLessThan(free.msPerDecision);
  });

  it('spielt nach einem Neuladen (fehlende Stiche) wie die Heuristik weiter', () => {
    // Drei Stiche mit Heuristik-Bots, dann übernimmt ein frischer starker Bot (wie nach dem
    // Wiederherstellen eines Tisches): Ihm fehlen die Stiche, also folgt er der Heuristik.
    const players = [0, 1, 2, 3].map((s) => createHeuristicBot(60 + s));
    let state = dealHand(DEFAULT_RULES, 0, 77);
    let checked = 0;
    for (let step = 0; state.phase !== 'finished' && step < 200; step++) {
      const view = handViewFor(state, state.turn);
      if (state.tricks.length >= 3 && view.legalCards.length > 1) {
        const fresh = createStrongBot(9).decide(view);
        expect(fresh).toEqual(createHeuristicBot(9).decide(view));
        checked++;
      }
      const result = applyAction(state, { ...players[state.turn]!.decide(view), seat: state.turn });
      if (!result.ok) throw new Error(result.error);
      state = result.state;
    }
    expect(checked).toBeGreaterThan(0);
  });
});
