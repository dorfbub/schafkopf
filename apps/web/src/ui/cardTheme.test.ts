import { SUITS, createDeck } from '@schafkopf/core';
import { describe, expect, it } from 'vitest';
import {
  CARD_THEMES,
  bayerischTheme,
  cardTheme,
  defineCardSet,
  ownFaceCount,
  salzburgerTheme,
} from './cardTheme';

const DECK = createDeck('lang');

describe('Kartenbilder (U9)', () => {
  it('Standard ist das bayerische Bild; unbekannte Kennungen fallen darauf zurück', () => {
    expect(CARD_THEMES[0]).toBe(bayerischTheme);
    expect(cardTheme('bayerisch')).toBe(bayerischTheme);
    expect(cardTheme('salzburger')).toBe(salzburgerTheme);
    expect(cardTheme('wuerttembergisch')).toBe(bayerischTheme);
    expect(cardTheme(undefined)).toBe(bayerischTheme);
  });

  it('Kennungen sind eindeutig und haben die Form, die der Kern prüft', () => {
    const ids = CARD_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]{0,31}$/);
  });

  it('jeder Satz liefert alle 32 Karten, den Rücken und die vier Farbzeichen', () => {
    for (const theme of CARD_THEMES) {
      for (const card of DECK)
        expect(theme.faceImage(card).url, `${theme.id} ${card}`).not.toBe('');
      expect(theme.backImage().url).not.toBe('');
      for (const suit of SUITS) expect(theme.suitUrl(suit)).not.toBe('');
    }
  });

  it('das bayerische Bild ist vollständig und kein Entwurf', () => {
    expect(ownFaceCount(bayerischTheme)).toBe(32);
    expect(bayerischTheme.draft).toBe(false);
  });

  it('das Salzburger Bild bringt alle 32 Karten selbst mit; Rücken und Farbzeichen wie bayerisch', () => {
    expect(ownFaceCount(salzburgerTheme)).toBe(32);
    for (const card of DECK) {
      expect(salzburgerTheme.faceImage(card).url).not.toBe(bayerischTheme.faceImage(card).url);
    }
    expect(salzburgerTheme.backImage()).toEqual(bayerischTheme.backImage());
    expect(salzburgerTheme.suitUrl('herz')).toBe(bayerischTheme.suitUrl('herz'));
  });

  it('das Salzburger Bild hat den Weli und die Sechser für Watten, das bayerische nicht', () => {
    for (const name of ['weli', 'eichel-6', 'gras-6', 'herz-6']) {
      expect(salzburgerTheme.extraImage(name)?.url, name).toBeTruthy();
    }
    expect(salzburgerTheme.extraImage('schellen-6')).toBeUndefined();
    expect(bayerischTheme.extraImage('weli')).toBeUndefined();
  });

  it('ein neuer Satz lässt sich ohne Eingriff in die Spiellogik ergänzen', () => {
    const probe = defineCardSet(
      {
        id: 'probe',
        label: 'Probe',
        faces: { GU: { url: 'gras-unter.png', fit: 'cover' } },
        back: { url: 'ruecken.png', fit: 'cover' },
        suits: { gras: { url: 'gras.png', fit: 'cover' } },
      },
      bayerischTheme,
    );
    expect(probe.faceImage('GU')).toEqual({ url: 'gras-unter.png', fit: 'cover' });
    expect(probe.faceImage('GO')).toEqual(bayerischTheme.faceImage('GO'));
    expect(probe.backImage().url).toBe('ruecken.png');
    expect(probe.suitUrl('gras')).toBe('gras.png');
    expect(probe.suitUrl('eichel')).toBe(bayerischTheme.suitUrl('eichel'));
    expect(ownFaceCount(probe)).toBe(1);
    expect(probe.hasOwnFace('GO')).toBe(false);
  });
});
