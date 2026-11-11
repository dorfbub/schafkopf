import type { CompletedTrick } from '@schafkopf/core';
import type { CSSProperties } from 'react';
import { TABLE_TEXT } from '../../i18n/de';
import { CardView } from '../kit';
import type { SeatInfo } from './layout';

interface Props {
  trick: CompletedTrick;
  seats: SeatInfo;
  open: boolean;
  onToggle: () => void;
}

/**
 * Der letzte Stich liegt klein unten rechts auf dem Filz – immer sichtbar, sobald der erste
 * Stich weggeräumt ist. Antippen (oder Enter) öffnet ihn groß mit den Namen.
 */
export function LastTrickPile({ trick, seats, open, onToggle }: Props) {
  const winner = seats.nameOf(trick.winner);
  return (
    <button
      type="button"
      className="stapel"
      aria-expanded={open}
      aria-label={TABLE_TEXT.lastTrickPileLabel(winner, trick.points)}
      onClick={onToggle}
    >
      <span className="stapel__karten" aria-hidden="true">
        {trick.cards.map((card, i) => {
          const seat = (trick.leader + i) % seats.players;
          return (
            <span key={card} className="stapel__karte" style={{ '--i': i } as CSSProperties}>
              <CardView card={card} state={seat === trick.winner ? 'won' : undefined} />
            </span>
          );
        })}
      </span>
      <span className="stapel__text" aria-hidden="true">
        {TABLE_TEXT.lastTrick}
      </span>
    </button>
  );
}
