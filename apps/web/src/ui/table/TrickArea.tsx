import type { CompletedTrick, Trick } from '@schafkopf/core';
import { TABLE_TEXT } from '../../i18n/de';
import { CardView } from '../kit';
import type { SeatInfo } from './layout';

interface Props {
  trick: Trick;
  /** Gesetzt, solange der fertige Stich noch liegen bleibt. */
  completed: CompletedTrick | null;
  /** Der fertige Stich wandert gerade zum Gewinner. */
  sweeping: boolean;
  seats: SeatInfo;
}

/** Der Stich in der Tischmitte; jede Karte liegt vor dem Spieler, der sie gelegt hat. */
export function TrickArea({ trick, completed, sweeping, seats }: Props) {
  const classes = [
    'stich',
    sweeping && completed && `stich--weg stich--zu-${seats.position(completed.winner)}`,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} role="group" aria-label={TABLE_TEXT.trick}>
      {trick.cards.map((card, i) => {
        const seat = (trick.leader + i) % seats.players;
        const won = completed !== null && completed.winner === seat;
        return (
          <div
            key={card}
            className={`stich__karte stich__karte--${seats.position(seat)}`}
            style={{ zIndex: i + 1 }}
          >
            <CardView card={card} state={won ? 'won' : undefined} />
          </div>
        );
      })}
      {completed && (
        <p className="stich__gewinner" aria-live="polite">
          {TABLE_TEXT.wonBy(seats.nameOf(completed.winner), completed.points)}
        </p>
      )}
    </div>
  );
}
