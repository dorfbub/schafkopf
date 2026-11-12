import {
  type BidCall,
  type Card,
  type Contract,
  type HandState,
  type RuleSet,
  DEFAULT_RULES,
} from '@schafkopf/core';
import type { AskKind, RuleId, TutorInput, TutorOption } from '../src';
import { act, allPass, deal, declare, fixedHand, input, play } from './lagen';

/** Eine Lage: Spielstand und wer fragt. */
export interface Spielstand {
  state: HandState;
  seat: number;
}

const at = (state: HandState, seat: number): Spielstand => ({ state, seat });

/** Eingabe des Tutors zu einem Fall. */
export const inputOf = (fall: Fall): TutorInput => {
  const { state, seat } = fall.lage();
  return input(state, seat);
};

/**
 * Je Faustregel eine feste Lage: wer fragt, was der Tutor empfehlen soll und welche Regel die
 * Empfehlung begründen muss. Sitz 0 beginnt Ansage und ersten Stich (Geber ist Sitz 3).
 */
export interface Fall {
  rule: RuleId;
  title: string;
  lage: () => Spielstand;
  /** Frage an den Tutor (ohne Angabe: was gerade ansteht). */
  ask?: AskKind;
  /** Erwartete Empfehlung (eine von mehreren gleichwertigen ist erlaubt). */
  expect: (o: TutorOption) => boolean;
}

const KONTRA: RuleSet = { ...DEFAULT_RULES, kontra: true };
const RAMSCH: RuleSet = { ...DEFAULT_RULES, allPassed: 'ramsch' };
const HOCHZEIT: RuleSet = { ...DEFAULT_RULES, contracts: [...DEFAULT_RULES.contracts, 'hochzeit'] };

const isCall = (type: BidCall['type']) => (o: TutorOption) =>
  o.type === 'bid' && o.call.type === type;
const isDeclare = (c: Contract) => (o: TutorOption) =>
  o.type === 'bid' &&
  o.call.type === 'declare' &&
  o.call.contract.kind === c.kind &&
  o.call.contract.suit === c.suit &&
  Boolean(o.call.contract.tout) === Boolean(c.tout);
const isCard =
  (...cards: Card[]) =>
  (o: TutorOption) =>
    o.type === 'card' && cards.includes(o.card);
const isMove = (type: 'accept' | 'decline') => (o: TutorOption) =>
  o.type === 'prelude' && o.move.type === type;
const isGive =
  (...cards: Card[]) =>
  (o: TutorOption) =>
    o.type === 'prelude' &&
    o.move.type === 'give' &&
    cards.some((c) => (o.move.type === 'give' ? o.move.cards : []).includes(c));
const isDouble = (d: boolean) => (o: TutorOption) => o.type === 'double' && o.double === d;

/** Sitz 0 sagt „Ich würde“, alle anderen „weiter“: Stufe 3, Sitz 0 nennt sein Spiel. */
function declareStage(hands: Card[][], rules: RuleSet = DEFAULT_RULES): HandState {
  let s = fixedHand(hands, rules);
  for (let i = 0; i < 4; i++) {
    s = act(s, s.turn, { type: 'bid', call: { type: s.turn === 0 ? 'interest' : 'pass' } });
  }
  return s;
}

/** Sitz 0 macht eine Hochzeit; Sitz 1 wird gefragt (Geber 3, alle anderen sagen „weiter“). */
export function hochzeitAngebot(
  hand1: Card[],
  rules: RuleSet = HOCHZEIT,
  hand0: Card[] = ['HK', 'EA', 'E10', 'GA', 'G10', 'S9', 'S8', 'E7'],
  kind: 'hochzeit' | 'arabischeHochzeit' = 'hochzeit',
): HandState {
  return declare(fixedHand(deal({ 0: hand0, 1: hand1 }, rules), rules), 0, { kind });
}

