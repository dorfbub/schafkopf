import { describe, expect, it } from 'vitest';
import {
  type Card,
  type CompletedTrick,
  type Contract,
  type HandState,
  type RuleSet,
  type Seat,
  type TableState,
  DEFAULT_RULES,
  applyTableAction,
  createRng,
  createTable,
  dealHand,
  legalCalls,
  legalCards,
  pick,
  scoreHand,
  startHand,
  tableViewFor,
} from '../src';

const STOCK: RuleSet = { ...DEFAULT_RULES, allPassed: 'stock' };

function seated(rules: RuleSet = STOCK): TableState {
  const t = createTable(rules);
  return { ...t, seats: t.seats.map((_, i) => ({ name: `S${i}`, kind: 'bot', connected: true })) };
}

function sumOk(table: TableState) {
  expect(table.balances.reduce((a, b) => a + b, 0) + table.pot).toBe(0);
}

/** Neues Spiel geben, alle sagen „weiter“. */
function allPass(table: TableState, seed: number): TableState {
  const started = startHand(table, seed);
  if (!started.ok) throw new Error(started.error);
  let t = started.table;
  sumOk(t);
  for (let i = 0; i < 4; i++) {
    const r = applyTableAction(t, {
      type: 'bid',
      seat: t.hand!.turn,
      call: { type: 'pass' },
    });
    if (!r.ok) throw new Error(r.error);
    t = r.table;
    sumOk(t);
  }
  return t;
}

/** Fertig gespieltes Spiel mit Pott: die Spielerpartei hat `partyPoints` Augen. */
function finished(
  contract: Contract,
  declarer: Seat,
  partner: Seat | null,
  partyPoints: number,
  pot: number,
  partyTricks = 4,
): HandState {
  const base = dealHand(STOCK, 3, 7, { pot, factor: 1 });
  const opponent = [0, 1, 2, 3].find((s) => s !== declarer && s !== partner)!;
  const tricks: CompletedTrick[] = Array.from({ length: 8 }, (_, i) => ({
    leader: 0,
    cards: [],
    winner: i < partyTricks ? declarer : opponent,
    points: i === 0 ? partyPoints : i === partyTricks ? 120 - partyPoints : 0,
  }));
  const neutral: Card[][] = [
    ['EO', 'HO', 'EU', 'HU'],
    ['GO', 'SO', 'GU', 'SU'],
    ['EA', 'GA', 'HA', 'SA'],
    ['E10', 'G10', 'H10', 'S10'],
  ];
  return {
    ...base,
    phase: 'finished',
    contract,
    declarer,
    partner,
    initialHands: neutral,
    hands: [[], [], [], []],
    tricks,
  };
}

describe('Stock: Einzahlung', () => {
  it('alle weiter: jeder zahlt den Einsatz in den Pott, es wird nicht gespielt', () => {
    const t = allPass(seated(), 1);
    const result = t.hand!.result!;
    expect(result.kind).toBe('passed');
    expect(result.outcome).toBeNull();
    expect(result.payments).toEqual([-10, -10, -10, -10]);
    expect(result.potDelta).toBe(40);
    expect(t.pot).toBe(40);
    expect(t.balances).toEqual([-10, -10, -10, -10]);
    expect(tableViewFor(t, 1).pot).toBe(40);
  });

  it('der Pott wächst, wenn wieder alle „weiter“ sagen; das nächste Spiel bekommt ihn mit', () => {
    let t = allPass(seated(), 1);
    t = allPass(t, 2);
    expect(t.pot).toBe(80);
    expect(t.balances).toEqual([-20, -20, -20, -20]);
    const next = startHand(t, 3);
    if (!next.ok) throw new Error(next.error);
    expect(next.table.hand!.carry.pot).toBe(80);
    expect(next.table.logs.at(-1)!.carry.pot).toBe(80);
  });

  it('der Einsatz ist einstellbar', () => {
    const rules = { ...STOCK, tariff: { ...STOCK.tariff, stock: 25 } };
    const t = allPass(seated(rules), 1);
    expect(t.pot).toBe(100);
    expect(t.balances).toEqual([-25, -25, -25, -25]);
  });

  it('ohne Stock wird weiter zusammengeworfen: kein Pott', () => {
    const t = allPass(seated(DEFAULT_RULES), 1);
    expect(t.pot).toBe(0);
    expect(t.hand!.result!.potDelta).toBe(0);
  });
});

describe('Stock: Auszahlung', () => {
  const SAU: Contract = { kind: 'sauspiel', suit: 'gras' };
  const SOLO: Contract = { kind: 'solo', suit: 'herz' };

  it('gewonnenes Sauspiel: die Spielerpartei teilt sich den Pott', () => {
    const r = scoreHand(finished(SAU, 0, 2, 61, 80));
    expect(r.payments).toEqual([10 + 40, -10, 10 + 40, -10]);
    expect(r.potDelta).toBe(-80);
  });

  it('gewonnenes Solo: der Spieler bekommt den ganzen Pott', () => {
    const r = scoreHand(finished(SOLO, 1, null, 70, 80));
    expect(r.payments).toEqual([-50, 150 + 80, -50, -50]);
    expect(r.potDelta).toBe(-80);
  });

  it('gewonnener Bettel bekommt den Pott (gleich welche Spielart)', () => {
    const r = scoreHand(finished({ kind: 'bettel' }, 3, null, 0, 40, 0));
    expect(r.outcome!.declarerWon).toBe(true);
    expect(r.payments).toEqual([-50, -50, -50, 150 + 40]);
    expect(r.potDelta).toBe(-40);
  });

  it('verlorenes Spiel: der Pott bleibt stehen', () => {
    const sau = scoreHand(finished(SAU, 0, 2, 60, 80));
    expect(sau.payments).toEqual([-10, 10, -10, 10]);
    expect(sau.potDelta).toBe(0);
    const solo = scoreHand(finished(SOLO, 1, null, 40, 80));
    expect(solo.potDelta).toBe(0);
  });

  it('Annahme 21: ein Rest, der sich nicht glatt teilen lässt, bleibt im Pott', () => {
    const r = scoreHand(finished(SAU, 0, 2, 61, 41));
    expect(r.payments).toEqual([10 + 20, -10, 10 + 20, -10]);
    expect(r.potDelta).toBe(-40);
    expect(r.payments.reduce((a, b) => a + b, 0) + r.potDelta).toBe(0);
  });

  it('am Tisch über viele Zufallsspiele: Pott wird gefüllt und ausbezahlt, Summe bleibt 0', () => {
    let t = seated();
    let paid = 0;
    let filled = 0;
    for (let n = 1; n <= 150; n++) {
      const started = startHand(t, n * 31);
      if (!started.ok) throw new Error(started.error);
      t = started.table;
      const rng = createRng(n);
      while (t.hand!.phase !== 'finished') {
        const seat = t.hand!.turn;
        const r = applyTableAction(
          t,
          t.hand!.phase === 'bidding'
            ? { type: 'bid', seat, call: pick(legalCalls(t.hand!, seat), rng) }
            : { type: 'play', seat, card: pick(legalCards(t.hand!, seat), rng) },
        );
        if (!r.ok) throw new Error(r.error);
        t = r.table;
        sumOk(t);
      }
      const { potDelta, outcome } = t.hand!.result!;
      if (potDelta > 0) filled++;
      if (potDelta < 0) {
        paid++;
        expect(outcome!.declarerWon).toBe(true);
        expect(t.pot).toBe(0);
      }
    }
    expect(filled).toBeGreaterThan(5);
    expect(paid).toBeGreaterThan(0);
  });
});
