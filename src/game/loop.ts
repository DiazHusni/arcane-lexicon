import { FIXED_STEP, MAX_DT } from '../constants/game'

export interface TickResult {
  /** Leftover milliseconds not yet consumed by a fixed step */
  accumulator: number
  /** Interpolation factor [0, 1) for smooth rendering between steps */
  alpha: number
}

/**
 * Pure fixed-timestep tick logic — no side effects, no requestAnimationFrame.
 *
 * Clamps rawDt to MAX_DT to prevent the spiral of death when the tab is
 * re-focused after being hidden (rawDt would otherwise be seconds).
 *
 * @param accumulator  Leftover ms from the previous frame
 * @param rawDt        Elapsed ms since last frame (will be clamped)
 * @param onUpdate     Called once per fixed step with the step duration
 * @param fixedStep    Step duration in ms (defaults to FIXED_STEP = 1000/60)
 */
export function processTick(
  accumulator: number,
  rawDt: number,
  onUpdate: (step: number) => void,
  fixedStep: number = FIXED_STEP,
): TickResult {
  const dt = Math.min(rawDt, MAX_DT)
  let acc = accumulator + dt

  while (acc >= fixedStep) {
    onUpdate(fixedStep)
    acc -= fixedStep
  }

  return { accumulator: acc, alpha: acc / fixedStep }
}
