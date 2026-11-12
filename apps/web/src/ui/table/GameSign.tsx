import {
  type Contract,
  type HandView,
  type Seat,
  type Suit,
  HAWAII_SWITCH_TRICK,
  MODES,
  trumpSuitFor,
  trumpsChange,
  tricksPlayed,
} from '@schafkopf/core';
import { KIND_NAME, SUIT_NAME, TABLE_TEXT, contractLabel } from '../../i18n/de';
import { bayerischTheme } from '../cardTheme';

/** Zeichen auf dem Schild: Farbzeichen (Rufsau bzw. Trumpf) oder Eckbuchstabe (Wenz, Geier). */
export type SignSymbol = { suit: Suit } | { letter: string } | null;

/**
 * Was gespielt wird, als Schild am Platz des Spielers. Neue Fälle kommen hier dazu:
 * - Ramsch (K3b): kein Spieler – dann `seat: null` und das Schild steht in der Tischmitte.
 * - Kontra/Re (K4): weitere Einträge in `extras`.
 * - Hochzeit (K5): Name „Hochzeit“ ohne Zeichen; der Partner trägt sofort die Marke „Mitspieler“.
 * - Hawaii-Habicht (H2): Zeichen der gerade gültigen Trumpffarbe; als Zusatz die zweite Farbe
 *   („ab Stich 5: Herz“), nach dem Wechsel „Trumpf gewechselt“.
 */
export interface GameSignInfo {
  seat: Seat;
  symbol: SignSymbol;
  /** Kurzer Name auf dem Schild, z. B. „Sauspiel“; die Farbe sagt das Zeichen. */
  name: string;
  /** Vollständig für Bildschirmleser, z. B. „Sauspiel auf die Gras-Sau“. */
  label: string;
  /** Zusätze als Marken, z. B. „Tout“. */
  extras: string[];
}

/** Eckbuchstabe für Spielarten ohne Farbe, in denen eine Kartenart allein Trumpf ist. */
const LETTER: Partial<Record<Contract['kind'], string>> = {
  wenz: 'U',
  geier: 'O',
  eisenbahner: '10',
};

/** Zeichen des Spiels; bei wechselnder Trumpffarbe die im Stich mit Index `trick` gültige. */
export function symbolFor(contract: Contract, trick = 0): SignSymbol {
  const trump = trumpSuitFor(contract, trick);
  if (trump) return { suit: trump };
  if (contract.suit && MODES[contract.kind].suitRole !== 'none') return { suit: contract.suit };
  const letter = LETTER[contract.kind];
  return letter ? { letter } : null;
}

/** Schild für das laufende Spiel; `null`, solange keiner spielt (Ansage, zusammengeworfen). */
export function gameSign(hand: HandView): GameSignInfo | null {
  const { contract, declarer } = hand;
  if (!contract || declarer === null) return null;
  const extras = contract.tout ? [TABLE_TEXT.bidTout] : [];
  // Die Sicht trägt keinen Stich-Index; nur bei wechselnder Trumpffarbe wird er gebraucht.
  const trick = trumpsChange(contract) ? tricksPlayed(hand) : 0;
  if (trumpsChange(contract) && contract.suit2) {
    extras.push(
      trick < HAWAII_SWITCH_TRICK
        ? TABLE_TEXT.trumpNext(SUIT_NAME[contract.suit2])
        : TABLE_TEXT.trumpSwitched,
    );
  }
  return {
    seat: declarer,
    symbol: symbolFor(contract, trick),
    name: KIND_NAME[contract.kind],
    label: contractLabel(contract),
    extras,
  };
}

/** Das Zeichen allein, z. B. für das Schild oder den Spielverlauf. */
export function SignMark({ symbol }: { symbol: SignSymbol }) {
  if (!symbol) return null;
  return (
    <span className="spielschild__zeichen" aria-hidden="true">
      {'suit' in symbol ? bayerischTheme.suit(symbol.suit) : symbol.letter}
    </span>
  );
}

/** Schild „Sauspiel [Gras]“ auf Papier; ersetzt am Platz die Marke „Spieler“. */
export function GameSign({ info }: { info: GameSignInfo }) {
  return (
    <span className="spielschild" role="note" aria-label={TABLE_TEXT.signLabel(info.label)}>
      <SignMark symbol={info.symbol} />
      <span className="spielschild__name">{info.name}</span>
      {info.extras.map((extra) => (
        <span key={extra} className="marke marke--brass">
          {extra}
        </span>
      ))}
    </span>
  );
}
