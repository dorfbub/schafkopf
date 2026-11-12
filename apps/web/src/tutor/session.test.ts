import {
  type Action,
  type TableState,
  type TableView,
  DEFAULT_RULES,
  applyTableAction,
  createTable,
  legalCalls,
  legalCards,
  startHand,
  tableViewFor,
} from '@schafkopf/core';
import type { Advice, Review, TutorInput, TutorOption } from '@schafkopf/tutor';
import { describe, expect, it } from 'vitest';
import type { TutorEngine } from './engine';
import { TutorSession } from './session';

/** Tisch mit dir auf Platz 0 und drei Bots; gespielt wird mit festen Zügen. */
function table(): TableState {
  let t: TableState = {
    ...createTable(DEFAULT_RULES),
    seats: ['Du', 'A', 'B', 'C'].map((name, i) => ({
      name,
      kind: i === 0 ? 'human' : 'bot',
      connected: true,
    })),
  };
  // Ein Seed, bei dem jemand spielt (nicht zusammengeworfen): die Bots sagen an, du nicht.
  for (let seed = 1; ; seed++) {
    const started = startHand(t, seed);
    if (!started.ok) throw new Error(started.error);
    t = advance(started.table, (s) => s.hand!.phase !== 'bidding');
    if (t.hand!.phase === 'playing') return t;
    t = { ...createTable(DEFAULT_RULES), seats: t.seats };
  }
}

/** Ansage: Platz 1 will spielen, alle anderen „weiter“; im Spiel die erste erlaubte Karte. */
function step(t: TableState): Action | null {
  const hand = t.hand!;
  const seat = hand.turn;
  if (hand.phase === 'bidding') {
    const calls = legalCalls(hand, seat);
    const want =
      seat === 1
        ? (calls.find((c) => c.type === 'interest') ??
          calls.find((c) => c.type === 'declare') ??
          calls[0]!)
        : (calls.find((c) => c.type === 'pass') ?? calls[0]!);
    return { seat, type: 'bid', call: want };
  }
  if (hand.phase === 'playing') return { seat, type: 'play', card: legalCards(hand, seat)[0]! };
  return null;
}

function advance(t: TableState, stop: (t: TableState) => boolean): TableState {
  let s = t;
  for (let i = 0; i < 200 && !stop(s); i++) {
    const action = step(s);
    if (!action) break;
    const r = applyTableAction(s, action);
    if (!r.ok) throw new Error(r.error);
    s = r.table;
  }
  return s;
}

const view = (t: TableState): TableView => tableViewFor(t, 0);
const myCardTurn = (t: TableState) =>
  t.hand!.phase === 'playing' && t.hand!.turn === 0 && legalCards(t.hand!, 0).length > 1;

