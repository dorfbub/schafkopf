import type { HandView } from '@schafkopf/core';
import { describe, expect, it } from 'vitest';
import { lastCall } from './Seats';

describe('Letzter Ruf am Platz', () => {
  it('nach gescheiterter Hochzeit zählt nur, was seit der Wiederaufnahme gesagt wurde', () => {
    const hand = {
      bids: [
        { seat: 1, call: { type: 'interest' } },
        { seat: 2, call: { type: 'interest' } },
        { seat: 1, call: { type: 'name', level: { kind: 'sauspiel' } } },
        { seat: 2, call: { type: 'hold' } },
        { seat: 1, call: { type: 'yield' } },
        { seat: 2, call: { type: 'declare', contract: { kind: 'hochzeit' } } },
      ],
    } as HandView;
    expect(lastCall(hand, 1)).toBeNull();
    expect(lastCall(hand, 2)).toBeNull();
    const resumed = { bids: [...hand.bids, { seat: 1, call: { type: 'hold' } }] } as HandView;
    expect(lastCall(resumed, 1)).toEqual({ type: 'hold' });
    // Ohne Vorspiel bleibt alles wie bisher.
    expect(lastCall({ bids: hand.bids.slice(0, 5) } as HandView, 1)).toEqual({ type: 'yield' });
  });
});
