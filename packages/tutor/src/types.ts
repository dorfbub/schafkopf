import type {
  BidCall,
  Card,
  CompletedTrick,
  HandView,
  PreludeMove,
  RuleSet,
  Seat,
} from '@schafkopf/core';
import type { RuleId } from './rules';

/** Worum es geht: Ansage, Kartenwahl, Kontra/Re oder das Vorspiel der Hochzeit. */
export type AskKind = 'bid' | 'card' | 'double' | 'prelude';

/**
 * Alles, was der Tutor bekommt – genau das, was der Mensch am Tisch selbst weiß:
 * seine Sicht, die öffentlichen Tischregeln, den eigenen Sitz und die Stiche, die er hat fallen
 * sehen. Fremde Karten bekommt er nie.
 */
export interface TutorInput {
  view: HandView;
  rules: RuleSet;
  /** Eigener Sitz (`TableView.you`). */
  seat: Seat;
  /**
   * Alle fertigen Stiche dieses Spiels in Reihenfolge – öffentlich, jeder hat sie gesehen. Passt
   * die Zahl nicht zu `view.tricksWon` (etwa nach dem Neuladen), rechnet der Tutor nicht, sondern
   * begründet nur mit Faustregeln (`Advice.basis = 'faustregel'`).
   */
  history: readonly CompletedTrick[];
}

/** Aufwand und Zufall der Rechnung. Ohne Angaben: feste Budgets, Seed 1. */
export interface TutorOptions {
  seed?: number;
  /** Höchstzahl simulierter Karten für Kartenwahl und Kontra (Standard `TUTOR_BUDGET`). */
  playBudget?: number;
  /** Höchstzahl simulierter Karten für die Ansage. */
  bidBudget?: number;
  /** Uhr von außen; nur zusammen mit `budgetMs` wirksam (im Kern gibt es keine Zeit). */
  now?: () => number;
  budgetMs?: number;
}

/** Eine Möglichkeit, über die der Tutor spricht. */
export type TutorOption =
  | { type: 'bid'; call: BidCall }
  | { type: 'card'; card: Card }
  | { type: 'double'; double: boolean }
  /** Vorspiel: Hochzeit annehmen/ablehnen oder Karten zurückgeben. */
  | { type: 'prelude'; move: PreludeMove };

/** Platzhalter für Texte: Karten (`"EO"`), Sitze (Zahl), Farben, Spielarten, Zahlen. */
export type Params = Record<string, string | number>;

/** Ein Text als Kennung plus Platzhalter; die deutschen Texte stehen in der Oberfläche (T2). */
export interface Message {
  key: string;
  params: Params;
}

/** Bereich einer Faustregel (siehe docs/STRATEGIEN.md). */
export type Area =
  | 'ansage'
  | 'zweikampf'
  | 'hochzeit'
  | 'kontra'
  | 'spieler'
  | 'gegenspieler'
  | 'zugeben'
  | 'bettel'
  | 'ramsch';

/** Eine Faustregel, die in der Lage greift, und die Möglichkeiten, für die sie spricht. */
export interface RuleHit {
  id: RuleId;
  area: Area;
  favored: TutorOption[];
  params: Params;
}

/** Wert einer Möglichkeit in Cent (aus Sicht des Fragenden). */
export interface OptionValue {
  option: TutorOption;
  /** Erwartete Cent; `null`, wenn nicht gerechnet (chancenlos oder ohne vollständige Stiche). */
  cents: number | null;
  /** true: nicht simuliert, sondern aus der Heuristik geschätzt (angesagte Hochzeit). */
  estimated: boolean;
}

export type ImportanceLevel = 'niedrig' | 'mittel' | 'hoch';

export interface Importance {
  /**
   * Was ein naheliegender Fehlgriff kostet: Abstand der besten Möglichkeit zur schlechtesten
   * der plausiblen anderen (für die eine Faustregel oder die Heuristik spricht), in Cent.
   */
  stakeCents: number;
  level: ImportanceLevel;
  /** Meldet sich der Tutor im Automatikmodus von selbst? (Schwelle: `level === 'hoch'`.) */
  auto: boolean;
}

export interface Advice {
  ask: AskKind;
  /** Alle Möglichkeiten, die beste zuerst (ohne Wert am Ende). */
  options: OptionValue[];
  recommended: TutorOption;
  /** `suche`: Werte aus Probespielen; `faustregel`: ohne Rechnung, nur Faustregeln/Heuristik. */
  basis: 'suche' | 'faustregel';
  /** Höchstens zwei Faustregeln, die die Empfehlung begründen – die wichtigste zuerst. */
  reasons: RuleHit[];
  /** Faustregeln, die hier greifen, aber für etwas anderes sprechen („hier gilt die Ausnahme“). */
  overruled: RuleHit[];
  /** Denkanstoß: eine Frage, die zur Lösung führt, ohne sie zu verraten. */
  hint: Message;
  importance: Importance;
}

export type Verdict = 'gut' | 'vertretbar' | 'fehler';

export interface Review {
  verdict: Verdict;
  move: TutorOption;
  best: TutorOption;
  /** Erwarteter Verlust gegenüber der Empfehlung in Cent (0, wenn nicht gerechnet). */
  lossCents: number;
  /** Faustregel, die zur besseren Möglichkeit geführt hätte. */
  rule: RuleHit | null;
  /** Faustregel, der der Zug gefolgt ist, die hier aber nicht passte. */
  misleading: RuleHit | null;
  /** Soll der Tutor es ansprechen? Nur bei echten Fehlern (siehe Didaktik). */
  mention: boolean;
}