/** Rechenwerk zum Steuern: merkt sich die Anfragen, antwortet mit festen Werten. */
function stubEngine(opts: { auto?: boolean; review?: Partial<Review> } = {}) {
  const inputs: TutorInput[] = [];
  const engine: TutorEngine = {
    advise(input) {
      inputs.push(input);
      const card = input.view.legalCards[0]!;
      const advice: Advice = {
        ask: 'card',
        options: input.view.legalCards.map((c, i) => ({
          option: { type: 'card', card: c },
          cents: 10 - i,
          estimated: false,
        })),
        recommended: { type: 'card', card },
        basis: 'suche',
        reasons: [{ id: 'karte.schmieren', area: 'zugeben', favored: [], params: {} }],
        overruled: [],
        hint: { key: 'denkanstoss.karte.schmieren', params: { partner: 1 } },
        importance: { stakeCents: 20, level: opts.auto ? 'hoch' : 'niedrig', auto: !!opts.auto },
      };
      return Promise.resolve(advice);
    },
    review(input, move: TutorOption) {
      inputs.push(input);
      return Promise.resolve({
        verdict: 'fehler',
        move,
        best: move,
        lossCents: 12,
        rule: null,
        misleading: null,
        mention: true,
        ...opts.review,
      } as Review);
    },
    dispose() {},
  };
  return { engine, inputs };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('Trainer am Tisch (T2)', () => {
  it('sammelt die gesehenen Stiche und gibt sie vollständig weiter', async () => {
    const { engine, inputs } = stubEngine();
    const session = new TutorSession(engine, false);
    let t = table();
    session.update(view(t));
    // Stich für Stich weiter; jede Sicht geht an den Trainer.
    while (t.hand!.phase === 'playing' && t.hand!.tricks.length < 3) {
      t = advance(t, (s) => s !== t);
      session.update(view(t));
    }
    t = advance(t, myCardTurn);
    session.update(view(t));
    session.ask({ id: 'frage.karte.welche', ask: 'card', params: {} });
    await flush();
    const input = inputs.at(-1)!;
    expect(input.history).toHaveLength(t.hand!.tricks.length);
    expect(input.seat).toBe(0);
    // Nur die eigene Sicht: Die Hände der anderen kennt der Trainer nicht.
    expect(JSON.stringify(input)).not.toContain('"hands"');
  });

  it('antwortet in drei Stufen und hebt ab der zweiten die Empfehlung hervor', async () => {
    const { engine } = stubEngine();
    const session = new TutorSession(engine, false);
    const t = advance(table(), myCardTurn);
    session.update(view(t));
    expect(session.getSnapshot().questions.map((q) => q.id)).toContain('frage.karte.welche');

    session.toggle();
    expect(session.getSnapshot().bubble).toEqual({ kind: 'menu' });
    session.ask(session.getSnapshot().questions.find((q) => q.id === 'frage.karte.welche')!);
    expect(session.getSnapshot().bubble?.kind).toBe('thinking');
    await flush();
    let b = session.getSnapshot().bubble;
    expect(b?.kind === 'advice' && b.stage).toBe(1);
    expect(session.getSnapshot().tip).toBeNull(); // erst der Denkanstoß

    session.reveal();
    b = session.getSnapshot().bubble;
    expect(b?.kind === 'advice' && b.stage).toBe(2);
    expect(session.getSnapshot().tip).toEqual({ type: 'card', card: legalCards(t.hand!, 0)[0] });

    session.reveal();
    b = session.getSnapshot().bubble;
    expect(b?.kind === 'advice' && b.stage).toBe(3);
  });

  it('schließt einen veralteten Rat, sobald sich die Lage ändert', async () => {
    const { engine } = stubEngine();
    const session = new TutorSession(engine, false);
    let t = advance(table(), myCardTurn);
    session.update(view(t));
    session.ask({ id: 'frage.karte.welche', ask: 'card', params: {} });
    await flush();
    session.reveal();
    const card = legalCards(t.hand!, 0)[1]!;
    session.noteMove({ type: 'card', card });
    const r = applyTableAction(t, { seat: 0, type: 'play', card });
    if (!r.ok) throw new Error(r.error);
    t = r.table;
    session.update(view(t));
    expect(session.getSnapshot().open).toBe(false);
    expect(session.getSnapshot().tip).toBeNull();
  });

  it('bewertet den Zug hinterher und merkt Fehler für den Rückblick', async () => {
    const { engine } = stubEngine();
    const session = new TutorSession(engine, true);
    const t = advance(table(), myCardTurn);
    session.update(view(t));
    const card = legalCards(t.hand!, 0)[1]!;
    session.noteMove({ type: 'card', card });
    await flush();
    const snap = session.getSnapshot();
    expect(snap.marks).toHaveLength(1);
    expect(snap.marks[0]).toMatchObject({ where: 'card', trick: t.hand!.tricks.length });
    // Im Automatikmodus spricht Max den Fehler an …
    expect(snap.bubble?.kind).toBe('review');
    // … und „War mein letzter Zug gut?“ steht jetzt zur Wahl.
    expect(snap.questions.map((q) => q.id)).toContain('frage.rueckblick.zug');
  });

  it('spricht ohne Automatik nichts von selbst an, merkt den Fehler aber trotzdem', async () => {
    const { engine } = stubEngine({ auto: true });
    const session = new TutorSession(engine, false);
    const t = advance(table(), myCardTurn);
    session.update(view(t));
    await flush();
    expect(session.getSnapshot().open).toBe(false);
    session.noteMove({ type: 'card', card: legalCards(t.hand!, 0)[1]! });
    await flush();
    expect(session.getSnapshot().open).toBe(false);
    expect(session.getSnapshot().marks).toHaveLength(1);
  });

  it('meldet sich im Automatikmodus in wichtigen Momenten zuerst mit dem Denkanstoß', async () => {
    const { engine } = stubEngine({ auto: true });
    const session = new TutorSession(engine, true);
    const t = advance(table(), myCardTurn);
    session.update(view(t));
    await flush();
    const b = session.getSnapshot().bubble;
    expect(b?.kind).toBe('advice');
    expect(b?.kind === 'advice' && b.auto && b.stage).toBe(1);
    expect(session.getSnapshot().tip).toBeNull();
  });

  it('bleibt bei unwichtigen Momenten still', async () => {
    const { engine } = stubEngine({ auto: false });
    const session = new TutorSession(engine, true);
    session.update(view(advance(table(), myCardTurn)));
    await flush();
    expect(session.getSnapshot().open).toBe(false);
  });

  it('nennt gute Züge nicht und merkt sie nicht für den Rückblick', async () => {
    const { engine } = stubEngine({ review: { verdict: 'gut', mention: false, lossCents: 0 } });
    const session = new TutorSession(engine, true);
    const t = advance(table(), myCardTurn);
    session.update(view(t));
    session.noteMove({ type: 'card', card: legalCards(t.hand!, 0)[0]! });
    await flush();
    expect(session.getSnapshot().marks).toHaveLength(0);
    expect(session.getSnapshot().bubble).toBeNull();
  });

  it('hat für Zuschauer nichts zu sagen', () => {
    const { engine } = stubEngine();
    const session = new TutorSession(engine, true);
    session.update(tableViewFor(advance(table(), myCardTurn), null));
    expect(session.getSnapshot().questions).toEqual([]);
  });

  it('schweigt, solange der Tisch noch den fertigen Stich zeigt', async () => {
    const { engine, inputs } = stubEngine({ auto: true });
    const session = new TutorSession(engine, true);
    const t = advance(table(), myCardTurn);
    // Der vorige Stich liegt noch auf dem Tisch, die Sicht kennt schon den neuen.
    session.setSettled(false);
    session.update(view(t));
    await flush();
    // Von selbst meldet er sich nicht; eine Frage wartet („denkt nach“), statt zu antworten.
    expect(session.getSnapshot().bubble).toBeNull();
    session.ask({ id: 'frage.karte.welche', ask: 'card', params: {} });
    await flush();
    expect(session.getSnapshot().bubble?.kind).toBe('thinking');
    // Der Stich ist weggeräumt: jetzt antwortet Max zu der Lage, die man sieht.
    session.setSettled(true);
    await flush();
    expect(session.getSnapshot().bubble?.kind).toBe('advice');
    expect(inputs.at(-1)!.view.currentTrick).toEqual(t.hand!.currentTrick);
  });

  it('meldet sich von selbst erst, wenn der fertige Stich weggeräumt ist', async () => {
    const { engine } = stubEngine({ auto: true });
    const session = new TutorSession(engine, true);
    const t = advance(table(), myCardTurn);
    session.setSettled(false);
    session.update(view(t));
    await flush();
    expect(session.getSnapshot().bubble).toBeNull();
    session.setSettled(true);
    await flush();
    expect(session.getSnapshot().bubble).toMatchObject({ kind: 'advice', auto: true });
  });
});
