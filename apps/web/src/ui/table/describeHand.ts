import type { HandSummary } from '@schafkopf/core';
import { TABLE_TEXT as T, contractLabel } from '../../i18n/de';

export interface HandDescription {
  /** Wer was gespielt hat, z. B. „Sepp: Sauspiel Eichel“. */
  what: string;
  /** Ausgang für die Spielerpartei; `null` bei Ramsch und ohne Spiel. */
  outcome: 'won' | 'lost' | null;
}

/** Eine Zeile der Abendtabelle in Worten: wer hat was gespielt und wie ging es aus. */
export function describeHand(
  summary: HandSummary,
  nameOf: (seat: number) => string,
): HandDescription {
  const { result } = summary;
  const details = result.outcome?.details;
  if (!details) {
    return { what: result.potDelta > 0 ? T.gameStock : T.gamePassed, outcome: null };
  }
  if (details.type === 'ramsch') {
    return {
      what:
        details.durchmarsch !== null
          ? T.gameDurchmarsch(nameOf(details.durchmarsch))
          : T.gameRamsch(nameOf(details.loser!)),
      outcome: null,
    };
  }
  return {
    what: T.gamePlays(nameOf(details.declarer), contractLabel(details.contract)),
    outcome: details.won ? 'won' : 'lost',
  };
}
