import { type Card, rankOf, suitOf } from '@schafkopf/core';
import { RANK_NAME, SUIT_NAME } from '../i18n/de';
import { type CardTheme, useCardTheme } from './cardTheme';

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
  /** Ohne Angabe das Kartenbild des Tisches (`CardThemeContext`). */
  theme?: CardTheme;
}

/** Name einer Karte für Bildschirmleser, z. B. „Gras-Sau“. */
export function cardLabel(card: Card): string {
  return `${SUIT_NAME[suitOf(card)]}-${RANK_NAME[rankOf(card)]}`;
}

export function CardView({ card, onPlay, state, theme: given }: Props) {
  const tableTheme = useCardTheme();
  const theme = given ?? tableTheme;
  const label = cardLabel(card);
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

export function CardBack({ theme: given }: { theme?: CardTheme }) {
  const tableTheme = useCardTheme();
  const theme = given ?? tableTheme;
  return <span className="card card--back">{theme.back()}</span>;
}
