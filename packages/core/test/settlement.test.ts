import { describe, expect, it } from 'vitest';
import {
  type Action,
  type HandResult,
  type TableState,
  DEFAULT_RULES,
  applyTableAction,
  breakdownOf,
  createRng,
  createTable,
  ledgerOf,
  legalCalls,
  legalCards,
  minimalTransfers,
  passedResult,
  pick,
  refundPot,
  settleUp,
  startHand,
} from '../src';

/** Wendet die Überweisungen auf die Salden an: danach muss alles 0 sein. */
function applied(balances: number[], transfers: { from: number; to: number; amount: number }[]) {
  const after = [...balances];
  for (const t of transfers) {
    after[t.from]! += t.amount;
    after[t.to]! -= t.amount;
  }
  return after;
}

describe('Endabrechnung: Überweisungen', () => {
  it('ein Verlierer, drei Gewinner: drei Überweisungen', () => {
    const balances = [-300, 100, 100, 100];
    const transfers = minimalTransfers(balances);
    expect(transfers).toHaveLength(3);
    expect(applied(balances, transfers)).toEqual([0, 0, 0, 0]);
  });

  it('zwei Paare, die sich getrennt ausgleichen: zwei Überweisungen statt drei', () => {
    const balances = [-100, 100, -250, 250];
    const transfers = minimalTransfers(balances);
    expect(transfers).toHaveLength(2);
    expect(transfers).toContainEqual({ from: 0, to: 1, amount: 100 });
    expect(transfers).toContainEqual({ from: 2, to: 3, amount: 250 });
  });

  it('wer genau ausgeglichen ist, kommt nicht vor', () => {
    const transfers = minimalTransfers([0, -50, 50, 0]);
    expect(transfers).toEqual([{ from: 1, to: 2, amount: 50 }]);
  });

  it('nichts zu zahlen: keine Überweisung', () => {
    expect(minimalTransfers([0, 0, 0, 0])).toEqual([]);
  });

  it('wirft, wenn die Salden nicht null ergeben', () => {
    expect(() => minimalTransfers([100, 0, 0, 0])).toThrow();
  });

  it('gleicht in zufälligen Fällen aus, nie mit mehr als n − 1 Überweisungen', () => {
    const rng = createRng(7);
    for (let i = 0; i < 300; i++) {
      const raw = Array.from({ length: 3 }, () => Math.round((rng() - 0.5) * 40) * 10);
      const balances = [...raw, -raw.reduce((a, b) => a + b, 0)];
      const transfers = minimalTransfers(balances);
      expect(applied(balances, transfers).map((x) => x || 0)).toEqual([0, 0, 0, 0]);
      expect(transfers.length).toBeLessThanOrEqual(3);
      expect(transfers.every((t) => t.amount > 0 && t.from !== t.to)).toBe(true);
    }
  });
});

describe('Endabrechnung: Pott zurück (Annahme 13)', () => {
  it('geht zu gleichen Teilen an alle', () => {
    expect(refundPot([-300, 100, 100, 100], 200)).toEqual([50, 50, 50, 50]);
  });

  it('Rest-Cent gehen an die mit dem niedrigsten Stand', () => {
    // 50 ct auf vier: je 12, Rest 2 → die beiden mit dem niedrigsten Stand
    expect(refundPot([-100, 30, -100, 170 - 50], 50)).toEqual([13, 12, 13, 12]);
    expect(refundPot([0, 0, 0, 0], 50)).toEqual([13, 13, 12, 12]);
  });

  it('ohne Pott gibt es nichts zurück', () => {
    expect(refundPot([-10, 10, 0, 0], 0)).toEqual([0, 0, 0, 0]);
  });

  it('settleUp: Stände plus Pott ergeben null und werden ausgeglichen', () => {
    // Summe(balances) + pot = 0
    const balances = [-150, 100, 100, -100];
    const pot = -balances.reduce((a, b) => a + b, 0);
    const s = settleUp(balances, pot);
    expect(s.refunds.reduce((a, b) => a + b, 0)).toBe(pot);
    expect(s.balances.reduce((a, b) => a + b, 0)).toBe(0);
    expect(applied(s.balances, s.transfers)).toEqual([0, 0, 0, 0]);
  });

  it('settleUp: Pott allein, alle gleich – jeder bekommt seinen Einsatz zurück, nichts zu überweisen', () => {
    const s = settleUp([-50, -50, -50, -50], 200);
    expect(s.balances).toEqual([0, 0, 0, 0]);
    expect(s.transfers).toEqual([]);
  });
});

