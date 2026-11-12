import { type TableView, ledgerOf, settleUp } from '@schafkopf/core';
import { useEffect, useRef } from 'react';
import { TABLE_TEXT as T, money, plainMoney } from '../../i18n/de';
import { Button, Dialog } from '../kit';
import { describeHand } from './describeHand';
import type { SeatInfo } from './layout';

interface Props {
  view: TableView;
  seats: SeatInfo;
  /** Beim Verlassen: „Zurück zum Tisch“ und „Tisch verlassen“ statt nur „Schließen“. */
  leaving: boolean;
  onClose: () => void;
  onLeave: () => void;
}

function Amount({ cents }: { cents: number }) {
  return <span className={cents < 0 ? 'text-negative' : undefined}>{money(cents)}</span>;
}

/**
 * Der Abend (U4): Tabelle aller Spiele mit Betrag je Spieler und laufendem Stand, darunter die
 * Endabrechnung „wer zahlt wem“. Alles aus `view.history` – Rechnung im Kern (`ledgerOf`, `settleUp`).
 */
export function EveningDialog({ view, seats, leaving, onClose, onLeave }: Props) {
  const players = view.seats.length;
  const rows = ledgerOf(view.history, players);
  const settlement = settleUp(view.balances, view.pot);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    backRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus();
    };
  }, [onClose]);

  const evenly = view.pot > 0 && view.pot % players === 0;
  return (
    <Dialog
      className="abend"
      title={leaving ? T.leaveTitle : T.eveningTitle}
      hint={rows.length > 0 ? T.eveningHint : undefined}
      actions={
        leaving ? (
          <>
            <Button ref={backRef} variant="secondary" onClick={onClose}>
              {T.leaveBack}
            </Button>
            <Button onClick={onLeave}>{T.leaveConfirm}</Button>
          </>
        ) : (
          <Button ref={backRef} variant="secondary" onClick={onClose}>
            {T.close}
          </Button>
        )
      }
    >
      {rows.length === 0 ? (
        <p className="abend__leer">{T.eveningEmpty}</p>
      ) : (
        <div className="abend__rolle" tabIndex={0} role="region" aria-label={T.eveningTableLabel}>
          <table className="abend__tabelle">
            <thead>
              <tr>
                <th scope="col" className="abend__nr">
                  {T.colNo}
                </th>
                <th scope="col">{T.colGame}</th>
                {view.seats.map((_, seat) => (
                  <th key={seat} scope="col" className={seat === view.you ? 'ist-du' : undefined}>
                    {seats.nameOf(seat)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const d = describeHand(row.summary, seats.nameOf);
                return (
                  <tr key={row.summary.handNo}>
                    <th scope="row" className="abend__nr">
                      {row.summary.handNo}
                    </th>
                    <td className="abend__spiel">
                      {d.what}
                      {d.outcome && (
                        <span className={`abend__ausgang abend__ausgang--${d.outcome}`}>
                          {d.outcome === 'won' ? T.gameWon : T.gameLost}
                        </span>
                      )}
                    </td>
                    {row.payments.map((cents, seat) => (
                      <td key={seat} className={seat === view.you ? 'ist-du' : undefined}>
                        <Amount cents={cents} />
                        <span className="abend__stand">
                          <Amount cents={row.balances[seat]!} />
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={2}>
                  {T.standRow}
                </th>
                {view.balances.map((cents, seat) => (
                  <td key={seat} className={seat === view.you ? 'ist-du' : undefined}>
                    <Amount cents={cents} />
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <section className="abrechnung" aria-labelledby="abrechnung-titel">
        <h3 id="abrechnung-titel" className="abrechnung__titel">
          {T.settleTitle}
        </h3>
        {view.pot > 0 && (
          <p className="abrechnung__pott">
            {evenly
              ? T.settleRefund(plainMoney(view.pot), plainMoney(view.pot / players))
              : T.settleRefundCents(plainMoney(view.pot))}
          </p>
        )}
        {settlement.transfers.length === 0 ? (
          <p className="abrechnung__leer">{T.settleEven}</p>
        ) : (
          <ul className="abrechnung__liste">
            {settlement.transfers.map((t) => (
              <li
                key={`${t.from}-${t.to}`}
                className={t.from === view.you || t.to === view.you ? 'ist-du' : undefined}
              >
                <span>{T.settlePays(seats.nameOf(t.from), seats.nameOf(t.to))}</span>
                <span className="num">{plainMoney(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Dialog>
  );
}
