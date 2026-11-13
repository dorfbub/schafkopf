import { type CompletedTrick, type HandView, type TableView, tricksPlayed } from '@schafkopf/core';
import {
  type Advice,
  type AskKind,
  type Question,
  type Review,
  type RuleId,
  type TutorInput,
  type TutorOption,
  currentAsk,
  optionKey,
  questionsFor,
} from '@schafkopf/tutor';
import type { TutorEngine } from './engine';

/*
 * Der Trainer am Tisch (T2): verfolgt die eigene Sicht, sammelt die gesehenen Stiche, beantwortet
 * Auswahlfragen in drei Stufen, meldet sich im Automatikmodus in wichtigen Momenten und bewertet
 * jeden eigenen Zug hinterher. Reine Logik ohne React; die Oberfläche liest `getSnapshot()`.
 *
 * Didaktik (docs/STRATEGIEN.md, „Didaktik“):
 * - Erst der Denkanstoß, auf Wunsch die Empfehlung (am Tisch hervorgehoben), dann die Begründung.
 * - Von selbst nur bei Wichtigkeit „hoch“, höchstens einmal je Stich (in der Ansage einmal, beim
 *   Kontra einmal) und nie zweimal hintereinander mit derselben Faustregel.
 * - Hinterher spricht er nur echte Fehler an (`Review.mention`), und nur im Automatikmodus. Alle
 *   Fehler eines Spiels landen im Rückblick („So wurde gespielt“).
 */

/** Was in der Sprechblase steht. */
export type Bubble =
  /** Auswahlfragen zur Lage. */
  | { kind: 'menu' }
  /** Max rechnet noch. */
  | { kind: 'thinking'; question: Question | null }
  /** Antwort in Stufen: 1 Denkanstoß, 2 Empfehlung, 3 Begründung. */
  | {
      kind: 'advice';
      question: Question | null;
      advice: Advice;
      stage: 1 | 2 | 3;
      /** Von selbst gemeldet (Automatikmodus). */
      auto: boolean;
      situation: string;
      /** War gerade Re (statt Kontra) möglich? Für den Text der Empfehlung. */
      re: boolean;
    }
  /** Bewertung des letzten eigenen Zugs: 1 Urteil, 2 was besser gewesen wäre. */
  | { kind: 'review'; review: Review; stage: 1 | 2; auto: boolean; re: boolean }
  /** Die Rechnung ging schief; ehrlich sagen statt raten. */
  | { kind: 'failed' };

/** Eine Stelle für den Rückblick: ein Fehler (`verdict: 'fehler'`) im Spiel. */
export interface TutorMark {
  /** Reihenfolge im Spiel. */
  order: number;
  /** Ansage, Kontra/Re oder Karte im Stich `trick` (0-basiert). */
  where: 'bid' | 'double' | 'card';
  trick: number | null;
  review: Review;
  /** Re statt Kontra. */
  re: boolean;
}

export interface TutorSnapshot {
  /** Sprechblase offen? */
  open: boolean;
  bubble: Bubble | null;
  auto: boolean;
  /** Auswahlfragen, die gerade passen (inklusive „War mein letzter Zug gut?“). */
  questions: Question[];
  /** Spiel vorbei: Max verweist auf den Rückblick. */
  finished: boolean;
  /** Empfohlene Möglichkeit zum Hervorheben (ab Stufe 2, nur solange sie noch gilt). */
  tip: TutorOption | null;
  /** Fehler dieses Spiels, für „So wurde gespielt“. */
  marks: TutorMark[];
  handNo: number;
}

const EMPTY: TutorSnapshot = {
  open: false,
  bubble: null,
  auto: true,
  questions: [],
  finished: false,
  tip: null,
  marks: [],
  handNo: -1,
};

const REVIEW_QUESTION: Question = { id: 'frage.rueckblick.zug', ask: 'review', params: {} };

/** Eine kleine, feste Zahl aus der Lage – gleiche Lage, gleiche Antwort. */
function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Kennung der Entscheidungslage: Ändert sie sich, ist ein Rat von vorher veraltet. */
function situationOf(handNo: number, hand: HandView): string {
  return [
    handNo,
    hand.phase,
    hand.turn,
    hand.bids.length,
    tricksPlayed(hand),
    hand.currentTrick.cards.length,
    hand.prelude ? `${hand.prelude.step}${hand.prelude.log.length}` : '-',
    hand.canDouble ? 1 : 0,
    hand.doubling.kontra ?? '-',
    hand.doubling.re ?? '-',
  ].join('|');
}

