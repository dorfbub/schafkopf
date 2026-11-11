import {
  type Action,
  type Seat,
  type TableState,
  DEFAULT_RULES,
  applyTableAction,
  createTable,
  legalCards,
  legalContracts,
  startHand,
  tableViewFor,
} from '@schafkopf/core';
import { useEffect, useState } from 'react';
import { TableBoard } from '../ui/table/TableBoard';

/*
 * Tischprobe (D3): der Spieltisch mit festen Spielständen aus dem Kern, ohne Netz. Nur im
 * Entwicklungsserver, z. B. http://localhost:5180/#tisch?szene=stich
 *
 * Szenen: ansage (du sagst an), warten (andere sagen an), stich (laufender Stich, du bist
 * dran), ergebnis (Spiel beendet), zuschauer. Mit `&auto=1` spielen die anderen weiter.
 * Beispielnamen stehen deshalb hier und nicht in i18n/de.ts.
 */

const NAMES = ['Lukas', 'Resi', 'Xaver', 'Vroni'];
const ME: Seat = 0;

/** Deterministische Wahl aus den erlaubten Zügen. */
function pick<T>(options: T[], step: number): T {
  return options[(step * 7 + 3) % options.length]!;
}

/** Zug für `seat`: in der Ansage sagt nur Xaver ein Sauspiel an, die anderen sagen weiter. */
function botAction(table: TableState, step: number): Action | null {
  const hand = table.hand!;
  const seat = hand.turn;
  if (hand.phase === 'bidding') {
    const options = legalContracts(hand, seat);
    const sauspiel = options.find((c) => c.kind === 'sauspiel');
    return { seat, type: 'bid', contract: seat === 2 && sauspiel ? sauspiel : null };
  }
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
function advance(table: TableState, stop: (t: TableState) => boolean): TableState {
  let t = table;
  for (let step = 0; step < 200 && !stop(t); step++) {
    const action = botAction(t, step);
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
      const action = botAction(table, step);
      if (action) setTable((t) => apply(t, action));
      setStep((s) => s + 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [auto, othersTurn, table, step]);

  const next = () => {
    const started = startHand(table, 4711 + table.handNo);
    if (started.ok) setTable(started.table);
  };

  return (
    <TableBoard
      view={tableViewFor(table, viewer)}
      onBid={(contract) => setTable((t) => apply(t, { seat: ME, type: 'bid', contract }))}
      onPlay={(card) => setTable((t) => apply(t, { seat: ME, type: 'play', card }))}
      onNext={next}
      onLeave={() => (location.hash = '')}
    />
  );
}
