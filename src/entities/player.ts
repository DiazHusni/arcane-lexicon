import * as THREE from 'three'

export interface Player {
  mesh: THREE.Group
  health: number
  /** Ambient glow light at player position — always on, intensity 0.3 */
  glow: THREE.PointLight
}

const ROBE_COLOR  = 0x5E2D9C
const HAT_COLOR   = 0x3A1A6E
const HEAD_COLOR  = 0xF0D9B0
const STAFF_COLOR = 0x8B5E3C
const ORB_COLOR   = 0x00D4FF

function mat(color: number, emissive = 0x000000, emissiveIntensity = 0): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color,
    emissive:          new THREE.Color(emissive),
    emissiveIntensity,
    flatShading:       true,
  })
}

/**
 * Creates the player as a low-poly mage figure: robe, head, pointy hat, and
 * a staff with a glowing Sheikah-blue orb.
 */
export function createPlayer(scene: THREE.Scene): Player {
  const group = new THREE.Group()

  // Robe — wide 8-sided cone, bottom at y=0, top at y=1.1
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 8), mat(ROBE_COLOR, ROBE_COLOR, 0.1))
  robe.position.y = 0.55
  group.add(robe)

  // Head — small sphere above the robe collar
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mat(HEAD_COLOR))
  head.position.y = 1.28
  group.add(head)

  // Hat brim — flat disk
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 8), mat(HAT_COLOR))
  brim.position.y = 1.49
  group.add(brim)

  // Hat cone — tall pointy wizard hat
  const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 8), mat(HAT_COLOR, HAT_COLOR, 0.05))
  hatCone.position.y = 1.795
  group.add(hatCone)

  // Staff — thin cylinder slightly to the right
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6), mat(STAFF_COLOR))
  staff.position.set(0.35, 0.65, 0)
  group.add(staff)

  // Orb — glowing Sheikah-blue sphere at the top of the staff
  const orbMat = new THREE.MeshLambertMaterial({
    color:             ORB_COLOR,
    emissive:          new THREE.Color(ORB_COLOR),
    emissiveIntensity: 0.8,
  })
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), orbMat)
  orb.position.set(0.35, 1.32, 0)
  group.add(orb)

  group.position.set(0, 0.05, 0)
  scene.add(group)

  // Glow light positioned at the orb
  const glow = new THREE.PointLight(ORB_COLOR, 0.3, 4)
  glow.position.set(0.35, 1.37, 0)
  scene.add(glow)

  return { mesh: group, health: 100, glow }
}

let _t = 0

/** Animate the mage — gentle floating bob synced to elapsed time. */
export function tickPlayer(player: Player, dtMs: number): void {
  _t += dtMs * 0.001
  const bob = Math.sin(_t * 1.5) * 0.06
  player.mesh.position.y = 0.05 + bob
  player.glow.position.y = 1.37 + bob
}
