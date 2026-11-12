import {
  type BidCall,
  type Card,
  type Contract,
  MODES,
  SUITS,
  availableKinds,
  bidValue,
  card,
  orderFor,
  pointsOf,
  rankOf,
  sameContract,
  suitOf,
  tricksPlayed,
} from '@schafkopf/core';
import {
  RE_MARGIN_DECLARER,
  RE_MARGIN_PARTNER,
  bettelSafe,
  candidateContracts,
  kontraStrength,
  rateContract,
  rateWedding,
  toutSafe,
} from '@schafkopf/bots';
import type { Lage } from './lage';
import type { Area, AskKind, Params, TutorOption } from './types';

/**
 * Die Faustregeln des Tutors – dieselben Kennungen und dieselbe Reihenfolge wie in
 * docs/STRATEGIEN.md. Jede Regel prüft, ob sie in der Lage greift, und nennt die Möglichkeiten,
 * für die sie spricht. Die Reihenfolge ist die Priorität: Spezielle Regeln stehen vor allgemeinen,
 * die Begründung nennt die ersten beiden, die zur Empfehlung passen.
 *
 * Texte gibt es hier keine: Begründung und Denkanstoß sind Kennungen mit Platzhaltern
 * (`regel.<id>`, `denkanstoss.<id>`), die Oberfläche (T2) setzt die Texte ein.
 */
export const RULE_IDS = [
  // Ansage
  'ansage.zu.schwach',
  'ansage.sauspiel.grundblatt',
  'ansage.ruffarbe.kurz',
  'ansage.solo.trumpflaenge',
  'ansage.wenz.unter.und.farben',
  'ansage.bettel.nur.sicher',
  'ansage.tout.nur.sicher',
  'zweikampf.eigener.wert',
  'hochzeit.zwei.sauen',
  // Kontra und Re
  'kontra.gegen.partnerspiel',
  'kontra.gegen.einzelspiel',
  're.mit.reserve',
  // Kartenspiel: Spielerpartei
  'spieler.solo.von.oben',
  'spieler.trumpf.ziehen',
  'spieler.rufsau.nicht.selbst.suchen',
  'spieler.farbe.nach.trumpf',
  'mitspieler.trumpf.spielen',
  // Kartenspiel: Gegenspieler
  'gegner.rufsau.suchen',
  'gegner.sau.frisch',
  'gegner.kurzer.weg.lange.farbe',
  'gegner.kein.trumpf.anspielen',
  // Zugeben
  'karte.schmieren',
  'karte.nicht.vorschnell.schmieren',
  'karte.hinten.billig.stechen',
  'karte.stechen.lohnt',
  'karte.farbe.freimachen',
  'karte.abspatzen',
  // Bettel
  'bettel.spieler.drunter',
  'bettel.gegner.klein',
  // Ramsch
  'ramsch.durchmarsch.verhindern',
  'ramsch.hoch.drunter',
] as const;
export type RuleId = (typeof RULE_IDS)[number];

export interface RuleCheck {
  favored: TutorOption[];
  params: Params;
}

export interface RuleDef {
  id: RuleId;
  area: Area;
  ask: AskKind;
  check(l: Lage): RuleCheck | null;
}

// ---------------------------------------------------------------------------
// Bausteine

const cardOpts = (cards: readonly Card[]): TutorOption[] =>
  cards.map((c) => ({ type: 'card', card: c }));
const callOpts = (calls: readonly BidCall[]): TutorOption[] =>
  calls.map((call) => ({ type: 'bid', call }));
const hit = (favored: TutorOption[], params: Params = {}): RuleCheck | null =>
  favored.length > 0 ? { favored, params } : null;

const minBy = <T>(items: readonly T[], f: (t: T) => number): T[] => {
  if (items.length === 0) return [];
  const best = Math.min(...items.map(f));
  return items.filter((t) => f(t) === best);
};
const maxBy = <T>(items: readonly T[], f: (t: T) => number): T[] => minBy(items, (t) => -f(t));

