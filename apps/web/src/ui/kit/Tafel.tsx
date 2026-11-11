import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLElement> {
  /** Papier (Standard) oder dunkle Fläche auf dem Filz. */
  tone?: 'paper' | 'felt';
}

/** Tafel: abgesetzte Fläche für zusammengehörige Inhalte (Start, Lobby, Einstellungen). */
export function Tafel({ tone = 'paper', className, ...rest }: Props) {
  const classes = [
    'tafel',
    tone === 'felt' ? 'tafel--felt surface-felt' : 'surface-paper',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <section className={classes} {...rest} />;
}
