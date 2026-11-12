import { describe, expect, it } from 'vitest';
import {
  type Card,
  type CompletedTrick,
  type Contract,
  type HandState,
  type RuleSet,
  BID_ORDER,
  DEFAULT_RULES,
  MODES,
  allContracts,
  bidValue,
  dealHand,
  parseRuleOptions,
  scoreHand,
  withRuleOptions,
} from '../src';

const withRules = (patch: Partial<RuleSet>): RuleSet => ({ ...DEFAULT_RULES, ...patch });

/** Fertiges Spiel: Sitz 0 spielt (im Sauspiel mit Sitz 2) und macht `points` Augen in `tricks` Stichen. */
function finished(
  rules: RuleSet,
  contract: Contract,
  initialHands: Card[][],
  points = 80,
  tricks = 4,
): HandState {
  const partner = contract.kind === 'sauspiel' ? 2 : null;
  const declarer = 0;
  const stichList: CompletedTrick[] = Array.from({ length: 8 }, (_, i) => ({
    leader: 0,
    cards: [],
    winner: i < tricks ? declarer : 1,
    points: i === 0 ? points : i === tricks ? 120 - points : 0,
  }));
  return {
    ...dealHand(rules, 3, 7),
    phase: 'finished',
    contract,
    declarer,
    partner,
    initialHands,
    hands: [[], [], [], []],
    tricks: stichList,
  };
}

/** Ohne Laufende für beide Parteien. */
const NEUTRAL: Card[][] = [
  ['EO', 'HO', 'EU', 'HU'],
  ['GO', 'SO', 'GU', 'SU'],
  ['EA', 'GA', 'HA', 'SA'],
  ['E10', 'G10', 'H10', 'S10'],
];
/** Sitz 0 hat die obersten Trümpfe: Eichel-, Gras-, Herz-Ober und alle Unter bis Eichel-Unter. */
const MIT_ZWEI: Card[][] = [
  ['EO', 'GO', 'EA', 'GA'],
  ['HO', 'SO', 'GU', 'SU'],
  ['HA', 'SA', 'E10', 'G10'],
  ['H10', 'S10', 'EU', 'HU'],
];
const MIT_SIE: Card[][] = [
  ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HU', 'SU'],
  ['EA', 'GA', 'HA', 'SA'],
  ['E10', 'G10', 'H10', 'S10'],
  ['EK', 'GK', 'HK', 'SK'],
];

function value(state: HandState) {
  const r = scoreHand(state);
  if (r.kind !== 'played') throw new Error('nicht gespielt');
  const details = r.outcome!.details;
  if (details.type !== 'party') throw new Error('kein Parteispiel');
  return { ...details, value: r.outcome!.value, payments: r.payments };
}

describe('DEFAULT_RULES', () => {
  it('rechnen unverändert ab', () => {
    expect(DEFAULT_RULES.tariff).toEqual({
      sauspiel: 10,
      solo: 50,
      extra: 10,
      ramsch: 10,
      stock: 10,
    });
    expect(DEFAULT_RULES.allPassed).toBe('zusammenwerfen');
    expect(DEFAULT_RULES.ramsch).toEqual({ durchmarsch: true, jungfrau: true });
    expect(DEFAULT_RULES.laufende).toEqual({
      sauspiel: 3,
      solo: 3,
      wenz: 2,
      geier: 2,
      farbwenz: 3,
      eisenbahner: 2,
    });
    expect(DEFAULT_RULES.contracts).toEqual([
      'sauspiel',
      'bettel',
      'geier',
      'farbwenz',
      'wenz',
      'solo',
    ]);
    expect(DEFAULT_RULES.allowTout && DEFAULT_RULES.sie && DEFAULT_RULES.davonlaufen).toBe(true);
    const sau = value(finished(DEFAULT_RULES, { kind: 'sauspiel', suit: 'gras' }, NEUTRAL, 91, 6));
    expect(sau).toMatchObject({ value: 20, laufende: 0, payments: [20, -20, 20, -20] });
    const sie = value(finished(DEFAULT_RULES, { kind: 'solo', suit: 'herz' }, MIT_SIE));
    expect(sie).toMatchObject({ sie: true, value: 200 });
  });

  it('parseRuleOptions nimmt die Standardwerte an', () => {
    expect(parseRuleOptions(JSON.parse(JSON.stringify(DEFAULT_RULES)))).toMatchObject({
      contracts: DEFAULT_RULES.contracts,
      tariff: DEFAULT_RULES.tariff,
    });
  });
});

