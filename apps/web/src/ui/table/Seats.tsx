import type { BidCall, HandView, Seat, TableView } from '@schafkopf/core';
import { TABLE_TEXT, callLabel, money } from '../../i18n/de';
import { CardBack, PlayerSeat } from '../kit';
import type { SeatInfo } from './layout';

/** Höchstens so viele verdeckte Karten am Platz zeigen. */
const MAX_BACKS = 8;

interface SeatProps {
  view: TableView;
  hand: HandView;
  seats: SeatInfo;
}

/** Stiche und Kontostand eines Sitzes, z. B. „1 Stich · −0,40 €“. */
export function SeatStats({ view, hand, seat }: { view: TableView; hand: HandView; seat: Seat }) {
  const balance = view.balances[seat]!;
  return (
    <>
      <span>{TABLE_TEXT.tricks(hand.tricksWon[seat]!)}</span>
      <span className={balance < 0 ? 'text-negative' : undefined}>{money(balance)}</span>
    </>
  );
}

/** Marken „Spieler“ und „Mitspieler“, sobald sie bekannt sind. */
export function PartyMarks({ hand, seat }: { hand: HandView; seat: Seat }) {
  if (hand.declarer === seat)
    return <span className="marke marke--paper">{TABLE_TEXT.markDeclarer}</span>;
  if (hand.partner === seat)
    return <span className="marke marke--paper">{TABLE_TEXT.markPartner}</span>;
  return null;
}

/** Ist der Sitz als Spieler oder Mitspieler bekannt? */
export function inParty(hand: HandView, seat: Seat): boolean {
  return hand.declarer === seat || hand.partner === seat;
}

/** Was ein Sitz in der Ansage zuletzt gesagt hat; `null`, wenn er noch nichts gesagt hat. */
export function lastCall(hand: HandView, seat: Seat): BidCall | null {
  return hand.bids.findLast((b) => b.seat === seat)?.call ?? null;
}

/** Ist der Sitz mit diesem Ruf aus der Ansage ausgestiegen („weiter“, „gut“)? */
export function isOut(call: BidCall): boolean {
  return call.type === 'pass' || call.type === 'yield';
}

/** Die Plätze der anderen am Tisch (für Zuschauer alle vier). */
export function Seats({ view, hand, seats }: SeatProps) {
  return (
    <>
      {view.seats.map((player, seat) => {
        if (seat === view.you) return null;
        const turn = hand.turn === seat && hand.phase !== 'finished';
        const bid = hand.phase === 'bidding' ? lastCall(hand, seat) : null;
        const size = hand.handSizes[seat]!;
        return (
          <PlayerSeat
            key={seat}
            className={`tisch-platz tisch-platz--${seats.position(seat)}`}
            name={seats.nameOf(seat)}
            info={<SeatStats view={view} hand={hand} seat={seat} />}
            turn={turn}
            dealer={seat === hand.dealer}
            disconnected={player !== null && !player.connected}
            marks={inParty(hand, seat) && <PartyMarks hand={hand} seat={seat} />}
            bubble={
              bid && <span className={isOut(bid) ? 'blase--weiter' : ''}>{callLabel(bid)}</span>
            }
            cards={
              size > 0 &&
              Array.from({ length: Math.min(size, MAX_BACKS) }, (_, i) => <CardBack key={i} />)
            }
          />
        );
      })}
    </>
  );
}
