import { describe, expect, it } from 'vitest';
import {
  type Card,
  createDeck,
  createRng,
  followable,
  orderFor,
  shuffle,
  sumPoints,
  trickWinnerIndex,
} from '../src';

describe('Blatt', () => {
  it('lange Karte hat 32 verschiedene Karten und 120 Augen', () => {
    const deck = createDeck('lang');
    expect(deck).toHaveLength(32);
    expect(new Set(deck).size).toBe(32);
    expect(sumPoints(deck)).toBe(120);
  });

  it('kurze Karte hat 24 Karten ohne 7er und 8er', () => {
    const deck = createDeck('kurz');
    expect(deck).toHaveLength(24);
    expect(deck.some((c) => c.endsWith('7') || c.endsWith('8'))).toBe(false);
    expect(sumPoints(deck)).toBe(120);
  });

  it('mischt mit gleichem Seed gleich, mit anderem Seed anders', () => {
    const deck = createDeck('lang');
    expect(shuffle(deck, createRng(42))).toEqual(shuffle(deck, createRng(42)));
    expect(shuffle(deck, createRng(42))).not.toEqual(shuffle(deck, createRng(43)));
  });
});

describe('Stichgewinner', () => {
  const sauspiel = orderFor({ kind: 'sauspiel', suit: 'eichel' }, 0);
  const wenz = orderFor({ kind: 'wenz' }, 0);
  const bettel = orderFor({ kind: 'bettel' }, 0);

  const cases: [string, typeof sauspiel, Card[], number][] = [
    ['höchste Farbkarte gewinnt', sauspiel, ['E9', 'EA', 'E10', 'EK'], 1],
    ['Zehner sticht König', sauspiel, ['GK', 'G10', 'G7', 'G8'], 1],
    ['Trumpf sticht Farbe', sauspiel, ['EA', 'H7', 'E10', 'EK'], 1],
    ['Ober sticht Unter', sauspiel, ['EU', 'SO', 'HA', 'GU'], 1],
    ['Eichel-Ober ist der höchste Trumpf', sauspiel, ['GO', 'HO', 'EO', 'SO'], 2],
    ['Eichel-Unter sticht Gras-Unter', sauspiel, ['GU', 'EU', 'HA', 'H10'], 1],
    ['abgeworfene Fremdfarbe sticht nie', sauspiel, ['S7', 'EA', 'GA', 'G10'], 0],
    ['im Wenz ist der Ober keine Trumpfkarte', wenz, ['EK', 'EO', 'E9', 'E7'], 0],
    ['im Wenz sticht der Unter', wenz, ['EA', 'SU', 'EO', 'E10'], 1],
    ['im Wenz ist Herz normale Farbe', wenz, ['EA', 'HA', 'E10', 'EK'], 0],
    ['im Bettel liegt der Zehner unter dem Unter', bettel, ['E10', 'EU', 'E9', 'E7'], 1],
  ];

  it.each(cases)('%s', (_name, order, cards, winner) => {
    expect(trickWinnerIndex(cards, order)).toBe(winner);
  });
});

describe('Bedienpflicht', () => {
  const order = orderFor({ kind: 'sauspiel', suit: 'gras' }, 0);
  const hand: Card[] = ['EO', 'HK', 'EA', 'E7', 'S9'];

  it('beim Anspielen ist alles erlaubt', () => {
    expect(followable(hand, [], order)).toEqual(hand);
  });

  it('Farbe muss bedient werden – der Ober zählt nicht zur Farbe', () => {
    expect(followable(hand, ['E10'], order)).toEqual(['EA', 'E7']);
  });

  it('Trumpf muss mit Trumpf bedient werden (Ober und Herz)', () => {
    expect(followable(hand, ['SU'], order)).toEqual(['EO', 'HK']);
  });

  it('wer nicht bedienen kann, ist frei', () => {
    expect(followable(hand, ['G9'], order)).toEqual(hand);
  });
});