describe('Option: erlaubte Spielarten', () => {
  it('abgeschaltete Spielart ist nicht ansagbar', () => {
    const rules = withRules({ contracts: ['sauspiel', 'solo'] });
    const kinds = new Set(allContracts(rules).map((c) => c.kind));
    expect([...kinds].sort()).toEqual(['sauspiel', 'solo']);
  });
});

describe('Option: Tout', () => {
  it('ohne Tout gibt es keine Tout-Ansagen', () => {
    expect(allContracts(DEFAULT_RULES).some((c) => c.tout)).toBe(true);
    expect(allContracts(withRules({ allowTout: false })).some((c) => c.tout)).toBe(false);
  });
});

describe('Option: Tarif', () => {
  it('anderer Tarif ändert die Zahlung', () => {
    const rules = withRules({
      tariff: { sauspiel: 20, solo: 100, extra: 5, ramsch: 10, stock: 10 },
    });
    const sau = value(finished(rules, { kind: 'sauspiel', suit: 'gras' }, NEUTRAL, 91, 6));
    expect(sau.value).toBe(25); // 20 + Schneider 5
    expect(sau.payments).toEqual([25, -25, 25, -25]);
    const solo = value(finished(rules, { kind: 'solo', suit: 'herz' }, NEUTRAL, 80, 4));
    expect(solo.value).toBe(100);
    expect(solo.payments).toEqual([300, -100, -100, -100]);
  });
});

describe('Option: Schwelle für Laufende', () => {
  const wenz: Contract = { kind: 'wenz' };
  const MIT_UNTERN: Card[][] = [
    ['EU', 'GU', 'HU', 'EA'],
    ['SU', 'SO', 'GO', 'HO'],
    ['EO', 'GA', 'HA', 'SA'],
    ['E10', 'G10', 'H10', 'S10'],
  ];
  it('Standard: Wenz mit 3 Laufenden zählt, mit Schwelle 4 nicht', () => {
    expect(value(finished(DEFAULT_RULES, wenz, MIT_UNTERN)).laufende).toBe(3);
    const strenger = withRules({ laufende: { ...DEFAULT_RULES.laufende, wenz: 4 } });
    const r = value(finished(strenger, wenz, MIT_UNTERN));
    expect(r.laufende).toBe(0);
    expect(r.value).toBe(50);
  });

  it('Schwelle 1 zählt auch zwei Laufende', () => {
    const lax = withRules({ laufende: { ...DEFAULT_RULES.laufende, solo: 1 } });
    const solo: Contract = { kind: 'solo', suit: 'herz' };
    expect(value(finished(DEFAULT_RULES, solo, MIT_ZWEI)).laufende).toBe(0);
    expect(value(finished(lax, solo, MIT_ZWEI)).laufende).toBe(2);
  });
});

describe('Option: Sie', () => {
  it('ohne Sie wird wie ein normales Solo abgerechnet', () => {
    const rules = withRules({ sie: false });
    const r = value(finished(rules, { kind: 'solo', suit: 'herz' }, MIT_SIE));
    expect(r.sie).toBe(false);
    expect(r.laufende).toBe(8);
    expect(r.value).toBe(50 + 8 * 10);
  });
});

type Raw = {
  tariff: Record<string, unknown>;
  laufende: Record<string, unknown>;
  ramsch: Record<string, unknown>;
  [key: string]: unknown;
};

