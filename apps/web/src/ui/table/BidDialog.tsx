import {
  type Contract,
  type ContractKind,
  type HandView,
  type Suit,
  type TableView,
  CONTRACT_KINDS,
  MODES,
  SUITS,
  bidValue,
  sameContract,
} from '@schafkopf/core';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { KIND_NAME, SUIT_NAME, TABLE_TEXT, contractLabel } from '../../i18n/de';
import { bayerischTheme } from '../cardTheme';
import { Button, Dialog } from '../kit';
import type { SeatInfo } from './layout';
import { bidText } from './Seats';

interface Props {
  view: TableView;
  hand: HandView;
  seats: SeatInfo;
  onBid: (contract: Contract | null) => void;
}

/** Wahlknopf im Dialog: gedrückt = gewählt. */
function Choice({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="wahl"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * Ansage-Dialog: erst die Spielart, dann (falls nötig) die Farbe, Tout als Schalter.
 * Angeboten wird nur, was `legalContracts` erlaubt; der Rest ist gesperrt.
 */
export function BidDialog({ view, hand, seats, onBid }: Props) {
  const legal = hand.legalContracts;
  const [kind, setKind] = useState<ContractKind | null>(null);
  const [suit, setSuit] = useState<Suit | null>(null);
  const [tout, setTout] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);

  // Wenn man dran ist, springt der Fokus in den Dialog (aber nicht auf einen Knopf).
  useEffect(() => titleRef.current?.focus(), []);

  const kinds = CONTRACT_KINDS.filter((k) => view.rules.contracts.includes(k));
  const needsSuit = kind !== null && MODES[kind].suitRole !== 'none';
  const legalFor = (k: ContractKind, s: Suit | null, t?: boolean) =>
    legal.filter(
      (c) =>
        c.kind === k && (s === null || c.suit === s) && (t === undefined || Boolean(c.tout) === t),
    );

  const chooseKind = (k: ContractKind) => {
    setKind(k);
    const suits = SUITS.filter((s) => legalFor(k, s).length > 0);
    const keep = suit !== null && suits.includes(suit);
    const nextSuit =
      MODES[k].suitRole === 'none' ? null : keep ? suit : suits.length === 1 ? suits[0]! : null;
    setSuit(nextSuit);
    if (tout && legalFor(k, nextSuit, true).length === 0) setTout(false);
  };

  const chooseSuit = (s: Suit) => {
    setSuit(s);
    if (kind && tout && legalFor(kind, s, true).length === 0) setTout(false);
  };

  const toutPossible = kind !== null && legalFor(kind, needsSuit ? suit : null, true).length > 0;
  const anyTout = legal.some((c) => c.tout);
  const chosen: Contract | undefined =
    kind && (!needsSuit || suit)
      ? legal.find((c) => sameContract(c, { kind, ...(suit && needsSuit ? { suit } : {}), tout }))
      : undefined;

  // Wer hat schon was gesagt, wer kommt noch?
  const order = Array.from(
    { length: seats.players },
    (_, i) => (hand.dealer + 1 + i) % seats.players,
  );
  const said = order
    .filter((s) => s !== view.you && bidText(hand, s) !== null)
    .map((s) => TABLE_TEXT.bidSaid(seats.nameOf(s), bidText(hand, s)!));
  const open = order
    .slice(order.indexOf(view.you ?? 0) + 1)
    .filter((s) => bidText(hand, s) === null)
    .map(seats.nameOf);
  const highest = hand.bids
    .filter((b) => b.contract)
    .reduce<Contract | null>(
      (best, b) => (!best || bidValue(b.contract!) > bidValue(best) ? b.contract : best),
      null,
    );

  const status = TABLE_TEXT.bidStatus(said, open);

  return (
    <Dialog
      className="ansage"
      title={TABLE_TEXT.bidTitle}
      hint={
        <>
          {status && <span className="ansage__status">{status}</span>}
          {highest && (
            <strong className="ansage__hoechste">
              {TABLE_TEXT.bidToBeat(contractLabel(highest))}
            </strong>
          )}
        </>
      }
      actions={
        <>
          {anyTout && legal.length > 0 && (
            <label className={`schalter${toutPossible ? '' : ' schalter--aus'}`}>
              <input
                type="checkbox"
                role="switch"
                className="schalter__eingabe"
                checked={tout}
                disabled={!toutPossible}
                onChange={(e) => setTout(e.target.checked)}
              />
              <span className="schalter__bahn" aria-hidden="true" />
              <span>
                {TABLE_TEXT.bidTout}{' '}
                <span className="schalter__hinweis">{TABLE_TEXT.bidTouthint}</span>
              </span>
            </label>
          )}
          <Button variant="secondary" onClick={() => onBid(null)}>
            {TABLE_TEXT.bidPass}
          </Button>
          <Button disabled={!chosen} onClick={() => chosen && onBid(chosen)}>
            {chosen ? TABLE_TEXT.bidAnnounce(contractLabel(chosen)) : TABLE_TEXT.bidChoose}
          </Button>
        </>
      }
    >
      <div ref={titleRef} tabIndex={-1} className="ansage__anker" />
      {legal.length === 0 ? (
        <p className="ansage__nichts">{TABLE_TEXT.bidNothing}</p>
      ) : (
        <>
          <fieldset className="ansage__gruppe">
            <legend className="ansage__label">{TABLE_TEXT.bidKind}</legend>
            <div className="ansage__wahl">
              {kinds.map((k) => (
                <Choice
                  key={k}
                  pressed={kind === k}
                  disabled={legalFor(k, null).length === 0}
                  onClick={() => chooseKind(k)}
                >
                  {KIND_NAME[k]}
                </Choice>
              ))}
            </div>
          </fieldset>
          {needsSuit && (
            <fieldset className="ansage__gruppe">
              <legend className="ansage__label">
                {MODES[kind].suitRole === 'called'
                  ? TABLE_TEXT.bidSuitCalled
                  : TABLE_TEXT.bidSuitTrump}
              </legend>
              <div className="ansage__wahl">
                {SUITS.map((s) => (
                  <Choice
                    key={s}
                    pressed={suit === s}
                    disabled={legalFor(kind, s).length === 0}
                    onClick={() => chooseSuit(s)}
                  >
                    <span className="wahl__zeichen" aria-hidden="true">
                      {bayerischTheme.suit(s)}
                    </span>
                    {SUIT_NAME[s]}
                  </Choice>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}
    </Dialog>
  );
}
