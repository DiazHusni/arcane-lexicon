import { GameData, GamePhase } from '../types/index'
import { PLAYER_HEALTH } from '../constants/game'

export function createGameData(): GameData {
  return {
    phase: 'PLAYING' as GamePhase,
    health: PLAYER_HEALTH,
    wave: 1,
    score: 0,
  }
}

/** Fixed-step update — Phase 1: no enemies or combat yet */
export function update(data: GameData, _dt: number): GameData {
  return data
}
