import { type Card, rankOf, suitOf } from '@schafkopf/core';
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
}

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
};