describe('Regeln prüfen', () => {
  const ok = () => JSON.parse(JSON.stringify(DEFAULT_RULES)) as Raw;

  it('gültige Änderung wird übernommen, Rest bleibt', () => {
    const raw = ok();
    raw.tariff.solo = 30;
    raw.contracts = ['wenz', 'sauspiel'];
    const parsed = parseRuleOptions(raw)!;
    expect(parsed.contracts).toEqual(['sauspiel', 'wenz']);
    const rules = withRuleOptions(DEFAULT_RULES, parsed);
    expect(rules.tariff.solo).toBe(30);
    expect(rules.players).toBe(4);
  });

  it.each<[string, (r: Raw) => void]>([
    ['Sauspiel aus', (r) => (r.contracts = ['wenz'])],
    ['unbekannte Spielart', (r) => (r.contracts = ['sauspiel', 'ramsch'])],
    ['Tarif negativ', (r) => (r.tariff.extra = -1)],
    ['Tarif krumm', (r) => (r.tariff.solo = 2.5)],
    ['Tarif Text', (r) => (r.tariff.sauspiel = '10')],
    ['Schwelle 0', (r) => (r.laufende.wenz = 0)],
    ['Schwelle 9', (r) => (r.laufende.solo = 9)],
    ['Schwelle fehlt', (r) => delete r.laufende.geier],
    ['Tout kein Wahrheitswert', (r) => (r.allowTout = 1)],
    ['Sie fehlt', (r) => delete r.sie],
    ['unbekannte Regel für alle weiter', (r) => (r.allPassed = 'bock')],
    ['Regel für alle weiter fehlt', (r) => delete r.allPassed],
    ['Ramsch-Tarif fehlt', (r) => delete r.tariff.ramsch],
    ['Ramsch-Tarif negativ', (r) => (r.tariff.ramsch = -10)],
    ['Stock-Einsatz fehlt', (r) => delete r.tariff.stock],
    ['Stock-Einsatz krumm', (r) => (r.tariff.stock = 0.5)],
    ['Durchmarsch kein Wahrheitswert', (r) => (r.ramsch.durchmarsch = 'ja')],
    ['Ramsch-Optionen fehlen', (r) => (r.ramsch = undefined as never)],
    ['Kontra fehlt', (r) => delete r.kontra],
    ['Kontra kein Wahrheitswert', (r) => (r.kontra = 'ja')],
  ])('lehnt ab: %s', (_name, mutate) => {
    const raw = ok();
    mutate(raw);
    expect(parseRuleOptions(raw)).toBeNull();
  });

  it('Ramsch mit Unteroptionen wird übernommen', () => {
    const raw = ok();
    raw.allPassed = 'ramsch';
    raw.tariff.ramsch = 20;
    raw.tariff.stock = 30;
    raw.ramsch = { durchmarsch: false, jungfrau: true, extra: 1 };
    const parsed = parseRuleOptions(raw)!;
    expect(parsed.allPassed).toBe('ramsch');
    expect(parsed.tariff.ramsch).toBe(20);
    expect(parsed.tariff.stock).toBe(30);
    expect(parsed.ramsch).toEqual({ durchmarsch: false, jungfrau: true });
  });

  it('lehnt Nicht-Objekte ab', () => {
    for (const v of [null, 5, 'x', [], undefined]) expect(parseRuleOptions(v)).toBeNull();
  });
});

describe('Rangfolge', () => {
  it('BID_ORDER enthält die ansagbaren Spielarten, niedrigste zuerst', () => {
    expect(BID_ORDER).toEqual([
      'sauspiel',
      'bettel',
      'eisenbahner',
      'geier',
      'farbwenz',
      'wenz',
      'solo',
    ]);
    expect(BID_ORDER.every((k) => MODES[k].biddable)).toBe(true);
  });

  it('der Rang folgt BID_ORDER; Tout schlägt jede Ansage ohne Tout', () => {
    const values = BID_ORDER.map((kind) => bidValue({ kind }));
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(values[0]).toBeGreaterThan(0); // 0 heißt „noch nichts genannt“
    expect(bidValue({ kind: 'sauspiel', tout: true })).toBeGreaterThan(bidValue({ kind: 'solo' }));
  });
});
