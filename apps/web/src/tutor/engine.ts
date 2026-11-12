import type { Advice, AskKind, Review, TutorInput, TutorOption } from '@schafkopf/tutor';
import { type WorkerRequest, type WorkerResponse, runRequest } from './compute';

/**
 * Rechenwerk des Trainers. Die Rechnung (Probespiele des starken Bots) dauert auf einem Handy
 * spürbar; im Browser läuft sie deshalb in einem Web Worker, damit der Tisch flüssig bleibt.
 * Alles bleibt im eigenen Browser – nichts davon geht über das Netz.
 */
export interface TutorEngine {
  advise(input: TutorInput, ask: AskKind, seed: number): Promise<Advice | null>;
  review(input: TutorInput, move: TutorOption, seed: number): Promise<Review | null>;
  dispose(): void;
}

/** Anfrage ohne Kennung (die vergibt `send`). */
type WorkerRequestBody = WorkerRequest extends infer R
  ? R extends WorkerRequest
    ? Omit<R, 'id'>
    : never
  : never;

/** Rechnet ohne Worker (Tests, Browser ohne Worker). */
export function createDirectEngine(now?: () => number): TutorEngine {
  let id = 0;
  const run = <T>(req: WorkerRequest) => Promise.resolve(runRequest(req, now) as T);
  return {
    advise: (input, ask, seed) => run({ id: id++, op: 'advise', input, ask, seed }),
    review: (input, move, seed) => run({ id: id++, op: 'review', input, move, seed }),
    dispose() {},
  };
}

/** Rechnet in einem Web Worker; fällt ohne Worker auf die direkte Rechnung zurück. */
export function createWorkerEngine(): TutorEngine {
  let worker: Worker;
  try {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return createDirectEngine(() => performance.now());
  }
  let nextId = 1;
  const pending = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void }>();
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const entry = pending.get(e.data.id);
    if (!entry) return;
    pending.delete(e.data.id);
    if ('error' in e.data) entry.reject(new Error(e.data.error));
    else entry.resolve(e.data.result as never);
  };
  worker.onerror = () => {
    for (const entry of pending.values()) entry.reject(new Error('Trainer-Worker abgestürzt'));
    pending.clear();
  };
  const send = <T>(req: WorkerRequestBody) =>
    new Promise<T>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve: resolve as (v: never) => void, reject });
      worker.postMessage({ ...req, id });
    });
  return {
    advise: (input, ask, seed) => send({ op: 'advise', input, ask, seed }),
    review: (input, move, seed) => send({ op: 'review', input, move, seed }),
    dispose() {
      worker.terminate();
      pending.clear();
    },
  };
}
