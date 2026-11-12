import {
  type Advice,
  type AskKind,
  type Review,
  type TutorInput,
  type TutorOption,
  type TutorOptions,
  advise,
  review,
} from '@schafkopf/tutor';

/*
 * Die eigentliche Rechnung, getrennt vom Worker-Aufbau: Der Worker importiert nur diese Datei.
 */

/** Zeitbudget je Frage; auf schnellen Rechnern reicht das feste Rechenbudget vorher. */
export const TUTOR_BUDGET_MS = 400;

export type WorkerRequest =
  | { id: number; op: 'advise'; input: TutorInput; ask: AskKind; seed: number }
  | { id: number; op: 'review'; input: TutorInput; move: TutorOption; seed: number };

export type WorkerResponse = { id: number; result: unknown } | { id: number; error: string };

/** Führt eine Anfrage aus – im Worker und, ohne Worker, direkt. */
export function runRequest(req: WorkerRequest, now?: () => number): Advice | Review | null {
  const options: TutorOptions = {
    seed: req.seed,
    ...(now ? { now, budgetMs: TUTOR_BUDGET_MS } : {}),
  };
  return req.op === 'advise'
    ? advise(req.input, req.ask, options)
    : review(req.input, req.move, options);
}
