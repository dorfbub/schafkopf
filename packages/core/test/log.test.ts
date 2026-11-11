import { describe, expect, it } from 'vitest';
import {
  type Action,
  type AllPassedRule,
  DEFAULT_RULES,
  MAX_LOGS,
  applyTableAction,
  createRng,
  createTable,
  legalCalls,
  legalCards,
  pick,
  replay,
  startHand,
  tableViewFor,
  type TableState,
} from '../src';

/** Spielt ein Spiel mit zufälligen erlaubten Zügen zu Ende. */
function playRandom(table: TableState, seed: number): TableState {
  const rng = createRng(seed);
  let t = table;
  while (t.hand!.phase !== 'finished') {
    const seat = t.hand!.turn;
    const action: Action =
      t.hand!.phase === 'bidding'
        ? { type: 'bid', seat, call: pick(legalCalls(t.hand!, seat), rng) }
        : { type: 'play', seat, card: pick(legalCards(t.hand!, seat), rng) };
    const r = applyTableAction(t, action);
    if (!r.ok) throw new Error(r.error);
    t = r.table;
  }
  return t;
}

function seated(allPassed: AllPassedRule = 'zusammenwerfen'): TableState {
  const t = createTable({ ...DEFAULT_RULES, allPassed });
  return { ...t, seats: t.seats.map((_, i) => ({ name: `S${i}`, kind: 'bot', connected: true })) };
}

describe('Übertrag zwischen Tisch und Spiel', () => {
  it('der Tisch gibt seinen Pott ins Spiel und ins Protokoll; Summe(balances) + pot = 0', () => {
    let table: TableState = { ...seated(), pot: 40, balances: [-10, -10, -10, -10] };
    for (let n = 1; n <= 20; n++) {
      const started = startHand(table, n);
      if (!started.ok) throw new Error(started.error);
      expect(started.table.hand!.carry).toEqual({ pot: table.pot, factor: 1 });
      expect(started.table.logs.at(-1)!.carry).toEqual({ pot: table.pot, factor: 1 });
      table = playRandom(started.table, n);
      expect(replay(table.logs.at(-1)!)).toEqual(table.hand);
      expect(table.balances.reduce((a, b) => a + b, 0) + table.pot).toBe(0);
      expect(tableViewFor(table, 0).pot).toBe(table.pot);
    }
  });
});

describe('Spielprotokoll', () => {
  it('replay ergibt für viele Zufallsspiele denselben Endzustand', () => {
    let table = seated();
    for (let n = 1; n <= 300; n++) {
      const started = startHand(table, n * 7919);
      if (!started.ok) throw new Error(started.error);
      table = playRandom(started.table, n);
      const log = table.logs.at(-1)!;
      expect(log.handNo).toBe(n);
      expect(replay(log)).toEqual(table.hand);
      // Die Zusammenfassung stimmt mit dem Ergebnis überein.
      expect(table.history.at(-1)).toEqual({
        handNo: n,
        dealer: table.dealer,
        result: table.hand!.result,
      });
    }
    expect(table.history).toHaveLength(300);
    expect(table.logs).toHaveLength(MAX_LOGS);
  });

  it.each<AllPassedRule>(['ramsch'])('replay deckt die Regel „alle weiter“ ab: %s', (rule) => {
    let table = seated(rule);
    let passed = 0;
    for (let n = 1; n <= 120; n++) {
      const started = startHand(table, n * 104729);
      if (!started.ok) throw new Error(started.error);
      table = playRandom(started.table, n);
      const log = table.logs.at(-1)!;
      if (log.actions.filter((a) => a.type === 'bid').every((a) => a.call.type === 'pass')) {
        passed++;
      }
      expect(replay(JSON.parse(JSON.stringify(log)))).toEqual(table.hand);
      expect(table.balances.reduce((a, b) => a + b, 0) + table.pot).toBe(0);
    }
    expect(passed).toBeGreaterThan(5);
  });

  it('das Protokoll übersteht JSON und liefert danach dasselbe Spiel', () => {
    const started = startHand(seated(), 42);
    if (!started.ok) throw new Error(started.error);
    const table = playRandom(started.table, 5);
    const log = JSON.parse(JSON.stringify(table.logs.at(-1)));
    expect(replay(log)).toEqual(table.hand);
  });

  it('ein Protokoll mit unerlaubter Aktion wird abgelehnt', () => {
    const started = startHand(seated(), 42);
    if (!started.ok) throw new Error(started.error);
    const log = playRandom(started.table, 5).logs.at(-1)!;
    const broken = { ...log, actions: [{ ...log.actions[1]! }, ...log.actions.slice(1)] };
    expect(() => replay(broken)).toThrow();
  });

  it('Sichten enthalten während des Spiels keine fremden Karten und keine Protokolle', () => {
    let table = seated();
    for (let n = 1; n <= 20; n++) {
      const started = startHand(table, n);
      if (!started.ok) throw new Error(started.error);
      table = started.table;
      const rng = createRng(n);
      while (table.hand!.phase !== 'finished') {
        const hand = table.hand!;
        for (let viewer = 0; viewer < 4; viewer++) {
          const json = JSON.stringify(tableViewFor(table, viewer));
          expect(json).not.toContain('"logs"');
          expect(json).not.toContain('"seed"');
          expect(json).not.toContain('initialHands');
          const played = [...hand.tricks.flatMap((t) => t.cards), ...hand.currentTrick.cards];
          for (const seat of [0, 1, 2, 3]) {
            if (seat === viewer) continue;
            for (const c of hand.hands[seat]!) {
              if (!played.includes(c)) expect(json).not.toContain(`"${c}"`);
            }
          }
        }
        const seat = hand.turn;
        const action: Action =
          hand.phase === 'bidding'
            ? { type: 'bid', seat, call: pick(legalCalls(hand, seat), rng) }
            : { type: 'play', seat, card: pick(legalCards(hand, seat), rng) };
        const r = applyTableAction(table, action);
        if (!r.ok) throw new Error(r.error);
        table = r.table;
      }
    }
  });

  it('Speichergröße für 50 Spiele (Richtwert)', () => {
    let table = seated();
    for (let n = 1; n <= 50; n++) {
      const started = startHand(table, [n, n * 3, n * 5, n * 7 + 4000000000]);
      if (!started.ok) throw new Error(started.error);
      table = playRandom(started.table, n);
    }
    const bytes = JSON.stringify({ logs: table.logs, history: table.history }).length;
    console.log(`50 Spiele: Protokolle + Verlauf ≈ ${(bytes / 1024).toFixed(0)} KiB`);
    expect(bytes).toBeLessThan(400 * 1024);
  });
});
