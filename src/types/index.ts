import type { SpellState } from './spell'

export type GamePhase = 'TITLE' | 'PLAYING' | 'PAUSED' | 'DYING' | 'DEAD' | 'WAVE_CLEAR'

export interface GameData {
  phase: GamePhase
  health: number
  maxHealth: number
  wave: number
  score: number
  kills: number
  comboMultiplier: number
  comboTimer: number          // ms since last kill — resets combo when > COMBO_RESET_MS
  dyingTimer: number          // ms remaining in DYING state
  waveClearTimer: number      // ms remaining in WAVE_CLEAR state
  spells: SpellState[]
  playerShieldActive: boolean
  playerShieldExpiry: number  // ms remaining while ARMA dome is active
  geluRemaining: number       // ms remaining (0 = not active)
  breveRemaining: number      // ms remaining (0 = not active)
  focusedEnemyId: number | null
}
