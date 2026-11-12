import {
  type Card,
  type CardSetId,
  DEFAULT_CARD_SET,
  type Suit,
  createDeck,
  rankOf,
  suitOf,
} from '@schafkopf/core';
import { type ReactNode, createContext, useContext } from 'react';
import { CARD_SET_NAME } from '../i18n/de';
import { updates } from '../updates';

/**
 * Ein Kartenbild ("Satz", U9). Die Oberfläche kennt nur diese Schnittstelle; die Spiellogik merkt
 * von Kartenbildern nichts. Ein Satz liefert alles, was am Tisch gezeichnet wird:
 * - `face`: alle 32 Karten (Bild- und Zahlkarten),
 * - `back`: den Rücken (verdeckte Karten am Platz),
 * - `suit`: die vier Farbzeichen (Spielschild, Ansage-Dialog, Spielverlauf).
 * Namen der Farben und Ränge („Gras-Ober“) und die Eckbuchstaben des Spielschilds (U, O, 10)
 * kommen aus `i18n/de.ts` und gelten für alle Sätze.
 *
 * Neue Sätze entstehen mit `defineCardSet` und stehen in `CARD_THEMES`; fehlende Bilder fallen
 * auf das bayerische Bild zurück.
 */
export interface CardTheme {
  id: CardSetId;
  /** Name in der Lobby, z. B. „Bayerisch“. */
  label: string;
  /** Noch nicht fertig: fehlende Bilder kommen vom Grundsatz (bayerisch). */
  draft: boolean;
  /** Namensnennung für fremdes Material (CC BY / BY-SA); leer bei eigenem oder gemeinfreiem. */
  credits: readonly string[];
  /** Bild einer Karte (immer gesetzt, notfalls aus dem Grundsatz). */
  faceImage(card: Card): CardImage;
  backImage(): CardImage;
  suitUrl(suit: Suit): string;
  /** Stammt das Bild der Karte aus diesem Satz selbst (nicht aus dem Rückfall)? */
  hasOwnFace(card: Card): boolean;
  face(card: Card): ReactNode;
  back(): ReactNode;
  suit(suit: Suit): ReactNode;
}

/**
 * Wie ein Bild in der Karte sitzt:
 * - `bleed`: SVG im Format der U2-Vorlagen, 125 × 205 mit 5 Einheiten Rand um die Karte,
 * - `cover`: fremdes Bild ohne Rand, füllt die Karte (schneidet notfalls oben/unten ab).
 */
export type CardImageFit = 'bleed' | 'cover';

export interface CardImage {
  url: string;
  fit: CardImageFit;
}

/** Was ein Satz selbst mitbringt; alles darf fehlen. */
export interface CardSetSource {
  id: CardSetId;
  label: string;
  draft?: boolean;
  credits?: readonly string[];
  faces: Partial<Record<Card, CardImage>>;
  back?: CardImage;
  suits?: Partial<Record<Suit, CardImage>>;
}

/** Lädt ein Kartenbild nicht, ist die Seite veraltet: Hinweis statt weißer Karten. */
const missing = () => updates.reportMissingAsset();

const imgClass = (fit: CardImageFit) => (fit === 'bleed' ? 'face-img' : 'face-img face-img--cover');

function cardImg(image: CardImage) {
  return (
    <img
      className={imgClass(image.fit)}
      src={image.url}
      alt=""
      draggable={false}
      onError={missing}
    />
  );
}

/**
 * Baut aus einer Quelle einen vollständigen Satz. Ohne `base` muss die Quelle vollständig sein
 * (das ist nur der Grundsatz); sonst ergänzt `base` alles Fehlende.
 */
export function defineCardSet(source: CardSetSource, base?: CardTheme): CardTheme {
  const none: CardImage = { url: '', fit: 'bleed' };
  const faceImage = (card: Card) => source.faces[card] ?? base?.faceImage(card) ?? none;
  const backImage = () => source.back ?? base?.backImage() ?? none;
  const suitUrl = (suit: Suit) => source.suits?.[suit]?.url ?? base?.suitUrl(suit) ?? '';
  return {
    id: source.id,
    label: source.label,
    draft: source.draft ?? false,
    credits: source.credits ?? [],
    faceImage,
    backImage,
    suitUrl,
    hasOwnFace: (card) => source.faces[card] !== undefined,
    face: (card) => cardImg(faceImage(card)),
    back: () => cardImg(backImage()),
    suit: (suit) => <img src={suitUrl(suit)} alt="" draggable={false} />,
  };
}

