import type { SpellState } from '../types/spell'
import {
  findEnemyMatch,
  hasEnemyPrefix,
  getMaxEnemyWordLength,
} from '../entities/enemies/wordAssignment'
import { SPELL_DEFINITIONS, hasSpellPrefix } from '../spells/definitions'

export interface InputState {
  readonly buffer: readonly string[]
}

export type MatchType = 'enemy' | 'spell' | 'deadend' | 'none'

export interface InputMatchResult {
  type: MatchType
  enemyId: number | null   // set when type === 'enemy'
  spellWord: string | null // set when type === 'spell'
  newState: InputState
}

export function createInputState(): InputState {
  return { buffer: [] }
}

/**
 * Process a single keydown event against the current word registries.
 *
 * Priority:
 *   1. Enemy word exact match → type='enemy', clear buffer
 *   2. Unlocked + ready spell exact match → type='spell', clear buffer
 *   3. No prefix in either registry → type='deadend', clear buffer
 *   4. Otherwise → type='none', keep accumulating
 *
 * Accepts A-Z (case-insensitive) and Backspace. All other keys are ignored.
 */
export function handleKeydown(
  state: InputState,
  key: string,
  spells: SpellState[],
): InputMatchResult {
  // Backspace — trim buffer, no match check
  if (key === 'Backspace') {
    return {
      type: 'none',
      enemyId: null,
      spellWord: null,
      newState: { buffer: state.buffer.slice(0, -1) },
    }
  }

  // Only A-Z accepted
  if (!key.match(/^[A-Z]$/i)) {
    return { type: 'none', enemyId: null, spellWord: null, newState: state }
  }

  const newState: InputState = { buffer: [...state.buffer, key.toLowerCase()] }
  const buffer = newState.buffer.join('')

  // 1. Enemy word exact match
  const enemyId = findEnemyMatch(buffer)
  if (enemyId !== null) {
    return { type: 'enemy', enemyId, spellWord: null, newState: { buffer: [] } }
  }

  // 2. Unlocked + ready spell exact match
  const readySpells = spells.filter(s => s.unlocked && s.cooldownRemaining === 0)
  const matchedSpell = readySpells.find(s => s.word === buffer)
  if (matchedSpell) {
    return { type: 'spell', enemyId: null, spellWord: matchedSpell.word, newState: { buffer: [] } }
  }

  // 3. Dead-end: no prefix match anywhere
  const unlockedWords = spells.filter(s => s.unlocked).map(s => s.word)
  const hasEPrefix = hasEnemyPrefix(buffer)
  const hasSPrefix = hasSpellPrefix(buffer, unlockedWords)

  if (!hasEPrefix && !hasSPrefix) {
    return { type: 'deadend', enemyId: null, spellWord: null, newState: { buffer: [] } }
  }

  // Buffer length guard
  const maxEnemyLen = getMaxEnemyWordLength()
  const maxSpellLen = SPELL_DEFINITIONS.reduce((m, d) => Math.max(m, d.word.length), 0)
  if (buffer.length > Math.max(maxEnemyLen, maxSpellLen)) {
    return { type: 'deadend', enemyId: null, spellWord: null, newState: { buffer: [] } }
  }

  return { type: 'none', enemyId: null, spellWord: null, newState }
}

/** Returns the current buffer as a single lowercase string. */
export function getBufferString(state: InputState): string {
  return state.buffer.join('')
}

/** Returns a new InputState with an empty buffer. */
export function clearBuffer(_state: InputState): InputState {
  return { buffer: [] }
}

/**
 * Auto-focus: find the enemy id whose word shares the longest prefix with buffer.
 * If buffer is empty, returns the nearest enemy by Euclidean distance.
 */
export function findAutoFocusEnemy(
  buffer: string,
  enemyWords: Map<number, string>,
  playerX: number,
  playerZ: number,
  enemyPositions: Map<number, { x: number; z: number }>,
): number | null {
  if (buffer.length === 0) {
    let nearest: number | null = null
    let nearestDist = Infinity
    for (const [id, pos] of enemyPositions) {
      const dx = pos.x - playerX
      const dz = pos.z - playerZ
      const dist = dx * dx + dz * dz  // squared distance is fine for comparison
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = id
      }
    }
    return nearest
  }

  let bestId: number | null = null
  let bestLen = -1
  for (const [id, word] of enemyWords) {
    if (word.startsWith(buffer) && buffer.length > bestLen) {
      bestLen = buffer.length
      bestId = id
    }
  }
  return bestId
}
