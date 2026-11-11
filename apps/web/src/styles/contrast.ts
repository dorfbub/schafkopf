/** Kontrastverhältnis nach WCAG 2.x für zwei Farben in Hex-Schreibweise (#rrggbb). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/**
 * Farbpaare, die WCAG AA erreichen müssen: Schrift ≥ 4,5 : 1, große/fette Schrift und
 * Bedienelemente ≥ 3 : 1. Geprüft in contrast.test.ts und gezeigt auf der Musterseite.
 * Schrift auf Grün wird gegen die hellste Stelle des Filzes (Lampenlicht) geprüft.
 */
export interface ContrastPair {
  fg: string;
  bg: string;
  use: string;
  min: 4.5 | 3;
}

export const CONTRAST_PAIRS: ContrastPair[] = [
  { fg: '--color-on-felt', bg: '--color-ground', use: 'Schrift auf Grund', min: 4.5 },
  { fg: '--color-on-felt', bg: '--color-felt-light', use: 'Schrift auf Filz', min: 4.5 },
  { fg: '--color-on-felt-muted', bg: '--color-felt-light', use: 'Leise auf Filz', min: 4.5 },
  { fg: '--color-on-felt-muted', bg: '--color-felt-raised', use: 'Leise auf Platz', min: 4.5 },
  {
    fg: '--color-negative-on-felt',
    bg: '--color-felt-light',
    use: 'Minus auf Filz',
    min: 4.5,
  },
  { fg: '--color-brass', bg: '--color-felt-light', use: 'Messing auf Filz (groß)', min: 3 },
  { fg: '--color-brass', bg: '--color-ground', use: 'Messing auf Grund', min: 4.5 },
  { fg: '--color-on-brass', bg: '--color-brass', use: 'Schrift auf Messing', min: 4.5 },
  { fg: '--color-on-paper', bg: '--color-paper', use: 'Schrift auf Papier', min: 4.5 },
  { fg: '--color-on-paper-muted', bg: '--color-paper', use: 'Leise auf Papier', min: 4.5 },
  {
    fg: '--color-on-paper-muted',
    bg: '--color-paper-line-soft',
    use: 'Leise auf gesperrtem Feld',
    min: 4.5,
  },
  {
    fg: '--color-negative-on-paper',
    bg: '--color-paper',
    use: 'Minus auf Papier',
    min: 4.5,
  },
  { fg: '--color-accent', bg: '--color-paper', use: 'Akzent auf Papier', min: 4.5 },
  { fg: '--color-on-accent', bg: '--color-accent', use: 'Hauptknopf', min: 4.5 },
  { fg: '--color-on-accent', bg: '--color-accent-hover', use: 'Hauptknopf, Hover', min: 4.5 },
  { fg: '--color-on-paper', bg: '--color-paper-raised', use: 'Eingabe', min: 4.5 },
  {
    fg: '--color-paper-control',
    bg: '--color-paper',
    use: 'Rand Eingabefeld',
    min: 3,
  },
  { fg: '--color-accent', bg: '--color-paper', use: 'Fokusring auf Papier', min: 3 },
  { fg: '--color-brass', bg: '--color-felt', use: 'Fokusring auf Filz', min: 3 },
  { fg: '--color-suit-eichel', bg: '--color-card-face', use: 'Eichel auf Karte', min: 4.5 },
  { fg: '--color-suit-gras', bg: '--color-card-face', use: 'Gras auf Karte', min: 4.5 },
  { fg: '--color-suit-herz', bg: '--color-card-face', use: 'Herz auf Karte', min: 4.5 },
  { fg: '--color-suit-schellen', bg: '--color-card-face', use: 'Schellen auf Karte', min: 4.5 },
];
