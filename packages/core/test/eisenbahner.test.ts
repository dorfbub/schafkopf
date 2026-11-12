import { describe, expect, it } from 'vitest';
import {
  type Card,
  type CompletedTrick,
  type Contract,
  type HandState,
  type RuleSet,
  DEFAULT_RULES,
  MODES,
  allContracts,
  allLevels,
  bidValue,
  dealHand,
  effectiveSuit,
  followable,
  orderFor,
  parseRuleOptions,
  scoreHand,
  trickWinnerIndex,
} from '../src';

const EISENBAHNER: Contract = { kind: 'eisenbahner' };
const AN: RuleSet = { ...DEFAULT_RULES, contracts: [...DEFAULT_RULES.contracts, 'eisenbahner'] };
const order = orderFor(EISENBAHNER, 0);

describe('Eisenbahner: Ordnung', () => {
  it('Trümpfe sind die vier Zehner: Eichel, Gras, Herz, Schellen', () => {
    expect(order.trumps).toEqual(['E10', 'G10', 'H10', 'S10']);
  });

  it('Zehner stechen in der Reihenfolge Eichel, Gras, Herz, Schellen', () => {
    expect(trickWinnerIndex(['S10', 'H10', 'G10', 'E10'], order)).toBe(3);
    expect(trickWinnerIndex(['S10', 'H10', 'G10', 'SA'], order)).toBe(2);
    expect(trickWinnerIndex(['SA', 'S10', 'EU', 'EO'], order)).toBe(1);
  });

  it('Farbkarten stechen A K O U 9 8 7 (der Zehner ist Trumpf, nicht Farbkarte)', () => {
    expect(trickWinnerIndex(['E7', 'E8', 'EU', 'E9'], order)).toBe(2);
    expect(trickWinnerIndex(['E7', 'EO', 'EK', 'EA'], order)).toBe(3);
    expect(trickWinnerIndex(['EK', 'EO', 'EU', 'E9'], order)).toBe(0);
    // Ober und Unter sind gewöhnliche Farbkarten
    expect(effectiveSuit('EO', order)).toBe('eichel');
    expect(effectiveSuit('GU', order)).toBe('gras');
  });

  it('Zehner sind eine eigene Farbe beim Bedienen', () => {
    const hand: Card[] = ['E10', 'EA', 'GA'];
    // Zehner angespielt: wer einen Zehner hat, muss ihn zugeben (auch nicht die Eichel-Sau)
    expect(followable(hand, ['H10'], order)).toEqual(['E10']);
    // Eichel angespielt: der Eichel-Zehner ist keine Eichel, nur die Sau darf zugegeben werden
    expect(followable(hand, ['E7'], order)).toEqual(['EA']);
    // Ohne Zehner darf bei angespieltem Zehner alles gespielt werden
    expect(followable(['EA', 'GA'], ['H10'], order)).toEqual(['EA', 'GA']);
  });
});

describe('Eisenbahner: Rang und Ansagbarkeit', () => {
  it('steht zwischen Bettel und Geier', () => {
    expect(bidValue({ kind: 'bettel' })).toBeLessThan(bidValue({ kind: 'eisenbahner' }));
    expect(bidValue({ kind: 'eisenbahner' })).toBeLessThan(bidValue({ kind: 'geier' }));
  });

  it('im Zweikampf schlägt er den Bettel und unterliegt dem Geier', () => {
    const levels = allLevels(AN).map((l) => l.kind);
    expect(levels.indexOf('eisenbahner')).toBeGreaterThan(levels.indexOf('bettel'));
    expect(levels.indexOf('eisenbahner')).toBeLessThan(levels.indexOf('geier'));
  });

  it('Eisenbahner Tout schlägt jedes Spiel ohne Tout, aber keinen höheren Tout', () => {
    expect(bidValue({ kind: 'eisenbahner', tout: true })).toBeGreaterThan(
      bidValue({ kind: 'solo' }),
    );
    expect(bidValue({ kind: 'eisenbahner', tout: true })).toBeLessThan(
      bidValue({ kind: 'geier', tout: true }),
    );
  });

  it('ist standardmäßig nicht ansagbar, mit der Option schon (auch als Tout)', () => {
    expect(allContracts(DEFAULT_RULES).some((c) => c.kind === 'eisenbahner')).toBe(false);
    expect(DEFAULT_RULES.contracts).not.toContain('eisenbahner');
    const an = allContracts(AN).filter((c) => c.kind === 'eisenbahner');
    expect(an).toEqual([{ kind: 'eisenbahner' }, { kind: 'eisenbahner', tout: true }]);
    expect(
      allContracts({ ...AN, allowTout: false }).filter((c) => c.kind === 'eisenbahner'),
    ).toEqual([{ kind: 'eisenbahner' }]);
  });

  it('Tischregeln mit Eisenbahner und Schwelle werden angenommen', () => {
    const raw = { ...AN, contracts: ['eisenbahner', 'sauspiel'] };
    expect(parseRuleOptions(raw)?.contracts).toEqual(['sauspiel', 'eisenbahner']);
    expect(parseRuleOptions({ ...AN, laufende: { ...AN.laufende, eisenbahner: 0 } })).toBeNull();
    const ohne: Record<string, number> = { ...AN.laufende };
    delete ohne.eisenbahner;
    expect(parseRuleOptions({ ...AN, laufende: ohne })).toBeNull();
  });

  it('ist ein Einzelspiel mit Tout, Laufenden und Solo-Tarif', () => {
    const m = MODES.eisenbahner;
    expect([m.parties, m.tariff, m.canTout, m.hasLaufende, m.goal]).toEqual([
      'alone',
      'solo',
      true,
      true,
      'points',
    ]);
  });
});

