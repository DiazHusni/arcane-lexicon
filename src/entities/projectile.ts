import * as THREE from 'three'
import type { Enemy } from './enemy'
import { PROJECTILE_SPEED } from '../constants/game'
import { HEX } from '../constants/colors'

const BASE_RADIUS = 0.15

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

/** Visual size of the projectile sphere (world units). */
export function projectileSize(wordLength: number): number {
  return lerp(0.08, 0.40, (wordLength - 3) / 9)
}

export interface Projectile {
  mesh: THREE.Mesh
  active: boolean
  targetEnemy: Enemy | null
  wordLength: number
}

export function createProjectilePool(scene: THREE.Scene, size: number): Projectile[] {
  return Array.from({ length: size }, () => {
    const geo = new THREE.SphereGeometry(BASE_RADIUS, 8, 6)
    const mat = new THREE.MeshLambertMaterial({
      color: HEX.AMBER,
      emissive: HEX.AMBER,
      emissiveIntensity: 0.6,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.visible = false
    scene.add(mesh)
    return { mesh, active: false, targetEnemy: null, wordLength: 0 }
  })
}

/** Acquire a slot from the pool, positioning it at origin aimed at target. */
export function acquireProjectile(
  pool: Projectile[],
  origin: THREE.Vector3,
  target: Enemy,
  wordLength: number,
): Projectile | null {
  const slot = pool.find(p => !p.active)
  if (!slot) return null

  const scale = projectileSize(wordLength) / BASE_RADIUS
  slot.mesh.scale.setScalar(scale)
  slot.mesh.position.copy(origin)
  slot.mesh.position.y = 0.5
  slot.mesh.visible = true
  slot.active = true
  slot.targetEnemy = target
  slot.wordLength = wordLength
  return slot
}

export function releaseProjectile(proj: Projectile): void {
  proj.active = false
  proj.mesh.visible = false
  proj.targetEnemy = null
}

export interface ImpactEvent {
  proj: Projectile
  enemy: Enemy
}

/**
 * Move all active projectiles. Returns a list of impact events
 * for projectiles that reached their targets this tick.
 */
export function moveProjectiles(pool: Projectile[], dt: number): ImpactEvent[] {
  const impacts: ImpactEvent[] = []
  const dtSec = dt / 1000

  for (const proj of pool) {
    if (!proj.active || !proj.targetEnemy) continue

    const target = proj.targetEnemy
    const dir = new THREE.Vector3().subVectors(target.position, proj.mesh.position)
    const dist = dir.length()

    if (dist < 0.3) {
      impacts.push({ proj, enemy: target })
      releaseProjectile(proj)
      continue
    }

    dir.normalize().multiplyScalar(PROJECTILE_SPEED * dtSec)
    proj.mesh.position.add(dir)
    proj.mesh.position.y = 0.5
  }

  return impacts
}
