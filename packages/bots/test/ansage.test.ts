import { describe, expect, it } from 'vitest';
import { type Card, type Contract, DEFAULT_RULES, type RuleSet } from '@schafkopf/core';
import { alleSticheSicher, ansageWert } from '../src';

/** Ansage-Tabellen (B4): feste Fälle, an denen man die Tabelle von Hand nachprüfen kann. */

const BETTEL: Contract = { kind: 'bettel' };
const POSITIONEN = [0, 1, 2, 3];
const wert = (hand: Card[], c: Contract, pos: number, rules: RuleSet = DEFAULT_RULES) =>
  ansageWert(hand, c, rules, pos);

describe('Ansage-Tabelle: Bettel', () => {
  it('bewertet einen Bettel mit blankem Schellen-Ober und -Zehner als Verlust', () => {
    // Fund bei der Abnahme: Spielt ein Gegner Schellen klein an, muss der Spieler mit Zehner
    // oder Ober drüber. Früher lag der Wert bei +9 bis +19 Cent.
    const hand: Card[] = ['GO', 'SO', 'GU', 'H7', 'GA', 'G9', 'G7', 'S10'];
    for (const pos of POSITIONEN) expect(wert(hand, BETTEL, pos)!).toBeLessThan(0);
  });

  it('bewertet einen von unten gedeckten Bettel hoch', () => {
    const hand: Card[] = ['E7', 'E8', 'G7', 'G8', 'H7', 'H9', 'S7', 'S8'];
    for (const pos of POSITIONEN) expect(wert(hand, BETTEL, pos)!).toBeGreaterThan(50);
  });

  it('bewertet einen Bettel mit einer oder zwei offenen hohen Karten als Verlust', () => {
    // Gemessen mit „Stark“ als Gegenspielern (je 400 Probespiele, Vorhand/Mittelhand/Hinterhand):
    // blanker König −110/−125/−109, blanke Sau −143/−145/−145, Sau und König über der Sieben
    // −130/−133/−123 Cent.
    const blankerKoenig: Card[] = ['HK', 'E7', 'E8', 'G7', 'G8', 'G9', 'S7', 'S8'];
    const blankeSau: Card[] = ['EA', 'G7', 'G8', 'G9', 'H7', 'H8', 'S7', 'S8'];
    const zwei: Card[] = ['E7', 'EA', 'G7', 'G8', 'H7', 'HK', 'S7', 'S8'];
    for (const pos of POSITIONEN) {
      expect(wert(blankerKoenig, BETTEL, pos)!).toBeLessThan(0);
      expect(wert(blankeSau, BETTEL, pos)!).toBeLessThan(0);
      expect(wert(zwei, BETTEL, pos)!).toBeLessThan(0);
    }
  });

  it('lässt eine hohe Karte zu, wenn man sie früh abwerfen kann', () => {
    // König über der Sieben, dazu eine einzelne Gras-Sieben: Nach dem ersten Gras-Anspiel ist
    // man frei und wirft den König ab. Gemessen +26/+35/+54 Cent (Vorhand/Mittelhand/Hinterhand).
    const hand: Card[] = ['E7', 'E8', 'E9', 'G7', 'H7', 'HK', 'S7', 'S8'];
    for (const pos of POSITIONEN) expect(wert(hand, BETTEL, pos)!).toBeGreaterThan(0);
  });
});

describe('Ansage-Tabelle: allgemein', () => {
  const solo: Card[] = ['EO', 'GO', 'SU', 'HA', 'H9', 'H8', 'G7', 'SA'];
  const herz: Contract = { kind: 'solo', suit: 'herz' };

  it('rechnet mit dem Tarif der Tischregeln', () => {
    const doppelt: RuleSet = {
      ...DEFAULT_RULES,
      tariff: { ...DEFAULT_RULES.tariff, solo: 100, extra: 20, sauspiel: 20 },
    };
    expect(wert(solo, herz, 0, doppelt)!).toBeCloseTo(2 * wert(solo, herz, 0)!, 6);
  });

  it('hat unterhalb des Bereichs keinen Wert', () => {
    const schwach: Card[] = ['H7', 'H8', 'E7', 'E8', 'G7', 'G9', 'S8', 'SK'];
    expect(wert(schwach, { kind: 'solo', suit: 'eichel' }, 0)).toBeNull();
    expect(wert(schwach, { kind: 'sauspiel', suit: 'gras' }, 0)).toBeNull();
  });

  it('rechnet ein sicheres Tout exakt: doppelter Wert mit Laufenden', () => {
    const hand: Card[] = ['EO', 'GO', 'HO', 'SO', 'EU', 'GU', 'HA', 'H10'];
    const tout: Contract = { ...herz, tout: true };
    expect(alleSticheSicher(hand, tout, 'lang')).toBe(true);
    // 3 Gegner × 2 × (50 Grundtarif + 6 Laufende × 10)
    expect(wert(hand, tout, 0)).toBe(660);
    expect(alleSticheSicher(solo, tout, 'lang')).toBe(false);
  });

  it('kennt alle Besetzungen', () => {
    const kurz4: RuleSet = { ...DEFAULT_RULES, deck: 'kurz' };
    const kurz3: RuleSet = { ...DEFAULT_RULES, deck: 'kurz', players: 3 };
    expect(wert(['EO', 'GO', 'HO', 'SU', 'HA', 'H10'], herz, 0, kurz4)!).toBeGreaterThan(0);
    expect(
      wert(['EO', 'GO', 'HO', 'SU', 'HA', 'H10', 'HK', 'EA'], herz, 0, kurz3)!,
    ).toBeGreaterThan(0);
  });
});
