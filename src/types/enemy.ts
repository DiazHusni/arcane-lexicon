export type EnemyType = 'acutus' | 'solidus' | 'perfectus' | 'nexus'

export interface EnemyConfig {
  type: EnemyType
  baseSpeed: number
  health: number
  threatRadius: number
  tierPoints: number
  geometryRadius: number
}
