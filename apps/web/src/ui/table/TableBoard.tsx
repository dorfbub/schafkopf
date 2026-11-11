import type { Card, Contract, TableView } from '@schafkopf/core';
import { useCallback, useState } from 'react';
import { BidDialog } from './BidDialog';
import { LastTrickDialog } from './LastTrickDialog';
import { seatInfo } from './layout';
import { OwnSeat } from './OwnSeat';
import { ResultDialog } from './ResultDialog';
import { Seats } from './Seats';
import { TableBar } from './TableBar';
import { TrickArea } from './TrickArea';
import { useTrickDisplay } from './useTrickDisplay';

export interface TableBoardProps {
  view: TableView;
  onBid: (contract: Contract | null) => void;
  onPlay: (card: Card) => void;
  /** Nur der Gastgeber gibt das nächste Spiel. */
  onNext: (() => void) | null;
  onLeave: () => void;
}

/**
 * Der Spieltisch: Leiste, Filz mit den Plätzen der anderen und dem Stich, darunter der eigene
 * Platz mit der Hand. Arbeitet nur auf der `TableView`; Aktionen gehen über die Rückrufe.
 */
export function TableBoard({ view, onBid, onPlay, onNext, onLeave }: TableBoardProps) {
  const hand = view.hand!;
  const seats = seatInfo(view);
  const shown = useTrickDisplay(hand, view.handNo);
  const [lastOpen, setLastOpen] = useState(false);
  const closeLast = useCallback(() => setLastOpen(false), []);

  const myTurn = view.you !== null && hand.turn === view.you && hand.phase !== 'finished';
  const canSeeLast = hand.lastTrick !== null && shown.completed === null;
  const toggleLast = canSeeLast ? () => setLastOpen((open) => !open) : null;
  const showResult = hand.phase === 'finished' && shown.completed === null && !lastOpen;

  const play = (card: Card) => {
    shown.release();
    setLastOpen(false);
    onPlay(card);
  };

  return (
    <main className={`tisch tisch--${hand.phase}`}>
      <TableBar
        view={view}
        hand={hand}
        seats={seats}
        lastTrickOpen={lastOpen}
        onLastTrick={toggleLast}
        onLeave={onLeave}
      />
      <div className="tisch__raum">
        <div className="tisch__platte" aria-hidden="true" />
        <Seats view={view} hand={hand} seats={seats} />
        <TrickArea trick={shown.trick} completed={shown.completed} seats={seats} />
        {hand.phase === 'bidding' && myTurn && (
          <BidDialog key={view.handNo} view={view} hand={hand} seats={seats} onBid={onBid} />
        )}
        {showResult && (
          <ResultDialog
            view={view}
            hand={hand}
            seats={seats}
            onNext={onNext}
            onLastTrick={toggleLast}
          />
        )}
        {lastOpen && hand.lastTrick && (
          <LastTrickDialog trick={hand.lastTrick} seats={seats} onClose={closeLast} />
        )}
      </div>
      <OwnSeat view={view} hand={hand} seats={seats} onPlay={play} />
    </main>
  );
}
