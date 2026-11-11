import type { CompletedTrick, HandView, Trick } from '@schafkopf/core';
import { useEffect, useState } from 'react';

/** So lange bleibt ein fertiger Stich ruhig liegen, bevor er zum Gewinner wandert. */
export const TRICK_HOLD_MS = 1000;

/**
 * Dauer des Wegräumens in Millisekunden, aus der Variable `--duration-sweep` (tokens.css).
 * Bei „Bewegung reduzieren“ ist sie 0 – dann verschwindet der Stich nach dem Liegenlassen sofort.
 */
function sweepMs(): number {
  if (typeof window === 'undefined') return 0;
  const value = getComputedStyle(document.documentElement).getPropertyValue('--duration-sweep');
  const ms = parseFloat(value);
  return Number.isFinite(ms) ? (value.trim().endsWith('ms') ? ms : ms * 1000) : 0;
}

export interface TrickDisplay {
  /** Der Stich, der gerade auf dem Tisch liegt. */
  trick: Trick;
  /** Gesetzt, solange ein fertiger Stich noch liegen bleibt oder weggeräumt wird. */
  completed: CompletedTrick | null;
  /** Der fertige Stich wandert gerade zum Gewinner. */
  sweeping: boolean;
  /** Beendet das Liegenlassen sofort, z. B. wenn man selbst schon ausspielt. */
  release(): void;
}

/**
 * Die Sicht kennt nur den laufenden und den letzten Stich. Sobald ein Stich fertig ist, ist
 * `currentTrick` sofort leer – damit alle die vierte Karte sehen, hält die Oberfläche den
 * fertigen Stich noch kurz fest und lässt ihn dann zum Gewinner wandern.
 *
 * Das Festhalten beginnt schon im selben Rendern (nicht erst im Effekt), sonst wäre der
 * Stich für einen Augenblick leer und alle Karten kämen noch einmal herein.
 */
export function useTrickDisplay(hand: HandView, handNo: number): TrickDisplay {
  const done = hand.tricksWon.reduce((a, b) => a + b, 0);
  const [handled, setHandled] = useState({ handNo, done });
  const [phase, setPhase] = useState<'hold' | 'sweep' | null>(null);

  // Abgeleiteter Zustand während des Renderns (von React so vorgesehen).
  if (handled.handNo !== handNo || done < handled.done) {
    setHandled({ handNo, done });
    setPhase(null);
  } else if (done > handled.done) {
    setHandled({ handNo, done });
    setPhase('hold');
  }

  useEffect(() => {
    const sweep = sweepMs();
    const start = setTimeout(() => setPhase((p) => (p === 'hold' ? 'sweep' : p)), TRICK_HOLD_MS);
    const end = setTimeout(
      () => setPhase((p) => (p === 'sweep' ? null : p)),
      TRICK_HOLD_MS + sweep,
    );
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [handled]);

  const held = phase !== null && hand.lastTrick !== null ? hand.lastTrick : null;
  return {
    trick: held ?? hand.currentTrick,
    completed: held,
    sweeping: held !== null && phase === 'sweep',
    release: () => setPhase(null),
  };
}
