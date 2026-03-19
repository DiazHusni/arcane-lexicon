import * as THREE from 'three'

export interface Player {
  mesh: THREE.Mesh
  health: number
}

/** Creates a placeholder player mesh and adds it to the scene. */
export function createPlayer(scene: THREE.Scene): Player {
  const geo = new THREE.SphereGeometry(0.5, 10, 8)
  const mat = new THREE.MeshLambertMaterial({ color: 0x7c3aed })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(0, 0.5, 0)
  scene.add(mesh)

  return { mesh, health: 100 }
}
