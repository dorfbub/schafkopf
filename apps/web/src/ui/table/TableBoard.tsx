import type { BidCall, Card, PreludeMove, Seat, TableView } from '@schafkopf/core';
import type { AbsentSeatInfo } from '@schafkopf/net';
import { useCallback, useState } from 'react';
import { TABLE_TEXT } from '../../i18n/de';
import { CardThemeContext, cardTheme } from '../cardTheme';
import { Button, Dialog } from '../kit';
import { BidDialog } from './BidDialog';
import { EveningDialog } from './EveningDialog';
import { LastTrickDialog } from './LastTrickDialog';
import { LastTrickPile } from './LastTrickPile';
import { seatInfo } from './layout';
import { OwnSeat } from './OwnSeat';
import { PreludeDialog } from './PreludeDialog';
import { ResultDialog } from './ResultDialog';
import { type AbsentActions, Seats } from './Seats';
import { RulesDialog } from './RulesDialog';
import { TableBar } from './TableBar';
import { TrickArea } from './TrickArea';
import { TutorCorner } from './Tutor';
import { useTrickDisplay } from './useTrickDisplay';

export interface TableBoardProps {
  view: TableView;
  onBid: (call: BidCall) => void;
  onPlay: (card: Card) => void;
  /** Zug im Vorspiel der Hochzeit (K5). */
  onPrelude?: (move: PreludeMove) => void;
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
  onPrelude = () => {},
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
  const [evening, setEvening] = useState<'show' | 'leave' | null>(null);
  const closeEvening = useCallback(() => setEvening(null), []);
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
  const showResult =
    hand.phase === 'finished' && shown.completed === null && !lastOpen && evening === null;

  const play = (card: Card) => {
    shown.release();
    setLastOpen(false);
    onPlay(card);
  };

  const theme = cardTheme(view.rules.cardSet);
  return (
    <CardThemeContext value={theme}>
      <main className={`tisch tisch--${hand.phase}`} data-kartenbild={theme.id}>
        <TableBar
          view={view}
          hand={hand}
          seats={seats}
          rulesOpen={rulesOpen}
          onRules={() => setRulesOpen((open) => !open)}
          onEvening={() => setEvening((open) => (open === 'show' ? null : 'show'))}
          // Mit gespielten Spielen erst die Abrechnung zeigen.
          onLeave={() => (view.history.length > 0 ? setEvening('leave') : onLeave())}
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
          {/* Bleibt auch liegen, während der fertige Stich noch in der Mitte liegt – sonst ginge
            der Fokus verloren, wenn man gerade auf dem Stapel steht. */}
          {hand.lastTrick && (
            <LastTrickPile
              trick={hand.lastTrick}
              seats={seats}
              open={lastOpen}
              onToggle={() => setLastOpen((open) => !open)}
            />
          )}
          {/* Trainer (nur allein gegen Bots): liegt über dem Filz und verschiebt nichts. */}
          <TutorCorner hand={hand} seats={seats} settled={shown.completed === null} />
          {hand.phase === 'bidding' && myTurn && (
            <BidDialog
              key={`${view.handNo}-${hand.bids.length}`}
              view={view}
              hand={hand}
              seats={seats}
              onBid={onBid}
            />
          )}
          {hand.phase === 'prelude' && myTurn && (
            <PreludeDialog
              key={`${view.handNo}-${hand.prelude?.step}`}
              view={view}
              hand={hand}
              seats={seats}
              onMove={onPrelude}
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
          {evening !== null && (
            <EveningDialog
              view={view}
              seats={seats}
              leaving={evening === 'leave'}
              onClose={closeEvening}
              onLeave={onLeave}
            />
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
    </CardThemeContext>
  );
}
