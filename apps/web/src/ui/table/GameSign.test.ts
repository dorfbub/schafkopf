import type { HandView } from '@schafkopf/core';
import { describe, expect, it } from 'vitest';
import { gameSign, symbolFor } from './GameSign';

/** Nur die Felder, die das Schild liest. */
function hand(
  fields: Pick<HandView, 'contract' | 'declarer'> & Partial<Pick<HandView, 'tricksWon'>>,
): HandView {
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

  it('Hawaii-Habicht: zeigt die gültige Trumpffarbe und ihren Wechsel nach dem vierten Stich', () => {
    const contract = { kind: 'hawaii', suit: 'gras', suit2: 'herz' } as const;
    const vorher = gameSign(hand({ contract, declarer: 1, tricksWon: [1, 1, 0, 1] }));
    expect(vorher).toEqual({
      seat: 1,
      symbol: { suit: 'gras' },
      name: 'Hawaii-Habicht',
      label: 'Hawaii-Habicht (Gras, ab Stich 5 Herz)',
      extras: ['ab Stich 5: Herz'],
    });
    const nachher = gameSign(hand({ contract, declarer: 1, tricksWon: [1, 2, 0, 1] }));
    expect(nachher).toEqual(
      expect.objectContaining({ symbol: { suit: 'herz' }, extras: ['Trumpf gewechselt'] }),
    );
    expect(symbolFor(contract, 3)).toEqual({ suit: 'gras' });
    expect(symbolFor(contract, 4)).toEqual({ suit: 'herz' });
  });

  it('fehlt, solange keiner spielt', () => {
    expect(gameSign(hand({ contract: null, declarer: null }))).toBeNull();
  });
});
