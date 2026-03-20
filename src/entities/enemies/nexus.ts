import type { EnemyConfig } from '../../types/enemy'
import { HEX } from '../../constants/colors'
import * as THREE from 'three'

export const NEXUS_CONFIG: EnemyConfig = {
  type: 'nexus',
  baseSpeed: 0.21,
  health: 2,           // survives Phase 1 hit; dies on Phase 2
  threatRadius: 1.5,
  tierPoints: 100,
  geometryRadius: 0.9,
}

export function createNexusMesh(): THREE.Mesh {
  const geo = new THREE.DodecahedronGeometry(NEXUS_CONFIG.geometryRadius)
  const mat = new THREE.MeshLambertMaterial({
    color:       HEX.COLD_BLUE,
    emissive:    new THREE.Color(HEX.COLD_BLUE).multiplyScalar(0.2),
    flatShading: true,
  })
  return new THREE.Mesh(geo, mat)
}
