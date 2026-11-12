import type { CompletedTrick } from '@schafkopf/core';
import type { SyntheticEvent } from 'react';
import { TABLE_TEXT, TUTOR_TEXT } from '../../i18n/de';
import { useTutor } from '../../tutor/context';
import type { TutorMark } from '../../tutor/session';
import { CardView } from '../kit';
import type { SeatInfo } from './layout';

/** Der Rückblick zeigt höchstens so viele Stellen – die teuersten (docs/STRATEGIEN.md, Didaktik). */
const MAX_MARKS = 3;

/** Die teuersten Fehler, in Spielreihenfolge; dazu, wie viele weggelassen wurden. */
export function pickMarks(marks: readonly TutorMark[]): { shown: TutorMark[]; more: number } {
  const top = [...marks]
    .sort((a, b) => b.review.lossCents - a.review.lossCents)
    .slice(0, MAX_MARKS)
    .sort((a, b) => a.order - b.order);
  return { shown: top, more: marks.length - top.length };
}

/** Ein Satz von Max zu einer Stelle: was besser gewesen wäre, dazu die Faustregel. */
function MarkText({ mark }: { mark: TutorMark }) {
  const { review, re } = mark;
  return (
    <>
      {TUTOR_TEXT.historyMark(review.move, review.best, review.lossCents, re)}
      {review.rule && <> {TUTOR_TEXT.historyRule(review.rule.id)}</>}
    </>
  );
}

interface Props {
  tricks: CompletedTrick[];
  seats: SeatInfo;
}

/**
 * Spielverlauf im Ergebnis-Dialog, aufklappbar: je Stich eine Zeile mit den vier Karten in
 * Spielreihenfolge (wer sie gelegt hat darunter), die stechende hervorgehoben, rechts die Augen.
 */
/** Aufgeklappt: den Verlauf im Dialog nach oben holen (ohne Gleiten bei „Bewegung reduzieren“). */
function showOpened(e: SyntheticEvent<HTMLDetailsElement>) {
  const details = e.currentTarget;
  if (!details.open) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  details.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
}

export function GameHistory({ tricks, seats }: Props) {
  // Rückblick des Trainers (T2): nur allein gegen Bots mit Max Weber.
  const tutor = useTutor();
  const { shown, more } = pickMarks(tutor?.snap.marks ?? []);
  const early = shown.filter((m) => m.where !== 'card');
  const atTrick = (n: number) => shown.find((m) => m.where === 'card' && m.trick === n);
  return (
    <details className="verlauf" onToggle={showOpened}>
      <summary className="verlauf__knopf">
        {TABLE_TEXT.historyTitle}
        {tutor && shown.length > 0 && (
          <span className="verlauf__max-zahl">{TUTOR_TEXT.historyMarks(shown.length)}</span>
        )}
      </summary>
      {tutor && (
        <div className="verlauf__max">
          <span className="verlauf__max-kopf" aria-hidden="true">
            {TUTOR_TEXT.initials}
          </span>
          <div className="verlauf__max-text">
            {shown.length === 0 && <p>{TUTOR_TEXT.historyNoMarks}</p>}
            {shown.length > early.length && (
              <p>{TUTOR_TEXT.historyIntro(shown.length - early.length)}</p>
            )}
            {early.map((m) => (
              <p key={m.order}>
                <strong>{TUTOR_TEXT.historyWhere(m.where, m.re)}:</strong> <MarkText mark={m} />
              </p>
            ))}
            {more > 0 && <p className="verlauf__max-leise">{TUTOR_TEXT.historyMore(more)}</p>}
          </div>
        </div>
      )}
      <ol className="verlauf__stiche">
        {tricks.map((trick, n) => {
          const mark = atTrick(n);
          const markedCard = mark?.review.move.type === 'card' ? mark.review.move.card : null;
          return (
            <li
              key={n}
              className={`verlauf__stich${mark ? ' verlauf__stich--max' : ''}`}
              aria-label={TABLE_TEXT.historyTrick(
                n + 1,
                seats.nameOf(trick.leader),
                seats.nameOf(trick.winner),
                trick.points,
              )}
            >
              <span className="verlauf__nr" aria-hidden="true">
                {n + 1}
              </span>
              <span className="verlauf__karten">
                {trick.cards.map((card, i) => {
                  const seat = (trick.leader + i) % seats.players;
                  const marked = card === markedCard;
                  return (
                    <span
                      key={card}
                      className={`verlauf__karte${marked ? ' verlauf__karte--max' : ''}`}
                    >
                      <CardView card={card} state={seat === trick.winner ? 'won' : undefined} />
                      <span className="verlauf__name">{seats.nameOf(seat)}</span>
                    </span>
                  );
                })}
              </span>
              <span className="verlauf__augen" aria-hidden="true">
                {trick.points}
              </span>
              {mark && (
                <p className="verlauf__hinweis">
                  <span className="verlauf__hinweis-wer">{TUTOR_TEXT.historyMarkLabel}:</span>{' '}
                  <MarkText mark={mark} />
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
