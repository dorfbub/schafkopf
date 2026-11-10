import type { PlayerAction } from './hand';
import type { HandView } from './view';

/**
 * Schnittstelle für Computer-Gegner. Ein Bot sieht dasselbe wie ein Mensch
 * (eine `HandView`) und antwortet mit einer Aktion. Wird nur aufgerufen, wenn
 * der Bot an der Reihe ist. Implementierungen liegen in packages/bots.
 */
export interface Bot {
  decide(view: HandView): PlayerAction;
}
