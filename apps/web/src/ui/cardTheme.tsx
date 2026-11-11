import { type Card, type Suit, rankOf, suitOf } from '@schafkopf/core';
import type { ReactNode } from 'react';

/**
 * Ein Kartenbild ("Theme"). Die Oberfläche kennt nur diese Schnittstelle –
 * ein weiteres Kartenset (z. B. französisches Blatt) ist nur ein weiteres Objekt
 * dieser Form.
 */
export interface CardTheme {
  id: string;
  label: string;
  face(card: Card): ReactNode;
  back(): ReactNode;
  /** Farbzeichen, z. B. für die Farbwahl im Ansage-Dialog. */
  suit(suit: Suit): ReactNode;
}

/*
 * Farbzeichen des bayerischen Blatts aus den D1-Entwürfen (docs/entwuerfe/gemeinsam.js). Die
 * Farben gehören zum Kartenbild wie die Farben der Karten-SVGs, nicht zum Gestaltungssystem.
 */
const SUIT_ICON: Record<Suit, ReactNode> = {
  herz: (
    <svg viewBox="0 0 24 24">
      <path
        d="M12 21s-7.6-4.7-9.4-9.3C1.3 8.3 3.6 5 7 5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.7 3.3 4.4 6.7C19.6 16.3 12 21 12 21z"
        fill="#c8202f"
        stroke="#7d0f18"
        strokeWidth="1"
      />
    </svg>
  ),
  schellen: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="4.3" r="1.6" fill="none" stroke="#6b4300" strokeWidth="1.2" />
      <circle cx="12" cy="13" r="7.6" fill="#e9b420" stroke="#6b4300" strokeWidth="1.1" />
      <path d="M4.8 10.6h14.4" stroke="#c8202f" strokeWidth="2.4" />
      <path d="M8.6 16.2h6.8" stroke="#4a2e00" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="12" cy="18" r="1" fill="#4a2e00" />
    </svg>
  ),
  gras: (
    <svg viewBox="0 0 24 24">
      <path
        d="M12 1.8c5.2 4.1 7.2 9.4 4.6 14.2-1.3 2.5-2.9 3.9-4.6 6-1.7-2.1-3.3-3.5-4.6-6C4.8 11.2 6.8 5.9 12 1.8z"
        fill="#3c8a37"
        stroke="#1d4a1a"
        strokeWidth="1"
      />
      <path
        d="M12 4.5v17.3M12 9l-3 2.5M12 9l3 2.5M12 13.5l-3.4 2.6M12 13.5l3.4 2.6"
        stroke="#1d4a1a"
        strokeWidth=".9"
        fill="none"
      />
    </svg>
  ),
  eichel: (
    <svg viewBox="0 0 24 24">
      <path d="M12.6 6.4c.3-1.8 1.2-3.2 2.6-4" stroke="#4b3212" strokeWidth="1.2" fill="none" />
      <path
        d="M14.4 3.4c2.6-.9 5 .1 5.8 1.8-2.4 1.2-4.6.8-5.8-1.8z"
        fill="#3c8a37"
        stroke="#1d4a1a"
        strokeWidth=".8"
      />
      <ellipse
        cx="12"
        cy="15.4"
        rx="4.9"
        ry="6.1"
        fill="#b8661e"
        stroke="#5a2e0a"
        strokeWidth="1"
      />
      <path
        d="M6.4 12.2C6.4 8.6 8.9 6.4 12 6.4s5.6 2.2 5.6 5.8z"
        fill="#7a5a22"
        stroke="#3e2a08"
        strokeWidth="1"
      />
      <path d="M7.6 10l8.8 0M7 11.2h10M8.6 8.6h6.8" stroke="#3e2a08" strokeWidth=".6" />
    </svg>
  ),
};

/*
 * Bayerisches Blatt aus den D1-Entwürfen. Die SVGs liegen bis U2 in docs/entwuerfe/karten
 * (dort erzeugt `erzeuge-figuren.mjs` die Bildkarten); Herkunft und offene Lizenzfrage der
 * Zahlenkarten: docs/entwuerfe/karten/LIZENZ.md – vor einer Veröffentlichung klären.
 * Der Kartenrücken ist reines CSS (`.card--back`).
 */
const urls = import.meta.glob<string>('../../../../docs/entwuerfe/karten/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

function urlFor(card: Card): string {
  return urls[`../../../../docs/entwuerfe/karten/${suitOf(card)}-${rankOf(card)}.svg`] ?? '';
}

export const bayerischTheme: CardTheme = {
  id: 'bayerisch',
  label: 'Bayerisch',
  face(card) {
    return <img className="face-img" src={urlFor(card)} alt="" draggable={false} />;
  },
  back() {
    return null;
  },
  suit(suit) {
    return SUIT_ICON[suit];
  },
};
