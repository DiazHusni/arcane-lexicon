import type { EnemyConfig } from '../../types/enemy'
import type { LoadedModel, AnimController } from '../../types/animation'
import { cloneModel, findMaterial } from '../../loader/modelLoader'
import { createAnimController } from '../../animation/animationController'
import * as THREE from 'three'

export const NEXUS_CONFIG: EnemyConfig = {
  type: 'nexus',
  baseSpeed: 0.21,
  health: 2,           // survives Phase 1 hit; dies on Phase 2
  threatRadius: 1.5,
  tierPoints: 100,
  geometryRadius: 0.9,
}

export function createNexusInstance(
  baseModel: LoadedModel,
): { group: THREE.Group; bodyMat: THREE.MeshStandardMaterial; animController: AnimController } {
  const cloned = cloneModel(baseModel)
  const group = cloned.scene

  const sharedMat = findMaterial(group, 'nexus_body')
  const bodyMat = sharedMat ? sharedMat.clone() : new THREE.MeshStandardMaterial({ flatShading: true })

  if (sharedMat) {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material === sharedMat) {
        child.material = bodyMat
      }
    })
  }

  const animController = createAnimController(group, cloned.animations)

  return { group, bodyMat, animController }
}
