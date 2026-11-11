import type { CompletedTrick, HandView, Trick } from '@schafkopf/core';
import { useEffect, useRef, useState } from 'react';

/** So lange bleibt ein fertiger Stich liegen, bevor er zum Gewinner wandert. */
export const TRICK_HOLD_MS = 1400;

export interface TrickDisplay {
  /** Der Stich, der gerade auf dem Tisch liegt. */
  trick: Trick;
  /** Gesetzt, solange ein fertiger Stich noch liegen bleibt. */
  completed: CompletedTrick | null;
  /** Beendet das Liegenlassen sofort, z. B. wenn man selbst schon ausspielt. */
  release(): void;
}

/**
 * Die Sicht kennt nur den laufenden und den letzten Stich. Sobald ein Stich fertig ist, ist
 * `currentTrick` sofort leer – damit alle die vierte Karte sehen, hält die Oberfläche den
 * fertigen Stich noch kurz fest.
 */
export function useTrickDisplay(hand: HandView, handNo: number): TrickDisplay {
  const done = hand.tricksWon.reduce((a, b) => a + b, 0);
  const seen = useRef({ handNo, done });
  const [held, setHeld] = useState<CompletedTrick | null>(null);
  // Über das Netz kommt mit jeder Sicht ein neues Objekt; nur die Anzahl der Stiche zählt.
  const lastTrick = useRef(hand.lastTrick);
  lastTrick.current = hand.lastTrick;

  useEffect(() => {
    const before = seen.current;
    seen.current = { handNo, done };
    if (before.handNo !== handNo || done < before.done) {
      setHeld(null);
      return;
    }
    if (done > before.done && lastTrick.current) {
      setHeld(lastTrick.current);
      const timer = setTimeout(() => setHeld(null), TRICK_HOLD_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [handNo, done]);

  return {
    trick: held ?? hand.currentTrick,
    completed: held,
    release: () => setHeld(null),
  };
}