/** Sitz 1 hat die Hochzeit angenommen und gibt jetzt zurück. */
export function hochzeitRueckgabe(hand1: Card[], rules?: RuleSet, hand0?: Card[], kind?: never) {
  return act(hochzeitAngebot(hand1, rules, hand0, kind), 1, {
    type: 'prelude',
    move: { type: 'accept' },
  });
}

const SOLO_HERZ: Contract = { kind: 'solo', suit: 'herz' };

export const FAELLE: Fall[] = [
  // ----- Ansage -----
  {
    rule: 'ansage.zu.schwach',
    title: 'Schwaches Blatt: weiter',
    lage: () => at(fixedHand(deal({ 0: ['H7', 'H8', 'E7', 'E8', 'G7', 'G9', 'S8', 'SK'] })), 0),
    expect: isCall('pass'),
  },
  {
    rule: 'ansage.sauspiel.grundblatt',
    title: 'Fünf Trümpfe mit dem Alten und eine Sau: Sauspiel',
    lage: () => at(fixedHand(deal({ 0: ['EO', 'HO', 'SU', 'HA', 'H9', 'GA', 'E9', 'S7'] })), 0),
    expect: isCall('interest'),
  },
  {
    rule: 'ansage.ruffarbe.kurz',
    title: 'Die Sau zur blanken Zehn rufen',
    lage: () =>
      at(declareStage(deal({ 0: ['EO', 'GO', 'HU', 'H10', 'H8', 'E10', 'S9', 'S8'] })), 0),
    expect: isDeclare({ kind: 'sauspiel', suit: 'eichel' }),
  },
  {
    rule: 'ansage.solo.trumpflaenge',
    title: 'Sieben Trümpfe mit drei Obern: Solo',
    lage: () => at(declareStage(deal({ 0: ['EO', 'GO', 'HO', 'EU', 'GU', 'HA', 'H10', 'EA'] })), 0),
    expect: isDeclare(SOLO_HERZ),
  },
  {
    rule: 'ansage.wenz.unter.und.farben',
    title: 'Drei Unter und zwei Sauen mit langer Farbe: Wenz',
    lage: () =>
      at(declareStage(deal({ 0: ['EU', 'GU', 'SU', 'EA', 'E10', 'EK', 'GA', 'G10'] })), 0),
    expect: isDeclare({ kind: 'wenz' }),
  },
  {
    rule: 'ansage.bettel.nur.sicher',
    title: 'Lauter kleine Karten, jede Farbe von unten gedeckt: Bettel',
    lage: () => at(declareStage(deal({ 0: ['E7', 'E8', 'G7', 'G8', 'H7', 'H9', 'S7', 'S8'] })), 0),
    expect: isDeclare({ kind: 'bettel' }),
  },
  {
    rule: 'ansage.tout.nur.sicher',
    title: 'Alle Trümpfe von oben: Solo Tout',
    lage: () => at(declareStage(deal({ 0: ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HA', 'H10'] })), 0),
    expect: isDeclare({ ...SOLO_HERZ, tout: true }),
  },
  {
    rule: 'zweikampf.eigener.wert',
    title: 'Im Zweikampf kein höheres Spiel ohne eigenes Blatt',
    lage: () => {
      let s = fixedHand(deal({ 1: ['GU', 'SU', 'EA', 'GK', 'G9', 'S8', 'H7', 'E7'] }));
      s = act(s, 0, { type: 'bid', call: { type: 'interest' } });
      s = act(s, 1, { type: 'bid', call: { type: 'interest' } });
      s = act(s, 2, { type: 'bid', call: { type: 'pass' } });
      s = act(s, 3, { type: 'bid', call: { type: 'pass' } });
      return at(s, 1);
    },
    expect: isCall('yield'),
  },
  {
    rule: 'hochzeit.zwei.sauen',
    title: 'Ein Trumpf und zwei Sauen: Hochzeit',
    lage: () =>
      at(
        fixedHand(
          deal({ 0: ['SU', 'EA', 'E10', 'GA', 'G9', 'S7', 'S8', 'E7'] }, HOCHZEIT),
          HOCHZEIT,
        ),
        0,
      ),
    expect: isCall('interest'),
  },
  {
    rule: 'hochzeit.annehmen.trumpf',
    ask: 'prelude',
    title: 'Viele Trümpfe, Hochzeit angeboten: annehmen',
    lage: () => at(hochzeitAngebot(['EO', 'GO', 'SO', 'EU', 'HA', 'GK', 'G9', 'S7']), 1),
    expect: isMove('accept'),
  },
  {
    rule: 'hochzeit.ablehnen.schwach',
    ask: 'prelude',
    title: 'Kaum Trümpfe, Hochzeit angeboten: ablehnen',
    lage: () => at(hochzeitAngebot(['E8', 'E9', 'G7', 'G8', 'S7', 'SK', 'H7', 'H8']), 1),
    expect: isMove('decline'),
  },
  {
    rule: 'hochzeit.zurueckgeben.farbe.frei',
    ask: 'prelude',
    title: 'Nach dem Annehmen: die einzelne Schellen-Karte zurück macht Schellen frei',
    lage: () => at(hochzeitRueckgabe(['EO', 'GO', 'SO', 'EU', 'HA', 'GK', 'G9', 'S7']), 1),
    expect: isGive('S7'),
  },
  {
    rule: 'hochzeit.zurueckgeben.klein',
    ask: 'prelude',
    title: 'Nach dem Annehmen, keine Farbe zu räumen: eine kleine Karte zurück',
    lage: () => at(hochzeitRueckgabe(['EO', 'GO', 'EU', 'HA', 'GK', 'G9', 'S7', 'SK']), 1),
    expect: isGive('S7', 'G9'),
  },

  // ----- Kontra und Re -----
  {
    rule: 'kontra.gegen.partnerspiel',
    ask: 'double',
    title: 'Gegen ein Sauspiel mit eigenem Sauspiel-Blatt: Kontra',
    lage: () => {
      const hands = deal(
        {
          0: ['EO', 'GO', 'HO', 'SO', 'HA', 'H10', 'GA', 'SA'],
          1: ['E9', 'E8', 'HU', 'H9', 'G9', 'G8', 'S9', 'S8'],
          2: ['EA', 'E10', 'EK', 'E7', 'G10', 'GK', 'G7', 'S7'],
        },
        KONTRA,
      );
      return at(declare(fixedHand(hands, KONTRA), 1, { kind: 'sauspiel', suit: 'eichel' }), 0);
    },
    expect: isDouble(true),
  },
  {
    rule: 'kontra.gegen.einzelspiel',
    ask: 'double',
    title: 'Gegen einen Wenz ohne Unter und ohne Sau: kein Kontra',
    lage: () => {
      const hands = deal(
        {
          0: ['E9', 'E8', 'G9', 'G8', 'S9', 'S8', 'H9', 'H8'],
          1: ['EU', 'GU', 'SU', 'EA', 'E10', 'EK', 'GA', 'G10'],
        },
        KONTRA,
      );
      return at(declare(fixedHand(hands, KONTRA), 1, { kind: 'wenz' }), 0);
    },
    expect: isDouble(false),
  },
  {
    rule: 're.mit.reserve',
    ask: 'double',
    title: 'Starkes Solo nach einem Kontra: Re',
    lage: () => {
      const hands = deal({ 1: ['EO', 'GO', 'HO', 'SO', 'EU', 'HA', 'H10', 'EA'] }, KONTRA);
      let s = declare(fixedHand(hands, KONTRA), 1, SOLO_HERZ);
      s = act(s, 0, { type: 'double' });
      return at(s, 1);
    },
    expect: isDouble(true),
  },

  // ----- Spielerpartei -----
  {
    rule: 'spieler.solo.von.oben',
    title: 'Solo mit den höchsten Trümpfen: von oben ziehen',
    lage: () => {
      const hands = deal({ 0: ['EO', 'GO', 'HO', 'SO', 'EU', 'HA', 'EA', 'GA'] });
      return at(declare(fixedHand(hands), 0, SOLO_HERZ), 0);
    },
    expect: isCard('EO'),
  },
  {
    rule: 'spieler.trumpf.ziehen',
    title: 'Sauspieler kommt heraus: Trumpf',
    lage: () => {
      const hands = deal({
        0: ['EO', 'GO', 'HO', 'SU', 'H9', 'H8', 'GA', 'E9'],
        2: ['EA', 'E10', 'E7', 'G9', 'G8', 'S9', 'S8', 'H7'],
      });
      return at(declare(fixedHand(hands), 0, { kind: 'sauspiel', suit: 'eichel' }), 0);
    },
    expect: isCard('EO', 'GO', 'HO', 'SU', 'H9', 'H8'),
  },
  {
    rule: 'spieler.rufsau.nicht.selbst.suchen',
    title: 'Sauspieler sucht die Rufsau nicht selbst',
    lage: () => {
      const hands = deal({
        0: ['EO', 'GO', 'HO', 'SO', 'HA', 'E7', 'G10', 'GK'],
        2: ['EA', 'E10', 'E9', 'G9', 'G8', 'S9', 'S8', 'H7'],
      });
      return at(declare(fixedHand(hands), 0, { kind: 'sauspiel', suit: 'eichel' }), 0);
    },
    expect: (o) => o.type === 'card' && o.card !== 'E7',
  },
  {
    rule: 'spieler.farbe.nach.trumpf',
    title: 'Wenz mit allen Untern: gleich die Sauen',
    lage: () => {
      const hands = deal({ 0: ['EU', 'GU', 'SU', 'HU', 'EA', 'E10', 'GA', 'S7'] });
      return at(declare(fixedHand(hands), 0, { kind: 'wenz' }), 0);
    },
    expect: isCard('EA', 'E10', 'GA'),
  },
  {
    rule: 'mitspieler.trumpf.spielen',
    title: 'Gerufener Mitspieler kommt heraus: Trumpf oder Rufsau',
    lage: () => {
      const hands = deal({
        0: ['EA', 'E8', 'GO', 'H10', 'HK', 'G9', 'S9', 'S8'],
        1: ['EO', 'HO', 'SO', 'EU', 'HA', 'E9', 'G10', 'GK'],
      });
      return at(declare(fixedHand(hands), 1, { kind: 'sauspiel', suit: 'eichel' }), 0);
    },
    expect: isCard('EA', 'GO', 'H10', 'HK'),
  },

  // ----- Gegenspieler -----
  {
    rule: 'gegner.rufsau.suchen',
    title: 'Gegenspieler kommt heraus: Rufsau suchen',
    lage: () => {
      const hands = deal({
        0: ['E7', 'G9', 'G8', 'S9', 'S8', 'HK', 'H7', 'SU'],
        1: ['EO', 'GO', 'HO', 'SO', 'HA', 'E9', 'G10', 'GK'],
        2: ['EA', 'E10', 'EK', 'G7', 'S7', 'SK', 'H8', 'H9'],
      });
      return at(declare(fixedHand(hands), 1, { kind: 'sauspiel', suit: 'eichel' }), 0);
    },
    expect: isCard('E7'),
  },
  {
    rule: 'gegner.sau.frisch',
    title: 'Gegen ein Solo: die Sau, solange die Farbe frisch ist',
    lage: () => {
      const hands = deal({
        0: ['GA', 'G9', 'S8', 'S7', 'E8', 'E7', 'H7', 'H8'],
        2: ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HA', 'H10'],
      });
      return at(declare(fixedHand(hands), 2, SOLO_HERZ), 0);
    },
    expect: isCard('GA'),
  },
  {
    rule: 'gegner.kurzer.weg.lange.farbe',
    title: 'Solospieler direkt dahinter: lange Farbe',
    lage: () => {
      const hands = deal({
        0: ['GK', 'G9', 'G8', 'G7', 'S9', 'E8', 'H7', 'H9'],
        1: ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HA', 'EA'],
      });
      return at(declare(fixedHand(hands), 1, SOLO_HERZ), 0);
    },
    expect: isCard('GK', 'G9', 'G8', 'G7'),
  },
  {
    rule: 'gegner.kein.trumpf.anspielen',
    title: 'Gegenspieler ohne Ruffarbe: keinen Trumpf anspielen',
    lage: () => {
      const hands = deal({
        0: ['GK', 'G9', 'G8', 'S9', 'S8', 'SK', 'H8', 'H7'],
        1: ['EO', 'GO', 'HO', 'SO', 'HA', 'E9', 'G10', 'EK'],
      });
      return at(declare(fixedHand(hands), 1, { kind: 'sauspiel', suit: 'eichel' }), 0);
    },
    expect: isCard('GK', 'G9', 'G8', 'S9', 'S8', 'SK'),
  },

  // ----- Zugeben -----
  {
    rule: 'karte.schmieren',
    title: 'Mitspieler hat den Stich sicher: schmieren',
    lage: () => {
      const hands = deal({
        0: ['GA', 'G9', 'G8', 'E8', 'S9', 'H7', 'EK', 'SK'],
        1: ['SA', 'S10', 'E10', 'E9', 'E7', 'H8', 'H9', 'S7'],
        3: ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HA', 'H10'],
      });
      return at(play(declare(fixedHand(hands), 3, SOLO_HERZ), 'GA'), 1);
    },
    expect: isCard('SA', 'S10', 'E10'),
  },
  {
    rule: 'karte.nicht.vorschnell.schmieren',
    title: 'Mitspieler liegt vorn, aber nicht sicher: nicht schmieren',
    lage: () => {
      const hands = deal({
        0: ['G9', 'G8', 'GK', 'E8', 'S9', 'H7', 'EK', 'SK'],
        1: ['SA', 'S10', 'E10', 'E9', 'E7', 'H8', 'H9', 'S7'],
        3: ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HA', 'H10'],
      });
      return at(play(declare(fixedHand(hands), 3, SOLO_HERZ), 'G9'), 1);
    },
    expect: (o) => o.type === 'card' && !['SA', 'S10', 'E10'].includes(o.card),
  },
  {
    rule: 'karte.hinten.billig.stechen',
    title: 'Als Letzter: mit dem kleinsten Trumpf stechen',
    lage: () => {
      const hands = deal({
        0: ['GA', 'G9', 'E8', 'E7', 'S9', 'S8', 'SK', 'EK'],
        1: ['G10', 'G8', 'E9', 'E10', 'S10', 'S7', 'SA', 'EA'],
        2: ['G7', 'GK', 'GO', 'GU', 'HK', 'H9', 'H8', 'H7'],
        3: ['EO', 'HO', 'SO', 'EU', 'SU', 'HU', 'HA', 'H10'],
      });
      return at(play(declare(fixedHand(hands), 3, SOLO_HERZ), 'GA', 'G10', 'G7'), 3);
    },
    expect: isCard('H10'),
  },
  {
    rule: 'karte.stechen.lohnt',
    title: 'Viele Augen im Stich und ein sicherer Stecher: stechen',
    lage: () => {
      const hands = deal({
        0: ['GA', 'G9', 'E8', 'E7', 'S9', 'S8', 'GK', 'EK'],
        1: ['G10', 'G8', 'E9', 'E10', 'S10', 'S7', 'SA', 'EA'],
        2: ['EO', 'GO', 'HO', 'SO', 'EU', 'HA', 'H10', 'SK'],
      });
      return at(play(declare(fixedHand(hands), 2, SOLO_HERZ), 'GA', 'G10'), 2);
    },
    expect: isCard('EO', 'GO', 'HO', 'SO', 'EU', 'HA', 'H10'),
  },
  {
    rule: 'karte.farbe.freimachen',
    title: 'Abwerfen: die einzelne Karte einer Farbe',
    lage: () => {
      const hands = deal({
        0: ['EO', 'GO', 'HO', 'SO', 'EU', 'HA', 'H10', 'SA'],
        1: ['GA', 'G10', 'GK', 'S9', 'S8', 'SK', 'E7', 'G9'],
      });
      return at(play(declare(fixedHand(hands), 0, SOLO_HERZ), 'EO'), 1);
    },
    expect: isCard('E7'),
  },
  {
    rule: 'karte.abspatzen',
    title: 'Kein Stich möglich: einen Spatz abwerfen',
    lage: () => {
      const hands = deal({
        0: ['EO', 'GO', 'HO', 'SO', 'EU', 'HA', 'H10', 'SA'],
        1: ['GA', 'G10', 'GK', 'S9', 'S8', 'SK', 'E7', 'EK'],
      });
      return at(play(declare(fixedHand(hands), 0, SOLO_HERZ), 'EO'), 1);
    },
    expect: isCard('S9', 'S8', 'E7'),
  },
  {
    rule: 'karte.abspatzen.trumpf',
    title: 'Lauter Trümpfe, Stich verloren: einen Trumpf ohne Augen, nicht die Sau',
    lage: () => {
      const hands = deal({
        0: ['EO', 'GO', 'HO', 'EU', 'HK', 'H10', 'SA', 'SK'],
        1: ['SO', 'HU', 'SU', 'GU', 'HA', 'H9', 'H8', 'H7'],
      });
      return at(play(declare(fixedHand(hands), 0, SOLO_HERZ), 'EO'), 1);
    },
    expect: isCard('H9', 'H8', 'H7'),
  },

  // ----- Bettel -----
  {
    rule: 'bettel.spieler.drunter',
    title: 'Bettelspieler: die höchste Karte, die drunter bleibt',
    lage: () => {
      const hands = deal({
        0: ['E10', 'G7', 'G8', 'S7', 'S8', 'H7', 'H8', 'EA'],
        1: ['E9', 'EK', 'E7', 'G9', 'S9', 'H9', 'GU', 'SU'],
      });
      return at(play(declare(fixedHand(hands), 1, { kind: 'bettel' }), 'E10'), 1);
    },
    expect: isCard('E9'),
  },
  {
    rule: 'bettel.gegner.klein',
    title: 'Gegen den Bettel: klein anspielen',
    lage: () => {
      const hands = deal({
        0: ['E7', 'EA', 'EK', 'G10', 'GA', 'SA', 'SK', 'HA'],
        2: ['E8', 'E9', 'G7', 'G8', 'S7', 'S8', 'H7', 'H8'],
      });
      return at(declare(fixedHand(hands), 2, { kind: 'bettel' }), 0);
    },
    expect: isCard('E7'),
  },

  // ----- Ramsch -----
  {
    rule: 'ramsch.durchmarsch.verhindern',
    title: 'Einer hat alle Stiche: sicher einen Stich nehmen',
    lage: () => {
      const hands = deal(
        {
          0: ['EO', 'GO', 'HO', 'SO', 'S7', 'E7', 'G7', 'H7'],
          1: ['SA', 'S9', 'EA', 'E10', 'GA', 'G10', 'G9', 'E9'],
          2: ['EU', 'GU', 'SU', 'HU', 'HA', 'H10', 'HK', 'H9'],
        },
        RAMSCH,
      );
      const s = play(allPass(fixedHand(hands, RAMSCH)), 'EO', 'E9', 'H9', 'H8', 'GO', 'G9', 'HK');
      return at(play(s, 'E8', 'S7'), 1);
    },
    expect: isCard('SA'),
  },
  {
    rule: 'ramsch.hoch.drunter',
    title: 'Ramsch: unter der Sau die Zehn loswerden',
    lage: () => {
      const hands = deal(
        {
          0: ['GA', 'EO', 'E7', 'E8', 'S7', 'S8', 'H7', 'H8'],
          1: ['G10', 'G9', 'G7', 'E9', 'S9', 'SK', 'EK', 'H9'],
        },
        RAMSCH,
      );
      return at(play(allPass(fixedHand(hands, RAMSCH)), 'GA'), 1);
    },
    expect: isCard('G10'),
  },
];
