import type { CompletedTrick } from '@schafkopf/core';
import type { SyntheticEvent } from 'react';
import { TABLE_TEXT } from '../../i18n/de';
import { CardView } from '../kit';
import type { SeatInfo } from './layout';

interface Props {
  tricks: CompletedTrick[];
  seats: SeatInfo;
}

/**
 * Spielverlauf im Ergebnis-Dialog, aufklappbar: je Stich eine Zeile mit den vier Karten in
 * Spielreihenfolge (wer sie gelegt hat darunter), die stechende hervorgehoben, rechts die Augen.
 */
/** Aufgeklappt: den Verlauf im Dialog nach oben holen (ohne Gleiten bei „Bewegung reduzieren“). */
function showOpened(e: SyntheticEvent<HTMLDetailsElement>) {
  const details = e.currentTarget;
  if (!details.open) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  details.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
}

export function GameHistory({ tricks, seats }: Props) {
  return (
    <details className="verlauf" onToggle={showOpened}>
      <summary className="verlauf__knopf">{TABLE_TEXT.historyTitle}</summary>
      <ol className="verlauf__stiche">
        {tricks.map((trick, n) => (
          <li
            key={n}
            className="verlauf__stich"
            aria-label={TABLE_TEXT.historyTrick(
              n + 1,
              seats.nameOf(trick.leader),
              seats.nameOf(trick.winner),
              trick.points,
            )}
          >
            <span className="verlauf__nr" aria-hidden="true">
              {n + 1}
            </span>
            <span className="verlauf__karten">
              {trick.cards.map((card, i) => {
                const seat = (trick.leader + i) % seats.players;
                return (
                  <span key={card} className="verlauf__karte">
                    <CardView card={card} state={seat === trick.winner ? 'won' : undefined} />
                    <span className="verlauf__name">{seats.nameOf(seat)}</span>
                  </span>
                );
              })}
            </span>
            <span className="verlauf__augen" aria-hidden="true">
              {trick.points}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
