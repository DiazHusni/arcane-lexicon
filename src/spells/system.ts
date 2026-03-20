import type { SpellState } from '../types/spell'
import { getSpellDefinition } from './definitions'
import { GELU_RAMP_BACK_MS, GELU_SLOW_FACTOR } from '../constants/game'

// ── Cooldown management ───────────────────────────────────────────────────

export function tickCooldowns(spells: SpellState[], dt: number): SpellState[] {
  return spells.map(s => ({
    ...s,
    cooldownRemaining: Math.max(0, s.cooldownRemaining - dt),
  }))
}

export function isSpellReady(spells: SpellState[], word: string): boolean {
  const s = spells.find(sp => sp.word === word)
  return s !== undefined && s.unlocked && s.cooldownRemaining === 0
}

/**
 * Start the cooldown for a spell. For ARMA the cooldown is deferred to shield
 * expiry — callers must NOT call this on ARMA cast.
 */
export function startCooldown(spells: SpellState[], word: string): SpellState[] {
  const def = getSpellDefinition(word)
  if (!def) return spells
  return spells.map(s =>
    s.word === word ? { ...s, cooldownRemaining: def.cooldownMs } : s,
  )
}

// ── Active effect tickers ─────────────────────────────────────────────────

export interface GeluTick {
  remaining: number | null  // null = expired
  speedMultiplier: number
}

/** Tick GELU slow. Returns remaining ms (null if expired) and current speed multiplier. */
export function tickGeluEffect(remaining: number, dt: number): GeluTick {
  const next = remaining - dt
  if (next <= 0) return { remaining: null, speedMultiplier: 1.0 }
  if (next <= GELU_RAMP_BACK_MS) {
    // Linearly ramp from GELU_SLOW_FACTOR → 1.0 over last 2s
    const t = next / GELU_RAMP_BACK_MS  // 1.0 at ramp start, 0.0 at end
    const mult = GELU_SLOW_FACTOR + (1.0 - GELU_SLOW_FACTOR) * (1.0 - t)
    return { remaining: next, speedMultiplier: mult }
  }
  return { remaining: next, speedMultiplier: GELU_SLOW_FACTOR }
}

/** Tick ARMA shield. Returns remaining ms and whether it just expired. */
export function tickArmaShield(
  remaining: number,
  dt: number,
): { remaining: number; expired: boolean } {
  const next = remaining - dt
  if (next <= 0) return { remaining: 0, expired: true }
  return { remaining: next, expired: false }
}

/** Tick BREVE effect. Returns remaining ms, or null if expired. */
export function tickBreveEffect(remaining: number, dt: number): number | null {
  const next = remaining - dt
  return next <= 0 ? null : next
}

// ── Spell casting ─────────────────────────────────────────────────────────

export interface CastResult {
  spells: SpellState[]
  shieldActivated: boolean
  geluActivated: boolean
  breveActivated: boolean
  aoeRadius: number | null  // non-null for FULMEN
}

/**
 * Cast a spell by name. Returns updated spell states and which effects fired.
 * Cooldown is started immediately UNLESS the spell is ARMA (deferred to shield expiry).
 */
export function castSpell(spells: SpellState[], word: string): CastResult {
  const def = getSpellDefinition(word)
  if (!def) {
    return { spells, shieldActivated: false, geluActivated: false, breveActivated: false, aoeRadius: null }
  }

  const shieldActivated = def.effect.type === 'shield'
  const geluActivated   = def.effect.type === 'freeze'
  const breveActivated  = def.effect.type === 'shorten'
  const aoeRadius       = def.effect.type === 'aoe_clear' ? def.effect.radius : null

  // ARMA: cooldown deferred to shield expiry — do NOT start it now
  const updatedSpells = shieldActivated ? spells : startCooldown(spells, word)

  return { spells: updatedSpells, shieldActivated, geluActivated, breveActivated, aoeRadius }
}
