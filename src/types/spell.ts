export type SpellTarget = 'nearest' | 'all' | 'player' | 'none'

export type SpellEffect =
  | { type: 'aoe_clear'; radius: number }
  | { type: 'freeze'; durationMs: number }
  | { type: 'shorten'; letters: number; durationMs: number }
  | { type: 'shield'; blocksNextHit: true; expiryMs: number }

export interface SpellDefinition {
  word: string
  cooldownMs: number
  target: SpellTarget
  effect: SpellEffect
  vfxKey: string
  sfxKey: string
  unlockAtKills: number
}

export interface SpellState {
  word: string
  cooldownRemaining: number  // ms; 0 = ready
  unlocked: boolean
}
