import type { BidCall, HandView, Seat, TableView } from '@schafkopf/core';
import type { AbsentSeatInfo } from '@schafkopf/net';
import { useEffect, useState } from 'react';
import { TABLE_TEXT, callLabel, money } from '../../i18n/de';
import { Button, CardBack, PlayerSeat } from '../kit';
import { GameSign, gameSign } from './GameSign';
import type { SeatInfo } from './layout';

/** Gastgeber-Befehle für getrennte Mitspieler; fehlt bei Gästen. */
export interface AbsentActions {
  standInNow: (seat: Seat) => void;
  /** Fragt nach, bevor ein Spieler dauerhaft vom Platz genommen wird. */
  askRemove: (seat: Seat) => void;
}

/** Höchstens so viele verdeckte Karten am Platz zeigen. */
const MAX_BACKS = 8;

interface SeatProps {
  view: TableView;
  hand: HandView;
  seats: SeatInfo;
  absent: AbsentSeatInfo[];
  hostActions: AbsentActions | null;
}

/** Aktuelle Uhrzeit, sekündlich erneuert, solange `active` gilt (für Restzeiten). */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** Sekunden bis zur Vertretung, aufgerundet, nie negativ. */
function secondsLeft(info: AbsentSeatInfo, now: number): number {
  return Math.max(0, Math.ceil(((info.standInAt ?? now) - now) / 1000));
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

/**
 * Am Platz des Spielers das Schild mit dem Spiel (siehe `GameSign`), am Platz des Mitspielers
 * die Marke „Mitspieler“, sobald er bekannt ist.
 */
export function PartyMarks({ hand, seat }: { hand: HandView; seat: Seat }) {
  const sign = gameSign(hand);
  if (sign && sign.seat === seat) return <GameSign info={sign} />;
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
export function Seats({ view, hand, seats, absent, hostActions }: SeatProps) {
  const now = useNow(absent.some((a) => a.standInAt !== null));
  return (
    <>
      {view.seats.map((player, seat) => {
        if (seat === view.you) return null;
        const turn = hand.turn === seat && hand.phase !== 'finished';
        const bid = hand.phase === 'bidding' ? lastCall(hand, seat) : null;
        const size = hand.handSizes[seat]!;
        const away = absent.find((a) => a.seat === seat);
        const name = seats.nameOf(seat);
        return (
          <PlayerSeat
            key={seat}
            className={`tisch-platz tisch-platz--${seats.position(seat)}`}
            name={name}
            info={<SeatStats view={view} hand={hand} seat={seat} />}
            turn={turn}
            dealer={seat === hand.dealer}
            disconnected={player !== null && !player.connected}
            standIn={away?.standIn}
            disconnectedLabel={
              away && !away.standIn ? TABLE_TEXT.absentCountdown(secondsLeft(away, now)) : undefined
            }
            actions={
              away &&
              hostActions && (
                <>
                  {!away.standIn && (
                    <Button
                      variant="secondary"
                      size="small"
                      aria-label={TABLE_TEXT.absentStandInNowLabel(name)}
                      onClick={() => hostActions.standInNow(seat)}
                    >
                      {TABLE_TEXT.absentStandInNow}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="small"
                    aria-label={TABLE_TEXT.absentRemoveLabel(name)}
                    onClick={() => hostActions.askRemove(seat)}
                  >
                    {TABLE_TEXT.absentRemove}
                  </Button>
                </>
              )
            }
            party={inParty(hand, seat)}
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
