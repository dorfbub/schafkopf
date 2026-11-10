import { describe, expect, it } from 'vitest';
import {
  type Card,
  type CompletedTrick,
  type Contract,
  type HandState,
  type Seat,
  DEFAULT_RULES,
  MODES,
  countLaufende,
  dealHand,
  scoreHand,
} from '../src';

/**
 * Baut ein fertig gespieltes Spiel direkt aus dem gewünschten Ergebnis:
 * Die Spielerpartei bekommt `partyTricks` Stiche mit zusammen `partyPoints` Augen.
 * (Die Stichkarten selbst sind für die Abrechnung egal.)
 */
function finished(options: {
  contract: Contract;
  declarer: Seat;
  partner?: Seat;
  partyPoints: number;
  partyTricks: number;
  initialHands?: Card[][];
}): HandState {
  const base = dealHand(DEFAULT_RULES, 3, 7);
  const opponent = [0, 1, 2, 3].find((s) => s !== options.declarer && s !== options.partner)!;
  const tricks: CompletedTrick[] = Array.from({ length: 8 }, (_, i) => {
    const forParty = i < options.partyTricks;
    const points = forParty
      ? i === 0
        ? options.partyPoints
        : 0
      : i === options.partyTricks
        ? 120 - options.partyPoints
        : 0;
    return { leader: 0, cards: [], winner: forParty ? options.declarer : opponent, points };
  });
  // Standard-Hände ohne Laufende: Die höchsten Trümpfe sind auf beide Parteien verteilt.
  const neutral: Card[][] = [
    ['EO', 'HO', 'EU', 'HU'],
    ['GO', 'SO', 'GU', 'SU'],
    ['EA', 'GA', 'HA', 'SA'],
    ['E10', 'G10', 'H10', 'S10'],
  ];
  return {
    ...base,
    phase: 'finished',
    contract: options.contract,
    declarer: options.declarer,
    partner: options.partner ?? null,
    initialHands: options.initialHands ?? neutral,
    hands: [[], [], [], []],
    tricks,
  };
}

function played(state: HandState) {
  const result = scoreHand(state);
  if (result.kind !== 'played') throw new Error('nicht gespielt');
  return result;
}

const SAUSPIEL: Contract = { kind: 'sauspiel', suit: 'gras' };
const SOLO: Contract = { kind: 'solo', suit: 'herz' };

describe('Abrechnung Sauspiel', () => {
  it('61 Augen gewinnen einfach: 10 von jedem Gegner an jeden Spieler', () => {
    const r = played(
      finished({ contract: SAUSPIEL, declarer: 0, partner: 2, partyPoints: 61, partyTricks: 4 }),
    );
    expect(r).toMatchObject({ won: true, schneider: false, schwarz: false, value: 10 });
    expect(r.payments).toEqual([10, -10, 10, -10]);
  });

  it('60 Augen verlieren', () => {
    const r = played(
      finished({ contract: SAUSPIEL, declarer: 0, partner: 2, partyPoints: 60, partyTricks: 4 }),
    );
    expect(r).toMatchObject({ won: false, schneider: false, value: 10 });
    expect(r.payments).toEqual([-10, 10, -10, 10]);
  });

  it('Gegner mit 29 Augen sind Schneider, mit 30 Schneider frei', () => {
    const s = (points: number) =>
      played(
        finished({
          contract: SAUSPIEL,
          declarer: 0,
          partner: 2,
          partyPoints: points,
          partyTricks: 6,
        }),
      );
    expect(s(91)).toMatchObject({ won: true, schneider: true, value: 20 });
    expect(s(90)).toMatchObject({ won: true, schneider: false, value: 10 });
  });

  it('Spieler mit 30 Augen sind Schneider, mit 31 Schneider frei', () => {
    const s = (points: number) =>
      played(
        finished({
          contract: SAUSPIEL,
          declarer: 0,
          partner: 2,
          partyPoints: points,
          partyTricks: 2,
        }),
      );
    expect(s(30)).toMatchObject({ won: false, schneider: true, value: 20 });
    expect(s(31)).toMatchObject({ won: false, schneider: false, value: 10 });
  });

  it('Schwarz zählt Schneider mit', () => {
    const r = played(
      finished({ contract: SAUSPIEL, declarer: 0, partner: 2, partyPoints: 120, partyTricks: 8 }),
    );
    expect(r).toMatchObject({ won: true, schneider: true, schwarz: true, value: 30 });
  });
});

