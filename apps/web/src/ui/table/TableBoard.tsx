import type { BidCall, Card, Seat, TableView } from '@schafkopf/core';
import type { AbsentSeatInfo } from '@schafkopf/net';
import { useCallback, useState } from 'react';
import { TABLE_TEXT } from '../../i18n/de';
import { Button, Dialog } from '../kit';
import { BidDialog } from './BidDialog';
import { LastTrickDialog } from './LastTrickDialog';
import { seatInfo } from './layout';
import { OwnSeat } from './OwnSeat';
import { ResultDialog } from './ResultDialog';
import { type AbsentActions, Seats } from './Seats';
import { RulesDialog } from './RulesDialog';
import { TableBar } from './TableBar';
import { TrickArea } from './TrickArea';
import { useTrickDisplay } from './useTrickDisplay';

export interface TableBoardProps {
  view: TableView;
  onBid: (call: BidCall) => void;
  onPlay: (card: Card) => void;
  /** Kontra bzw. Re sagen (K4). */
  onDouble?: () => void;
  /** Nur der Gastgeber gibt das nächste Spiel. */
  onNext: (() => void) | null;
  onLeave: () => void;
  /** Getrennte Mitspieler (N3). */
  absent?: AbsentSeatInfo[];
  /** Nur der Gastgeber: Bot sofort übernehmen lassen bzw. Spieler dauerhaft ersetzen. */
  onStandInNow?: ((seat: Seat) => void) | null;
  onReplaceWithBot?: ((seat: Seat) => void) | null;
}

/**
 * Der Spieltisch: Leiste, Filz mit den Plätzen der anderen und dem Stich, darunter der eigene
 * Platz mit der Hand. Arbeitet nur auf der `TableView`; Aktionen gehen über die Rückrufe.
 */
export function TableBoard({
  view,
  onBid,
  onPlay,
  onDouble = () => {},
  onNext,
  onLeave,
  absent = [],
  onStandInNow = null,
  onReplaceWithBot = null,
}: TableBoardProps) {
  const hand = view.hand!;
  const seats = seatInfo(view);
  const shown = useTrickDisplay(hand, view.handNo);
  const [lastOpen, setLastOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const closeRules = useCallback(() => setRulesOpen(false), []);
  const closeLast = useCallback(() => setLastOpen(false), []);
  const [removing, setRemoving] = useState<Seat | null>(null);
  const hostActions: AbsentActions | null =
    onStandInNow && onReplaceWithBot
      ? { standInNow: onStandInNow, askRemove: (seat) => setRemoving(seat) }
      : null;
  // Kommt der Spieler zurück, während die Rückfrage offen ist, erübrigt sie sich.
  const removingSeat =
    removing !== null && absent.some((a) => a.seat === removing) ? removing : null;

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
        rulesOpen={rulesOpen}
        onRules={() => setRulesOpen((open) => !open)}
        onLeave={onLeave}
      />
      <div className="tisch__raum">
        <div className="tisch__platte" aria-hidden="true" />
        <Seats view={view} hand={hand} seats={seats} absent={absent} hostActions={hostActions} />
        <TrickArea
          trick={shown.trick}
          completed={shown.completed}
          sweeping={shown.sweeping}
          seats={seats}
        />
        {hand.phase === 'bidding' && myTurn && (
          <BidDialog
            key={`${view.handNo}-${hand.bids.length}`}
            view={view}
            hand={hand}
            seats={seats}
            onBid={onBid}
          />
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
        {rulesOpen && <RulesDialog rules={view.rules} onClose={closeRules} />}
        {removingSeat !== null && onReplaceWithBot && (
          <Dialog
            title={TABLE_TEXT.absentRemoveTitle(seats.nameOf(removingSeat))}
            hint={TABLE_TEXT.absentRemoveHint(seats.nameOf(removingSeat))}
            actions={
              <>
                <Button variant="secondary" onClick={() => setRemoving(null)}>
                  {TABLE_TEXT.absentRemoveCancel}
                </Button>
                <Button
                  onClick={() => {
                    onReplaceWithBot(removingSeat);
                    setRemoving(null);
                  }}
                >
                  {TABLE_TEXT.absentRemoveConfirm}
                </Button>
              </>
            }
          />
        )}
      </div>
      <OwnSeat view={view} hand={hand} seats={seats} onPlay={play} onDouble={onDouble} />
    </main>
  );
}
