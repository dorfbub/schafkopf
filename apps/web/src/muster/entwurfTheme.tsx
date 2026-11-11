import { rankOf, suitOf } from '@schafkopf/core';
import type { CardTheme } from '../ui/cardTheme';

/*
 * Kartenbild aus den D1-Entwürfen (docs/entwuerfe/karten). Nur für die Musterseite im
 * Entwicklungsserver: Die Lizenz der Zahlenkarten ist noch offen und die Bildkarten
 * überarbeitet U2. Deshalb landen die Dateien nicht im Produktions-Build.
 */
const urls = import.meta.glob<string>('../../../../docs/entwuerfe/karten/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

function urlFor(name: string): string {
  return urls[`../../../../docs/entwuerfe/karten/${name}.svg`] ?? '';
}

export const entwurfTheme: CardTheme = {
  id: 'entwurf',
  label: 'Bayerisch (Entwurf)',
  face(card) {
    return <img className="face-img" src={urlFor(`${suitOf(card)}-${rankOf(card)}`)} alt="" />;
  },
  back() {
    return null;
  },
};
