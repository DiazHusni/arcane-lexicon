import type { EnemyConfig } from '../../types/enemy'
import type { LoadedModel, AnimController } from '../../types/animation'
import { cloneModel, findMaterial } from '../../loader/modelLoader'
import { createAnimController } from '../../animation/animationController'
import * as THREE from 'three'

export const PERFECTUS_CONFIG: EnemyConfig = {
  type: 'perfectus',
  baseSpeed: 0.36,
  health: 1,
  threatRadius: 1.1,
  tierPoints: 30,
  geometryRadius: 0.6,
}

export function createPerfectusInstance(
  baseModel: LoadedModel,
): { group: THREE.Group; bodyMat: THREE.MeshStandardMaterial; animController: AnimController } {
  const cloned = cloneModel(baseModel)
  const group = cloned.scene

  const sharedMat = findMaterial(group, 'perfectus_body')
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