/*
 * Bayerisches Blatt (U2). Die SVGs erzeugt `apps/web/scripts/karten/erzeuge-karten.mjs`;
 * Zahlenkarten nach Fabian Bally (CC0), Bildkarten, Eckzeichen und Rücken selbst gezeichnet.
 * Herkunft und Lizenzen: apps/web/src/assets/LIZENZEN.md.
 */
const bayerischUrls = import.meta.glob<string>('../assets/karten/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});
const bayerischUrl = (name: string): CardImage => ({
  url: bayerischUrls[`../assets/karten/${name}.svg`] ?? '',
  fit: 'bleed',
});

const ALL_CARDS = createDeck('lang');
const SUITS: readonly Suit[] = ['eichel', 'gras', 'herz', 'schellen'];

export const bayerischTheme: CardTheme = defineCardSet({
  id: DEFAULT_CARD_SET,
  label: CARD_SET_NAME.bayerisch,
  faces: Object.fromEntries(
    ALL_CARDS.map((card) => [card, bayerischUrl(`${suitOf(card)}-${rankOf(card)}`)]),
  ),
  back: bayerischUrl('ruecken'),
  // dieselben Farbzeichen wie auf den Karten (Fabian Bally)
  suits: Object.fromEntries(SUITS.map((s) => [s, bayerischUrl(`zeichen-${s}`)])),
});

/*
 * Salzburger Bild, Entwurf (U9, Haltepunkt): Muster aus drei Wegen nebeneinander, damit Lukas
 * entscheiden kann – eigene Vektorzeichnung, gemeinfreie Scans (Wikimedia Commons) und
 * ein freier Vektorsatz (CC BY-SA). Alles Fehlende kommt vom bayerischen Bild.
 * Quellen und Lizenzen: apps/web/src/assets/kartensets/salzburger/QUELLEN.md.
 */
const salzburgerUrls = import.meta.glob<string>('../assets/kartensets/salzburger/**/*.{svg,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
});
const salzburger = (file: string, fit: CardImageFit): CardImage => ({
  url: salzburgerUrls[`../assets/kartensets/salzburger/${file}`] ?? '',
  fit,
});
const raster = (name: string) =>
  salzburger(`fremd/commons-raster/SPKW-Salzburg-Fuchs-Salzburg1-dt-${name}.jpg`, 'cover');
const vektor = (name: string) =>
  salzburger(`fremd/commons-vektor/Playing_card-german-${name}.svg`, 'cover');

export const salzburgerTheme: CardTheme = defineCardSet(
  {
    id: 'salzburger',
    label: CARD_SET_NAME.salzburger,
    draft: true,
    credits: ['Vektorkarten: Gunter Gerhardt (xskat), CC BY-SA 3.0, über Wikimedia Commons'],
    faces: {
      // Weg 3: selbst gezeichnet im Stil von U2
      HO: salzburger('eigen/herz-O.svg', 'bleed'),
      EA: salzburger('eigen/eichel-A.svg', 'bleed'),
      // Weg 1: Scans Anton Fuchs, Salzburg, um 1850 (gemeinfrei)
      SK: raster('schellen-koenig'),
      GO: raster('gruen-ober'),
      EU: raster('eichel-unter'),
      // Weg 2: Vektorsatz xskat (deutsches Blatt, kein Salzburger Bild)
      GK: vektor('blatt-13_king'),
      EK: vektor('eichel-13_konig'),
    },
  },
  bayerischTheme,
);

/** Alle Kartenbilder in der Reihenfolge der Lobby; das erste ist der Standard. */
export const CARD_THEMES: readonly CardTheme[] = [bayerischTheme, salzburgerTheme];

/** Satz zur Kennung; unbekannte Kennungen (ältere/neuere Version) fallen auf bayerisch zurück. */
export function cardTheme(id: CardSetId | undefined): CardTheme {
  return CARD_THEMES.find((t) => t.id === id) ?? bayerischTheme;
}

/** Wie viele der 32 Karten ein Satz selbst mitbringt (für Entwürfe in der Lobby). */
export function ownFaceCount(theme: CardTheme): number {
  return ALL_CARDS.filter((c) => theme.hasOwnFace(c)).length;
}

/** Das Kartenbild des Tisches; `TableBoard` setzt es aus `view.rules.cardSet`. */
export const CardThemeContext = createContext<CardTheme>(bayerischTheme);

export function useCardTheme(): CardTheme {
  return useContext(CardThemeContext);
}
