import { describe, it, expect } from 'vitest'
import { processTick } from './loop'
import { FIXED_STEP, MAX_DT } from '../constants/game'

describe('fixed-timestep loop', () => {
  it('calls update exactly once for dt = FIXED_STEP', () => {
    let calls = 0
    processTick(0, FIXED_STEP, () => calls++)
    expect(calls).toBe(1)
  })

  it('calls update twice for dt = 2 × FIXED_STEP', () => {
    let calls = 0
    processTick(0, FIXED_STEP * 2, () => calls++)
    expect(calls).toBe(2)
  })

  it('calls update zero times when dt < FIXED_STEP', () => {
    let calls = 0
    processTick(0, FIXED_STEP * 0.5, () => calls++)
    expect(calls).toBe(0)
  })

  it('accumulates a partial remainder', () => {
    let calls = 0
    const result = processTick(0, FIXED_STEP * 1.5, () => calls++)
    expect(calls).toBe(1)
    expect(result.accumulator).toBeCloseTo(FIXED_STEP * 0.5, 5)
  })

  it('carries accumulator across frames', () => {
    let calls = 0
    const r1 = processTick(0, FIXED_STEP * 0.8, () => calls++)
    expect(calls).toBe(0)
    const r2 = processTick(r1.accumulator, FIXED_STEP * 0.8, () => calls++)
    expect(calls).toBe(1)
    expect(r2.accumulator).toBeCloseTo(FIXED_STEP * 0.6, 5)
  })

  it('alpha is in [0, 1) for any dt', () => {
    for (const rawDt of [0, FIXED_STEP * 0.3, FIXED_STEP * 1.7, MAX_DT]) {
      const { alpha } = processTick(0, rawDt, () => {})
      expect(alpha).toBeGreaterThanOrEqual(0)
      expect(alpha).toBeLessThan(1)
    }
  })

  it('accumulator stays in [0, FIXED_STEP) regardless of dt', () => {
    // FIXED_STEP = 1000/60 is a repeating decimal; floating-point accumulation
    // means accumulator won't be exactly 0 — but it must stay within one step.
    for (const rawDt of [FIXED_STEP, FIXED_STEP * 3, FIXED_STEP * 5.9, MAX_DT]) {
      const { accumulator } = processTick(0, rawDt, () => {})
      expect(accumulator).toBeGreaterThanOrEqual(0)
      expect(accumulator).toBeLessThan(FIXED_STEP)
    }
  })

  it('clamps dt to MAX_DT — spiral of death prevention', () => {
    let calls = 0
    processTick(0, 99999, () => calls++)
    expect(calls).toBeLessThanOrEqual(Math.ceil(MAX_DT / FIXED_STEP) + 1)
  })

  it('passes the fixed step duration to update', () => {
    const steps: number[] = []
    processTick(0, FIXED_STEP * 2, (dt) => steps.push(dt))
    expect(steps).toEqual([FIXED_STEP, FIXED_STEP])
  })

  it('respects a custom fixedStep parameter', () => {
    let calls = 0
    processTick(0, 100, () => calls++, 50)
    expect(calls).toBe(2)
  })

  it('accumulator never exceeds fixedStep', () => {
    const { accumulator } = processTick(0, MAX_DT, () => {})
    expect(accumulator).toBeLessThan(FIXED_STEP)
  })
})
