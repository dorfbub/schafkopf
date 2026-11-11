import { type InputHTMLAttributes, useId } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Hinweis unter dem Feld; bei `error` wird stattdessen der Fehler gezeigt. */
  hint?: string;
  error?: string;
}

/** Eingabefeld mit Beschriftung, Hinweis und Fehlerzustand. */
export function TextField({ label, hint, error, className, ...rest }: Props) {
  const id = useId();
  const message = error ?? hint;
  return (
    <div className={`field${error ? ' field--error' : ''}${className ? ` ${className}` : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? `${id}-hint` : undefined}
        {...rest}
      />
      {message && (
        <span id={`${id}-hint`} className="field__hint">
          {message}
        </span>
      )}
    </div>
  );
}
