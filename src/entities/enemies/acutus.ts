import type { EnemyConfig } from '../../types/enemy'
import type { LoadedModel, AnimController } from '../../types/animation'
import { cloneModel, findMaterial } from '../../loader/modelLoader'
import { createAnimController } from '../../animation/animationController'
import * as THREE from 'three'

export const ACUTUS_CONFIG: EnemyConfig = {
  type: 'acutus',
  baseSpeed: 0.9,
  health: 1,
  threatRadius: 0.8,
  tierPoints: 10,
  geometryRadius: 0.45,
}

/**
 * Create an Acutus instance from a loaded model.
 * Clones the model and creates a unique body material for intensity coloring.
 */
export function createAcutusInstance(
  baseModel: LoadedModel,
): { group: THREE.Group; bodyMat: THREE.MeshStandardMaterial; animController: AnimController } {
  const cloned = cloneModel(baseModel)
  const group = cloned.scene

  // Clone the body material so each enemy can have independent color
  const sharedMat = findMaterial(group, 'acutus_body')
  const bodyMat = sharedMat ? sharedMat.clone() : new THREE.MeshStandardMaterial({ flatShading: true })

  // Apply cloned material to all meshes that had the shared one
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