describe('Aufschlüsselung', () => {
  function sauspielTable(): TableState {
    const t = createTable(DEFAULT_RULES);
    return {
      ...t,
      seats: t.seats.map((_, i) => ({ name: `S${i}`, kind: 'bot', connected: true })),
    };
  }

  function play(table: TableState, seed: number): TableState {
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

  it('Spiel ohne Wertung: keine Aufschlüsselung', () => {
    expect(breakdownOf(passedResult(4))).toBeNull();
  });

  it('Bestandteile ergeben den Spielwert, Faktoren den Betrag – in 200 Zufallsspielen', () => {
    let played = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const t = startHand(sauspielTable(), seed);
      if (!t.ok) throw new Error(t.error);
      const done = play(t.table, seed);
      const result = done.hand!.result!;
      const b = breakdownOf(result);
      if (!b) continue;
      played++;
      expect(b.parts.reduce((s, p) => s + p.amount, 0)).toBe(b.value);
      expect(b.value).toBe(result.outcome!.value);
      expect(b.parts[0]!.label).toBe('grundtarif');
      expect(b.amount).toBe(b.value * b.factor);
      // Der Betrag je Mitspieler der größeren Seite steht in den Zahlungen
      expect(Math.max(...result.payments.map(Math.abs))).toBeGreaterThanOrEqual(b.amount);
    }
    expect(played).toBeGreaterThan(50);
  });

  it('Faktoren werden vervielfacht', () => {
    const result: HandResult = {
      kind: 'played',
      outcome: {
        winners: [0],
        losers: [1, 2, 3],
        value: 70,
        parts: [
          { label: 'grundtarif', amount: 20 },
          { label: 'schneider', amount: 10 },
          { label: 'laufende', amount: 30 },
          { label: 'sie', amount: 10 },
        ],
        declarerWon: true,
        details: {
          type: 'ramsch',
          points: [],
          tricks: [],
          loser: null,
          durchmarsch: null,
          jungfrauen: [],
        },
      },
      factors: [
        { reason: 'kontra', factor: 2 },
        { reason: 're', factor: 2 },
      ],
      payments: [840, -280, -280, -280],
      potDelta: 0,
    };
    const b = breakdownOf(result)!;
    expect(b.value).toBe(70);
    expect(b.factor).toBe(4);
    expect(b.amount).toBe(280);
  });
});

describe('Tabelle des Abends', () => {
  it('führt den Stand mit und endet bei den Kontoständen des Tisches', () => {
    let t = createTable(DEFAULT_RULES);
    t = { ...t, seats: t.seats.map((_, i) => ({ name: `S${i}`, kind: 'bot', connected: true })) };
    const rng = createRng(3);
    for (let n = 1; n <= 4; n++) {
      const started = startHand(t, n);
      if (!started.ok) throw new Error(started.error);
      t = started.table;
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
    }
    const rows = ledgerOf(t.history, 4);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.summary.handNo)).toEqual([1, 2, 3, 4]);
    expect(rows.at(-1)!.balances).toEqual(t.balances);
    expect(rows.at(-1)!.pot).toBe(t.pot);
    rows.forEach((r, i) => {
      const prev = i === 0 ? [0, 0, 0, 0] : rows[i - 1]!.balances;
      expect(r.balances).toEqual(prev.map((b, s) => b + r.payments[s]!));
    });
  });
});
