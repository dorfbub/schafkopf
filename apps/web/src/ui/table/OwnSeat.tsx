import { type Card, type HandView, type TableView, tricksPlayed } from '@schafkopf/core';
import { type CSSProperties, type KeyboardEvent, useState } from 'react';
import { TABLE_TEXT, UI_TEXT } from '../../i18n/de';
import { Button, CardView } from '../kit';
import type { SeatInfo } from './layout';
import { sortHand } from './layout';
import { DoublingMarks, PartyMarks, SeatStats, hasDoubled, inParty } from './Seats';

interface Props {
  view: TableView;
  hand: HandView;
  seats: SeatInfo;
  onPlay: (card: Card) => void;
  /** Kontra bzw. Re sagen (K4). */
  onDouble: () => void;
}

/** Pfeiltasten wandern durch die spielbaren Karten der Hand. */
function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
  const step = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[e.key];
  if (step === undefined) return;
  const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
  if (buttons.length === 0) return;
  const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next = Math.max(0, Math.min(buttons.length - 1, (at < 0 ? 0 : at) + step));
  buttons[next]!.focus();
  e.preventDefault();
}

/**
 * Knopf „Kontra“ bzw. „Re“ (K4) – nur, solange der Kern es erlaubt. Nach dem Klick verschwindet
 * er mit der nächsten Sicht von selbst; bis dahin ist er gesperrt, damit kein Doppelklick ankommt.
 */
function DoubleButton({ hand, onDouble }: { hand: HandView; onDouble: () => void }) {
  const re = hand.doubling.kontra !== null;
  const [sent, setSent] = useState(false);
  return (
    <span className="eigen__kontra">
      <Button
        size="small"
        disabled={sent}
        aria-label={re ? TABLE_TEXT.reLabel : TABLE_TEXT.kontraLabel}
        onClick={() => {
          setSent(true);
          onDouble();
        }}
      >
        {re ? TABLE_TEXT.re : TABLE_TEXT.kontra}
      </Button>
      <span className="eigen__kontra-hinweis">{TABLE_TEXT.kontraHint}</span>
    </span>
  );
}

/** Eigener Platz unten: Name, Stand, Hinweis „Du bist dran“ und die Hand als Fächer. */
export function OwnSeat({ view, hand, seats, onPlay, onDouble }: Props) {
  if (view.you === null) {
    return (
      <footer className="eigen">
        <p className="eigen__info">{TABLE_TEXT.spectating}</p>
      </footer>
    );
  }
  const me = view.you;
  const myTurn = hand.turn === me && hand.phase !== 'finished';
  const cards = sortHand(hand.hand, hand.contract, tricksPlayed(hand));
  const n = cards.length;
  const turnText =
    myTurn && (hand.phase === 'bidding' ? TABLE_TEXT.yourTurnBid : TABLE_TEXT.yourTurnPlay);

  return (
    <footer className={`eigen${myTurn ? ' eigen--dran' : ''}${n === 0 ? ' eigen--ohne-hand' : ''}`}>
      <div className="eigen__info">
        <span className="eigen__avatar" aria-hidden="true">
          {seats.nameOf(me).slice(0, 1).toUpperCase()}
          {hand.dealer === me && (
            <span className="eigen__geber" title={UI_TEXT.seatDealer}>
              {UI_TEXT.seatDealerShort}
            </span>
          )}
        </span>
        <span className="eigen__name">{seats.nameOf(me)}</span>
        {hand.dealer === me && <span className="visually-hidden">{UI_TEXT.seatDealer}</span>}
        <span className="eigen__stand">
          <SeatStats view={view} hand={hand} seat={me} />
        </span>
        {inParty(hand, me) && <PartyMarks hand={hand} seat={me} />}
        {hasDoubled(hand, me) && <DoublingMarks hand={hand} seat={me} />}
        {turnText && <strong className="eigen__dran">{turnText}</strong>}
        {hand.canDouble && (
          <DoubleButton
            key={`${view.handNo}-${hand.doubling.kontra}`}
            hand={hand}
            onDouble={onDouble}
          />
        )}
      </div>
      {n > 0 && (
        <div
          className="hand"
          role="group"
          aria-label={TABLE_TEXT.hand}
          style={{ '--n': n } as CSSProperties}
          onKeyDown={moveFocus}
        >
          {cards.map((card, i) => {
            const legal = hand.legalCards.includes(card);
            const locked = hand.phase === 'playing' && myTurn && !legal;
            return (
              <span
                key={card}
                className="hand__platz"
                style={{ '--d': i - (n - 1) / 2, '--i': i } as CSSProperties}
              >
                <CardView
                  card={card}
                  state={locked ? 'locked' : undefined}
                  onPlay={legal ? () => onPlay(card) : undefined}
                />
              </span>
            );
          })}
        </div>
      )}
    </footer>
  );
}
