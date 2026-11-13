import type { HandView } from '@schafkopf/core';
import { type Advice, type Question, optionKey } from '@schafkopf/tutor';
import { useEffect, useRef } from 'react';
import { TUTOR_TEXT as T, type TutorTextContext } from '../../i18n/de';
import { useTutor } from '../../tutor/context';
import type { Bubble } from '../../tutor/session';
import { tutorSettings } from '../../tutor/settings';
import { Button } from '../kit';
import type { SeatInfo } from './layout';

interface Props {
  hand: HandView;
  seats: SeatInfo;
  /** Zeigt der Tisch die aktuelle Lage? Solange ein fertiger Stich liegt, schweigt Max. */
  settled: boolean;
}

/** Texte brauchen Namen statt Sitznummern; im Zweikampf auch den Gegner. */
export function textContext(hand: HandView, seats: SeatInfo, me: number | null): TutorTextContext {
  const a = hand.auction;
  const opponent =
    a.stage === 'duel' && me !== null ? (me === a.holder ? a.challenger : a.holder) : null;
  return { name: (seat) => seats.nameOf(seat), opponent: opponent ?? null };
}

/**
 * Die Figur von Max Weber: ein Knopf, der die Sprechblase öffnet und schließt. Sie steht an
 * fester Stelle – auf breitem Tisch und hochkant links neben dem eigenen Namen (`eigen`), im
 * niedrigen Fenster (Handy quer) oben links auf dem Filz (`raum`). Beide sind gerendert; die
 * Stile zeigen genau eine, die andere ist `display: none` und damit auch für Bildschirmleser weg.
 */
export function TutorFigure({ place }: { place: 'eigen' | 'raum' }) {
  const tutor = useTutor();
  if (!tutor) return null;
  const { session, snap } = tutor;
  return (
    <button
      type="button"
      className={`tutor-figur tutor-figur--${place}${snap.open ? ' tutor-figur--offen' : ''}`}
      aria-expanded={snap.open}
      aria-controls="tutor-blase"
      aria-label={snap.open ? T.figureClose : T.figureOpen}
      title={T.name}
      onClick={() => session.toggle()}
    >
      <span className="tutor-figur__kopf" aria-hidden="true">
        {T.initials}
      </span>
      <span className="tutor-figur__name" aria-hidden="true">
        {T.figureCaption}
      </span>
    </button>
  );
}

/**
 * Max Weber am Tisch: die Figur (im niedrigen Fenster) und seine Sprechblase. Beide liegen absolut
 * über dem Filz – sie verschieben nichts, der Tisch springt beim Ein- und Ausblenden nicht.
 * Ohne Trainer (Tisch mit Freunden) rendert die Komponente nichts.
 */
