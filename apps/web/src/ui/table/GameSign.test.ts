import type { HandView } from '@schafkopf/core';
import { describe, expect, it } from 'vitest';
import { gameSign, symbolFor } from './GameSign';

/** Nur die Felder, die das Schild liest. */
function hand(fields: Pick<HandView, 'contract' | 'declarer'>): HandView {
  return fields as HandView;
}

describe('Spielschild', () => {
  it('zeigt im Sauspiel die Farbe der Rufsau, im Solo und Farbwenz die Trumpffarbe', () => {
    expect(symbolFor({ kind: 'sauspiel', suit: 'gras' })).toEqual({ suit: 'gras' });
    expect(symbolFor({ kind: 'solo', suit: 'herz' })).toEqual({ suit: 'herz' });
    expect(symbolFor({ kind: 'farbwenz', suit: 'eichel' })).toEqual({ suit: 'eichel' });
  });

  it('zeigt bei Wenz und Geier den Eckbuchstaben, beim Bettel kein Zeichen', () => {
    expect(symbolFor({ kind: 'wenz' })).toEqual({ letter: 'U' });
    expect(symbolFor({ kind: 'geier' })).toEqual({ letter: 'O' });
    expect(symbolFor({ kind: 'bettel' })).toBeNull();
  });

  it('steht am Platz des Spielers mit kurzem Namen, vollem Namen und Tout als Zusatz', () => {
    expect(
      gameSign(hand({ contract: { kind: 'solo', suit: 'schellen', tout: true }, declarer: 2 })),
    ).toEqual({
      seat: 2,
      symbol: { suit: 'schellen' },
      name: 'Solo',
      label: 'Schellen-Solo Tout',
      extras: ['Tout'],
    });
    expect(gameSign(hand({ contract: { kind: 'sauspiel', suit: 'gras' }, declarer: 0 }))).toEqual(
      expect.objectContaining({ name: 'Sauspiel', label: 'Sauspiel auf die Gras-Sau', extras: [] }),
    );
  });

  it('fehlt, solange keiner spielt', () => {
    expect(gameSign(hand({ contract: null, declarer: null }))).toBeNull();
  });
});
