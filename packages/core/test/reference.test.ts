import { describe, expect, it } from 'vitest';
import raw from './reference-games.json?raw';
import { REFERENCE_GAMES, type ReferenceGame, referenceGame } from './reference-games';

const expected = JSON.parse(raw) as ReferenceGame[];

describe('Referenzspiele (Umbau ohne Verhaltensänderung)', () => {
  it('die eingecheckte Liste umfasst alle Spiele und viele Spielarten', () => {
    expect(expected).toHaveLength(REFERENCE_GAMES);
    const kinds = new Set(expected.map((g) => g.contract?.kind ?? 'passed'));
    expect(kinds.size).toBeGreaterThanOrEqual(6);
  });

  it('500 Zufallsspiele rechnen genau wie vor dem Umbau ab', () => {
    for (const game of expected) {
      expect(referenceGame(game.seed), `Seed ${game.seed}`).toEqual(game);
    }
  });
});
