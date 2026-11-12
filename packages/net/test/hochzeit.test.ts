import { describe, expect, it } from 'vitest';
import { createHeuristicBot, createRandomBot, preludeMove } from '@schafkopf/bots';
import {
  type Bot,
  type HandView,
  type PlayerAction,
  type RuleSet,
  DEFAULT_RULES,
  MODES,
  dealHand,
} from '@schafkopf/core';
import { ClientSession, HostSession, createLoopbackPair, parseHostSnapshot } from '../src';

const HOCHZEIT: RuleSet = { ...DEFAULT_RULES, contracts: [...DEFAULT_RULES.contracts, 'hochzeit'] };

/** Erster Seed, bei dem Sitz 1 (sagt zuerst an, Geber 0) genau einen Trumpf hat. */
const SEED = Array.from({ length: 500 }, (_, i) => i + 1).find((n) =>
  MODES.hochzeit.eligible!(dealHand(HOCHZEIT, 0, n).hands[1]!),
)!;

function createHost(createBot: (seat: number) => Bot = (s) => createRandomBot(s)) {
  const queue: (() => void)[] = [];
  const host = new HostSession({
    rules: HOCHZEIT,
    createBot,
    seed: () => SEED,
    schedule: (fn) => void queue.push(fn),
  });
  const flush = () => {
    for (let i = 0; queue.length > 0; i++) {
      if (i > 10_000) throw new Error('Host kommt nicht zur Ruhe');
      queue.shift()!();
    }
  };
  return { host, flush };
}

function join(host: HostSession, name: string) {
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  return new ClientSession(pair.client, { name, clientId: name });
}

const handOf = (c: ClientSession) => c.getSnapshot().view!.hand!;

/** Sitz 1 sagt als Einziger an und nennt die Hochzeit. */
function declareWedding(clients: ClientSession[]) {
  clients[1]!.bid({ type: 'interest' });
  for (const seat of [2, 3, 0]) clients[seat]!.bid({ type: 'pass' });
  clients[1]!.bid({ type: 'declare', contract: { kind: 'hochzeit' } });
  expect(handOf(clients[0]!).phase).toBe('prelude');
}

