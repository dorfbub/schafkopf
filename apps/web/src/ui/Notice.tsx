import { useEffect, useState } from 'react';
import { NOTICE_TEXT } from '../i18n/de';

/** So lange bleibt ein Hinweis stehen, wenn man ihn nicht vorher schließt. */
export const NOTICE_MS = 5000;

interface Props {
  /** Text des Hinweises; `null` = keiner. Ein neuer Text zeigt den Zettel erneut. */
  message: string | null;
  /** Am Tisch über der Hand statt ganz unten. */
  aboveHand?: boolean;
  /** Oben statt unten am Rand. */
  top?: boolean;
  /** Knopf im Hinweis; ein solcher Hinweis bleibt stehen, bis er geschlossen wird. */
  action?: { label: string; onClick: () => void };
}

/**
 * Unaufdringlicher Hinweis unten am Rand – ein kleiner Papierzettel, der von selbst wieder
 * verschwindet. Für Bildschirmleser als Statusmeldung angesagt.
 */
export function Notice({ message, aboveHand, top, action }: Props) {
  const [hidden, setHidden] = useState<string | null>(null);

  useEffect(() => {
    if (!message || action) return;
    setHidden(null);
    const timer = setTimeout(() => setHidden(message), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [message, action]);

  const show = message !== null && hidden !== message;
  return (
    <div
      className={`notice-area${aboveHand ? ' notice-area--above-hand' : ''}${top ? ' notice-area--top' : ''}`}
      role="status"
    >
      {show && (
        <p className="notice surface-paper">
          <span className="notice__text">{message}</span>
          {action && (
            <button type="button" className="btn btn--primary btn--small" onClick={action.onClick}>
              {action.label}
            </button>
          )}
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
