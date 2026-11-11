import type { HandResult, TableView } from '@schafkopf/core';
import { TABLE_TEXT, money } from '../../i18n/de';

/** Betrag ohne Vorzeichen. */
const plain = (cents: number) => money(cents).replace(/^[+−]/, '');

/**
 * Pott im Ergebnis (Stock): eingezahlt, gewonnen oder stehen geblieben. Nichts, solange es
 * keinen Pott gibt.
 */
export function PotNote({ view, result }: { view: TableView; result: HandResult }) {
  let label: string;
  let amount: number;
  if (result.potDelta > 0) {
    label = TABLE_TEXT.potFilled(plain(view.rules.tariff.stock));
    amount = view.pot;
  } else if (result.potDelta < 0) {
    label = TABLE_TEXT.potWon;
    amount = -result.potDelta;
  } else if (view.pot > 0) {
    label = TABLE_TEXT.potStays;
    amount = view.pot;
  } else {
    return null;
  }
  return (
    <p className="ergebnis__wert">
      <span>{label}</span>
      <span className="num">{plain(amount)}</span>
    </p>
  );
}
