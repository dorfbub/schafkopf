import {
  type Action,
  type BidCall,
  type BidLevel,
  type Seat,
  type TableState,
  DEFAULT_RULES,
  applyTableAction,
  createTable,
  legalCalls,
  legalCards,
  startHand,
  tableViewFor,
} from '@schafkopf/core';
import { useEffect, useState } from 'react';
import { TableBoard } from '../ui/table/TableBoard';

/*
 * Tischprobe (D3): der Spieltisch mit festen Spielständen aus dem Kern, ohne Netz. Nur im
 * Entwicklungsserver, z. B. http://localhost:5180/#tisch?szene=stich
 *
 * Szenen: ansage („Ich würde“/„weiter“), zweikampf (du forderst Xaver), halten (Resi fordert
 * dich), nennen (du nennst dein Spiel, mindestens Wenz), warten (andere sagen an), stich
 * (laufender Stich, du bist dran), ergebnis (Spiel beendet), zuschauer. Mit `&auto=1` spielen
 * die anderen weiter.
 * Beispielnamen stehen deshalb hier und nicht in i18n/de.ts.
 */

const NAMES = ['Lukas', 'Resi', 'Xaver', 'Vroni'];
const ME: Seat = 0;

/** Deterministische Wahl aus den erlaubten Zügen. */
function pick<T>(options: T[], step: number): T {
  return options[(step * 7 + 3) % options.length]!;
}

/** Wer in der Ansage was sagt, je Szene. Ohne Eintrag: „weiter“ bzw. aufgeben. */
type Script = Partial<Record<Seat, { interest?: boolean; name?: BidLevel; hold?: boolean }>>;

const SCRIPTS: Record<string, Script> = {
  // Xaver will immer ein Sauspiel spielen und hält es.
  default: { 2: { interest: true, hold: true } },
  zweikampf: { 2: { interest: true, hold: true }, [ME]: { interest: true } },
  nennen: { 2: { interest: true }, [ME]: { interest: true, name: { kind: 'wenz' } } },
  halten: {
    2: { interest: true },
    [ME]: { interest: true, name: { kind: 'wenz' } },
    1: { interest: true, name: { kind: 'solo' } },
  },
};

function bidCall(table: TableState, seat: Seat, script: Script): BidCall {
  const hand = table.hand!;
  const calls = legalCalls(hand, seat);
  const plan = script[seat] ?? {};
  const want = (ok: (c: BidCall) => boolean) => calls.find(ok) ?? calls[0]!;
  switch (hand.auction.stage) {
    case 'interest':
      return want((c) => c.type === (plan.interest ? 'interest' : 'pass'));
    case 'duel':
      if (seat === hand.auction.holder) {
        const holds = plan.hold && hand.auction.level?.kind === 'sauspiel';
        return want((c) => c.type === (holds ? 'hold' : 'yield'));
      }
      return want(
        (c) =>
          c.type === 'name' &&
          !hand.bids.some((b) => b.seat === seat && b.call.type === 'name') &&
          c.level.kind === (plan.name?.kind ?? 'sauspiel'),
      );
    case 'declare':
      return want(
        (c) =>
          c.type === 'declare' &&
          c.contract.kind === (hand.auction.level?.kind ?? 'sauspiel') &&
          !c.contract.tout,
      );
  }
}

/** Zug für `seat`: in der Ansage nach dem Drehbuch der Szene, im Spiel feste Karten. */
function botAction(table: TableState, step: number, script: Script): Action | null {
  const hand = table.hand!;
  const seat = hand.turn;
  if (hand.phase === 'bidding') return { seat, type: 'bid', call: bidCall(table, seat, script) };
  if (hand.phase === 'playing')
    return { seat, type: 'play', card: pick(legalCards(hand, seat), step) };
  return null;
}

function apply(table: TableState, action: Action): TableState {
  const result = applyTableAction(table, action);
  if (!result.ok) throw new Error(`Tischprobe: ${result.error}`);
  return result.table;
}

/** Spielt mit festen Zügen vor, bis `stop` zutrifft. Auch der eigene Platz zieht dabei. */
function advance(
  table: TableState,
  stop: (t: TableState) => boolean,
  script: Script = SCRIPTS.default!,
): TableState {
  let t = table;
  for (let step = 0; step < 200 && !stop(t); step++) {
    const action = botAction(t, step, script);
    if (!action) break;
    t = apply(t, action);
  }
  return t;
}

function scene(name: string): TableState {
  let table: TableState = {
    ...createTable(DEFAULT_RULES),
    seats: NAMES.map((n, i) => ({ name: n, kind: i === ME ? 'human' : 'bot', connected: true })),
    balances: [120, -40, -60, -20],
    dealer: 1,
    handNo: 6,
  };
  table = { ...table, hand: null };
  const started = startHand(table, 4711);
  if (!started.ok) throw new Error(started.error);
  table = started.table;

  const done = (t: TableState) => t.hand!.tricks.length;
  switch (name) {
    case 'warten':
      return table;
    case 'ansage':
      return advance(table, (t) => t.hand!.turn === ME);
    case 'zweikampf':
    case 'halten':
    case 'nennen':
      return advance(
        table,
        (t) =>
          t.hand!.turn === ME &&
          t.hand!.auction.stage === (name === 'nennen' ? 'declare' : 'duel') &&
          (name !== 'halten' || t.hand!.auction.holder === ME),
        SCRIPTS[name],
      );
    case 'ergebnis':
      return advance(table, (t) => t.hand!.phase === 'finished');
    case 'zuschauer':
    case 'stich':
    default:
      return advance(
        table,
        (t) =>
          t.hand!.phase === 'playing' &&
          done(t) >= 3 &&
          t.hand!.turn === ME &&
          t.hand!.currentTrick.cards.length >= 2,
      );
  }
}

export function Tischprobe() {
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const name = params.get('szene') ?? 'stich';
  const auto = params.get('auto') === '1';
  const viewer: Seat | null = name === 'zuschauer' ? null : ME;
  const [table, setTable] = useState(() => scene(name));
  const [step, setStep] = useState(0);

  const hand = table.hand!;
  const othersTurn = hand.phase !== 'finished' && (viewer === null || hand.turn !== ME);

  useEffect(() => {
    if (!auto || !othersTurn) return;
    const timer = setTimeout(() => {
      const action = botAction(table, step, SCRIPTS[name] ?? SCRIPTS.default!);
      if (action) setTable((t) => apply(t, action));
      setStep((s) => s + 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [auto, othersTurn, table, step, name]);

  const next = () => {
    const started = startHand(table, 4711 + table.handNo);
    if (started.ok) setTable(started.table);
  };

  return (
    <TableBoard
      view={tableViewFor(table, viewer)}
      onBid={(call) => setTable((t) => apply(t, { seat: ME, type: 'bid', call }))}
      onPlay={(card) => setTable((t) => apply(t, { seat: ME, type: 'play', card }))}
      onNext={next}
      onLeave={() => (location.hash = '')}
    />
  );
}
