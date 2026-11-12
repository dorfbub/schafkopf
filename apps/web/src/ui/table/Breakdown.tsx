import { type HandResult, breakdownOf } from '@schafkopf/core';
import { TABLE_TEXT as T, plainMoney } from '../../i18n/de';

interface Props {
  result: HandResult;
  /** Wie viele Laufende gezählt wurden (steht in der Zeile „Laufende“). */
  laufende?: number;
  /** Ramsch: „je Mitspieler“ statt „je Gegenspieler“. */
  eachLabel?: string;
}

/**
 * Aufschlüsselung des Spielwerts (U4): erst die Bestandteile (Grundtarif, Schneider, Laufende …),
 * dann die Faktoren (Kontra, Re, Jungfrau) und der Betrag je Spieler. Der Pott steht darunter
 * (`PotNote`). Rechnet nur auf dem `HandResult`.
 */
export function Breakdown({ result, laufende = 0, eachLabel = T.valuePerPlayer }: Props) {
  const b = breakdownOf(result);
  if (!b) return null;
  const hasFactors = b.factors.length > 0;
  return (
    <dl className="aufschluesselung" aria-label={T.breakdownLabel}>
      {b.parts.map((p) => (
        <div key={p.label} className="aufschluesselung__zeile">
          <dt>
            {p.label === 'laufende' && laufende > 0
              ? T.valuePartsLaufende(laufende)
              : T.valueParts[p.label]}
          </dt>
          <dd className="num">{plainMoney(p.amount)}</dd>
        </div>
      ))}
      {(b.parts.length > 1 || hasFactors) && (
        <div className="aufschluesselung__zeile aufschluesselung__summe">
          <dt>{T.valueSum}</dt>
          <dd className="num">{plainMoney(b.value)}</dd>
        </div>
      )}
      {b.factors.map((f, i) => (
        <div key={i} className="aufschluesselung__zeile aufschluesselung__faktor">
          <dt>{T.factorReasons[f.reason]}</dt>
          <dd className="num">{T.factorTimes(f.factor)}</dd>
        </div>
      ))}
      <div className="aufschluesselung__zeile aufschluesselung__ergebnis">
        <dt>{eachLabel}</dt>
        <dd className="num">{plainMoney(b.amount)}</dd>
      </div>
    </dl>
  );
}