function finished(
  contract: Contract,
  initialHands: Card[][],
  points = 80,
  tricks = 4,
  rules: RuleSet = AN,
): HandState {
  const list: CompletedTrick[] = Array.from({ length: 8 }, (_, i) => ({
    leader: 0,
    cards: [],
    winner: i < tricks ? 0 : 1,
    points: i === 0 ? points : i === tricks ? 120 - points : 0,
  }));
  return {
    ...dealHand(rules, 3, 7),
    phase: 'finished',
    contract,
    declarer: 0,
    partner: null,
    initialHands,
    hands: [[], [], [], []],
    tricks: list,
  };
}

function value(state: HandState) {
  const r = scoreHand(state);
  if (r.kind !== 'played') throw new Error('nicht gespielt');
  const d = r.outcome!.details;
  if (d.type !== 'party') throw new Error('kein Parteispiel');
  return { ...d, value: r.outcome!.value, payments: r.payments };
}

/** Eichel-Zehner beim Gegner, Gras-Zehner beim Spieler: keine Laufenden für keine Seite. */
const KEINE: Card[][] = [
  ['G10', 'EA', 'GA', 'HA'],
  ['E10', 'H10', 'SA', 'SU'],
  ['S10', 'EO', 'GO', 'HO'],
  ['SO', 'EU', 'GU', 'HU'],
];
/** Sitz 0 hat die Zehner von Eichel und Gras: zwei Laufende. */
const ZWEI: Card[][] = [
  ['E10', 'G10', 'EA', 'GA'],
  ['H10', 'S10', 'GU', 'SU'],
  ['HA', 'SA', 'EO', 'GO'],
  ['HO', 'SO', 'EU', 'HU'],
];
const EINE: Card[][] = [
  ['E10', 'EA', 'GA', 'HA'],
  ['G10', 'H10', 'S10', 'SU'],
  ['SA', 'EO', 'GO', 'HO'],
  ['SO', 'EU', 'GU', 'HU'],
];
const ALLE: Card[][] = [
  ['E10', 'G10', 'H10', 'S10', 'EA', 'GA', 'HA', 'SA'],
  ['EK', 'GK', 'HK', 'SK'],
  ['EO', 'GO', 'HO', 'SO'],
  ['EU', 'GU', 'HU', 'SU'],
];

describe('Eisenbahner: Abrechnung', () => {
  it('Gewinn zum Einzelspiel-Tarif, Gegner zahlen je einmal', () => {
    const r = value(finished(EISENBAHNER, KEINE, 80, 4));
    expect(r.laufende).toBe(0);
    expect(r.value).toBe(50);
    expect(r.payments).toEqual([150, -50, -50, -50]);
  });

  it('Laufende zählen ab 2, mit einem Zehner nicht', () => {
    const zwei = value(finished(EISENBAHNER, ZWEI, 80, 4));
    expect(zwei.laufende).toBe(2);
    expect(zwei.value).toBe(70);
    expect(value(finished(EISENBAHNER, EINE, 80, 4)).laufende).toBe(0);
  });

  it('die Schwelle ist über RuleSet.laufende einstellbar', () => {
    const streng = { ...AN, laufende: { ...AN.laufende, eisenbahner: 3 } };
    expect(value(finished(EISENBAHNER, ZWEI, 80, 4, streng)).laufende).toBe(0);
  });

  it('Tout gewonnen: alle Stiche, Tout-Aufschlag wie beim Wenz', () => {
    const tout = value(finished({ kind: 'eisenbahner', tout: true }, ALLE, 120, 8));
    expect(tout.value).toBeGreaterThan(50);
    expect(tout.payments[0]).toBeGreaterThan(0);
    expect(tout.laufende).toBe(4);
  });

  it('Tout verloren: ein verlorener Stich genügt', () => {
    const r = value(finished({ kind: 'eisenbahner', tout: true }, ALLE, 110, 7));
    expect(r.payments[0]).toBeLessThan(0);
  });
});
