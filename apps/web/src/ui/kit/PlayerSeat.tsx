import type { ReactNode } from 'react';
import { UI_TEXT } from '../../i18n/de';

interface Props {
  name: string;
  /** Nebeninfo unter dem Namen, z. B. „2 Stiche · +0,30 €“. */
  info?: ReactNode;
  turn?: boolean;
  dealer?: boolean;
  disconnected?: boolean;
  /** Marken wie „Spieler“ oder „Mitspieler“. */
  marks?: ReactNode;
  /** Sprechblase, z. B. die Ansage. */
  bubble?: ReactNode;
  /** Verdeckte Karten des Spielers. */
  cards?: ReactNode;
  className?: string;
}

/** Platz eines Mitspielers am Tisch mit den Zuständen „am Zug“, „Geber“ und „getrennt“. */
export function PlayerSeat({
  name,
  info,
  turn,
  dealer,
  disconnected,
  marks,
  bubble,
  cards,
  className,
}: Props) {
  const classes = [
    'player-seat',
    turn && 'player-seat--turn',
    dealer && 'player-seat--dealer',
    disconnected && 'player-seat--disconnected',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const states = [
    turn && UI_TEXT.seatTurn,
    dealer && UI_TEXT.seatDealer,
    disconnected && UI_TEXT.seatDisconnected,
  ].filter(Boolean);
  return (
    <div className={classes} aria-label={[name, ...states].join(', ')} role="group">
      <span className="player-seat__avatar" aria-hidden="true">
        {name.slice(0, 1).toUpperCase()}
        {dealer && (
          <span className="player-seat__dealer" title={UI_TEXT.seatDealer}>
            {UI_TEXT.seatDealerShort}
          </span>
        )}
      </span>
      <span className="player-seat__name">{name}</span>
      {info && <span className="player-seat__info">{info}</span>}
      {(marks || disconnected || turn) && (
        <span className="player-seat__marks">
          {turn && <span className="marke marke--brass">{UI_TEXT.seatTurn}</span>}
          {disconnected && <span className="marke">{UI_TEXT.seatDisconnected}</span>}
          {marks}
        </span>
      )}
      {bubble && <span className="player-seat__bubble">{bubble}</span>}
      {cards && (
        <span className="player-seat__cards" aria-hidden="true">
          {cards}
        </span>
      )}
    </div>
  );
}
