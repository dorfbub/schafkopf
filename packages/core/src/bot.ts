import type { PlayerAction } from './hand';
import type { RuleSet } from './rules';
import type { HandView } from './view';

/**
 * Schnittstelle für Computer-Gegner. Ein Bot sieht dasselbe wie ein Mensch
 * (eine `HandView`) und antwortet mit einer Aktion. Wird nur aufgerufen, wenn
 * der Bot an der Reihe ist. Implementierungen liegen in packages/bots.
 *
 * `rules` sind die Tischregeln – öffentlich wie für jeden Menschen am Tisch (sie stehen in der
 * `TableView`). Der Host gibt sie bei jedem Aufruf mit, damit ein Bot nichts ansagt, was am
 * Tisch abgeschaltet ist, und Ramsch-Optionen kennt. Fehlen sie, rechnet der Bot mit den
 * Standardregeln.
 */
export interface Bot {
  decide(view: HandView, rules?: RuleSet): PlayerAction;
}
