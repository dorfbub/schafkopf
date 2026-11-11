import type { HandView, TableView } from '@schafkopf/core';
import { RULES_TEXT, TABLE_TEXT, contractLabel } from '../../i18n/de';
import { Button } from '../kit';
import type { SeatInfo } from './layout';

interface Props {
  view: TableView;
  hand: HandView;
  seats: SeatInfo;
  lastTrickOpen: boolean;
  onLastTrick: (() => void) | null;
  rulesOpen: boolean;
  onRules: () => void;
  onLeave: () => void;
}

/** Leiste über dem Tisch: Spielnummer, was gespielt wird, letzter Stich, Verlassen. */
export function TableBar({
  view,
  hand,
  seats,
  lastTrickOpen,
  onLastTrick,
  rulesOpen,
  onRules,
  onLeave,
}: Props) {
  // Noch nicht gelegte Karten plus die im laufenden Stich ergeben die offenen Stiche.
  const cardsLeft = hand.handSizes.reduce((a, b) => a + b, 0) + hand.currentTrick.cards.length;
  const tricksDone = hand.tricksWon.reduce((a, b) => a + b, 0);
  const allTricks = tricksDone + Math.ceil(cardsLeft / seats.players);
  const phase =
    hand.phase === 'bidding'
      ? TABLE_TEXT.bidding
      : hand.phase === 'finished'
        ? TABLE_TEXT.finished
        : TABLE_TEXT.trickNo(Math.min(tricksDone + 1, allTricks), allTricks);

  let status;
  if (hand.contract && hand.declarer !== null) {
    status = (
      <>
        <span className="tisch-leiste__wer">{seats.nameOf(hand.declarer)}</span> {TABLE_TEXT.plays}{' '}
        <b className="tisch-leiste__spiel">{contractLabel(hand.contract)}</b>
      </>
    );
  } else if (hand.phase === 'bidding') {
    status =
      hand.turn === view.you ? (
        <b className="tisch-leiste__spiel">{TABLE_TEXT.youBid}</b>
      ) : (
        TABLE_TEXT.othersBid(seats.nameOf(hand.turn))
      );
  }

  return (
    <header className="tisch-leiste">
      <div className="tisch-leiste__links">
        <span className="tisch-leiste__marke">{TABLE_TEXT.brand}</span>
        <span className="tisch-leiste__phase">
          {TABLE_TEXT.handNo(view.handNo)} · {phase}
        </span>
      </div>
      <p className="tisch-leiste__status" aria-live="polite">
        {status}
      </p>
      <div className="tisch-leiste__knoepfe">
        {onLastTrick && (
          <Button
            variant="secondary"
            size="small"
            aria-expanded={lastTrickOpen}
            onClick={onLastTrick}
          >
            {TABLE_TEXT.lastTrick}
          </Button>
        )}
        <Button variant="secondary" size="small" aria-expanded={rulesOpen} onClick={onRules}>
          {RULES_TEXT.info}
        </Button>
        <Button variant="secondary" size="small" onClick={onLeave}>
          {TABLE_TEXT.leave}
        </Button>
      </div>
    </header>
  );
}