export class TutorSession {
  private snap: TutorSnapshot;
  private readonly listeners = new Set<() => void>();
  private input: TutorInput | null = null;
  private situation = '';
  private handNo = -1;
  private history: CompletedTrick[] = [];
  private lastReview: { review: Review; re: boolean } | null = null;
  private order = 0;
  /** Rat je Lage und Frage (die Automatik rechnet ihn ohnehin schon). */
  private cache = new Map<string, Promise<Advice | null>>();
  private autoSlots = new Set<string>();
  private lastAutoRule: RuleId | null = null;
  private disposed = false;
  /**
   * Zeigt der Tisch schon die Lage, über die der Trainer spricht? Ein fertiger Stich bleibt noch
   * kurz liegen (`TRICK_HOLD_MS`), während die Sicht schon den nächsten kennt – in dieser Zeit
   * schweigt Max, sonst redet er über Karten, die man noch nicht sieht.
   */
  private settled = true;
  /** Während des Liegenlassens gestellte Frage; beantwortet, sobald der Tisch die Lage zeigt. */
  private pending: Question | null = null;

  constructor(
    private readonly engine: TutorEngine,
    auto = true,
  ) {
    this.snap = { ...EMPTY, auto };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): TutorSnapshot => this.snap;

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  /** Neue Sicht vom Tisch. */
  update(view: TableView): void {
    const hand = view.hand;
    if (!hand || view.you === null) {
      this.input = null;
      this.set({ questions: [], tip: null });
      return;
    }
    if (view.handNo !== this.handNo) this.newHand(view.handNo);
    this.trackHistory(hand);
    const input: TutorInput = {
      view: hand,
      rules: view.rules,
      seat: view.you,
      history: this.history,
    };
    this.input = input;
    const situation = situationOf(view.handNo, hand);
    const changed = situation !== this.situation;
    this.situation = situation;

    let { open, bubble } = this.snap;
    if (changed && bubble && (bubble.kind === 'advice' || bubble.kind === 'thinking')) {
      // Die Lage ist eine andere: Ein alter Rat würde verwirren.
      open = false;
      bubble = null;
    }
    this.set({
      open,
      bubble,
      questions: this.questions(input),
      finished: hand.phase === 'finished',
    });
    if (changed && this.settled) this.maybeAuto(input, situation);
  }

  /** Der Tisch hält gerade einen fertigen Stich fest (`false`) bzw. zeigt wieder die Sicht. */
  setSettled(settled: boolean): void {
    if (settled === this.settled) return;
    this.settled = settled;
    if (!settled) return;
    const input = this.input;
    const pending = this.pending;
    this.pending = null;
    if (pending && this.snap.bubble?.kind === 'thinking') {
      this.ask(pending);
      return;
    }
    if (input) this.maybeAuto(input, this.situation);
  }

  /** Figur angetippt: Blase auf (Auswahlfragen) bzw. zu. */
  toggle(): void {
    if (this.snap.open) this.close();
    else this.set({ open: true, bubble: { kind: 'menu' } });
  }

  close(): void {
    this.set({ open: false, bubble: null });
  }

  /** Zurück zu den Auswahlfragen. */
  menu(): void {
    this.set({ open: true, bubble: { kind: 'menu' } });
  }

  setAuto(auto: boolean): void {
    this.set({ auto });
  }

  /** Eine Auswahlfrage stellen. */
  ask(question: Question): void {
    if (question.ask === 'review') {
      if (!this.lastReview) return;
      this.set({
        open: true,
        bubble: {
          kind: 'review',
          review: this.lastReview.review,
          stage: 1,
          auto: false,
          re: this.lastReview.re,
        },
      });
      return;
    }
    const input = this.input;
    if (!input) return;
    const situation = this.situation;
    this.set({ open: true, bubble: { kind: 'thinking', question } });
    if (!this.settled) {
      // Der Tisch zeigt noch den fertigen Stich: erst antworten, wenn man die Lage sieht.
      this.pending = question;
      return;
    }
    void this.adviceFor(input, question.ask, situation).then(
      (advice) => {
        if (this.situation !== situation || this.snap.bubble?.kind !== 'thinking') return;
        if (!advice) {
          this.set({ bubble: { kind: 'menu' } });
          return;
        }
        this.set({
          bubble: {
            kind: 'advice',
            question,
            advice,
            stage: 1,
            auto: false,
            situation,
            re: input.view.doubling.kontra !== null,
          },
        });
      },
      () => this.failed(situation),
    );
  }

  /** Nächste Stufe der Antwort bzw. der Bewertung. */
  reveal(): void {
    const b = this.snap.bubble;
    if (b?.kind === 'advice' && b.stage < 3) {
      this.set({ bubble: { ...b, stage: (b.stage + 1) as 2 | 3 } });
    } else if (b?.kind === 'review' && b.stage < 2) {
      this.set({ bubble: { ...b, stage: 2 } });
    }
  }

