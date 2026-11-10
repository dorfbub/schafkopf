import { type Card, rankOf, suitOf } from '@schafkopf/core';
import { RANK_NAME, SUIT_NAME } from '../i18n/de';
import { type CardTheme, textTheme } from './cardTheme';

interface Props {
  card: Card;
  /** Wenn gesetzt, ist die Karte spielbar. */
  onPlay?: () => void;
  dimmed?: boolean;
  theme?: CardTheme;
}

export function CardView({ card, onPlay, dimmed, theme = textTheme }: Props) {
  const label = `${SUIT_NAME[suitOf(card)]}-${RANK_NAME[rankOf(card)]}`;
  const face = theme.face(card);
  if (!onPlay) {
    return (
      <span className={`card${dimmed ? ' card--dimmed' : ''}`} role="img" aria-label={label}>
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

export function CardBack({ theme = textTheme }: { theme?: CardTheme }) {
  return <span className="card card--back">{theme.back()}</span>;
}
