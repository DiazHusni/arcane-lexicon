import type { EnemyConfig } from '../../types/enemy'
import { HEX } from '../../constants/colors'
import * as THREE from 'three'

export const ACUTUS_CONFIG: EnemyConfig = {
  type: 'acutus',
  baseSpeed: 0.9,
  health: 1,
  threatRadius: 0.8,
  tierPoints: 10,
  geometryRadius: 0.45,
}

export function createAcutusMesh(): THREE.Mesh {
  const geo = new THREE.TetrahedronGeometry(ACUTUS_CONFIG.geometryRadius)
  const mat = new THREE.MeshLambertMaterial({
    color:       HEX.COLD_BLUE,
    emissive:    new THREE.Color(HEX.COLD_BLUE).multiplyScalar(0.15),
    flatShading: true,
  })
  return new THREE.Mesh(geo, mat)
}