describe('Hochzeit über das Netz', () => {
  it('vier Menschen: Angebot, Annahme und verdeckter Tausch', () => {
    const { host } = createHost();
    const clients = ['Anna', 'Bene', 'Cilli', 'Dori'].map((n) => join(host, n));
    host.start();
    declareWedding(clients);
    expect(handOf(clients[2]!).legalMoves).toEqual([{ type: 'decline' }, { type: 'accept' }]);
    expect(handOf(clients[3]!).legalMoves).toEqual([]);

    // Außerhalb der Reihe oder schief geformt: abgelehnt.
    clients[3]!.prelude({ type: 'accept' });
    expect(clients[3]!.getSnapshot().lastError).toBe('not_your_turn');
    clients[2]!.act({ type: 'prelude', move: { type: 'give', cards: 'EA' } } as never);
    expect(clients[2]!.getSnapshot().lastError).toBe('bad_message');
    clients[2]!.act({ type: 'prelude', move: { type: 'nimm' } } as never);
    expect(clients[2]!.getSnapshot().lastError).toBe('bad_message');
    clients[2]!.act({ type: 'prelude' } as never);
    expect(clients[2]!.getSnapshot().lastError).toBe('bad_message');

    clients[2]!.prelude({ type: 'accept' });
    expect(clients[2]!.getSnapshot().lastError).toBeNull();
    const exchange = handOf(clients[2]!);
    expect(exchange.hand).toHaveLength(9);
    expect(exchange.partner).toBe(2);
    // Nur erlaubte Karten zurück: ein Trumpf, den er nicht geben darf, wird abgelehnt.
    const trumps = MODES.hochzeit.trumps({ kind: 'hochzeit' }, 0);
    const trump = exchange.hand.find((c) => trumps.includes(c))!;
    clients[2]!.prelude({ type: 'give', cards: [trump] });
    expect(clients[2]!.getSnapshot().lastError).toBe('illegal_move');

    const given = exchange.legalMoves[0]!;
    expect(given.type).toBe('give');
    const card = given.type === 'give' ? given.cards[0]! : '';
    const before = [0, 3].map((s) => handOf(clients[s]!).hand);
    clients[2]!.prelude(given);
    for (const c of clients) expect(handOf(c).phase).toBe('playing');
    expect(handOf(clients[1]!).hand).toContain(card);
    // Die Unbeteiligten sehen dieselben Karten wie vorher und den Partner.
    expect([0, 3].map((s) => handOf(clients[s]!).hand)).toEqual(before);
    for (const s of [0, 3]) {
      expect(handOf(clients[s]!).partner).toBe(2);
      expect(JSON.stringify(clients[s]!.getSnapshot().view)).not.toContain(`"${card}"`);
    }
    // Das Spielprotokoll beim Host enthält den Tausch.
    const actions = host.getTable().logs.at(-1)!.actions;
    expect(actions.filter((a) => a.type === 'prelude')).toHaveLength(2);
  });

  it('ein Mensch gegen Bots: alle Bots lehnen ab, dann wird zusammengeworfen', () => {
    // Seed suchen, bei dem Anna (Platz 0, Geber, sagt zuletzt an) genau einen Trumpf hat und die
    // Bots vor ihr alle „weiter“ sagen. Zufalls-Bots, weil sie jede Hochzeit ablehnen – der
    // Heuristik-Bot nimmt mit starkem Trumpfblatt an (B3), und das hat fast immer einer.
    for (let seed = 1; seed < 2000; seed++) {
      if (!MODES.hochzeit.eligible!(dealHand(HOCHZEIT, 0, seed).hands[0]!)) continue;
      const queue: (() => void)[] = [];
      const host = new HostSession({
        rules: HOCHZEIT,
        createBot: (s) => createRandomBot(s),
        seed: () => seed,
        schedule: (fn) => void queue.push(fn),
      });
      const anna = join(host, 'Anna');
      host.start();
      while (queue.length > 0) queue.shift()!();
      const hand = handOf(anna);
      if (hand.bids.some((b) => b.call.type !== 'pass')) continue;
      anna.bid({ type: 'interest' });
      anna.bid({ type: 'declare', contract: { kind: 'hochzeit' } });
      expect(anna.getSnapshot().lastError).toBeNull();
      expect(handOf(anna).phase).toBe('prelude');
      while (queue.length > 0) queue.shift()!();
      const actions = host.getTable().logs.at(-1)!.actions;
      expect(actions.filter((a) => a.type === 'prelude')).toEqual(
        [1, 2, 3].map((seat) => ({
          type: 'prelude',
          seat,
          move: { type: 'decline' },
        })),
      );
      expect(handOf(anna).phase).toBe('finished');
      expect(handOf(anna).result!.kind).toBe('passed');
      return;
    }
    throw new Error('Kein passender Seed');
  });

  it('Speicherstand während des Vorspiels wird wiederhergestellt', () => {
    const { host } = createHost();
    const clients = ['Anna', 'Bene', 'Cilli', 'Dori'].map((n) => join(host, n));
    host.start();
    declareWedding(clients);
    clients[2]!.prelude({ type: 'accept' });
    const snapshot = parseHostSnapshot(JSON.parse(JSON.stringify(host.exportSnapshot())));
    expect(snapshot).not.toBeNull();
    expect(snapshot!.table.hand!.phase).toBe('prelude');
    expect(snapshot!.table.hand!.prelude).toMatchObject({ step: 'exchange', partner: 2 });
    // Wiederhergestellt gelten alle Menschen als getrennt; nach der Frist vertreten Bots sie,
    // der Bot auf Cillis Platz gibt eine Karte zurück, und das Spiel läuft zu Ende.
    const queue: (() => void)[] = [];
    const restored = HostSession.restore(snapshot!, {
      createBot: (s) => createRandomBot(s),
      seed: () => SEED,
      schedule: (fn) => void queue.push(fn),
      standInDelayMs: 0,
    });
    for (let i = 0; queue.length > 0 && i < 10_000; i++) queue.shift()!();
    const hand = restored.getTable().hand!;
    expect(hand.phase).toBe('finished');
    expect(hand.contract).toEqual({ kind: 'hochzeit' });
    expect(hand.partner).toBe(2);
    expect(hand.result!.outcome!.winners.length).toBe(2);
  });
});

/**
 * Bot, der eine Hochzeit ansagt, wann immer er darf, und – je nach `accepts` – jede Hochzeit
 * annimmt. Sonst spielt er wie der Heuristik-Bot. Merkt sich jede Aktion, die nicht in der
 * Sicht erlaubt war; der Host würde sie sonst still durch einen Notfallzug ersetzen.
 */
