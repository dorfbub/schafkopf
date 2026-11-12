import {
  type BidCall,
  type BidLevel,
  type Contract,
  type ContractKind,
  type HandView,
  type Suit,
  type TableView,
  BID_ORDER,
  MODES,
  SUITS,
  rankOf,
  sameContract,
  suitOf,
} from '@schafkopf/core';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  KIND_NAME,
  SUIT_NAME,
  TABLE_TEXT,
  callLabel,
  contractLabel,
  levelLabel,
} from '../../i18n/de';
import { bayerischTheme } from '../cardTheme';
import { Button, Dialog } from '../kit';
import type { SeatInfo } from './layout';
import { lastCall } from './Seats';

interface Props {
  view: TableView;
  hand: HandView;
  seats: SeatInfo;
  onBid: (call: BidCall) => void;
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

/** Tout als Schalter in der Knopfzeile. */
function ToutSwitch({
  checked,
  enabled,
  onChange,
}: {
  checked: boolean;
  enabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className={`schalter${enabled ? '' : ' schalter--aus'}`}>
      <input
        type="checkbox"
        role="switch"
        className="schalter__eingabe"
        checked={checked}
        disabled={!enabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="schalter__bahn" aria-hidden="true" />
      <span>
        {TABLE_TEXT.bidTout} <span className="schalter__hinweis">{TABLE_TEXT.bidTouthint}</span>
      </span>
    </label>
  );
}

/** Wahl der Spielart; gesperrt ist, wofür `available` nichts hergibt. */
function KindChoice({
  view,
  kind,
  available,
  onChoose,
}: {
  view: TableView;
  kind: ContractKind | null;
  available: (k: ContractKind) => boolean;
  onChoose: (k: ContractKind) => void;
}) {
  const kinds = BID_ORDER.filter((k) => view.rules.contracts.includes(k));
  return (
    <fieldset className="ansage__gruppe">
      <legend className="ansage__label">{TABLE_TEXT.bidKind}</legend>
      <div className="ansage__wahl">
        {kinds.map((k) => (
          <Choice key={k} pressed={kind === k} disabled={!available(k)} onClick={() => onChoose(k)}>
            {KIND_NAME[k]}
          </Choice>
        ))}
      </div>
    </fieldset>
  );
}

/** Wahl einer Farbe (Rufsau bzw. Trumpf); gesperrt ist, wofür `available` nichts hergibt. */
function SuitChoice({
  legend,
  selected,
  available,
  onChoose,
}: {
  legend: string;
  selected: Suit | null;
  available: (s: Suit) => boolean;
  onChoose: (s: Suit) => void;
}) {
  return (
    <fieldset className="ansage__gruppe">
      <legend className="ansage__label">{legend}</legend>
      <div className="ansage__wahl">
        {SUITS.map((s) => (
          <Choice
            key={s}
            pressed={selected === s}
            disabled={!available(s)}
            onClick={() => onChoose(s)}
          >
            <span className="wahl__zeichen" aria-hidden="true">
              {bayerischTheme.suit(s)}
            </span>
            {SUIT_NAME[s]}
          </Choice>
        ))}
      </div>
    </fieldset>
  );
}

/** Anker für den Fokus: Beim Erscheinen springt er in den Dialog, aber nicht auf einen Knopf. */
function FocusAnchor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return <div ref={ref} tabIndex={-1} className="ansage__anker" />;
}

/**
 * Ansage-Dialog, je nach Stufe (docs/REGELN.md, „Ansage“):
 * „Ich würde“/„weiter“ → Zweikampf (Spielart nennen bzw. „ich auch“/„gut“) → Spiel nennen.
 * Angeboten wird nur, was `legalCalls` erlaubt; der Rest ist gesperrt.
 */
export function BidDialog({ view, hand, seats, onBid }: Props) {
  const { stage, holder, challenger, level } = hand.auction;

  // Wer hat zuletzt was gesagt, wer kommt in der ersten Runde noch?
  const order = Array.from(
    { length: seats.players },
    (_, i) => (hand.dealer + 1 + i) % seats.players,
  );
  const said = order.flatMap((s) => {
    const call = s === view.you ? null : lastCall(hand, s);
    return call ? [TABLE_TEXT.bidSaid(seats.nameOf(s), callLabel(call))] : [];
  });
  const open =
    stage === 'interest'
      ? order
          .slice(order.indexOf(view.you ?? 0) + 1)
          .filter((s) => lastCall(hand, s) === null)
          .map(seats.nameOf)
      : [];
  const status = TABLE_TEXT.bidStatus(said, open);
  const statusLine = status && <span className="ansage__status">{status}</span>;

  if (stage === 'interest') return <InterestStep hand={hand} status={statusLine} onBid={onBid} />;
  if (stage === 'duel' && view.you === holder) {
    return (
      <HoldStep
        hand={hand}
        name={seats.nameOf(challenger!)}
        level={level!}
        status={statusLine}
        onBid={onBid}
      />
    );
  }
  if (stage === 'duel') {
    return (
      <NameStep
        view={view}
        hand={hand}
        name={seats.nameOf(holder!)}
        level={level}
        status={statusLine}
        onBid={onBid}
      />
    );
  }
  return <DeclareStep view={view} hand={hand} level={level} status={statusLine} onBid={onBid} />;
}

interface StepProps {
  hand: HandView;
  status: ReactNode;
  onBid: (call: BidCall) => void;
}

/** Stufe 1: „Ich würde“ oder „weiter“. */
function InterestStep({ hand, status, onBid }: StepProps) {
  const canPlay = hand.legalCalls.some((c) => c.type === 'interest');
  return (
    <Dialog
      className="ansage"
      title={TABLE_TEXT.interestTitle}
      hint={status}
      actions={
        <>
          <Button variant="secondary" onClick={() => onBid({ type: 'pass' })}>
            {TABLE_TEXT.bidPass}
          </Button>
          <Button disabled={!canPlay} onClick={() => onBid({ type: 'interest' })}>
            {TABLE_TEXT.interestYes}
          </Button>
        </>
      }
    >
      <FocusAnchor />
      <p className="ansage__text">{TABLE_TEXT.interestBody}</p>
    </Dialog>
  );
}

/** Zweikampf, man hält: „ich auch“ oder „gut“. */
function HoldStep({
  hand,
  name,
  level,
  status,
  onBid,
}: StepProps & { name: string; level: BidLevel }) {
  const canHold = hand.legalCalls.some((c) => c.type === 'hold');
  return (
    <Dialog
      className="ansage"
      title={TABLE_TEXT.holdTitle(name, levelLabel(level))}
      hint={status}
      actions={
        <>
          <Button variant="secondary" onClick={() => onBid({ type: 'yield' })}>
            {TABLE_TEXT.holdNo}
          </Button>
          <Button disabled={!canHold} onClick={() => onBid({ type: 'hold' })}>
            {TABLE_TEXT.holdYes}
          </Button>
        </>
      }
    >
      <FocusAnchor />
      <p className="ansage__text">{TABLE_TEXT.holdBody(levelLabel(level))}</p>
    </Dialog>
  );
}

/** Zweikampf, man fordert: eine Spielart nennen (ohne Farbe) oder aufgeben. */
function NameStep({
  view,
  hand,
  name,
  level,
  status,
  onBid,
}: StepProps & { view: TableView; name: string; level: BidLevel | null }) {
  const levels = hand.legalCalls.flatMap((c) => (c.type === 'name' ? [c.level] : []));
  const [kind, setKind] = useState<ContractKind | null>(null);
  const [tout, setTout] = useState(false);
  const find = (k: ContractKind, t: boolean) =>
    levels.find((l) => l.kind === k && Boolean(l.tout) === t);

  const chooseKind = (k: ContractKind) => {
    setKind(k);
    // Geht die Spielart nur noch als Tout, ist Tout gleich eingeschaltet.
    if (!find(k, false)) setTout(true);
    else if (tout && !find(k, true)) setTout(false);
  };

  const chosen = kind ? find(kind, tout) : undefined;
  const toutPossible =
    kind !== null && find(kind, true) !== undefined && find(kind, false) !== undefined;
  const anyTout = levels.some((l) => l.tout);

  return (
    <Dialog
      className="ansage"
      title={TABLE_TEXT.duelTitle(name)}
      hint={
        <>
          {status}
          <strong className="ansage__hoechste">
            {level ? TABLE_TEXT.duelHintLevel(name, levelLabel(level)) : TABLE_TEXT.duelHint(name)}
          </strong>
        </>
      }
      actions={
        <>
          {anyTout && <ToutSwitch checked={tout} enabled={toutPossible} onChange={setTout} />}
          <Button variant="secondary" onClick={() => onBid({ type: 'yield' })}>
            {TABLE_TEXT.duelYield}
          </Button>
          <Button
            disabled={!chosen}
            onClick={() => chosen && onBid({ type: 'name', level: chosen })}
          >
            {chosen ? TABLE_TEXT.duelName(levelLabel(chosen)) : TABLE_TEXT.bidChoose}
          </Button>
        </>
      }
    >
      <FocusAnchor />
      {levels.length === 0 ? (
        <p className="ansage__nichts">{TABLE_TEXT.bidNothing}</p>
      ) : (
        <KindChoice
          view={view}
          kind={kind}
          available={(k) => levels.some((l) => l.kind === k)}
          onChoose={chooseKind}
        />
      )}
    </Dialog>
  );
}

/** Stufe 3: das genaue Spiel nennen – erst Spielart, dann (falls nötig) Farbe, Tout als Schalter. */
function DeclareStep({
  view,
  hand,
  level,
  status,
  onBid,
}: StepProps & { view: TableView; level: BidLevel | null }) {
  const legal = hand.legalCalls.flatMap((c) => (c.type === 'declare' ? [c.contract] : []));
  // Muss: nur Sauspiel ist möglich – gleich vorwählen, die Farbe auch, wenn es nur eine gibt.
  const forcedSuits = hand.auction.forced ? [...new Set(legal.map((c) => c.suit))] : [];
  const [kind, setKind] = useState<ContractKind | null>(hand.auction.forced ? 'sauspiel' : null);
  const [suit, setSuit] = useState<Suit | null>(
    forcedSuits.length === 1 ? (forcedSuits[0] ?? null) : null,
  );
  // Zweite Trumpffarbe (Hawaii-Habicht, `suitCount: 2`): eigener Schritt nach der ersten.
  const [suit2, setSuit2] = useState<Suit | null>(null);
  const [tout, setTout] = useState(false);

  const needsSuit = kind !== null && MODES[kind].suitRole !== 'none';
  const needsSuit2 = kind !== null && MODES[kind].suitCount === 2;
  const legalFor = (k: ContractKind, s: Suit | null, t?: boolean, s2: Suit | null = null) =>
    legal.filter(
      (c) =>
        c.kind === k &&
        (s === null || c.suit === s) &&
        (s2 === null || c.suit2 === s2) &&
        (t === undefined || Boolean(c.tout) === t),
    );

  const chooseKind = (k: ContractKind) => {
    setKind(k);
    const suits = SUITS.filter((s) => legalFor(k, s).length > 0);
    const keep = suit !== null && suits.includes(suit);
    const nextSuit =
      MODES[k].suitRole === 'none' ? null : keep ? suit : suits.length === 1 ? suits[0]! : null;
    setSuit(nextSuit);
    const nextSuit2 = MODES[k].suitCount === 2 && suit2 !== nextSuit ? suit2 : null;
    setSuit2(nextSuit2);
    // Geht die Spielart nur als Tout (sie liegt unter dem Gehaltenen), ist Tout gleich an.
    if (legalFor(k, null, false).length === 0) setTout(true);
    else if (tout && legalFor(k, nextSuit, true, nextSuit2).length === 0) setTout(false);
  };

  const chooseSuit = (s: Suit) => {
    setSuit(s);
    // Beide Farben müssen verschieden sein.
    const nextSuit2 = suit2 === s ? null : suit2;
    setSuit2(nextSuit2);
    if (kind && tout && legalFor(kind, s, true, nextSuit2).length === 0) setTout(false);
  };

  const chooseSuit2 = (s: Suit) => {
    setSuit2(s);
    if (kind && tout && legalFor(kind, suit, true, s).length === 0) setTout(false);
  };

  const suitFilter = needsSuit ? suit : null;
  const suit2Filter = needsSuit2 ? suit2 : null;
  const toutPossible =
    kind !== null &&
    legalFor(kind, suitFilter, true, suit2Filter).length > 0 &&
    legalFor(kind, suitFilter, false, suit2Filter).length > 0;
  const anyTout = legal.some((c) => c.tout);
  const chosen: Contract | undefined =
    kind && (!needsSuit || suit) && (!needsSuit2 || suit2)
      ? legal.find((c) =>
          sameContract(c, {
            kind,
            ...(suit && needsSuit ? { suit } : {}),
            ...(suit2 && needsSuit2 ? { suit2 } : {}),
            tout,
          }),
        )
      : undefined;
  // Muss: gesperrt, wenn eine rufbare Sau dabei ist, von deren Farbe er keine Karte hat.
  const forced = hand.auction.forced;
  const blocked =
    forced &&
    legal.some(
      (c) => !hand.hand.some((h) => suitOf(h) === c.suit && rankOf(h) !== 'O' && rankOf(h) !== 'U'),
    );

  return (
    <Dialog
      className="ansage"
      title={forced ? TABLE_TEXT.mussTitle : TABLE_TEXT.bidTitle}
      hint={
        <>
          {status}
          {forced && <strong className="ansage__hoechste">{TABLE_TEXT.mussBody}</strong>}
          {level && (
            <strong className="ansage__hoechste">{TABLE_TEXT.bidMinimum(levelLabel(level))}</strong>
          )}
        </>
      }
      actions={
        <>
          {anyTout && <ToutSwitch checked={tout} enabled={toutPossible} onChange={setTout} />}
          <Button
            disabled={!chosen}
            onClick={() => chosen && onBid({ type: 'declare', contract: chosen })}
          >
            {chosen ? TABLE_TEXT.bidAnnounce(contractLabel(chosen)) : TABLE_TEXT.bidChoose}
          </Button>
        </>
      }
    >
      <FocusAnchor />
      {blocked && <p className="ansage__text">{TABLE_TEXT.mussBlocked}</p>}
      <KindChoice
        view={view}
        kind={kind}
        available={(k) => legalFor(k, null).length > 0}
        onChoose={chooseKind}
      />
      {needsSuit && (
        <SuitChoice
          legend={
            needsSuit2
              ? TABLE_TEXT.bidSuitTrumpFirst
              : MODES[kind].suitRole === 'called'
                ? TABLE_TEXT.bidSuitCalled
                : TABLE_TEXT.bidSuitTrump
          }
          selected={suit}
          available={(s) => legalFor(kind, s).length > 0}
          onChoose={chooseSuit}
        />
      )}
      {needsSuit2 && suit && (
        <SuitChoice
          legend={TABLE_TEXT.bidSuitTrumpSecond}
          selected={suit2}
          available={(s) => s !== suit && legalFor(kind, suit, undefined, s).length > 0}
          onChoose={chooseSuit2}
        />
      )}
    </Dialog>
  );
}
