import { describe, it, expect } from 'vitest'
import { enemyCount, spawnDistribution, speedScale, getSpawnList } from './wave'

describe('enemyCount', () => {
  it('wave 1 → 4', () => expect(enemyCount(1)).toBe(4))
  it('wave 2 → 6', () => expect(enemyCount(2)).toBe(6))
  it('wave 5 → 10', () => expect(enemyCount(5)).toBe(10))
  it('wave 10 → 18', () => expect(enemyCount(10)).toBe(18))
})

describe('speedScale', () => {
  it('wave 1 → ~1.05', () => expect(speedScale(1)).toBeCloseTo(1.05))
  it('wave 20 → 2.0 (capped)', () => expect(speedScale(20)).toBe(2.0))
  it('wave 100 → 2.0 (capped)', () => expect(speedScale(100)).toBe(2.0))
  it('increases with wave up to cap', () => {
    expect(speedScale(5)).toBeGreaterThan(speedScale(1))
    expect(speedScale(10)).toBeGreaterThan(speedScale(5))
  })
})

describe('spawnDistribution', () => {
  it('wave 1 — all acutus', () => {
    const d = spawnDistribution(1)
    expect(d.acutus).toBe(1.0)
    expect(d.solidus).toBe(0.0)
    expect(d.nexus).toBe(0.0)
  })

  it('wave 3 — acutus + solidus', () => {
    const d = spawnDistribution(3)
    expect(d.acutus).toBeGreaterThan(0)
    expect(d.solidus).toBeGreaterThan(0)
    expect(d.perfectus).toBe(0.0)
    expect(d.nexus).toBe(0.0)
  })

  it('wave 8+ — all four types', () => {
    const d = spawnDistribution(8)
    expect(d.nexus).toBeGreaterThan(0)
    expect(d.perfectus).toBeGreaterThan(0)
  })

  it('fractions sum to ~1.0', () => {
    for (const w of [1, 3, 5, 8]) {
      const d = spawnDistribution(w)
      const sum = d.acutus + d.solidus + d.perfectus + d.nexus
      expect(sum).toBeCloseTo(1.0, 5)
    }
  })
})

describe('getSpawnList', () => {
  it('returns exactly enemyCount(wave) entries', () => {
    for (const w of [1, 2, 5, 8]) {
      const list = getSpawnList(w)
      expect(list.length).toBe(enemyCount(w))
    }
  })

  it('wave 1 → only acutus', () => {
    const list = getSpawnList(1)
    expect(list.every(t => t === 'acutus')).toBe(true)
  })

  it('wave 8 → contains nexus', () => {
    // Run multiple times since it's random — at least one in 10 runs should have nexus
    const results = Array.from({ length: 10 }, () => getSpawnList(8))
    const someHaveNexus = results.some(list => list.includes('nexus'))
    expect(someHaveNexus).toBe(true)
  })
})
