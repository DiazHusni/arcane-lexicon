import * as THREE from 'three'

interface CastAnim {
  timer: number
  duration: number
  /** Normalized XZ direction toward cast target. */
  dir: THREE.Vector3
}

export interface Player {
  mesh: THREE.Group
  health: number
  /** Ambient glow light positioned at the staff orb — always on, intensity 0.3 */
  glow: THREE.PointLight
  /** World-space projectile spawn point (staff orb XZ, Y locked to 0.5). Updated each tick. */
  staffWorldPos: THREE.Vector3
  castAnim: CastAnim | null
}

const ROBE_COLOR  = 0x5E2D9C
const HAT_COLOR   = 0x3A1A6E
const HEAD_COLOR  = 0xF0D9B0
const STAFF_COLOR = 0x8B5E3C
const ORB_COLOR   = 0x00D4FF

/** Group-local XZ offset of the staff (Y ignored — projectiles locked to world y=0.5). */
const STAFF_LOCAL_XZ = new THREE.Vector3(0.35, 0, 0)

/** Duration of the lunge-and-recover cast animation in ms. */
const CAST_DURATION = 320

/** Scratch vector — avoids allocation inside tickPlayer. */
const _staffTemp = new THREE.Vector3()

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
 * a staff with a glowing Sheikah-blue orb. The orb is the projectile origin.
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

  // Glow light starts at orb position
  const glow = new THREE.PointLight(ORB_COLOR, 0.3, 4)
  glow.position.set(0.35, 1.37, 0)
  scene.add(glow)

  return {
    mesh:          group,
    health:        100,
    glow,
    staffWorldPos: new THREE.Vector3(0.35, 0.5, 0),
    castAnim:      null,
  }
}

/**
 * Start a 320 ms lunge-and-recover animation facing the target position.
 * Safe to call mid-animation — restarts with the new direction.
 */
export function triggerCastAnim(player: Player, targetPos: THREE.Vector3): void {
  const dir = new THREE.Vector3(targetPos.x, 0, targetPos.z).normalize()
  // Default forward if target is at player's feet
  if (dir.lengthSq() < 0.01) dir.set(0, 0, -1)
  player.castAnim = { timer: 0, duration: CAST_DURATION, dir }
}

let _t = 0

/** Animate the mage each render frame. Applies cast animation when active. */
export function tickPlayer(player: Player, dtMs: number): void {
  _t += dtMs * 0.001
  const bob = Math.sin(_t * 1.5) * 0.06

  let offsetX = 0
  let offsetZ = 0
  let yRot    = player.mesh.rotation.y

  if (player.castAnim) {
    const ca = player.castAnim
    ca.timer = Math.min(ca.timer + dtMs, ca.duration)
    const p = ca.timer / ca.duration  // 0 → 1

    // Snap to face the target immediately
    yRot = Math.atan2(ca.dir.x, ca.dir.z)

    // Lunge shape: rise to peak at p=0.25, recover through 0 by p=0.7, then done
    const lunge = p < 0.25
      ? p / 0.25                    // 0 → 1
      : p < 0.7
        ? 1 - (p - 0.25) / 0.45    // 1 → 0
        : 0

    offsetX = ca.dir.x * lunge * 0.18
    offsetZ = ca.dir.z * lunge * 0.18

    if (ca.timer >= ca.duration) player.castAnim = null
  }

  player.mesh.position.set(offsetX, 0.05 + bob, offsetZ)
  player.mesh.rotation.y = yRot

  // Recompute staff world position (accounts for Y rotation from cast anim)
  player.mesh.updateWorldMatrix(true, false)
  _staffTemp.copy(STAFF_LOCAL_XZ)
  player.mesh.localToWorld(_staffTemp)
  _staffTemp.y = 0.5  // lock to projectile height
  player.staffWorldPos.copy(_staffTemp)

  // Glow follows the orb
  player.glow.position.set(_staffTemp.x, 1.37 + bob, _staffTemp.z)
}
