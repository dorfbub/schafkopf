import {
  type Card,
  type Contract,
  type HandView,
  type Seat,
  type TableView,
  SUITS,
  orderFor,
  rankOf,
  sameContract,
  suitOf,
} from '@schafkopf/core';
import type { ClientSession, HostSession } from '@schafkopf/net';
import { useState } from 'react';
import { contractLabel, money } from '../i18n/de';
import { CardBack, CardView } from './CardView';

interface Props {
  view: TableView;
  client: ClientSession;
  host: HostSession | null;
  onLeave: () => void;
}

/** Position am Bildschirm relativ zum eigenen Platz; gespielt wird im Uhrzeigersinn. */
const POSITIONS = ['bottom', 'left', 'top', 'right'] as const;

/** Sortiert die Hand: Trümpfe zuerst (hoch → niedrig), dann die Farben. */
function sortHand(hand: readonly Card[], contract: Contract | null): Card[] {
  const order = orderFor(contract ?? { kind: 'sauspiel', suit: 'eichel' });
  const key = (c: Card) => {
    const trump = order.trumps.indexOf(c);
    if (trump >= 0) return trump;
    return 100 + SUITS.indexOf(suitOf(c)) * 10 + order.rankOrder.indexOf(rankOf(c));
  };
  return [...hand].sort((a, b) => key(a) - key(b));
}

export function Table({ view, client, host, onLeave }: Props) {
  const hand = view.hand!;
  const players = view.seats.length;
  const me = view.you ?? 0;
  const position = (seat: Seat) => POSITIONS[(seat - me + players) % players]!;
  const nameOf = (seat: Seat) => view.seats[seat]?.name ?? `Platz ${seat + 1}`;
  const myTurn = view.you !== null && hand.turn === view.you && hand.phase !== 'finished';

  // Solange noch niemand zum nächsten Stich ausgespielt hat, bleibt der letzte Stich liegen.
  const showLast = hand.currentTrick.cards.length === 0 && hand.lastTrick !== null;
  const trick = showLast ? hand.lastTrick! : hand.currentTrick;

  return (
    <main className="table">
      <header className="table__bar">
        <span>Spiel {view.handNo}</span>
        <strong>
          {hand.contract && hand.declarer !== null
            ? `${nameOf(hand.declarer)}: ${contractLabel(hand.contract)}`
            : hand.phase === 'bidding'
              ? 'Ansage'
              : ''}
        </strong>
        <button type="button" className="secondary" onClick={onLeave}>
          Verlassen
        </button>
      </header>

      <div className="table__felt">
        {view.seats.map((player, seat) => {
          if (seat === view.you) return null;
          const bid = hand.bids.find((b) => b.seat === seat);
          return (
            <div
              key={seat}
              className={`seat seat--${position(seat)}${hand.turn === seat && hand.phase !== 'finished' ? ' seat--turn' : ''}`}
            >
              <span className="seat__name">
                {nameOf(seat)}
                {seat === hand.dealer && ' · Geber'}
                {player && !player.connected && ' · getrennt'}
              </span>
              <span className="seat__info">
                {hand.handSizes[seat]} Karten · {hand.tricksWon[seat]} Stiche ·{' '}
                {money(view.balances[seat]!)}
              </span>
              {hand.phase === 'bidding' && bid && (
                <span className="seat__bid">
                  {bid.contract ? contractLabel(bid.contract) : 'weiter'}
                </span>
              )}
              {hand.partner === seat && <span className="seat__bid">Mitspieler</span>}
              <span className="seat__cards" aria-hidden="true">
                {Array.from({ length: Math.min(hand.handSizes[seat]!, 8) }, (_, i) => (
                  <CardBack key={i} />
                ))}
              </span>
            </div>
          );
        })}

        <div className="trick" aria-label="Stich">
          {trick.cards.map((card, i) => {
            const seat = (trick.leader + i) % players;
            const won = showLast && hand.lastTrick!.winner === seat;
            return (
              <div
                key={card}
                className={`trick__card trick__card--${position(seat)}${won ? ' trick__card--won' : ''}`}
              >
                <CardView card={card} state={won ? 'won' : undefined} />
              </div>
            );
          })}
        </div>

        {hand.phase === 'bidding' && myTurn && (
          <BidPanel options={hand.legalContracts} onBid={(contract) => client.bid(contract)} />
        )}
        {hand.phase === 'finished' && (
          <ResultPanel
            view={view}
            hand={hand}
            nameOf={nameOf}
            onNext={host ? () => host.nextHand() : null}
          />
        )}
      </div>

      <footer className={`own${myTurn ? ' own--turn' : ''}`}>
        <div className="own__info">
          {view.you === null ? (
            'Du schaust zu'
          ) : (
            <>
              {nameOf(view.you)}
              {view.you === hand.dealer && ' · Geber'} · {hand.tricksWon[view.you]} Stiche ·{' '}
              {money(view.balances[view.you]!)}
              {myTurn && <strong> · Du bist dran</strong>}
            </>
          )}
        </div>
        <div className="own__hand">
          {sortHand(hand.hand, hand.contract).map((card) => {
            const legal = hand.legalCards.includes(card);
            return (
              <CardView
                key={card}
                card={card}
                state={hand.phase === 'playing' && myTurn && !legal ? 'locked' : undefined}
                onPlay={legal ? () => client.play(card) : undefined}
              />
            );
          })}
        </div>
      </footer>
    </main>
  );
}

