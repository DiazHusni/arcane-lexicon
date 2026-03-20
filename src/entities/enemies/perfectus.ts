import type { EnemyConfig } from '../../types/enemy'
import { HEX } from '../../constants/colors'
import * as THREE from 'three'

export const PERFECTUS_CONFIG: EnemyConfig = {
  type: 'perfectus',
  baseSpeed: 0.36,
  health: 1,
  threatRadius: 1.1,
  tierPoints: 30,
  geometryRadius: 0.6,
}

export function createPerfectusMesh(): THREE.Mesh {
  const geo = new THREE.OctahedronGeometry(PERFECTUS_CONFIG.geometryRadius)
  const mat = new THREE.MeshLambertMaterial({
    color:       HEX.COLD_BLUE,
    emissive:    new THREE.Color(HEX.COLD_BLUE).multiplyScalar(0.15),
    flatShading: true,
  })
  return new THREE.Mesh(geo, mat)
}
