import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primär: Hauptaktion (eine pro Ansicht); sekundär: alles andere. */
  variant?: 'primary' | 'secondary';
  size?: 'normal' | 'small';
}

/** Schaltfläche. Ohne `type` ist sie `button`, nicht `submit`. */
export function Button({
  variant = 'primary',
  size = 'normal',
  type = 'button',
  className,
  ...rest
}: Props) {
  const classes = ['btn', `btn--${variant}`, size === 'small' && 'btn--small', className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}
