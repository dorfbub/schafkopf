import type { HandView, TableView } from '@schafkopf/core';
import { TABLE_TEXT, contractLabel, money } from '../../i18n/de';
import { Button, Dialog } from '../kit';
import type { SeatInfo } from './layout';

interface Props {
  view: TableView;
  hand: HandView;
  seats: SeatInfo;
  onNext: (() => void) | null;
  onLastTrick: (() => void) | null;
}

/** Betrag mit Minusfarbe, falls negativ. */
function Money({ cents }: { cents: number }) {
  return <span className={cents < 0 ? 'text-negative' : undefined}>{money(cents)}</span>;
}

/**
 * Ergebnis eines Spiels: wer gewonnen hat, Augen, Zuschläge und die Beträge. Die genaue
 * Aufschlüsselung (Grundtarif, Schneider, Laufende …) und der Verlauf folgen mit U4.
 */
export function ResultDialog({ view, hand, seats, onNext, onLastTrick }: Props) {
  const result = hand.result!;
  const actions = (
    <>
      {onLastTrick && (
        <Button variant="secondary" onClick={onLastTrick}>
          {TABLE_TEXT.lastTrick}
        </Button>
      )}
      {onNext ? (
        <Button onClick={onNext}>{TABLE_TEXT.nextHand}</Button>
      ) : (
        <p className="ergebnis__warten">{TABLE_TEXT.hostDeals}</p>
      )}
    </>
  );

  const table = (
    <table className="ergebnis__tabelle">
      <thead>
        <tr>
          <th scope="col">{TABLE_TEXT.colPlayer}</th>
          <th scope="col">{TABLE_TEXT.colHand}</th>
          <th scope="col">{TABLE_TEXT.colBalance}</th>
        </tr>
      </thead>
      <tbody>
        {view.seats.map((_, seat) => (
          <tr key={seat} className={seat === view.you ? 'ist-du' : undefined}>
            <th scope="row">
              {seats.nameOf(seat)}
              {seat === view.you && <span className="ergebnis__du"> ({TABLE_TEXT.you})</span>}
            </th>
            <td>
              <Money cents={result.payments[seat]!} />
            </td>
            <td>
              <Money cents={view.balances[seat]!} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (result.kind === 'passed') {
    return (
      <Dialog className="ergebnis" title={TABLE_TEXT.passedTitle} actions={actions}>
        {table}
      </Dialog>
    );
  }

  const names = result.party.map(seats.nameOf).join(TABLE_TEXT.and);
  const extras = [
    TABLE_TEXT.extras.tricks(result.partyTricks),
    result.schwarz ? TABLE_TEXT.extras.schwarz : result.schneider && TABLE_TEXT.extras.schneider,
    result.sie && TABLE_TEXT.extras.sie,
    result.laufende > 0 && TABLE_TEXT.extras.laufende(result.laufende),
  ].filter(Boolean);
  const share = Math.round((result.partyPoints / 120) * 100);

  return (
    <Dialog
      className={`ergebnis${result.won ? ' ergebnis--gewonnen' : ''}`}
      title={TABLE_TEXT.resultTitle(names, result.party.length > 1, result.won)}
      actions={actions}
    >
      <p className="ergebnis__spiel">{contractLabel(result.contract)}</p>
      <div className="augen">
        <span className="augen__zahl">{result.partyPoints}</span>
        <span className="augen__wort">{TABLE_TEXT.points}</span>
        <span className="augen__zusatz">{extras.join(' · ')}</span>
      </div>
      <div
        className="augen__balken"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={120}
        aria-valuenow={result.partyPoints}
        aria-label={TABLE_TEXT.pointsOf(result.partyPoints)}
      >
        <span style={{ width: `${share}%` }} />
      </div>
      <p className="ergebnis__wert">
        <span>{TABLE_TEXT.valuePerPlayer}</span>
        <span className="num">{money(result.value).replace(/^[+−]/, '')}</span>
      </p>
      {table}
    </Dialog>
  );
}
