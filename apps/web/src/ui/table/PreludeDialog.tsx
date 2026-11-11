import {
  type Card,
  type HandView,
  type PreludeMove,
  type TableView,
  rankOf,
  suitOf,
} from '@schafkopf/core';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { RANK_NAME, SUIT_NAME, TABLE_TEXT, preludeMoveLabel } from '../../i18n/de';
import { bayerischTheme } from '../cardTheme';
import { Button, Dialog } from '../kit';
import { type SeatInfo, sortHand } from './layout';

interface Props {
  view: TableView;
  hand: HandView;
  seats: SeatInfo;
  onMove: (move: PreludeMove) => void;
}

const sameCards = (a: readonly Card[], b: readonly Card[]) =>
  a.length === b.length && a.every((c) => b.includes(c));

/**
 * Vorspiel-Dialog der Hochzeit (REGELN.md, „Hochzeit“): erst „Nein“ / „Ich nehme an“, dann
 * wählt der Partner die Karte(n), die er zurückgibt. Angeboten wird nur, was `legalMoves`
 * erlaubt; die übrigen Karten stehen gesperrt daneben.
 */
export function PreludeDialog({ view, hand, seats, onMove }: Props) {
  const prelude = hand.prelude!;
  const declarer = seats.nameOf(hand.declarer!);
  // Wer schon abgelehnt hat – für alle sichtbar, weil laut gesagt.
  const said = prelude.log
    .filter((e) => e.seat !== view.you)
    .map((e) => TABLE_TEXT.bidSaid(seats.nameOf(e.seat), preludeMoveLabel(e.move)));
  const status = said.length > 0 && <span className="ansage__status">{said.join(' · ')}</span>;
  if (prelude.step === 'offer') {
    return <OfferStep declarer={declarer} status={status} onMove={onMove} />;
  }
  return <ExchangeStep hand={hand} declarer={declarer} onMove={onMove} />;
}

function OfferStep({
  declarer,
  status,
  onMove,
}: {
  declarer: string;
  status: ReactNode;
  onMove: (move: PreludeMove) => void;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  useEffect(() => anchor.current?.focus(), []);
  return (
    <Dialog
      className="ansage hochzeit"
      title={TABLE_TEXT.weddingOfferTitle(declarer)}
      hint={status}
      actions={
        <>
          <Button variant="secondary" onClick={() => onMove({ type: 'decline' })}>
            {TABLE_TEXT.weddingDecline}
          </Button>
          <Button onClick={() => onMove({ type: 'accept' })}>{TABLE_TEXT.weddingAccept}</Button>
        </>
      }
    >
      <div ref={anchor} tabIndex={-1} className="ansage__anker" />
      <p className="ansage__text">{TABLE_TEXT.weddingOfferBody(declarer)}</p>
    </Dialog>
  );
}

function ExchangeStep({
  hand,
  declarer,
  onMove,
}: {
  hand: HandView;
  declarer: string;
  onMove: (move: PreludeMove) => void;
}) {
  const gives = hand.legalMoves.flatMap((m) => (m.type === 'give' ? [m.cards] : []));
  const count = gives[0]?.length ?? 1;
  const allowed = new Set(gives.flat());
  const [chosen, setChosen] = useState<Card[]>(() => (gives.length === 1 ? gives[0]! : []));
  const legal = gives.find((g) => sameCards(g, chosen));
  const cards = sortHand(hand.hand, hand.contract, 0);

  const toggle = (card: Card) =>
    setChosen((now) => {
      if (now.includes(card)) return now.filter((c) => c !== card);
      // Bei einer Karte ersetzt die neue Wahl die alte; bei mehreren wird ergänzt.
      return count === 1 ? [card] : [...now, card].slice(-count);
    });

  return (
    <Dialog
      className="ansage hochzeit"
      title={TABLE_TEXT.weddingGiveTitle(count)}
      hint={<span className="ansage__status">{TABLE_TEXT.weddingGiveHint(declarer, count)}</span>}
      actions={
        <Button disabled={!legal} onClick={() => legal && onMove({ type: 'give', cards: legal })}>
          {TABLE_TEXT.weddingGive}
        </Button>
      }
    >
      <div className="hochzeit__karten" role="group" aria-label={TABLE_TEXT.hand}>
        {cards.map((card) => {
          const label = `${SUIT_NAME[suitOf(card)]}-${RANK_NAME[rankOf(card)]}`;
          const usable = allowed.has(card);
          return (
            <button
              key={card}
              type="button"
              className={`card ${usable ? 'card--playable' : 'card--locked'} hochzeit__karte`}
              aria-label={label}
              aria-pressed={chosen.includes(card)}
              disabled={!usable}
              onClick={() => toggle(card)}
            >
              {bayerischTheme.face(card)}
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
