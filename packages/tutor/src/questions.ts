import type { AskKind, Params, TutorInput } from './types';

/**
 * Auswahlfragen, die man dem Tutor stellen kann. Hier stehen nur Kennungen und Platzhalter; die
 * Texte kommen in T2 nach `apps/web/src/i18n/de.ts` (Textvorschläge in docs/STRATEGIEN.md).
 *
 * | Kennung                      | Wann                                   | Platzhalter        |
 * | ---------------------------- | -------------------------------------- | ------------------ |
 * | `frage.ansage.spielen`       | Ansage, Stufe 1 („Ich würde“/„weiter“) | –                  |
 * | `frage.ansage.welches.spiel` | Ansage, Stufe 1 oder Stufe 3           | –                  |
 * | `frage.ansage.zweikampf`     | Zweikampf, man fordert                 | `gegner`, `spiel`  |
 * | `frage.ansage.halten`        | Zweikampf, man hält                    | `gegner`, `spiel`  |
 * | `frage.karte.welche`         | eigene Karte, mehr als eine erlaubt    | –                  |
 * | `frage.kontra`               | Kontra möglich                         | `spieler`, `spiel` |
 * | `frage.re`                   | Re möglich                             | `kontra`           |
 * | `frage.rueckblick.zug`       | nach dem eigenen Zug (Bewertung)       | –                  |
 */
export const QUESTION_IDS = [
  'frage.ansage.spielen',
  'frage.ansage.welches.spiel',
  'frage.ansage.zweikampf',
  'frage.ansage.halten',
  'frage.karte.welche',
  'frage.kontra',
  'frage.re',
  'frage.rueckblick.zug',
] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

export interface Question {
  id: QuestionId;
  /** Welche Frage an `advise` dahintersteht (`review` für den Rückblick). */
  ask: AskKind | 'review';
  params: Params;
}

/**
 * Auswahlfragen, die zur Lage passen – in der Reihenfolge, in der die Oberfläche sie anbieten
 * soll. Der Rückblick (`frage.rueckblick.zug`) hängt am gemachten Zug und kommt nicht vor.
 */
export function questionsFor({ view, seat }: TutorInput): Question[] {
  const out: Question[] = [];
  if (view.phase === 'bidding' && view.turn === seat && view.legalCalls.length > 0) {
    const a = view.auction;
    if (a.stage === 'interest') {
      out.push({ id: 'frage.ansage.spielen', ask: 'bid', params: {} });
      out.push({ id: 'frage.ansage.welches.spiel', ask: 'bid', params: {} });
    } else if (a.stage === 'duel') {
      const holder = seat === a.holder;
      out.push({
        id: holder ? 'frage.ansage.halten' : 'frage.ansage.zweikampf',
        ask: 'bid',
        params: { gegner: (holder ? a.challenger : a.holder) ?? seat, spiel: a.level?.kind ?? '' },
      });
    } else {
      out.push({ id: 'frage.ansage.welches.spiel', ask: 'bid', params: {} });
    }
  }
  if (view.phase === 'playing') {
    if (view.canDouble && view.contract && view.declarer !== null) {
      if (view.doubling.kontra === null) {
        out.push({
          id: 'frage.kontra',
          ask: 'double',
          params: { spieler: view.declarer, spiel: view.contract.kind },
        });
      } else {
        out.push({ id: 'frage.re', ask: 'double', params: { kontra: view.doubling.kontra } });
      }
    }
    if (view.turn === seat && view.legalCards.length > 1) {
      out.push({ id: 'frage.karte.welche', ask: 'card', params: {} });
    }
  }
  return out;
}
