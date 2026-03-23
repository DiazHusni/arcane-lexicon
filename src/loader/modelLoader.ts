import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import type { LoadedModel } from '../types/animation'

const MODEL_PATHS: Record<string, string> = {
  mage:      '/models/mage.glb',
  acutus:    '/models/acutus.glb',
  solidus:   '/models/solidus.glb',
  perfectus: '/models/perfectus.glb',
  nexus:     '/models/nexus.glb',
}

/**
 * Load all character models. Calls onProgress with (loaded, total) counts.
 */
export async function loadAllModels(
  onProgress?: (loaded: number, total: number) => void,
): Promise<Record<string, LoadedModel>> {
  const entries = Object.entries(MODEL_PATHS)
  const total = entries.length
  let loaded = 0

  const loader = new GLTFLoader()
  const models: Record<string, LoadedModel> = {}

  for (const [name, path] of entries) {
    const gltf = await loader.loadAsync(path)

    // Set flat shading on all meshes to maintain stylized look
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        mat.flatShading = true
        mat.needsUpdate = true
      }
    })

    models[name] = {
      scene: gltf.scene,
      animations: gltf.animations,
    }

    loaded++
    onProgress?.(loaded, total)
  }

  return models
}

/**
 * Clone a loaded model for instancing. Each clone gets its own skeleton
 * so animations are independent, but GPU buffers are shared.
 */
export function cloneModel(model: LoadedModel): LoadedModel {
  const clonedScene = SkeletonUtils.clone(model.scene) as THREE.Group
  return {
    scene: clonedScene,
    animations: model.animations,  // clips are shared (read-only data)
  }
}

/**
 * Find a named material on a loaded model's scene graph.
 * Searches all meshes for a material whose name starts with the prefix.
 */
export function findMaterial(
  scene: THREE.Object3D,
  namePrefix: string,
): THREE.MeshStandardMaterial | null {
  let found: THREE.MeshStandardMaterial | null = null
  scene.traverse((child) => {
    if (found) return
    if (child instanceof THREE.Mesh && child.material) {
      const mat = child.material as THREE.MeshStandardMaterial
      if (mat.name && mat.name.startsWith(namePrefix)) {
        found = mat
      }
    }
  })
  return found
}
