import type { HandView, TableView } from '@schafkopf/core';
import { RULES_TEXT, TABLE_TEXT, contractLabel, plainMoney } from '../../i18n/de';
import { Button } from '../kit';
import type { SeatInfo } from './layout';
import { DoublingTag } from './Seats';

interface Props {
  view: TableView;
  hand: HandView;
  seats: SeatInfo;
  rulesOpen: boolean;
  onRules: () => void;
  onEvening: () => void;
  onLeave: () => void;
}

/**
 * Leiste über dem Tisch: Spielnummer, was gespielt wird, Regeln, Verlassen. Der letzte Stich
 * liegt seit dem Spielabend als Stapel auf dem Filz (`LastTrickPile`).
 */
export function TableBar({ view, hand, seats, rulesOpen, onRules, onEvening, onLeave }: Props) {
  // Noch nicht gelegte Karten plus die im laufenden Stich ergeben die offenen Stiche.
  const cardsLeft = hand.handSizes.reduce((a, b) => a + b, 0) + hand.currentTrick.cards.length;
  const tricksDone = hand.tricksWon.reduce((a, b) => a + b, 0);
  const allTricks = tricksDone + Math.ceil(cardsLeft / seats.players);
  const phase =
    hand.phase === 'bidding'
      ? TABLE_TEXT.bidding
      : hand.phase === 'prelude'
        ? TABLE_TEXT.wedding
        : hand.phase === 'finished'
          ? TABLE_TEXT.finished
          : TABLE_TEXT.trickNo(Math.min(tricksDone + 1, allTricks), allTricks);

  let status;
  if (hand.phase === 'prelude' && hand.prelude && hand.declarer !== null) {
    const declarer = seats.nameOf(hand.declarer);
    status =
      hand.prelude.step === 'exchange' ? (
        TABLE_TEXT.weddingExchange(seats.nameOf(hand.turn))
      ) : hand.turn === view.you ? (
        <b className="tisch-leiste__spiel">{TABLE_TEXT.weddingStatusYou(declarer)}</b>
      ) : (
        TABLE_TEXT.weddingStatus(declarer, seats.nameOf(hand.turn))
      );
  } else if (hand.contract && hand.declarer !== null) {
    status = (
      <>
        <span className="tisch-leiste__wer">{seats.nameOf(hand.declarer)}</span> {TABLE_TEXT.plays}{' '}
        <b className="tisch-leiste__spiel">{contractLabel(hand.contract)}</b>
        {hand.doubling.kontra !== null && <DoublingTag className="tisch-leiste__kontra" />}
        {hand.doubling.re !== null && <DoublingTag re className="tisch-leiste__kontra" />}
      </>
    );
  } else if (hand.contract) {
    // Spiel ohne Ansager (Ramsch).
    status = <b className="tisch-leiste__spiel">{TABLE_TEXT.ramschStatus}</b>;
  } else if (hand.phase === 'bidding' && hand.auction.forced) {
    status =
      hand.turn === view.you ? (
        <b className="tisch-leiste__spiel">{TABLE_TEXT.mussYou}</b>
      ) : (
        TABLE_TEXT.mussStatus(seats.nameOf(hand.turn))
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
          {(view.rules.allPassed === 'stock' || view.pot > 0) && (
            <> · {TABLE_TEXT.pot(plainMoney(view.pot))}</>
          )}
        </span>
      </div>
      <p className="tisch-leiste__status" aria-live="polite">
        {status}
      </p>
      <div className="tisch-leiste__knoepfe">
        <Button variant="secondary" size="small" aria-expanded={rulesOpen} onClick={onRules}>
          {RULES_TEXT.info}
        </Button>
        <Button variant="secondary" size="small" onClick={onEvening}>
          {TABLE_TEXT.evening}
        </Button>
        <Button variant="secondary" size="small" onClick={onLeave}>
          {TABLE_TEXT.leave}
        </Button>
      </div>
    </header>
  );
}
