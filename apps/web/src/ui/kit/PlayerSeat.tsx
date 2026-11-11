import type { ReactNode } from 'react';
import { UI_TEXT } from '../../i18n/de';

interface Props {
  name: string;
  /** Nebeninfo unter dem Namen, z. B. „2 Stiche · +0,30 €“. */
  info?: ReactNode;
  turn?: boolean;
  /** Gehört zur Partei des Spielers (Spieler oder bekannter Mitspieler). */
  party?: boolean;
  dealer?: boolean;
  disconnected?: boolean;
  /** Ein Bot vertritt den getrennten Spieler. */
  standIn?: boolean;
  /** Ersetzt die Marke „getrennt“, z. B. durch die Restzeit bis zur Vertretung. */
  disconnectedLabel?: string;
  /** Schaltflächen am Platz, z. B. für den Gastgeber. */
  actions?: ReactNode;
  /** Marken wie „Spieler“ oder „Mitspieler“. */
  marks?: ReactNode;
  /** Sprechblase, z. B. die Ansage. */
  bubble?: ReactNode;
  /** Verdeckte Karten des Spielers. */
  cards?: ReactNode;
  className?: string;
}

/**
 * Platz eines Mitspielers am Tisch mit den Zuständen „am Zug“, „Partei des Spielers“, „Geber“,
 * „getrennt“ und „Bot vertritt“.
 */
export function PlayerSeat({
  name,
  info,
  turn,
  party,
  dealer,
  disconnected,
  standIn,
  disconnectedLabel,
  actions,
  marks,
  bubble,
  cards,
  className,
}: Props) {
  const classes = [
    'player-seat',
    turn && 'player-seat--turn',
    party && 'player-seat--party',
    dealer && 'player-seat--dealer',
    disconnected && 'player-seat--disconnected',
    disconnected && standIn && 'player-seat--stand-in',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const states = [
    turn && UI_TEXT.seatTurn,
    dealer && UI_TEXT.seatDealer,
    disconnected && (disconnectedLabel ?? UI_TEXT.seatDisconnected),
    disconnected && standIn && UI_TEXT.seatStandIn,
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
          {disconnected && !standIn && (
            <span className="marke">{disconnectedLabel ?? UI_TEXT.seatDisconnected}</span>
          )}
          {disconnected && standIn && <span className="marke">{UI_TEXT.seatStandIn}</span>}
          {marks}
        </span>
      )}
      {actions && <span className="player-seat__actions">{actions}</span>}
      {bubble && <span className="player-seat__bubble">{bubble}</span>}
      {cards && (
        <span className="player-seat__cards" aria-hidden="true">
          {cards}
        </span>
      )}
    </div>
  );
}
