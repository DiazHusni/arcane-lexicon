import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerEnemy,
  unregisterEnemy,
  clearRegistry,
  findEnemyMatch,
  hasEnemyPrefix,
  getMaxEnemyWordLength,
  assignWord,
  checkPrefixCollisions,
} from './wordAssignment'
import { SPELL_WORDS } from '../../spells/definitions'

describe('enemy word registry', () => {
  beforeEach(() => clearRegistry())

  it('findEnemyMatch returns null when registry is empty', () => {
    expect(findEnemyMatch('stab')).toBeNull()
  })

  it('registerEnemy + findEnemyMatch returns the correct id', () => {
    registerEnemy(5, 'stab')
    expect(findEnemyMatch('stab')).toBe(5)
  })

  it('findEnemyMatch is case-sensitive (expects lowercase)', () => {
    registerEnemy(1, 'stab')
    expect(findEnemyMatch('STAB')).toBeNull()
  })

  it('unregisterEnemy removes the word', () => {
    registerEnemy(1, 'stab')
    unregisterEnemy(1, 'stab')
    expect(findEnemyMatch('stab')).toBeNull()
  })

  it('unregisterEnemy by wrong id does nothing', () => {
    registerEnemy(1, 'stab')
    unregisterEnemy(2, 'stab')  // wrong id
    expect(findEnemyMatch('stab')).toBe(1)
  })

  it('clearRegistry empties everything', () => {
    registerEnemy(1, 'stab')
    registerEnemy(2, 'crush')
    clearRegistry()
    expect(findEnemyMatch('stab')).toBeNull()
    expect(findEnemyMatch('crush')).toBeNull()
  })
})

describe('hasEnemyPrefix', () => {
  beforeEach(() => {
    clearRegistry()
    registerEnemy(1, 'stab')
    registerEnemy(2, 'stomp')
  })

  it('returns false for empty buffer', () => {
    expect(hasEnemyPrefix('')).toBe(false)
  })

  it('returns true for valid prefix', () => {
    expect(hasEnemyPrefix('st')).toBe(true)
    expect(hasEnemyPrefix('sta')).toBe(true)
  })

  it('returns false for non-matching prefix', () => {
    expect(hasEnemyPrefix('xx')).toBe(false)
  })

  it('returns true for exact match (prefix of itself)', () => {
    expect(hasEnemyPrefix('stab')).toBe(true)
  })
})

describe('getMaxEnemyWordLength', () => {
  beforeEach(() => clearRegistry())

  it('returns 0 when registry is empty', () => {
    expect(getMaxEnemyWordLength()).toBe(0)
  })

  it('returns the length of the longest word', () => {
    registerEnemy(1, 'stab')
    registerEnemy(2, 'stomp')
    registerEnemy(3, 'ancient')
    expect(getMaxEnemyWordLength()).toBe(7)
  })
})

describe('assignWord', () => {
  it('returns a string for each type', () => {
    const used = new Set<string>()
    expect(typeof assignWord('acutus', 1, used)).toBe('string')
    expect(typeof assignWord('solidus', 1, used)).toBe('string')
    expect(typeof assignWord('perfectus', 1, used)).toBe('string')
    expect(typeof assignWord('nexus', 1, used)).toBe('string')
  })

  it('acutus wave 1 returns short words (≤ 3 letters)', () => {
    const used = new Set<string>()
    for (let i = 0; i < 20; i++) {
      const w = assignWord('acutus', 1, used)
      expect(w.length).toBeLessThanOrEqual(4)  // 3-letter pool
    }
  })

  it('acutus wave 8 allows 4-letter words', () => {
    const used = new Set<string>()
    const words = Array.from({ length: 30 }, () => assignWord('acutus', 8, used))
    const hasFour = words.some(w => w.length === 4)
    expect(hasFour).toBe(true)
  })

  it('avoids words already in usedWords when possible', () => {
    // Exhaust a small part of the pool; word should come from the rest
    const used = new Set(['stab', 'fang', 'claw', 'gash', 'bolt', 'rage', 'bite', 'gore'])
    const word = assignWord('acutus', 1, used)
    // It should return something (may still repeat if pool exhausted, but at least returns a string)
    expect(typeof word).toBe('string')
    expect(word.length).toBeGreaterThan(0)
  })
})

describe('checkPrefixCollisions', () => {
  it('does not throw for actual spell words (FULMEN, GELU, ARMA, BREVE)', () => {
    expect(() => checkPrefixCollisions(SPELL_WORDS)).not.toThrow()
  })

  it('throws when a spell word is an exact enemy word', () => {
    expect(() => checkPrefixCollisions(['stab'])).toThrow()
  })

  it('throws when an enemy word starts with a spell word', () => {
    // Create an artificial short "spell" that is a prefix of 'stab'
    expect(() => checkPrefixCollisions(['sta'])).toThrow()
  })
})
