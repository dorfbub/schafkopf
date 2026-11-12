/// <reference lib="webworker" />
/**
 * Web Worker des Trainers: rechnet Rat und Bewertung abseits der Oberfläche. Bekommt nur die
 * eigene Sicht (`TutorInput`), nie den Zustand des Tisches.
 */
import { type WorkerRequest, type WorkerResponse, runRequest } from './compute';

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (e: MessageEvent<WorkerRequest>) => {
  let response: WorkerResponse;
  try {
    response = { id: e.data.id, result: runRequest(e.data, () => performance.now()) };
  } catch (error) {
    response = { id: e.data.id, error: String(error) };
  }
  scope.postMessage(response);
};
