import type { TableView } from '@schafkopf/core';
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { createWorkerEngine } from './engine';
import { type TutorSession, type TutorSnapshot, TutorSession as Session } from './session';
import { tutorSettings } from './settings';

/**
 * Der Trainer für die Bausteine des Tisches. Ohne Trainer (Tisch mit Freunden, Zuschauer,
 * ausgeschaltet) ist der Wert `null`, und Figur, Hervorhebung und Rückblick bleiben weg.
 */
const TutorContext = createContext<TutorSession | null>(null);

export function TutorProvider({
  session,
  children,
}: {
  session: TutorSession | null;
  children: ReactNode;
}) {
  return <TutorContext.Provider value={session}>{children}</TutorContext.Provider>;
}

const noSubscribe = () => () => {};
const noSnapshot = () => null;

/** Sitzung und aktueller Stand des Trainers, oder `null` ohne Trainer. */
export function useTutor(): { session: TutorSession; snap: TutorSnapshot } | null {
  const session = useContext(TutorContext);
  const snap = useSyncExternalStore(
    session ? session.subscribe : noSubscribe,
    session ? session.getSnapshot : noSnapshot,
  );
  return session && snap ? { session, snap } : null;
}

/**
 * Legt die Sitzung an, solange `enabled` gilt (eigener Web Worker), füttert sie mit jeder neuen
 * Sicht und hält den Automatikmodus mit der Einstellung gleich.
 */
export function useTutorSession(enabled: boolean, view: TableView): TutorSession | null {
  const [session, setSession] = useState<TutorSession | null>(null);
  const { auto } = useSyncExternalStore(tutorSettings.subscribe, tutorSettings.getSnapshot);

  useEffect(() => {
    if (!enabled) return;
    const engine = createWorkerEngine();
    const s = new Session(engine, tutorSettings.getSnapshot().auto);
    setSession(s);
    return () => {
      s.dispose();
      engine.dispose();
      setSession(null);
    };
  }, [enabled]);

  useEffect(() => {
    session?.update(view);
  }, [session, view]);

  useEffect(() => {
    session?.setAuto(auto);
  }, [session, auto]);

  return enabled ? session : null;
}