  /** Der Mensch hat gezogen (vor dem Abschicken): Lage merken und hinterher bewerten. */
  noteMove(move: TutorOption): void {
    const input = this.input;
    if (!input) return;
    const where: TutorMark['where'] =
      move.type === 'card' ? 'card' : move.type === 'bid' ? 'bid' : 'double';
    const trick = move.type === 'card' ? tricksPlayed(input.view) : null;
    const re = input.view.doubling.kontra !== null;
    const handNo = this.handNo;
    const order = this.order++;
    // Der Rat zu dieser Lage ist mit dem Zug erledigt.
    const b = this.snap.bubble;
    if (b && (b.kind === 'advice' || b.kind === 'thinking'))
      this.set({ open: false, bubble: null });
    void this.engine
      .review(input, move, seedOf(`${this.situation}|review|${optionKey(move)}`))
      .then(
        (review) => {
          if (!review || this.disposed || this.handNo !== handNo) return;
          this.lastReview = { review, re };
          const marks =
            review.verdict === 'fehler'
              ? [...this.snap.marks, { order, where, trick, review, re }].sort(
                  (a, c) => a.order - c.order,
                )
              : this.snap.marks;
          const speak = review.mention && this.snap.auto && !this.busy();
          this.set({
            marks,
            questions: this.input ? this.questions(this.input) : this.snap.questions,
            ...(speak
              ? { open: true, bubble: { kind: 'review', review, stage: 1, auto: true, re } }
              : {}),
          });
        },
        () => {},
      );
  }

  // -------------------------------------------------------------------------

  private set(patch: Partial<TutorSnapshot>): void {
    if (this.disposed) return;
    const next = { ...this.snap, ...patch };
    next.tip = this.tipOf(next);
    this.snap = next;
    for (const l of this.listeners) l();
  }

  private tipOf(s: TutorSnapshot): TutorOption | null {
    const b = s.bubble;
    if (!s.open || b?.kind !== 'advice' || b.stage < 2 || b.situation !== this.situation)
      return null;
    return b.advice.recommended;
  }

  /** Hat der Mensch die Blase gerade selbst in der Hand? Dann drängelt die Automatik nicht. */
  private busy(): boolean {
    const b = this.snap.bubble;
    if (!this.snap.open || !b) return false;
    if (b.kind === 'menu' || b.kind === 'thinking') return true;
    if (b.kind === 'advice') return !b.auto || b.stage > 1;
    if (b.kind === 'review') return !b.auto || b.stage > 1;
    return false;
  }

  private newHand(handNo: number): void {
    this.handNo = handNo;
    this.history = [];
    this.lastReview = null;
    this.order = 0;
    this.cache.clear();
    this.autoSlots.clear();
    this.situation = '';
    this.snap = { ...this.snap, open: false, bubble: null, marks: [], handNo };
  }

  /**
   * Gesehene Stiche sammeln: Die Sicht zeigt nur den letzten. Fehlt einer (etwa nach dem
   * Neuladen), passt die Zahl nicht, und der Tutor rät nur nach Faustregeln.
   */
  private trackHistory(hand: HandView): void {
    if (hand.tricks) {
      this.history = hand.tricks;
      return;
    }
    const played = tricksPlayed(hand);
    if (played === 0) this.history = [];
    else if (played === this.history.length + 1 && hand.lastTrick)
      this.history = [...this.history, hand.lastTrick];
  }

  private questions(input: TutorInput): Question[] {
    const list = questionsFor(input);
    return this.lastReview ? [...list, REVIEW_QUESTION] : list;
  }

  private adviceFor(input: TutorInput, ask: AskKind, situation: string): Promise<Advice | null> {
    const key = `${situation}|${ask}`;
    let p = this.cache.get(key);
    if (!p) {
      p = this.engine.advise(input, ask, seedOf(key));
      this.cache.set(key, p);
      // Fehlschläge nicht festhalten, sonst bliebe die Frage für diese Lage kaputt.
      p.catch(() => this.cache.delete(key));
    }
    return p;
  }

  /** Automatikmodus: in wichtigen Momenten von selbst mit dem Denkanstoß. */
  private maybeAuto(input: TutorInput, situation: string): void {
    if (!this.snap.auto) return;
    const ask = currentAsk(input);
    if (!ask) return;
    const slot =
      ask === 'bid'
        ? 'ansage'
        : ask === 'double'
          ? 'kontra'
          : ask === 'prelude'
            ? `vorspiel-${input.view.prelude?.step ?? ''}`
            : `stich-${tricksPlayed(input.view)}`;
    if (this.autoSlots.has(slot)) return;
    void this.adviceFor(input, ask, situation).then(
      (advice) => {
        if (!advice?.importance.auto || this.situation !== situation || !this.snap.auto) return;
        if (!this.settled) return;
        if (this.autoSlots.has(slot) || this.busy()) return;
        const rule = advice.reasons[0]?.id ?? null;
        if (rule !== null && rule === this.lastAutoRule) return;
        this.autoSlots.add(slot);
        this.lastAutoRule = rule;
        this.set({
          open: true,
          bubble: {
            kind: 'advice',
            question: null,
            advice,
            stage: 1,
            auto: true,
            situation,
            re: input.view.doubling.kontra !== null,
          },
        });
      },
      () => {},
    );
  }

  private failed(situation: string): void {
    if (this.situation === situation) this.set({ bubble: { kind: 'failed' } });
  }
}