function BidPanel({
  options,
  onBid,
}: {
  options: Contract[];
  onBid: (c: Contract | null) => void;
}) {
  const [tout, setTout] = useState(false);
  const hasTout = options.some((c) => c.tout);
  const shown = options.filter((c) => Boolean(c.tout) === tout);

  return (
    <div className="overlay">
      <h2>Was spielst du?</h2>
      <div className="bids">
        {shown.map((contract) => (
          <button
            key={contractLabel(contract)}
            type="button"
            onClick={() => onBid(options.find((c) => sameContract(c, contract))!)}
          >
            {contractLabel(contract)}
          </button>
        ))}
      </div>
      {shown.length === 0 && (
        <p className="hint">Mit diesem Blatt gibt es hier nichts anzusagen.</p>
      )}
      <div className="row">
        <button type="button" className="secondary" onClick={() => onBid(null)}>
          Weiter
        </button>
        {hasTout && (
          <label className="check">
            <input type="checkbox" checked={tout} onChange={(e) => setTout(e.target.checked)} />
            Tout
          </label>
        )}
      </div>
    </div>
  );
}

function ResultPanel({
  view,
  hand,
  nameOf,
  onNext,
}: {
  view: TableView;
  hand: HandView;
  nameOf: (seat: Seat) => string;
  onNext: (() => void) | null;
}) {
  const result = hand.result!;
  return (
    <div className="overlay">
      {result.kind === 'passed' ? (
        <h2>Alle weiter – es wird zusammengeworfen</h2>
      ) : (
        <>
          <h2>
            {result.party.map(nameOf).join(' und ')} {result.party.length > 1 ? 'haben' : 'hat'}{' '}
            {result.won ? 'gewonnen' : 'verloren'}
          </h2>
          <p>
            {contractLabel(result.contract)} · {result.partyPoints} Augen · {result.partyTricks}{' '}
            Stiche
            {result.sie && ' · Sie'}
            {result.schneider && !result.schwarz && ' · Schneider'}
            {result.schwarz && ' · Schwarz'}
            {result.laufende > 0 && ` · ${result.laufende} Laufende`}
          </p>
        </>
      )}
      <table className="scores">
        <thead>
          <tr>
            <th>Spieler</th>
            <th>Dieses Spiel</th>
            <th>Stand</th>
          </tr>
        </thead>
        <tbody>
          {view.seats.map((_, seat) => (
            <tr key={seat}>
              <td>{nameOf(seat)}</td>
              <td>{money(result.payments[seat]!)}</td>
              <td>{money(view.balances[seat]!)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {onNext ? (
        <button type="button" onClick={onNext}>
          Nächstes Spiel
        </button>
      ) : (
        <p className="hint">Der Gastgeber gibt das nächste Spiel.</p>
      )}
    </div>
  );
}
