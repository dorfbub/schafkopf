import { type Bot, type BotStrength, type RuleSet } from '@schafkopf/core';
import { createBeginnerBot } from './beginnerBot';
import { createHeuristicBot } from './heuristicBot';
import { type StrongBotOptions, createStrongBot } from './strongBot';

/** Was der Gastgeber zusätzlich mitgeben kann (nur „Stark“ nutzt es). */
export type BotFactoryOptions = Omit<StrongBotOptions, 'rules'>;

/**
 * Bot der gewählten Stärke (B2): „Anfänger“, „Normal“ (Heuristik-Bot aus B1) oder „Stark“
 * (Monte-Carlo-Suche). `rules` sind die öffentlichen Tischregeln.
 */
export function createBotOfStrength(
  strength: BotStrength,
  seed: number,
  rules?: RuleSet,
  options: BotFactoryOptions = {},
): Bot {
  switch (strength) {
    case 'anfaenger':
      return createBeginnerBot(seed);
    case 'normal':
      return createHeuristicBot(seed);
    case 'stark':
      return createStrongBot(seed, { ...options, ...(rules ? { rules } : {}) });
  }
}
