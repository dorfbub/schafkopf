import type { CompletedTrick } from '@schafkopf/core';
import { useEffect, useRef } from 'react';
import { TABLE_TEXT } from '../../i18n/de';
import { Button, CardView, Dialog } from '../kit';
import type { SeatInfo } from './layout';

interface Props {
  trick: CompletedTrick;
  seats: SeatInfo;
  onClose: () => void;
}

/** Zeigt den letzten Stich mit den Namen; Escape oder „Schließen“ schließt ihn. */
export function LastTrickDialog({ trick, seats, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus();
    };
  }, [onClose]);

  return (
    <Dialog
      className="letzter-stich"
      title={TABLE_TEXT.lastTrick}
      hint={TABLE_TEXT.wonBy(seats.nameOf(trick.winner), trick.points)}
      actions={
        <Button ref={closeRef} variant="secondary" onClick={onClose}>
          {TABLE_TEXT.close}
        </Button>
      }
    >
      <ol className="letzter-stich__karten">
        {trick.cards.map((card, i) => {
          const seat = (trick.leader + i) % seats.players;
          return (
            <li key={card} className="letzter-stich__karte">
              <CardView card={card} state={seat === trick.winner ? 'won' : undefined} />
              <span className="letzter-stich__name">{seats.nameOf(seat)}</span>
            </li>
          );
        })}
      </ol>
    </Dialog>
  );
}
