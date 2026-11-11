import { type Card, rankOf, suitOf } from '@schafkopf/core';
import { RANK_NAME, SUIT_NAME } from '../i18n/de';
import { type CardTheme, bayerischTheme } from './cardTheme';

/**
 * Zustand einer offenen Karte:
 * - `open`: liegt offen (Stich, fremde Hand), nicht bedienbar
 * - `playable`: darf gespielt werden – Messingrand, hebt sich beim Zeigen
 * - `locked`: in der eigenen Hand, darf gerade nicht gespielt werden – abgedunkelt
 * - `won`: Karte, die den Stich gewonnen hat
 */
export type CardState = 'open' | 'playable' | 'locked' | 'won';

interface Props {
  card: Card;
  /** Wenn gesetzt, ist die Karte spielbar (Zustand `playable`). */
  onPlay?: () => void;
  state?: CardState;
  theme?: CardTheme;
}

export function CardView({ card, onPlay, state, theme = bayerischTheme }: Props) {
  const label = `${SUIT_NAME[suitOf(card)]}-${RANK_NAME[rankOf(card)]}`;
  const face = theme.face(card);
  const shown = state ?? (onPlay ? 'playable' : 'open');
  if (shown !== 'playable' || !onPlay) {
    const extra = shown === 'open' ? '' : ` card--${shown}`;
    return (
      <span className={`card${extra}`} role="img" aria-label={label}>
        {face}
      </span>
    );
  }
  return (
    <button type="button" className="card card--playable" onClick={onPlay} aria-label={label}>
      {face}
    </button>
  );
}

export function CardBack({ theme = bayerischTheme }: { theme?: CardTheme }) {
  return <span className="card card--back">{theme.back()}</span>;
}
