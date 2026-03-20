import { describe, it, expect } from 'vitest'
import { createSpellStates, checkUnlocks } from './unlocks'

describe('createSpellStates', () => {
  it('returns 4 spells', () => {
    expect(createSpellStates()).toHaveLength(4)
  })

  it('FULMEN is unlocked from start (0 kills)', () => {
    const spells = createSpellStates()
    const fulmen = spells.find(s => s.word === 'fulmen')!
    expect(fulmen.unlocked).toBe(true)
  })

  it('GELU is locked from start', () => {
    const spells = createSpellStates()
    const gelu = spells.find(s => s.word === 'gelu')!
    expect(gelu.unlocked).toBe(false)
  })

  it('all spells start with 0 cooldown', () => {
    const spells = createSpellStates()
    expect(spells.every(s => s.cooldownRemaining === 0)).toBe(true)
  })
})

describe('checkUnlocks', () => {
  it('unlocks GELU at 5 kills', () => {
    const spells = createSpellStates()
    const { spells: updated, newlyUnlocked } = checkUnlocks(spells, 5)
    const gelu = updated.find(s => s.word === 'gelu')!
    expect(gelu.unlocked).toBe(true)
    expect(newlyUnlocked.some(u => u.word === 'gelu')).toBe(true)
  })

  it('unlocks ARMA at 15 kills', () => {
    const spells = createSpellStates()
    const { spells: updated, newlyUnlocked } = checkUnlocks(spells, 15)
    expect(updated.find(s => s.word === 'arma')!.unlocked).toBe(true)
    expect(newlyUnlocked.some(u => u.word === 'arma')).toBe(true)
  })

  it('unlocks BREVE at 25 kills', () => {
    const spells = createSpellStates()
    const { spells: updated, newlyUnlocked } = checkUnlocks(spells, 25)
    expect(updated.find(s => s.word === 'breve')!.unlocked).toBe(true)
    expect(newlyUnlocked.some(u => u.word === 'breve')).toBe(true)
  })

  it('does not re-unlock already-unlocked spells', () => {
    let { spells } = checkUnlocks(createSpellStates(), 5)
    const { newlyUnlocked } = checkUnlocks(spells, 5)
    expect(newlyUnlocked.some(u => u.word === 'gelu')).toBe(false)
  })

  it('4 kills → GELU not yet unlocked', () => {
    const { spells } = checkUnlocks(createSpellStates(), 4)
    expect(spells.find(s => s.word === 'gelu')!.unlocked).toBe(false)
  })

  it('does not mutate input spells', () => {
    const spells = createSpellStates()
    checkUnlocks(spells, 25)
    expect(spells.find(s => s.word === 'gelu')!.unlocked).toBe(false)
  })
})
