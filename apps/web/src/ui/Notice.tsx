import { useEffect, useState } from 'react';
import { NOTICE_TEXT } from '../i18n/de';

/** So lange bleibt ein Hinweis stehen, wenn man ihn nicht vorher schließt. */
export const NOTICE_MS = 5000;

interface Props {
  /** Text des Hinweises; `null` = keiner. Ein neuer Text zeigt den Zettel erneut. */
  message: string | null;
  /** Am Tisch über der Hand statt ganz unten. */
  aboveHand?: boolean;
}

/**
 * Unaufdringlicher Hinweis unten am Rand – ein kleiner Papierzettel, der von selbst wieder
 * verschwindet. Für Bildschirmleser als Statusmeldung angesagt.
 */
export function Notice({ message, aboveHand }: Props) {
  const [hidden, setHidden] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    setHidden(null);
    const timer = setTimeout(() => setHidden(message), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  const show = message !== null && hidden !== message;
  return (
    <div className={`notice-area${aboveHand ? ' notice-area--above-hand' : ''}`} role="status">
      {show && (
        <p className="notice surface-paper">
          <span className="notice__text">{message}</span>
          <button
            type="button"
            className="icon-btn notice__close"
            aria-label={NOTICE_TEXT.close}
            onClick={() => setHidden(message)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </p>
      )}
    </div>
  );
}
