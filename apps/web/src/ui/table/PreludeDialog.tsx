import type { Card, HandView, PreludeMove, TableView } from '@schafkopf/core';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { KIND_NAME, TABLE_TEXT, TUTOR_TEXT, preludeMoveLabel } from '../../i18n/de';
import { cardLabel } from '../CardView';
import { useTutor } from '../../tutor/context';
import { useCardTheme } from '../cardTheme';
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
    return (
      <OfferStep
        declarer={declarer}
        arabic={hand.contract?.kind === 'arabischeHochzeit'}
        status={status}
        onMove={onMove}
      />
    );
  }
  return <ExchangeStep hand={hand} declarer={declarer} onMove={onMove} />;
}

/** Anker für den Fokus: Beim Erscheinen springt er in den Dialog, aber nicht auf einen Knopf. */
function FocusAnchor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return <div ref={ref} tabIndex={-1} className="ansage__anker" />;
}

/** Empfehlung von Max im Vorspiel (ab Stufe 2 der Antwort), sonst `null`. */
function usePreludeTip(): PreludeMove | null {
  const tip = useTutor()?.snap.tip;
  return tip?.type === 'prelude' ? tip.move : null;
}

function OfferStep({
  declarer,
  arabic,
  status,
  onMove,
}: {
  declarer: string;
  arabic: boolean;
  status: ReactNode;
  onMove: (move: PreludeMove) => void;
}) {
  const tip = usePreludeTip();
  return (
    <Dialog
      className="ansage hochzeit"
      title={TABLE_TEXT.weddingOfferTitle(
        declarer,
        arabic ? KIND_NAME.arabischeHochzeit : undefined,
      )}
      hint={status}
      actions={
        <>
          <Button
            variant="secondary"
            className={tip?.type === 'decline' ? 'btn--tipp' : undefined}
            onClick={() => onMove({ type: 'decline' })}
          >
            {TABLE_TEXT.weddingDecline}
          </Button>
          <Button
            className={tip?.type === 'accept' ? 'btn--tipp' : undefined}
            onClick={() => onMove({ type: 'accept' })}
          >
            {TABLE_TEXT.weddingAccept}
          </Button>
        </>
      }
    >
      <FocusAnchor />
      <p className="ansage__text">{TABLE_TEXT.weddingOfferBody(declarer, arabic ? 2 : 1)}</p>
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
  const theme = useCardTheme();
  const tip = usePreludeTip();
  const tipped = new Set<Card>(tip?.type === 'give' ? tip.cards : []);
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
      <FocusAnchor />
      <div className="hochzeit__karten" role="group" aria-label={TABLE_TEXT.hand}>
        {cards.map((card) => {
          const usable = allowed.has(card);
          return (
            <button
              key={card}
              type="button"
              className={`card ${usable ? 'card--playable' : 'card--locked'} hochzeit__karte${tipped.has(card) ? ' hochzeit__karte--tipp' : ''}`}
              title={tipped.has(card) ? TUTOR_TEXT.tipLabel : undefined}
              aria-label={cardLabel(card)}
              aria-pressed={chosen.includes(card)}
              disabled={!usable}
              onClick={() => toggle(card)}
            >
              {theme.face(card)}
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