function weddingBot(seed: number, accepts: boolean, illegal: string[]): Bot {
  const inner = createHeuristicBot(seed);
  const choose = (view: HandView): PlayerAction => {
    if (view.phase === 'bidding') {
      const wedding = view.legalCalls.find(
        (c) =>
          (c.type === 'declare' && c.contract.kind === 'hochzeit') ||
          (c.type === 'name' && c.level.kind === 'hochzeit'),
      );
      if (wedding) return { type: 'bid', call: wedding };
      const eligible = MODES.hochzeit.eligible!(view.hand);
      if (eligible && view.auction.stage === 'interest') {
        return { type: 'bid', call: { type: 'interest' } };
      }
      if (eligible && view.auction.stage === 'duel' && view.turn === view.auction.holder) {
        return { type: 'bid', call: { type: 'hold' } };
      }
    }
    if (view.phase === 'prelude' && view.legalMoves.some((m) => m.type === 'accept')) {
      // Fest vorgegeben, unabhängig davon, was der Heuristik-Bot mit seinem Blatt täte (B3).
      return { type: 'prelude', move: { type: accepts ? 'accept' : 'decline' } };
    }
    return inner.decide(view);
  };
  return {
    decide(view) {
      const action = choose(view);
      const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
      const ok =
        action.type === 'play'
          ? view.legalCards.includes(action.card)
          : action.type === 'bid'
            ? view.legalCalls.some((c) => same(c, action.call))
            : action.type === 'prelude'
              ? view.legalMoves.some((m) => same(m, action.move))
              : view.canDouble;
      if (!ok) illegal.push(JSON.stringify(action));
      return action;
    },
  };
}

describe('Host mit vier Bots und Hochzeit', () => {
  for (const accepts of [false, true]) {
    it(`Bots ${accepts ? 'nehmen an' : 'lehnen ab'}: Spiele laufen durch, Kontosumme bleibt 0`, () => {
      let weddings = 0;
      let played = 0;
      for (const allPassed of ['zusammenwerfen', 'ramsch', 'muss'] as const) {
        const queue: (() => void)[] = [];
        const illegal: string[] = [];
        let n = 1;
        const options = {
          rules: { ...HOCHZEIT, allPassed },
          createBot: (seat: number) => weddingBot(seat + 1, accepts, illegal),
          seed: () => n++,
          schedule: (fn: () => void) => void queue.push(fn),
        };
        const host = new HostSession(options);
        host.start();
        for (let hand = 1; hand <= 40; hand++) {
          for (let i = 0; queue.length > 0; i++) {
            if (i > 10_000) throw new Error('Host kommt nicht zur Ruhe');
            queue.shift()!();
          }
          const table = host.getTable();
          const state = table.hand!;
          expect(state.phase).toBe('finished');
          const log = table.logs.at(-1)!;
          if (log.actions.some((a) => a.type === 'prelude')) weddings++;
          if (state.contract?.kind === 'hochzeit') {
            played++;
            expect(accepts).toBe(true);
            expect(state.partner).not.toBeNull();
            expect(state.partner).not.toBe(state.declarer);
          }
          expect(table.balances.reduce((a, b) => a + b, 0) + table.pot).toBe(0);
          host.nextHand();
        }
        expect(illegal).toEqual([]);
      }
      expect(weddings).toBeGreaterThan(5);
      if (accepts) expect(played).toBeGreaterThan(5);
      else expect(played).toBe(0);
    });
  }
});

describe('Bots im Vorspiel', () => {
  it('lehnen ab und geben sonst die niedrigste erlaubte Karte zurück', () => {
    const base = { contract: { kind: 'hochzeit' as const } } as HandView;
    expect(preludeMove({ ...base, legalMoves: [{ type: 'decline' }, { type: 'accept' }] })).toEqual(
      { type: 'decline' },
    );
    expect(
      preludeMove({
        ...base,
        legalMoves: [
          { type: 'give', cards: ['EA'] },
          { type: 'give', cards: ['G7'] },
          { type: 'give', cards: ['SK'] },
        ],
      }),
    ).toEqual({ type: 'give', cards: ['G7'] });
    // Nur Trümpfe: der niedrigste.
    expect(
      preludeMove({
        ...base,
        legalMoves: [
          { type: 'give', cards: ['EO'] },
          { type: 'give', cards: ['H7'] },
          { type: 'give', cards: ['HA'] },
        ],
      }),
    ).toEqual({ type: 'give', cards: ['H7'] });
  });

  it('geben bei der arabischen Hochzeit die zwei niedrigsten erlaubten Karten zurück', () => {
    const base = { contract: { kind: 'arabischeHochzeit' as const } } as HandView;
    expect(
      preludeMove({
        ...base,
        legalMoves: [
          { type: 'give', cards: ['EA', 'G7'] },
          { type: 'give', cards: ['G7', 'S7'] },
          { type: 'give', cards: ['SK', 'S7'] },
        ],
      }),
    ).toEqual({ type: 'give', cards: ['G7', 'S7'] });
    expect(preludeMove({ ...base, legalMoves: [{ type: 'decline' }, { type: 'accept' }] })).toEqual(
      { type: 'decline' },
    );
  });
});