function bidTurn(l: Lage): boolean {
  return l.view.phase === 'bidding' && l.view.turn === l.me && l.view.legalCalls.length > 0;
}

function cardTurn(l: Lage): boolean {
  return (
    l.view.phase === 'playing' &&
    l.view.turn === l.me &&
    l.view.legalCards.length > 1 &&
    l.contract !== null
  );
}

/** Spiel um Augen mit Spielerpartei (nicht Bettel, nicht Ramsch). */
function pointsGame(l: Lage): boolean {
  return (
    l.contract !== null && MODES[l.contract.kind].goal === 'points' && l.view.declarer !== null
  );
}

const deckSize = (l: Lage) => l.view.handSizes.reduce((a, b) => a + b, 0) + l.played.size;

/** Rufe, mit denen man auf eines der gewünschten Spiele hinarbeitet – je nach Stufe der Ansage. */
function wantCalls(l: Lage, wanted: readonly Contract[]): TutorOption[] {
  if (wanted.length === 0) return [];
  const calls = l.view.legalCalls;
  const a = l.view.auction;
  const current = a.level ? bidValue(a.level) : 0;
  const out = calls.filter((c) => {
    switch (c.type) {
      case 'interest':
        return true;
      case 'hold':
        return wanted.some((w) => bidValue(w) >= current);
      case 'name':
        return wanted.some((w) => bidValue(w) === bidValue(c.level));
      case 'declare':
        return wanted.some((w) => sameContract(w, c.contract));
      default:
        return false;
    }
  });
  return callOpts(out);
}

const passCalls = (l: Lage) =>
  callOpts(l.view.legalCalls.filter((c) => c.type === 'pass' || c.type === 'yield'));

/** Bewertete Spiele der Heuristik für das eigene Blatt (nur am Tisch erlaubte). */
function rated(l: Lage): { contract: Contract; margin: number }[] {
  const size = deckSize(l);
  return candidateContracts(l.hand, l.rules, l.view.auction.failed).map((contract) => ({
    contract,
    margin: rateContract(l.hand, contract, size),
  }));
}

const SAUSPIEL_ORDER = orderFor({ kind: 'sauspiel', suit: 'eichel' }, 0);
const SIDE_SUITS = SUITS.filter((s) => s !== 'herz');

/** Merkmale eines Sauspiel-Blatts: Trümpfe, hohe Ober, freie Farben, Farbsauen. */
function sauspielShape(hand: readonly Card[]) {
  const trumps = hand.filter((c) => SAUSPIEL_ORDER.trumps.includes(c));
  const topOber = trumps.filter((c) => ['EO', 'GO', 'HO'].includes(c)).length;
  const high = trumps.filter((c) => SAUSPIEL_ORDER.trumps.indexOf(c) < 4).length;
  const side = (s: string) => hand.filter((c) => suitOf(c) === s && !trumps.includes(c));
  const free = SIDE_SUITS.filter((s) => side(s).length === 0).length;
  const aces = SIDE_SUITS.filter((s) => side(s).some((c) => rankOf(c) === 'A')).length;
  return { t: trumps.length, topOber, high, free, aces };
}

// Spielerpartei und Gegner im Kartenspiel

const legal = (l: Lage) => l.view.legalCards;
const trumpsIn = (l: Lage, cards: readonly Card[]) => cards.filter((c) => l.isTrump(c));
const sideIn = (l: Lage, cards: readonly Card[]) => cards.filter((c) => !l.isTrump(c));
const unseenTrumps = (l: Lage) => l.unseen.filter((c) => l.isTrump(c)).length;
const isHighTrump = (l: Lage, c: Card) => l.isTrump(c) && (rankOf(c) === 'O' || rankOf(c) === 'U');

// ---------------------------------------------------------------------------
// Der Katalog

