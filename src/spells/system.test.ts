import { describe, it, expect } from 'vitest'
import {
  tickCooldowns,
  isSpellReady,
  startCooldown,
  tickGeluEffect,
  tickArmaShield,
  tickBreveEffect,
  castSpell,
} from './system'
import { createSpellStates } from './unlocks'
import type { SpellState } from '../types/spell'

// ── Helpers ───────────────────────────────────────────────────────────────

function allUnlocked(): SpellState[] {
  return createSpellStates().map(s => ({ ...s, unlocked: true }))
}

// ── Cooldown management ───────────────────────────────────────────────────

describe('tickCooldowns', () => {
  it('reduces cooldown by dt', () => {
    const spells = allUnlocked().map(s =>
      s.word === 'gelu' ? { ...s, cooldownRemaining: 3000 } : s,
    )
    const updated = tickCooldowns(spells, 1000)
    const gelu = updated.find(s => s.word === 'gelu')!
    expect(gelu.cooldownRemaining).toBe(2000)
  })

  it('does not go below 0', () => {
    const spells: SpellState[] = [{ word: 'x', cooldownRemaining: 100, unlocked: true }]
    const updated = tickCooldowns(spells, 500)
    expect(updated[0].cooldownRemaining).toBe(0)
  })

  it('does not mutate input', () => {
    const spells: SpellState[] = [{ word: 'x', cooldownRemaining: 2000, unlocked: true }]
    tickCooldowns(spells, 500)
    expect(spells[0].cooldownRemaining).toBe(2000)
  })
})

describe('isSpellReady', () => {
  it('ready when unlocked and cooldown 0', () => {
    const spells: SpellState[] = [{ word: 'fulmen', cooldownRemaining: 0, unlocked: true }]
    expect(isSpellReady(spells, 'fulmen')).toBe(true)
  })

  it('not ready when on cooldown', () => {
    const spells: SpellState[] = [{ word: 'fulmen', cooldownRemaining: 1000, unlocked: true }]
    expect(isSpellReady(spells, 'fulmen')).toBe(false)
  })

  it('not ready when locked', () => {
    const spells: SpellState[] = [{ word: 'gelu', cooldownRemaining: 0, unlocked: false }]
    expect(isSpellReady(spells, 'gelu')).toBe(false)
  })
})

describe('startCooldown', () => {
  it('sets cooldownRemaining to the spell definition cooldownMs', () => {
    const spells = allUnlocked()
    const updated = startCooldown(spells, 'gelu')
    const gelu = updated.find(s => s.word === 'gelu')!
    expect(gelu.cooldownRemaining).toBe(12000)  // GELU cooldown from definitions
  })

  it('does not affect other spells', () => {
    const spells = allUnlocked()
    const updated = startCooldown(spells, 'gelu')
    const fulmen = updated.find(s => s.word === 'fulmen')!
    expect(fulmen.cooldownRemaining).toBe(0)
  })
})

// ── Active effect tickers ─────────────────────────────────────────────────

describe('tickGeluEffect', () => {
  it('returns full slow at start', () => {
    const { speedMultiplier } = tickGeluEffect(7000, 0)
    expect(speedMultiplier).toBe(0.4)
  })

  it('returns null remaining when expired', () => {
    const { remaining } = tickGeluEffect(100, 200)
    expect(remaining).toBeNull()
  })

  it('ramp-back: multiplier increases during last 2s', () => {
    const { speedMultiplier: at2s } = tickGeluEffect(2000, 0)
    const { speedMultiplier: at1s } = tickGeluEffect(1000, 0)
    expect(at1s).toBeGreaterThan(at2s)  // more speed remaining at 1s than at 2s into ramp
    expect(at1s).toBeLessThan(1.0)
  })

  it('ramp-back reaches 1.0 speed at end (just before expiry)', () => {
    const { speedMultiplier } = tickGeluEffect(1, 0)
    expect(speedMultiplier).toBeCloseTo(1.0, 1)
  })
})

describe('tickArmaShield', () => {
  it('not expired when remaining > dt', () => {
    const { remaining, expired } = tickArmaShield(5000, 1000)
    expect(expired).toBe(false)
    expect(remaining).toBe(4000)
  })

  it('expired when dt >= remaining', () => {
    const { expired } = tickArmaShield(500, 1000)
    expect(expired).toBe(true)
  })
})

describe('tickBreveEffect', () => {
  it('returns reduced remaining', () => {
    expect(tickBreveEffect(5000, 1000)).toBe(4000)
  })

  it('returns null when expired', () => {
    expect(tickBreveEffect(500, 1000)).toBeNull()
  })
})

// ── Spell casting ─────────────────────────────────────────────────────────

describe('castSpell', () => {
  it('FULMEN — sets aoeRadius, starts cooldown', () => {
    const result = castSpell(allUnlocked(), 'fulmen')
    expect(result.aoeRadius).not.toBeNull()
    expect(result.aoeRadius).toBeGreaterThan(0)
    const fulmen = result.spells.find(s => s.word === 'fulmen')!
    expect(fulmen.cooldownRemaining).toBe(15000)
  })

  it('GELU — sets geluActivated, starts cooldown', () => {
    const result = castSpell(allUnlocked(), 'gelu')
    expect(result.geluActivated).toBe(true)
    const gelu = result.spells.find(s => s.word === 'gelu')!
    expect(gelu.cooldownRemaining).toBe(12000)
  })

  it('ARMA — sets shieldActivated, does NOT start cooldown (deferred)', () => {
    const result = castSpell(allUnlocked(), 'arma')
    expect(result.shieldActivated).toBe(true)
    const arma = result.spells.find(s => s.word === 'arma')!
    expect(arma.cooldownRemaining).toBe(0)  // deferred — not started on cast
  })

  it('BREVE — sets breveActivated, starts cooldown', () => {
    const result = castSpell(allUnlocked(), 'breve')
    expect(result.breveActivated).toBe(true)
    const breve = result.spells.find(s => s.word === 'breve')!
    expect(breve.cooldownRemaining).toBe(18000)
  })

  it('unknown word returns unchanged spells', () => {
    const spells = allUnlocked()
    const result = castSpell(spells, 'unknown')
    expect(result.spells).toEqual(spells)
    expect(result.shieldActivated).toBe(false)
    expect(result.geluActivated).toBe(false)
  })
})
