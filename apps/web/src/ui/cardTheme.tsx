import { type Card, type Suit, rankOf, suitOf } from '@schafkopf/core';
import type { ReactNode } from 'react';

/**
 * Ein Kartenbild ("Theme"). Die Oberfläche kennt nur diese Schnittstelle –
 * ein weiteres Kartenset (z. B. gezeichnetes bayerisches Blatt als SVG oder
 * französisches Blatt) ist nur ein weiteres Objekt dieser Form.
 */
export interface CardTheme {
  id: string;
  label: string;
  face(card: Card): ReactNode;
  back(): ReactNode;
}

const SUIT_SYMBOL: Record<Suit, string> = {
  eichel: '🌰',
  gras: '🍃',
  herz: '♥',
  schellen: '🔔',
};

/** Platzhalter-Kartenbild aus Text und Symbolen, bis es gezeichnete Karten gibt. */
export const textTheme: CardTheme = {
  id: 'text',
  label: 'Schlicht',
  face(card) {
    const suit = suitOf(card);
    return (
      <span className={`face face--${suit}`}>
        <span className="face__rank">{rankOf(card)}</span>
        <span className="face__suit">{SUIT_SYMBOL[suit]}</span>
        <span className="face__rank face__rank--bottom">{rankOf(card)}</span>
      </span>
    );
  },
  back() {
    return <span className="face face--back" />;
  },
};
