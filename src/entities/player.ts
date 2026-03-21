import * as THREE from 'three'

export interface Player {
  mesh: THREE.Mesh
  health: number
  /** Ambient glow light at player position — always on, intensity 0.3 */
  glow: THREE.PointLight
}

/**
 * Creates the player as a glowing rune ring (TorusGeometry) with a soft
 * ambient PointLight. Replaces the Phase 1/2 placeholder purple sphere.
 */
export function createPlayer(scene: THREE.Scene): Player {
  // Rune ring — flat torus that rotates slowly
  const geo = new THREE.TorusGeometry(0.55, 0.08, 8, 36)
  const mat = new THREE.MeshLambertMaterial({
    color:             0x00D4FF,
    emissive:          new THREE.Color(0x00D4FF),
    emissiveIntensity: 0.6,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(0, 0.3, 0)
  mesh.rotation.x = Math.PI / 2 // lie flat on the arena floor
  scene.add(mesh)

  // Dim ambient glow — always present
  const glow = new THREE.PointLight(0x00D4FF, 0.3, 4)
  glow.position.set(0, 0.5, 0)
  scene.add(glow)

  return { mesh, health: 100, glow }
}

/** Animate the player ring — slow spin. Call each frame with dt in ms. */
export function tickPlayer(player: Player, dtMs: number): void {
  player.mesh.rotation.z += dtMs * 0.0008
}