export const RULES: readonly RuleDef[] = [
  // ----- Ansage -----
  {
    id: 'ansage.zu.schwach',
    area: 'ansage',
    ask: 'bid',
    check(l) {
      if (!bidTurn(l) || l.view.auction.stage === 'declare') return null;
      const best = Math.max(-10, ...rated(l).map((r) => r.margin));
      if (best >= WEAK_HAND) return null;
      return hit(passCalls(l), { trumpf: sauspielShape(l.hand).t });
    },
  },
  {
    id: 'ansage.sauspiel.grundblatt',
    area: 'ansage',
    ask: 'bid',
    check(l) {
      if (!bidTurn(l) || !availableKinds(l.rules).includes('sauspiel')) return null;
      const s = sauspielShape(l.hand);
      const solid =
        (s.t >= 5 && s.topOber >= 1 && (s.free >= 1 || s.aces >= 1)) ||
        (s.t === 4 && s.high >= 2 && s.free >= 1 && s.aces >= 1) ||
        (s.t >= 6 && (s.free >= 2 || s.aces >= 1));
      if (!solid) return null;
      const suits = MODES.sauspiel.suitChoices?.(l.hand) ?? [];
      const wanted = suits.map((suit): Contract => ({ kind: 'sauspiel', suit }));
      return hit(wantCalls(l, wanted), { trumpf: s.t, frei: s.free, sauen: s.aces });
    },
  },
  {
    id: 'ansage.ruffarbe.kurz',
    area: 'ansage',
    ask: 'bid',
    check(l) {
      if (!bidTurn(l) || l.view.auction.stage !== 'declare') return null;
      const calls = l.view.legalCalls.filter(
        (c) => c.type === 'declare' && c.contract.kind === 'sauspiel' && !c.contract.tout,
      );
      if (calls.length < 2) return null;
      const suitOfCall = (c: BidCall) => (c.type === 'declare' ? c.contract.suit! : 'eichel');
      const cards = (c: BidCall) =>
        l.hand.filter((h) => suitOf(h) === suitOfCall(c) && !SAUSPIEL_ORDER.trumps.includes(h));
      const withTen = calls.filter((c) => cards(c).some((h) => rankOf(h) === '10'));
      const pool = withTen.length > 0 ? withTen : calls;
      const best = minBy(pool, (c) => cards(c).length);
      if (best.length === calls.length) return null;
      return hit(callOpts(best), { farbe: suitOfCall(best[0]!), zehn: withTen.length > 0 ? 1 : 0 });
    },
  },
  {
    id: 'ansage.solo.trumpflaenge',
    area: 'ansage',
    ask: 'bid',
    check(l) {
      if (!bidTurn(l) || !availableKinds(l.rules).includes('solo')) return null;
      const scale = l.hand.length / 8;
      const wanted = SUITS.flatMap((suit): Contract[] => {
        const order = orderFor({ kind: 'solo', suit }, 0);
        const trumps = l.hand.filter((c) => order.trumps.includes(c));
        const ober = trumps.filter((c) => order.trumps.indexOf(c) < 4).length;
        const ok =
          (trumps.length >= Math.ceil(6 * scale) && ober >= 2) ||
          trumps.length >= Math.ceil(7 * scale);
        return ok ? [{ kind: 'solo', suit }] : [];
      });
      return hit(wantCalls(l, wanted), { farbe: wanted[0]?.suit ?? '' });
    },
  },
  {
    id: 'ansage.wenz.unter.und.farben',
    area: 'ansage',
    ask: 'bid',
    check(l) {
      if (!bidTurn(l) || !availableKinds(l.rules).includes('wenz')) return null;
      const unter = l.hand.filter((c) => rankOf(c) === 'U');
      const aces = SUITS.filter((s) => l.hand.includes(card(s, 'A'))).length;
      const ok = (unter.length >= 3 || (unter.length === 2 && unter.includes('EU'))) && aces >= 2;
      if (!ok) return null;
      const first = (l.view.dealer + 1) % l.players === l.me ? 1 : 0;
      return hit(wantCalls(l, [{ kind: 'wenz' }]), { unter: unter.length, sauen: aces, first });
    },
  },
  {
    id: 'ansage.bettel.nur.sicher',
    area: 'ansage',
    ask: 'bid',
    check(l) {
      if (!bidTurn(l) || !availableKinds(l.rules).includes('bettel')) return null;
      const order = orderFor({ kind: 'bettel' }, 0);
      if (bettelSafe(l.hand, order, deckSize(l))) {
        return hit(wantCalls(l, [{ kind: 'bettel' }]), { sicher: 1 });
      }
      // Verlockend, aber nicht sicher: kaum hohe Karten, trotzdem eine Lücke.
      const high = l.hand.filter((c) => ['A', '10', 'K', 'O'].includes(rankOf(c))).length;
      if (high > 1 || l.view.auction.stage === 'declare') return null;
      if (rated(l).some((r) => r.contract.kind !== 'bettel' && r.margin >= 0)) return null;
      return hit(passCalls(l), { sicher: 0 });
    },
  },
  {
    id: 'ansage.tout.nur.sicher',
    area: 'ansage',
    ask: 'bid',
    check(l) {
      if (!bidTurn(l) || !l.rules.allowTout || l.view.auction.stage === 'interest') return null;
      const calls = l.view.legalCalls;
      const hasTout = calls.some(
        (c) => (c.type === 'name' && c.level.tout) || (c.type === 'declare' && c.contract.tout),
      );
      if (!hasTout) return null;
      const strong = rated(l).filter((r) => !r.contract.tout && r.margin >= TOUT_TEMPTING);
      if (strong.length === 0) return null;
      const safe = strong
        .map((r) => ({ ...r.contract, tout: true }))
        .filter((c) => toutSafe(l.hand, c, orderFor(c, 0)));
      if (safe.length > 0) return hit(wantCalls(l, safe), { sicher: 1, spiel: safe[0]!.kind });
      const plain = strong.map((r) => r.contract);
      return hit(wantCalls(l, plain), { sicher: 0, spiel: plain[0]!.kind });
    },
  },
  {
    id: 'zweikampf.eigener.wert',
    area: 'zweikampf',
    ask: 'bid',
    check(l) {
      if (!bidTurn(l) || l.view.auction.stage !== 'duel') return null;
      const a = l.view.auction;
      const current = a.level ? bidValue(a.level) : 0;
      const holder = l.me === a.holder;
      const wanted = rated(l)
        .filter((r) => r.margin >= 0)
        .filter((r) => (holder ? bidValue(r.contract) >= current : bidValue(r.contract) > current))
        .map((r) => r.contract);
      const other = (holder ? a.challenger : a.holder) ?? l.me;
      const params = { gegner: other, spiel: a.level?.kind ?? '' };
      return hit(wanted.length > 0 ? wantCalls(l, wanted) : passCalls(l), params);
    },
  },
  {
    id: 'hochzeit.zwei.sauen',
    area: 'hochzeit',
    ask: 'bid',
    check(l) {
      if (!bidTurn(l) || !availableKinds(l.rules).includes('hochzeit')) return null;
      if (l.view.auction.failed.includes('hochzeit')) return null;
      if (!MODES.hochzeit.eligible?.(l.hand)) return null;
      if (rateWedding(l.hand, 1) < 0) return null;
      return hit(wantCalls(l, [{ kind: 'hochzeit' }]), {});
    },
  },

  // ----- Kontra und Re -----
  {
    id: 'kontra.gegen.partnerspiel',
    area: 'kontra',
    ask: 'double',
    check(l) {
      const c = l.contract;
      if (!l.view.canDouble || !c || l.declarerSide || l.view.doubling.kontra !== null) return null;
      const parties = MODES[c.kind].parties;
      if (parties !== 'calledAce' && parties !== 'prelude') return null;
      const strength = kontraStrength(l.hand, c);
      return hit([{ type: 'double', double: strength >= 0 }], {
        trumpf: l.hand.filter((x) => orderFor(c, 0).trumps.includes(x)).length,
      });
    },
  },
  {
    id: 'kontra.gegen.einzelspiel',
    area: 'kontra',
    ask: 'double',
    check(l) {
      const c = l.contract;
      if (!l.view.canDouble || !c || l.declarerSide || l.view.doubling.kontra !== null) return null;
      if (MODES[c.kind].parties !== 'alone' || MODES[c.kind].goal !== 'points') return null;
      const strength = kontraStrength(l.hand, c);
      return hit([{ type: 'double', double: strength >= 0 }], { spiel: c.kind });
    },
  },
  {
    id: 're.mit.reserve',
    area: 'kontra',
    ask: 'double',
    check(l) {
      const c = l.contract;
      if (!l.view.canDouble || !c || !l.declarerSide || l.view.doubling.kontra === null)
        return null;
      const size = deckSize(l);
      const margin =
        l.me === l.view.declarer
          ? rateContract(l.hand, c, size) - RE_MARGIN_DECLARER
          : rateContract(l.hand, { kind: 'sauspiel', suit: c.suit ?? 'eichel' }, size) -
            RE_MARGIN_PARTNER;
      return hit([{ type: 'double', double: margin >= 0 }], { kontra: l.view.doubling.kontra });
    },
  },

  // ----- Kartenspiel: Spielerpartei -----
  {
    id: 'spieler.solo.von.oben',
    area: 'spieler',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || !l.leading || l.me !== l.view.declarer) return null;
      if (MODES[l.contract!.kind].parties !== 'alone' || unseenTrumps(l) === 0) return null;
      const trumps = trumpsIn(l, legal(l));
      const top = maxBy(trumps, l.str)[0];
      if (!top || !l.isTopOfSuit(top)) return null;
      return hit(cardOpts([top]), { karte: top, draussen: unseenTrumps(l) });
    },
  },
  {
    id: 'spieler.trumpf.ziehen',
    area: 'spieler',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || !l.leading || !l.declarerSide) return null;
      if (unseenTrumps(l) === 0) return null;
      return hit(cardOpts(trumpsIn(l, legal(l))), { draussen: unseenTrumps(l) });
    },
  },
  {
    id: 'spieler.rufsau.nicht.selbst.suchen',
    area: 'spieler',
    ask: 'card',
    check(l) {
      const sau = l.calledAce;
      if (!cardTurn(l) || !sau || !l.leading || l.me !== l.view.declarer) return null;
      if (l.played.has(sau)) return null;
      const suit = suitOf(sau);
      const called = legal(l).filter((c) => !l.isTrump(c) && suitOf(c) === suit);
      if (called.length === 0) return null;
      return hit(cardOpts(legal(l).filter((c) => !called.includes(c))), { farbe: suit });
    },
  },
  {
    id: 'spieler.farbe.nach.trumpf',
    area: 'spieler',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || !l.leading || !l.declarerSide) return null;
      if (unseenTrumps(l) > 0) return null;
      const side = sideIn(l, legal(l));
      const tops = side.filter((c) => l.isTopOfSuit(c));
      return hit(cardOpts(tops.length > 0 ? tops : side), {});
    },
  },
  {
    id: 'mitspieler.trumpf.spielen',
    area: 'spieler',
    ask: 'card',
    check(l) {
      const sau = l.calledAce;
      if (!cardTurn(l) || !sau || !l.leading) return null;
      if (l.view.partner !== l.me || l.me === l.view.declarer || l.played.has(sau)) return null;
      const favored = [...trumpsIn(l, legal(l)), ...legal(l).filter((c) => c === sau)];
      return hit(cardOpts(favored), { spieler: l.view.declarer ?? 0 });
    },
  },

  // ----- Kartenspiel: Gegenspieler -----
  {
    id: 'gegner.rufsau.suchen',
    area: 'gegenspieler',
    ask: 'card',
    check(l) {
      const sau = l.calledAce;
      if (!cardTurn(l) || !sau || !l.leading || l.declarerSide || l.played.has(sau)) return null;
      const suit = suitOf(sau);
      const called = legal(l).filter((c) => !l.isTrump(c) && suitOf(c) === suit);
      return hit(cardOpts(called), { farbe: suit });
    },
  },
  {
    id: 'gegner.sau.frisch',
    area: 'gegenspieler',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || !l.leading || l.declarerSide) return null;
      const aces = sideIn(l, legal(l)).filter(
        (c) => rankOf(c) === 'A' && !l.ledSuits.has(l.eff(c)) && c !== l.calledAce,
      );
      return hit(cardOpts(aces), { karte: aces[0] ?? '' });
    },
  },
  {
    id: 'gegner.kurzer.weg.lange.farbe',
    area: 'gegenspieler',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || !l.leading || l.declarerSide) return null;
      if (MODES[l.contract!.kind].parties !== 'alone') return null;
      const decl = l.view.declarer!;
      const short = decl === (l.me + 1) % l.players;
      const long = decl === (l.me + l.players - 1) % l.players;
      if (!short && !long) return null;
      const side = sideIn(l, legal(l));
      const len = (c: Card) => side.filter((x) => l.eff(x) === l.eff(c)).length;
      if (side.length === 0 || Math.max(...side.map(len)) === Math.min(...side.map(len))) {
        return null;
      }
      const favored = short ? maxBy(side, len) : minBy(side, len);
      return hit(cardOpts(favored), {
        weg: short ? 'kurz' : 'lang',
        farbe: favored[0] ? suitOf(favored[0]) : '',
      });
    },
  },
  {
    id: 'gegner.kein.trumpf.anspielen',
    area: 'gegenspieler',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || !l.leading || l.declarerSide) return null;
      if (trumpsIn(l, legal(l)).length === 0) return null;
      return hit(cardOpts(sideIn(l, legal(l))), {});
    },
  },

  // ----- Zugeben -----
  {
    id: 'karte.schmieren',
    area: 'zugeben',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || l.leading || l.winnerSeat === null) return null;
      if (l.sideOf(l.winnerSeat) !== 'friend' || !l.safeAgainstLater(l.winningCard!)) return null;
      const pool = legal(l).filter((c) => !isHighTrump(l, c));
      const most = Math.max(0, ...pool.map(pointsOf));
      if (most < 4) return null;
      const favored = pool.filter((c) => (most >= 10 ? pointsOf(c) >= 10 : pointsOf(c) === most));
      return hit(cardOpts(favored), { partner: l.winnerSeat });
    },
  },
  {
    id: 'karte.nicht.vorschnell.schmieren',
    area: 'zugeben',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || l.leading || l.winnerSeat === null) return null;
      if (l.sideOf(l.winnerSeat) !== 'friend' || l.safeAgainstLater(l.winningCard!)) return null;
      const cheap = legal(l).filter((c) => pointsOf(c) <= 4 && !isHighTrump(l, c));
      const sure = legal(l).filter((c) => l.wins(c) && l.safeAgainstLater(c));
      return hit(cardOpts([...new Set([...cheap, ...sure])]), { partner: l.winnerSeat });
    },
  },
  {
    id: 'karte.hinten.billig.stechen',
    area: 'zugeben',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || l.leading || l.laterSeats.length > 0) return null;
      if (l.winnerSeat === null || l.sideOf(l.winnerSeat) === 'friend') return null;
      const winners = legal(l).filter(l.wins);
      if (winners.length < 2 || trumpsIn(l, winners).length === 0) return null;
      const side = sideIn(l, winners);
      const favored = side.length > 0 ? side : minBy(winners, l.str);
      return hit(cardOpts(favored), { karte: favored[0]! });
    },
  },
  {
    id: 'karte.stechen.lohnt',
    area: 'zugeben',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || l.leading || l.winnerSeat === null) return null;
      if (l.sideOf(l.winnerSeat) === 'friend' || l.trickPoints < 10) return null;
      const sure = legal(l).filter((c) => l.wins(c) && l.safeAgainstLater(c));
      return hit(cardOpts(sure), { augen: l.trickPoints });
    },
  },
  {
    id: 'karte.farbe.freimachen',
    area: 'zugeben',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || l.leading || l.leadSuit === null) return null;
      if (l.hand.some((c) => l.eff(c) === l.leadSuit)) return null; // man muss bedienen
      if (
        l.winnerSeat !== null &&
        l.sideOf(l.winnerSeat) === 'friend' &&
        l.safeAgainstLater(l.winningCard!)
      ) {
        return null; // dann schmieren
      }
      const single = sideIn(l, legal(l)).filter(
        (c) =>
          pointsOf(c) <= 4 &&
          !l.isTopOfSuit(c) &&
          l.hand.filter((h) => l.eff(h) === l.eff(c)).length === 1,
      );
      return hit(cardOpts(single), { farbe: single[0] ? suitOf(single[0]) : '' });
    },
  },
  {
    id: 'karte.abspatzen',
    area: 'zugeben',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || !pointsGame(l) || l.leading || l.winnerSeat === null) return null;
      if (l.sideOf(l.winnerSeat) === 'friend') return null;
      const winners = legal(l).filter(l.wins);
      const sure = winners.filter((c) => l.safeAgainstLater(c));
      if (winners.length > 0 && (sure.length > 0 || l.trickPoints >= 10)) return null;
      const side = sideIn(l, legal(l));
      const favored = side.length > 0 ? minBy(side, pointsOf) : minBy(trumpsIn(l, legal(l)), l.str);
      return hit(cardOpts(favored), {});
    },
  },

  // ----- Bettel -----
  {
    id: 'bettel.spieler.drunter',
    area: 'bettel',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || l.contract!.kind !== 'bettel' || l.me !== l.view.declarer) return null;
      if (l.leading) return hit(cardOpts(minBy(legal(l), l.str)), {});
      const under = legal(l).filter((c) => !l.wins(c));
      return hit(cardOpts(maxBy(under, l.str)), {});
    },
  },
  {
    id: 'bettel.gegner.klein',
    area: 'bettel',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || l.contract!.kind !== 'bettel' || l.me === l.view.declarer) return null;
      const decl = l.view.declarer!;
      if (l.leading) {
        const open = legal(l).filter((c) => !l.voids[decl]!.has(l.eff(c)));
        return hit(cardOpts(minBy(open.length > 0 ? open : legal(l), l.str)), {});
      }
      if (l.laterSeats.includes(decl)) return hit(cardOpts(minBy(legal(l), l.str)), {});
      if (l.winnerSeat === decl) {
        const under = legal(l).filter((c) => !l.wins(c));
        return hit(cardOpts(maxBy(under, l.str)), {});
      }
      return null;
    },
  },

  // ----- Ramsch -----
  {
    id: 'ramsch.durchmarsch.verhindern',
    area: 'ramsch',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || l.contract!.kind !== 'ramsch' || !l.rules.ramsch.durchmarsch) return null;
      const done = tricksPlayed(l.view);
      if (done < 2) return null;
      const threat = l.view.tricksWon.findIndex((n, s) => s !== l.me && n === done);
      if (threat < 0) return null;
      const stoppers = l.leading
        ? legal(l).filter(
            (c) => l.isTopOfSuit(c) && (l.isTrump(c) || !l.voids[threat]!.has(l.eff(c))),
          )
        : legal(l).filter((c) => l.wins(c) && l.safeAgainstLater(c));
      return hit(cardOpts(stoppers), { spieler: threat });
    },
  },
  {
    id: 'ramsch.hoch.drunter',
    area: 'ramsch',
    ask: 'card',
    check(l) {
      if (!cardTurn(l) || l.contract!.kind !== 'ramsch' || l.leading) return null;
      const under = legal(l).filter((c) => !l.wins(c));
      const best = maxBy(under, (c) => pointsOf(c) * 2 + l.str(c) * 0.01);
      return hit(cardOpts(best), { karte: best[0] ?? '' });
    },
  },
];

/** Unter dieser Marge der Heuristik (für jedes Spiel) gilt ein Blatt als klar zu schwach. */
const WEAK_HAND = -1.5;
/** Ab dieser Marge ist ein Blatt so stark, dass ein Tout verlockt. */
const TOUT_TEMPTING = 2.5;

export function ruleById(id: RuleId): RuleDef {
  return RULES.find((r) => r.id === id)!;
}