describe('Abrechnung Einzelspiele', () => {
  it('Solo gewonnen: 50 von jedem der drei Gegner', () => {
    const r = played(finished({ contract: SOLO, declarer: 1, partyPoints: 70, partyTricks: 5 }));
    expect(r.payments).toEqual([-50, 150, -50, -50]);
  });

  it('Solo verloren: 50 an jeden der drei Gegner', () => {
    const r = played(finished({ contract: SOLO, declarer: 1, partyPoints: 50, partyTricks: 3 }));
    expect(r.payments).toEqual([50, -150, 50, 50]);
  });

  it('Tout zählt doppelt und ist nur mit allen Stichen gewonnen', () => {
    const tout: Contract = { ...SOLO, tout: true };
    const won = played(finished({ contract: tout, declarer: 0, partyPoints: 120, partyTricks: 8 }));
    expect(won).toMatchObject({ won: true, value: 100, schneider: false, schwarz: false });
    const lost = played(
      finished({ contract: tout, declarer: 0, partyPoints: 110, partyTricks: 7 }),
    );
    expect(lost).toMatchObject({ won: false, value: 100 });
    expect(lost.payments).toEqual([-300, 100, 100, 100]);
  });

  it('Bettel ist gewonnen, wenn der Spieler keinen Stich macht', () => {
    const bettel: Contract = { kind: 'bettel' };
    expect(
      played(finished({ contract: bettel, declarer: 0, partyPoints: 0, partyTricks: 0 })),
    ).toMatchObject({
      won: true,
      value: 50,
    });
    expect(
      played(finished({ contract: bettel, declarer: 0, partyPoints: 0, partyTricks: 1 })),
    ).toMatchObject({
      won: false,
      value: 50,
    });
  });

  it('Sie: alle Ober und Unter auf einer Hand zählt vierfach', () => {
    const hands: Card[][] = [
      ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HU', 'SU'],
      ['EA', 'GA', 'HA', 'SA', 'E10', 'G10', 'H10', 'S10'],
      ['EK', 'GK', 'HK', 'SK', 'E9', 'G9', 'H9', 'S9'],
      ['E8', 'G8', 'H8', 'S8', 'E7', 'G7', 'H7', 'S7'],
    ];
    const r = played(
      finished({
        contract: SOLO,
        declarer: 0,
        partyPoints: 120,
        partyTricks: 8,
        initialHands: hands,
      }),
    );
    expect(r).toMatchObject({ won: true, sie: true, value: 200 });
  });
});

describe('Laufende', () => {
  const trumps = MODES.sauspiel.trumps(SAUSPIEL);
  const hands = (a: Card[], b: Card[]): Card[][] => [a, b, [], []];

  it('zählt die höchsten Trümpfe in ununterbrochener Folge bei einer Partei', () => {
    expect(countLaufende(trumps, hands(['EO', 'GO', 'HO'], ['SO']), [0])).toBe(3);
    expect(countLaufende(trumps, hands(['EO', 'HO'], ['GO']), [0])).toBe(1);
  });

  it('zählt auch für die Gegenpartei', () => {
    expect(countLaufende(trumps, hands(['SO'], ['EO', 'GO', 'HO']), [0])).toBe(3);
  });

  it('Partner zählen zusammen', () => {
    expect(countLaufende(trumps, [['EO', 'HO'], ['SO'], ['GO'], []], [0, 2])).toBe(3);
  });

  it('drei Laufende erhöhen den Spielwert, zwei nicht', () => {
    const withRun = (declarerHand: Card[], other: Card[]) =>
      played(
        finished({
          contract: SAUSPIEL,
          declarer: 0,
          partner: 2,
          partyPoints: 61,
          partyTricks: 4,
          initialHands: [declarerHand, other, [], []],
        }),
      );
    expect(withRun(['EO', 'GO', 'HO'], ['SO'])).toMatchObject({ laufende: 3, value: 40 });
    expect(withRun(['EO', 'GO'], ['HO'])).toMatchObject({ laufende: 0, value: 10 });
  });

  it('im Wenz zählen schon zwei Laufende', () => {
    const r = played(
      finished({
        contract: { kind: 'wenz' },
        declarer: 0,
        partyPoints: 61,
        partyTricks: 4,
        initialHands: [['EU', 'GU'], ['HU'], [], []],
      }),
    );
    expect(r).toMatchObject({ laufende: 2, value: 70 });
  });
});
