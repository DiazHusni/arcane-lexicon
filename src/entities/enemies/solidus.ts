import type { EnemyConfig } from '../../types/enemy'
import { HEX } from '../../constants/colors'
import * as THREE from 'three'

export const SOLIDUS_CONFIG: EnemyConfig = {
  type: 'solidus',
  baseSpeed: 0.6,
  health: 1,
  threatRadius: 0.95,
  tierPoints: 20,
  geometryRadius: 0.5,
}

export function createSolidusMesh(): THREE.Mesh {
  const geo = new THREE.BoxGeometry(
    SOLIDUS_CONFIG.geometryRadius * 1.4,
    SOLIDUS_CONFIG.geometryRadius * 1.4,
    SOLIDUS_CONFIG.geometryRadius * 1.4,
  )
  const mat = new THREE.MeshLambertMaterial({ color: HEX.AMBER, flatShading: true })
  return new THREE.Mesh(geo, mat)
}
