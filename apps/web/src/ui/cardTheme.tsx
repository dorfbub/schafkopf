import { type Card, type Suit, rankOf, suitOf } from '@schafkopf/core';
import type { ReactNode } from 'react';
import { updates } from '../updates';

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
 * Bayerisches Blatt (U2). Die SVGs erzeugt `apps/web/scripts/karten/erzeuge-karten.mjs`;
 * Zahlenkarten nach Fabian Bally (CC0), Bildkarten, Eckzeichen und Rücken selbst gezeichnet.
 * Herkunft und Lizenzen: apps/web/src/assets/LIZENZEN.md.
 */
const urls = import.meta.glob<string>('../assets/karten/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Lädt ein Kartenbild nicht, ist die Seite veraltet: Hinweis statt weißer Karten. */
const missing = () => updates.reportMissingAsset();

const urlOf = (name: string): string => urls[`../assets/karten/${name}.svg`] ?? '';

export const bayerischTheme: CardTheme = {
  id: 'bayerisch',
  label: 'Bayerisch',
  face(card) {
    return (
      <img
        className="face-img"
        src={urlOf(`${suitOf(card)}-${rankOf(card)}`)}
        alt=""
        draggable={false}
        onError={missing}
      />
    );
  },
  back() {
    return (
      <img className="face-img" src={urlOf('ruecken')} alt="" draggable={false} onError={missing} />
    );
  },
  suit(suit) {
    // dieselben Farbzeichen wie auf den Karten (Fabian Bally)
    return <img src={urlOf(`zeichen-${suit}`)} alt="" draggable={false} />;
  },
};
