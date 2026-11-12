import { RULES_TEXT as T } from '../i18n/de';
import { type CardTheme } from './cardTheme';
import { CardBack, CardView } from './CardView';

/** Drei kleine Karten als Vorschau eines Kartenbilds (Lobby, Regel-Tafel). */
export function CardSetPreview({ theme }: { theme: CardTheme }) {
  return (
    <span className="kartenbild__vorschau" role="group" aria-label={T.cardSetPreview(theme.label)}>
      <CardView card="HO" theme={theme} />
      <CardView card="EA" theme={theme} />
      <CardBack theme={theme} />
    </span>
  );
}
