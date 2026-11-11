import type { HandView, TableView } from '@schafkopf/core';
import { TABLE_TEXT, contractLabel, money } from '../../i18n/de';
import { Button, Dialog } from '../kit';
import { GameHistory } from './GameHistory';
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
 * Ergebnis eines Spiels: wer gewonnen hat, Augen, Zuschläge, die Beträge und aufklappbar der
 * Spielverlauf. Die genaue Aufschlüsselung (Grundtarif, Schneider, Laufende …) folgt mit U4.
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

  if (result.kind === 'passed' || !result.outcome) {
    return (
      <Dialog className="ergebnis" title={TABLE_TEXT.passedTitle} actions={actions}>
        {table}
      </Dialog>
    );
  }

  const { value } = result.outcome;
  const details = result.outcome.details;
  const names = details.party.map(seats.nameOf).join(TABLE_TEXT.and);
  const extras = [
    TABLE_TEXT.extras.tricks(details.partyTricks),
    details.schwarz ? TABLE_TEXT.extras.schwarz : details.schneider && TABLE_TEXT.extras.schneider,
    details.sie && TABLE_TEXT.extras.sie,
    details.laufende > 0 && TABLE_TEXT.extras.laufende(details.laufende),
  ].filter(Boolean);
  const share = Math.round((details.partyPoints / 120) * 100);

  return (
    <Dialog
      className={`ergebnis${details.won ? ' ergebnis--gewonnen' : ''}`}
      title={TABLE_TEXT.resultTitle(names, details.party.length > 1, details.won)}
      actions={actions}
    >
      <p className="ergebnis__spiel">{contractLabel(details.contract)}</p>
      <div className="augen">
        <span className="augen__zahl">{details.partyPoints}</span>
        <span className="augen__wort">{TABLE_TEXT.points}</span>
        <span className="augen__zusatz">{extras.join(' · ')}</span>
      </div>
      <div
        className="augen__balken"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={120}
        aria-valuenow={details.partyPoints}
        aria-label={TABLE_TEXT.pointsOf(details.partyPoints)}
      >
        <span style={{ width: `${share}%` }} />
      </div>
      <p className="ergebnis__wert">
        <span>{TABLE_TEXT.valuePerPlayer}</span>
        <span className="num">{money(value).replace(/^[+−]/, '')}</span>
      </p>
      {table}
      {hand.tricks && hand.tricks.length > 0 && <GameHistory tricks={hand.tricks} seats={seats} />}
    </Dialog>
  );
}
