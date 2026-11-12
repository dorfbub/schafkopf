import { type Card, type HandView, type TableView, tricksPlayed } from '@schafkopf/core';
import { type CSSProperties, type KeyboardEvent, useEffect, useState } from 'react';
import { TABLE_TEXT, TUTOR_TEXT, UI_TEXT } from '../../i18n/de';
import { useTutor } from '../../tutor/context';
import { Button, CardView } from '../kit';
import type { SeatInfo } from './layout';
import { sortHand } from './layout';
import { TutorFigure } from './Tutor';
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
 * er mit der nächsten Sicht von selbst; bis dahin ist er kurz gesperrt, damit kein Doppelklick
 * ankommt.
 */
function DoubleButton({
  hand,
  onDouble,
  tip,
}: {
  hand: HandView;
  onDouble: () => void;
  /** Max Weber empfiehlt Kontra bzw. Re (T2). */
  tip: boolean;
}) {
  const re = hand.doubling.kontra !== null;
  const [sent, setSent] = useState(false);
  // Kommt keine Antwort an (Verbindung hakt, Host lehnt ab), wird der Knopf wieder frei.
  useEffect(() => {
    if (!sent) return;
    const id = setTimeout(() => setSent(false), 2000);
    return () => clearTimeout(id);
  }, [sent]);
  return (
    <span className={`eigen__kontra${tip ? ' eigen__kontra--tipp' : ''}`}>
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
  const tutor = useTutor();
  const tutorTip = tutor?.snap.tip ?? null;
  if (view.you === null) {
    return (
      <footer className="eigen">
        <p className="eigen__info">{TABLE_TEXT.spectating}</p>
      </footer>
    );
  }
  const me = view.you;
  // Empfehlung des Trainers (ab der zweiten Stufe der Antwort) am Tisch sichtbar machen.
  const tip = tutorTip;
  const myTurn = hand.turn === me && hand.phase !== 'finished';
  const cards = sortHand(hand.hand, hand.contract, tricksPlayed(hand));
  const n = cards.length;
  const turnText =
    hand.phase === 'bidding'
      ? TABLE_TEXT.yourTurnBid
      : hand.phase === 'prelude'
        ? TABLE_TEXT.yourTurnWedding
        : TABLE_TEXT.yourTurnPlay;

  return (
    <footer
      className={`eigen${myTurn ? ' eigen--dran' : ''}${inParty(hand, me) ? ' eigen--partei' : ''}${tutor ? ' eigen--trainer' : ''}`}
    >
      <TutorFigure place="eigen" />
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
        {/* Eigene Zeile, die auf schmalem Bildschirm immer da ist (auch leer): Spielschild und
            Marken erscheinen mitten im Spielabend, und der Tisch darf dabei nicht springen. */}
        <span className="eigen__marken">
          {inParty(hand, me) && <PartyMarks hand={hand} seat={me} />}
          {hasDoubled(hand, me) && <DoublingMarks hand={hand} seat={me} />}
        </span>
        {/* Steht immer da (unsichtbar, wenn andere dran sind), damit die Zeile gleich umbricht
            und der Tisch nicht springt. */}
        <strong className={`eigen__dran${myTurn ? '' : ' eigen__dran--aus'}`}>{turnText}</strong>
        {hand.canDouble && (
          <DoubleButton
            key={`${view.handNo}-${hand.doubling.kontra}`}
            hand={hand}
            onDouble={onDouble}
            tip={tip?.type === 'double' && tip.double}
          />
        )}
      </div>
      {/*
       * Die Handzeile bleibt auch ohne Karten stehen und behält ihre Höhe – sonst wächst der
       * Tisch beim Legen der letzten Karte nach (Fehler vom Spielabend).
       */}
      <div
        className="hand"
        role="group"
        aria-label={TABLE_TEXT.hand}
        aria-hidden={n === 0 || undefined}
        style={{ '--n': Math.max(n, 1) } as CSSProperties}
        onKeyDown={moveFocus}
      >
        {cards.map((card, i) => {
          const legal = hand.legalCards.includes(card);
          const locked = hand.phase === 'playing' && myTurn && !legal;
          const tipped = tip?.type === 'card' && tip.card === card && legal;
          return (
            <span
              key={card}
              className={`hand__platz${tipped ? ' hand__platz--tipp' : ''}`}
              style={{ '--d': i - (n - 1) / 2, '--i': i } as CSSProperties}
              title={tipped ? TUTOR_TEXT.tipLabel : undefined}
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
    </footer>
  );
}
