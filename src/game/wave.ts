import type { EnemyType } from '../types/enemy'

/** Total enemy count for a given wave number. */
export function enemyCount(wave: number): number {
  return Math.floor(3 + wave * 1.5)
}

/** Fractional distribution of enemy types per wave. */
export function spawnDistribution(wave: number): Record<EnemyType, number> {
  if (wave <= 2) return { acutus: 1.0, solidus: 0.0, perfectus: 0.0, nexus: 0.0 }
  if (wave <= 4) return { acutus: 0.7, solidus: 0.3, perfectus: 0.0, nexus: 0.0 }
  if (wave <= 7) return { acutus: 0.4, solidus: 0.4, perfectus: 0.2, nexus: 0.0 }
  return              { acutus: 0.2, solidus: 0.3, perfectus: 0.4, nexus: 0.1 }
}

/** Enemy movement speed multiplier for a given wave (5% per wave, capped at 2×). */
export function speedScale(wave: number): number {
  return Math.min(2.0, 1.0 + wave * 0.05)
}

/**
 * Produce an ordered list of enemy types to spawn for a given wave.
 * The list is shuffled so enemies arrive in unpredictable order.
 */
export function getSpawnList(wave: number): EnemyType[] {
  const count = enemyCount(wave)
  const dist = spawnDistribution(wave)
  const list: EnemyType[] = []

  const types: EnemyType[] = ['acutus', 'solidus', 'perfectus', 'nexus']
  for (const type of types) {
    const n = Math.round(dist[type] * count)
    for (let i = 0; i < n; i++) list.push(type)
  }

  // Adjust to exactly `count` due to rounding
  while (list.length < count) list.push('acutus')
  while (list.length > count) list.pop()

  // Fisher-Yates shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }

  return list
}

/** Random spawn position along the arena boundary edge. */
export function randomSpawnPosition(arenaHalfSize: number): { x: number; z: number } {
  const edge = Math.floor(Math.random() * 4)
  const t = (Math.random() * 2 - 1) * (arenaHalfSize - 1)
  const r = arenaHalfSize - 0.5
  switch (edge) {
    case 0: return { x: t, z: -r }  // North
    case 1: return { x: t, z:  r }  // South
    case 2: return { x: -r, z: t }  // West
    default: return { x:  r, z: t } // East
  }
}
