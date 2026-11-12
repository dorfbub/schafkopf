import { QUESTION_IDS, RULE_IDS } from '@schafkopf/tutor';
import { describe, expect, it } from 'vitest';
import { TUTOR_TEXT, type TutorTextContext } from '../i18n/de';

const ctx: TutorTextContext = { name: (seat) => `Sitz${seat}`, opponent: 2 };
const FALLBACK = TUTOR_TEXT.hint('denkanstoss.gibt.es.nicht', {}, ctx);

describe('Texte des Trainers (de.ts)', () => {
  it.each(RULE_IDS)('hat Titel, Begründung und Denkanstoß für %s', (id) => {
    expect(TUTOR_TEXT.ruleTitle(id)).not.toBe(id);
    expect(TUTOR_TEXT.ruleReason(id).length).toBeGreaterThan(20);
    expect(TUTOR_TEXT.hint(`denkanstoss.${id}`, {}, ctx)).not.toBe(FALLBACK);
  });

  it.each(['ausnahme', 'ansage', 'kontra', 'karte.anspielen', 'karte.zugeben'])(
    'hat den allgemeinen Denkanstoß %s',
    (key) => expect(TUTOR_TEXT.hint(`denkanstoss.${key}`, {}, ctx)).not.toBe(FALLBACK),
  );

  it.each(QUESTION_IDS)('hat einen Text für die Auswahlfrage %s', (id) => {
    expect(TUTOR_TEXT.question(id, {}, ctx)).not.toBe(id);
  });

  it('setzt Namen statt Sitznummern ein und nennt keine Cent im Denkanstoß', () => {
    expect(TUTOR_TEXT.hint('denkanstoss.karte.schmieren', { partner: 3 }, ctx)).toBe(
      'Sitz3 hält den Stich. Kann ihn noch jemand holen?',
    );
    for (const id of RULE_IDS)
      expect(TUTOR_TEXT.hint(`denkanstoss.${id}`, {}, ctx)).not.toMatch(/Cent|€/);
  });

  it('spricht Karten mit Artikel an', () => {
    expect(TUTOR_TEXT.recommend({ type: 'card', card: 'GA' }, false)).toBe(
      'Ich würde die Gras-Sau spielen.',
    );
    expect(TUTOR_TEXT.recommend({ type: 'card', card: 'HO' }, false)).toBe(
      'Ich würde den Herz-Ober spielen.',
    );
    expect(TUTOR_TEXT.reviewBetter({ type: 'card', card: 'E10' }, false)).toBe(
      'Besser wäre der Eichel-Zehner gewesen.',
    );
  });

  it('formuliert den Rückblick mit Artikel', () => {
    expect(
      TUTOR_TEXT.historyMark(
        { type: 'card', card: 'G10' },
        { type: 'card', card: 'G8' },
        19,
        false,
      ),
    ).toBe('Der Gras-Achter wäre besser gewesen als der Gras-Zehner (etwa 19 Cent).');
  });
});
