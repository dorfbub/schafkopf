import type { HandResult, RamschDetails, TableView } from '@schafkopf/core';
import type { ReactNode } from 'react';
import { TABLE_TEXT } from '../../i18n/de';
import { Dialog } from '../kit';
import type { SeatInfo } from './layout';
import { Breakdown } from './Breakdown';
import { PotNote } from './PotNote';
import { Money } from './ResultDialog';

interface Props {
  view: TableView;
  result: HandResult;
  details: RamschDetails;
  seats: SeatInfo;
  actions: ReactNode;
}

/**
 * Ergebnis eines Ramschs: wer verliert (oder mit Durchmarsch gewinnt), Augen und Stiche je
 * Spieler, Jungfrauen und die Beträge. Gleiche Bausteine wie der Ergebnis-Dialog.
 */
export function RamschResult({ view, result, details, seats, actions }: Props) {
  const durch = details.durchmarsch;
  const key = durch ?? details.loser!;
  const title =
    durch !== null
      ? TABLE_TEXT.ramschDurchmarsch(seats.nameOf(durch))
      : TABLE_TEXT.ramschLoser(seats.nameOf(key));
  const points = details.points[key]!;
  const extras = [
    TABLE_TEXT.extras.tricks(details.tricks[key]!),
    details.jungfrauen.length > 0 &&
      TABLE_TEXT.ramschJungfrauen(details.jungfrauen.map(seats.nameOf)),
  ].filter(Boolean);

  return (
    <Dialog
      className={`ergebnis${
        view.you !== null && result.outcome!.winners.includes(view.you) ? ' ergebnis--gewonnen' : ''
      }`}
      title={title}
      actions={actions}
    >
      <p className="ergebnis__spiel">
        {durch !== null ? TABLE_TEXT.ramschHintDurchmarsch : TABLE_TEXT.ramschHint}
      </p>
      <div className="augen">
        <span className="augen__zahl">{points}</span>
        <span className="augen__wort">{TABLE_TEXT.points}</span>
        <span className="augen__zusatz">{extras.join(' · ')}</span>
      </div>
      <div
        className="augen__balken"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={120}
        aria-valuenow={points}
        aria-label={TABLE_TEXT.pointsOf(points)}
      >
        <span style={{ width: `${Math.round((points / 120) * 100)}%` }} />
      </div>
      <Breakdown result={result} eachLabel={TABLE_TEXT.ramschPerPlayer} />
      <PotNote view={view} result={result} />
      <table className="ergebnis__tabelle">
        <thead>
          <tr>
            <th scope="col">{TABLE_TEXT.colPlayer}</th>
            <th scope="col">{TABLE_TEXT.colPoints}</th>
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
                {details.jungfrauen.includes(seat) && (
                  <span className="ergebnis__du"> · {TABLE_TEXT.jungfrau}</span>
                )}
              </th>
              <td className="num">{details.points[seat]}</td>
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
    </Dialog>
  );
}