export function TutorCorner({ hand, seats, settled }: Props) {
  const tutor = useTutor();
  const tutorSession = tutor?.session;
  useEffect(() => {
    tutorSession?.setSettled(settled);
  }, [tutorSession, settled]);
  const bubbleRef = useRef<HTMLElement>(null);
  const open = tutor?.snap.open ?? false;
  const bubbleKind = tutor?.snap.bubble?.kind;
  const stage = tutor?.snap.bubble && 'stage' in tutor.snap.bubble ? tutor.snap.bubble.stage : 0;

  // Neue Stufe: die Blase zeigt sie oben (beim Scrollen in langen Antworten).
  useEffect(() => {
    bubbleRef.current?.querySelector('.tutor-blase__inhalt')?.scrollTo({ top: 0 });
  }, [bubbleKind, stage]);

  if (!tutor) return null;
  const { session, snap } = tutor;
  const me = seats.me;
  const ctx = textContext(hand, seats, me);

  return (
    <>
      <TutorFigure place="raum" />
      <section
        id="tutor-blase"
        ref={bubbleRef}
        className="tutor-blase"
        hidden={!open}
        aria-label={T.bubbleLabel}
        aria-live="polite"
      >
        <header className="tutor-blase__kopf">
          <span className="tutor-blase__wer">{T.name}</span>
          <button
            type="button"
            className="tutor-blase__zu"
            aria-label={T.close}
            title={T.close}
            onClick={() => session.close()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        {open && snap.bubble && (
          <div className="tutor-blase__inhalt">
            <BubbleBody
              bubble={snap.bubble}
              questions={snap.questions}
              finished={snap.finished}
              ctx={ctx}
              onAsk={(q) => session.ask(q)}
              onReveal={() => session.reveal()}
              onMenu={() => session.menu()}
              onClose={() => session.close()}
            />
          </div>
        )}
        {open && snap.bubble?.kind === 'menu' && (
          <label className="check tutor-blase__auto">
            <input
              type="checkbox"
              checked={snap.auto}
              onChange={(e) => tutorSettings.set({ auto: e.target.checked })}
            />
            <span>
              {T.autoToggle}
              <span className="tutor-blase__klein">{T.autoHint}</span>
            </span>
          </label>
        )}
      </section>
    </>
  );
}

interface BodyProps {
  bubble: Bubble;
  questions: Question[];
  finished: boolean;
  ctx: TutorTextContext;
  onAsk: (q: Question) => void;
  onReveal: () => void;
  onMenu: () => void;
  onClose: () => void;
}

function BubbleBody({
  bubble,
  questions,
  finished,
  ctx,
  onAsk,
  onReveal,
  onMenu,
  onClose,
}: BodyProps) {
  switch (bubble.kind) {
    case 'menu':
      if (questions.length === 0)
        return <p className="tutor-blase__text">{finished ? T.finished : T.nothingToAsk}</p>;
      return (
        <>
          <p className="tutor-blase__text">{T.greeting}</p>
          <ul className="tutor-blase__fragen">
            {questions.map((q) => (
              <li key={q.id}>
                <button type="button" className="tutor-frage" onClick={() => onAsk(q)}>
                  {T.question(q.id, q.params, ctx)}
                </button>
              </li>
            ))}
          </ul>
        </>
      );
    case 'thinking':
      return <p className="tutor-blase__text tutor-blase__text--leise">{T.thinking}</p>;
    case 'failed':
      return (
        <>
          <p className="tutor-blase__text">{T.failed}</p>
          <Actions onMenu={onMenu} onClose={onClose} />
        </>
      );
    case 'advice':
      return (
        <AdviceBody
          bubble={bubble}
          questions={questions}
          ctx={ctx}
          onReveal={onReveal}
          onMenu={onMenu}
          onClose={onClose}
        />
      );
    case 'review':
      return <ReviewBody bubble={bubble} onReveal={onReveal} onMenu={onMenu} onClose={onClose} />;
  }
}

function Actions({
  next,
  onNext,
  onMenu,
  onClose,
}: {
  next?: string;
  onNext?: () => void;
  onMenu: () => void;
  onClose: () => void;
}) {
  return (
    <div className="tutor-blase__knoepfe">
      {next && onNext ? (
        <Button size="small" onClick={onNext}>
          {next}
        </Button>
      ) : (
        <Button size="small" variant="secondary" onClick={onClose}>
          {T.thanks}
        </Button>
      )}
      <Button size="small" variant="secondary" onClick={onMenu}>
        {T.otherQuestion}
      </Button>
    </div>
  );
}

/** Die drei Stufen: Denkanstoß – Empfehlung – Begründung. */
function AdviceBody({
  bubble,
  ctx,
  onReveal,
  onMenu,
  onClose,
}: {
  bubble: Extract<Bubble, { kind: 'advice' }>;
  questions: Question[];
  ctx: TutorTextContext;
  onReveal: () => void;
  onMenu: () => void;
  onClose: () => void;
}) {
  const { advice, stage, re } = bubble;
  const hint = T.hint(advice.hint.key, advice.hint.params, ctx);
  const question = bubble.question
    ? T.question(bubble.question.id, bubble.question.params, ctx)
    : null;
  return (
    <>
      {question && <p className="tutor-blase__frage">{question}</p>}
      <p className="tutor-blase__anstoss">
        {bubble.auto && <span className="tutor-blase__vorweg">{T.autoIntro} </span>}
        {hint}
      </p>
      {stage >= 2 && (
        <p className="tutor-blase__text tutor-blase__empfehlung">
          {T.recommend(advice.recommended, re)}
        </p>
      )}
      {stage >= 3 && <Reasons advice={advice} re={re} />}
      <Actions
        next={stage === 1 ? T.askRecommend : stage === 2 ? T.askWhy : undefined}
        onNext={onReveal}
        onMenu={onMenu}
        onClose={onClose}
      />
    </>
  );
}

function Reasons({ advice, re }: { advice: Advice; re: boolean }) {
  // Verglichen wird die Empfehlung mit der besten anderen Möglichkeit. Bei Gleichstand kann die
  // Empfehlung (nach Faustregel) knapp unter einer anderen liegen – dann „fast gleichauf“.
  const key = optionKey(advice.recommended);
  const best = advice.options.find((o) => optionKey(o.option) === key);
  const next = advice.options.find((o) => optionKey(o.option) !== key);
  const counted =
    advice.basis === 'suche' &&
    best &&
    next &&
    best.cents !== null &&
    next.cents !== null &&
    !best.estimated &&
    !next.estimated;
  return (
    <div className="tutor-blase__gruende">
      {advice.reasons.length === 0 ? (
        <p className="tutor-blase__text">{T.noRule}</p>
      ) : (
        advice.reasons.map((r) => (
          <p key={r.id} className="tutor-blase__text">
            <strong className="tutor-blase__regel">{T.ruleTitle(r.id)}.</strong>{' '}
            {T.ruleReason(r.id)}
          </p>
        ))
      )}
      {advice.overruled[0] && (
        <p className="tutor-blase__text tutor-blase__text--leise">
          {T.overruled(advice.overruled[0].id)}
        </p>
      )}
      {counted && (
        <p className="tutor-blase__text tutor-blase__text--leise">
          {T.margin(
            best.option,
            next.option,
            Math.max(0, best.cents! - next.cents!),
            re,
            advice.reasons.length > 0,
          )}
        </p>
      )}
      {advice.basis === 'faustregel' && (
        <p className="tutor-blase__text tutor-blase__text--leise">{T.onlyRules}</p>
      )}
    </div>
  );
}

/** Bewertung hinterher: erst das Urteil, auf Wunsch was besser gewesen wäre. */
function ReviewBody({
  bubble,
  onReveal,
  onMenu,
  onClose,
}: {
  bubble: Extract<Bubble, { kind: 'review' }>;
  onReveal: () => void;
  onMenu: () => void;
  onClose: () => void;
}) {
  const { review, stage, re } = bubble;
  if (review.verdict === 'gut')
    return (
      <>
        <p className="tutor-blase__anstoss">{T.reviewGood(review.move, re)}</p>
        <Actions onMenu={onMenu} onClose={onClose} />
      </>
    );
  if (review.verdict === 'vertretbar')
    return (
      <>
        <p className="tutor-blase__anstoss">
          {T.reviewOkay(review.move, review.best, review.lossCents, re)}
        </p>
        {review.rule && (
          <p className="tutor-blase__text">
            <strong className="tutor-blase__regel">{T.ruleTitle(review.rule.id)}.</strong>{' '}
            {T.ruleReason(review.rule.id)}
          </p>
        )}
        <Actions onMenu={onMenu} onClose={onClose} />
      </>
    );
  return (
    <>
      <p className="tutor-blase__anstoss">{T.reviewMistake(review.move, review.lossCents, re)}</p>
      {stage >= 2 && (
        <>
          <p className="tutor-blase__text tutor-blase__empfehlung">
            {T.reviewBetter(review.best, re)}
          </p>
          {review.rule && (
            <p className="tutor-blase__text">
              <strong className="tutor-blase__regel">{T.ruleTitle(review.rule.id)}.</strong>{' '}
              {T.ruleReason(review.rule.id)}
            </p>
          )}
          {review.misleading && (
            <p className="tutor-blase__text tutor-blase__text--leise">
              {T.reviewMisleading(review.misleading.id)}
            </p>
          )}
        </>
      )}
      <Actions
        next={stage === 1 ? T.askBetter : undefined}
        onNext={onReveal}
        onMenu={onMenu}
        onClose={onClose}
      />
    </>
  );
}
