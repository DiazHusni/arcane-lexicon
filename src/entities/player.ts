import * as THREE from 'three'
import type { LoadedModel, AnimController } from '../types/animation'
import { cloneModel } from '../loader/modelLoader'
import {
  createAnimController,
  transitionTo,
  tickAnimController,
  onFinished,
} from '../animation/animationController'

export interface Player {
  mesh: THREE.Group
  health: number
  /** Ambient glow light positioned at the staff orb — always on, intensity 0.3 */
  glow: THREE.PointLight
  /** World-space projectile spawn point (staff orb XZ, Y locked to 0.5). Updated each tick. */
  staffWorldPos: THREE.Vector3
  animController: AnimController
}

const ORB_COLOR   = 0x00D4FF

/** Group-local XZ offset of the staff (Y ignored — projectiles locked to world y=0.5). */
const STAFF_LOCAL_XZ = new THREE.Vector3(0.35, 0, 0)

/** Scratch vector — avoids allocation inside tickPlayer. */
const _staffTemp = new THREE.Vector3()

/**
 * Find the "hand.R" bone in the model's skeleton to track the staff orb position.
 * Falls back to a fixed local offset if the bone isn't found.
 */
function findHandBone(scene: THREE.Object3D): THREE.Bone | null {
  let found: THREE.Bone | null = null
  scene.traverse((child) => {
    if (found) return
    if (child instanceof THREE.Bone && child.name === 'hand.R') {
      found = child
    }
  })
  return found
}

/**
 * Creates the player mage from a loaded GLTF model.
 */
export function createPlayer(scene: THREE.Scene, model: LoadedModel): Player {
  const cloned = cloneModel(model)
  const group = cloned.scene
  group.position.set(0, 0.05, 0)

  // In Blender the model is Z-up; GLTF export converts to Y-up automatically.
  // Rotate 180° around Y so the mage faces the camera default direction.
  group.rotation.y = Math.PI
  scene.add(group)

  // Create animation controller
  const animController = createAnimController(group, cloned.animations)

  // Auto-return to idle after cast finishes
  onFinished(animController, (state) => {
    if (state === 'cast') {
      transitionTo(animController, 'idle', 0.2)
    }
  })

  // Glow light for the staff orb
  const glow = new THREE.PointLight(ORB_COLOR, 0.3, 4)
  glow.position.set(0.35, 1.37, 0)
  scene.add(glow)

  return {
    mesh: group,
    health: 100,
    glow,
    staffWorldPos: new THREE.Vector3(0.35, 0.5, 0),
    animController,
  }
}

/**
 * Start the cast animation facing the target position.
 * Safe to call mid-animation — restarts with the new direction.
 */
export function triggerCastAnim(player: Player, targetPos: THREE.Vector3): void {
  const dir = new THREE.Vector3(targetPos.x, 0, targetPos.z).normalize()
  if (dir.lengthSq() < 0.01) dir.set(0, 0, -1)

  // Snap to face the target
  player.mesh.rotation.y = Math.atan2(dir.x, dir.z)

  // Trigger cast animation via the animation controller
  transitionTo(player.animController, 'cast', 0.08)
}

/** Animate the mage each render frame. */
export function tickPlayer(player: Player, dtMs: number): void {
  const dtSec = dtMs * 0.001

  // Tick the animation mixer
  tickAnimController(player.animController, dtSec)

  // Recompute staff world position (accounts for Y rotation)
  player.mesh.updateWorldMatrix(true, true)
  _staffTemp.copy(STAFF_LOCAL_XZ)
  player.mesh.localToWorld(_staffTemp)
  _staffTemp.y = 0.5  // lock to projectile height
  player.staffWorldPos.copy(_staffTemp)

  // Glow follows the orb
  player.glow.position.set(_staffTemp.x, 1.37, _staffTemp.z)
}
