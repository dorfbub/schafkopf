import { type Contract, type HandView, type Seat, type Suit, MODES } from '@schafkopf/core';
import { KIND_NAME, TABLE_TEXT, contractLabel } from '../../i18n/de';
import { bayerischTheme } from '../cardTheme';

/** Zeichen auf dem Schild: Farbzeichen (Rufsau bzw. Trumpf) oder Eckbuchstabe (Wenz, Geier). */
export type SignSymbol = { suit: Suit } | { letter: string } | null;

/**
 * Was gespielt wird, als Schild am Platz des Spielers. Neue Fälle kommen hier dazu:
 * - Ramsch (K3b): kein Spieler – dann `seat: null` und das Schild steht in der Tischmitte.
 * - Kontra/Re (K4): weitere Einträge in `extras`.
 * - Hochzeit (K5): eigener Name und eigenes Zeichen; der Partner ist sofort bekannt.
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
const LETTER: Partial<Record<Contract['kind'], string>> = { wenz: 'U', geier: 'O' };

export function symbolFor(contract: Contract): SignSymbol {
  if (contract.suit && MODES[contract.kind].suitRole !== 'none') return { suit: contract.suit };
  const letter = LETTER[contract.kind];
  return letter ? { letter } : null;
}

/** Schild für das laufende Spiel; `null`, solange keiner spielt (Ansage, zusammengeworfen). */
export function gameSign(hand: HandView): GameSignInfo | null {
  const { contract, declarer } = hand;
  if (!contract || declarer === null) return null;
  return {
    seat: declarer,
    symbol: symbolFor(contract),
    name: KIND_NAME[contract.kind],
    label: contractLabel(contract),
    extras: contract.tout ? [TABLE_TEXT.bidTout] : [],
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
