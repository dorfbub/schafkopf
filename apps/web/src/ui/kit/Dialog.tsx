import { type ReactNode, useId } from 'react';

interface Props {
  title: string;
  hint?: ReactNode;
  children?: ReactNode;
  /** Schaltflächen unten rechts; die Hauptaktion zuletzt. */
  actions?: ReactNode;
  /** Mittig über dem Tisch (Standard) oder im Fluss, z. B. auf der Musterseite. */
  placement?: 'centered' | 'inline';
  className?: string;
}

/**
 * Dialog auf Papier mitten auf dem Tisch. Nicht modal: Die Hand bleibt sichtbar und der
 * Rest der Seite bedienbar, deshalb `role="dialog"` ohne Fokusfalle.
 */
export function Dialog({
  title,
  hint,
  children,
  actions,
  placement = 'centered',
  className,
}: Props) {
  const titleId = useId();
  const classes = [
    'dialog',
    'surface-paper',
    placement === 'centered' && 'dialog--centered',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <section className={classes} role="dialog" aria-labelledby={titleId}>
      <h2 className="dialog__title" id={titleId}>
        {title}
      </h2>
      {hint && <p className="dialog__hint">{hint}</p>}
      {children}
      {actions && <div className="dialog__actions">{actions}</div>}
    </section>
  );
}
