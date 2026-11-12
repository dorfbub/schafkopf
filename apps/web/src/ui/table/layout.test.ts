import type { Contract } from '@schafkopf/core';
import { describe, expect, it } from 'vitest';
import { sortHand } from './layout';

describe('Hand-Sortierung', () => {
  it('Hawaii-Habicht: Trümpfe nach der Farbe, die im laufenden Stich gilt', () => {
    const contract: Contract = { kind: 'hawaii', suit: 'gras', suit2: 'herz' };
    const hand = ['H7', 'GA', 'SK', 'HA', 'E9', 'G7'] as const;
    // Stiche 1–4: König, dann Gras; Herz ist gewöhnliche Farbe.
    expect(sortHand(hand, contract, 3)).toEqual(['SK', 'GA', 'G7', 'E9', 'HA', 'H7']);
    // Ab Stich 5: König, dann Herz; Gras ist gewöhnliche Farbe.
    expect(sortHand(hand, contract, 4)).toEqual(['SK', 'HA', 'H7', 'E9', 'GA', 'G7']);
  });
});
