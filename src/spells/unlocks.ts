import { SPELL_DEFINITIONS } from './definitions'
import type { SpellState } from '../types/spell'

export function createSpellStates(): SpellState[] {
  return SPELL_DEFINITIONS.map(def => ({
    word: def.word,
    cooldownRemaining: 0,
    unlocked: def.unlockAtKills === 0,
  }))
}

export interface UnlockEvent {
  word: string
  index: number
}

/**
 * Check if any spells should be unlocked given the current kill count.
 * Returns updated spell states and newly unlocked events.
 */
export function checkUnlocks(
  spells: SpellState[],
  kills: number,
): { spells: SpellState[]; newlyUnlocked: UnlockEvent[] } {
  const newlyUnlocked: UnlockEvent[] = []
  const updated = spells.map((s, i) => {
    if (!s.unlocked && SPELL_DEFINITIONS[i].unlockAtKills <= kills) {
      newlyUnlocked.push({ word: s.word, index: i })
      return { ...s, unlocked: true }
    }
    return s
  })
  return { spells: updated, newlyUnlocked }
}
