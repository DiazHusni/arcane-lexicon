export type GamePhase = 'TITLE' | 'PLAYING' | 'DYING' | 'DEAD' | 'WAVE_CLEAR'

export interface GameData {
  phase: GamePhase
  health: number
  wave: number
  score: number
}
