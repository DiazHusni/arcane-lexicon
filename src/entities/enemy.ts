import * as THREE from 'three'
import type { EnemyType } from '../types/enemy'
import { DAMAGE_WARNING_MS, DAMAGE_COOLDOWN_MS } from '../constants/game'

export interface Enemy {
  id: number
  type: EnemyType
  mesh: THREE.Mesh
  labelEl: HTMLElement
  word: string
  displayWord: string       // shown in billboard; may be shortened by BREVE
  position: THREE.Vector3
  prevPosition: THREE.Vector3
  velocity: THREE.Vector3
  speed: number             // base speed scaled per wave
  health: number
  maxHealth: number
  threatRadius: number
  tierPoints: number
  markedForDeath: boolean
  stunTimer: number         // ms remaining — move() is no-op while > 0
  speedMultiplier: number   // 1.0 = normal; 0.4 = GELU peak
  damageWarningTimer: number // ms until next damage tick (warning phase)
  damageCooldown: number    // ms until this enemy can damage again
  nexusPhase: number        // Nexus only: 1 or 2
  alive: boolean
}

const SEEK_WEIGHT       = 1.0
const SEPARATION_WEIGHT = 0.8

export function move(
  enemy: Enemy,
  playerPos: THREE.Vector3,
  allEnemies: Enemy[],
  dt: number,
): void {
  if (!enemy.alive || enemy.markedForDeath) return
  if (enemy.stunTimer > 0) {
    enemy.stunTimer = Math.max(0, enemy.stunTimer - dt)
    return
  }

  const dtSec = dt / 1000
  const effectiveSpeed = enemy.speed * enemy.speedMultiplier

  // Seek direction toward player
  const seekDir = new THREE.Vector3()
    .subVectors(playerPos, enemy.position)
    .normalize()

  // Separation from nearby enemies
  const separDir = new THREE.Vector3()
  const sepRadius = enemy.threatRadius * 1.5
  for (const other of allEnemies) {
    if (other.id === enemy.id || !other.alive) continue
    const dist = enemy.position.distanceTo(other.position)
    if (dist > 0 && dist < sepRadius) {
      const away = new THREE.Vector3()
        .subVectors(enemy.position, other.position)
        .normalize()
        .multiplyScalar(1 / dist)
      separDir.add(away)
    }
  }
  if (separDir.lengthSq() > 0) separDir.normalize()

  // Weighted sum → steering
  const steering = new THREE.Vector3()
    .addScaledVector(seekDir, SEEK_WEIGHT)
    .addScaledVector(separDir, SEPARATION_WEIGHT)

  if (steering.lengthSq() > 0) {
    steering.normalize().multiplyScalar(effectiveSpeed * dtSec)
  }

  enemy.prevPosition.copy(enemy.position)
  enemy.position.add(steering)
  enemy.mesh.position.copy(enemy.position)
  enemy.mesh.rotation.y += 0.01  // slow rotation while alive
}

export interface DamageEvent {
  damage: number
  enemyId: number
}

/**
 * Tick proximity damage logic each fixed step.
 * Returns a DamageEvent if damage should be applied this tick, otherwise null.
 */
export function tickProximityDamage(
  enemy: Enemy,
  playerPos: THREE.Vector3,
  dt: number,
): DamageEvent | null {
  if (!enemy.alive || enemy.markedForDeath) return null

  const dist = enemy.position.distanceTo(playerPos)
  if (dist > enemy.threatRadius) {
    enemy.damageWarningTimer = DAMAGE_WARNING_MS
    return null
  }

  if (enemy.damageCooldown > 0) {
    enemy.damageCooldown = Math.max(0, enemy.damageCooldown - dt)
    return null
  }

  enemy.damageWarningTimer = Math.max(0, enemy.damageWarningTimer - dt)

  if (enemy.damageWarningTimer <= 0) {
    enemy.damageCooldown = DAMAGE_COOLDOWN_MS
    enemy.damageWarningTimer = DAMAGE_WARNING_MS
    return { damage: 10, enemyId: enemy.id }
  }

  return null
}

export function markForDeath(enemy: Enemy): void {
  enemy.markedForDeath = true
  enemy.damageWarningTimer = DAMAGE_WARNING_MS
  if (enemy.labelEl) enemy.labelEl.style.opacity = '0.2'
}

export function applyStun(enemy: Enemy, durationMs: number): void {
  enemy.stunTimer = Math.max(enemy.stunTimer, durationMs)
}

export function applySpeedMultiplier(enemy: Enemy, multiplier: number): void {
  enemy.speedMultiplier = multiplier
}

/** Apply BREVE shortening — updates displayWord and billboard text. */
export function applyShorten(enemy: Enemy, letters: number): void {
  const keepLen = Math.max(1, enemy.word.length - letters)
  enemy.displayWord = enemy.word.slice(0, keepLen)
  if (enemy.labelEl) {
    const dots = '·'.repeat(enemy.word.length - keepLen)
    enemy.labelEl.textContent = enemy.displayWord + dots
  }
}

/** Restore the full word after BREVE expires. */
export function restoreWord(enemy: Enemy): void {
  enemy.displayWord = enemy.word
  if (enemy.labelEl) enemy.labelEl.textContent = enemy.word
}

/** Remove the enemy from view. Call when death animation is complete. */
export function die(enemy: Enemy): void {
  enemy.alive = false
  enemy.mesh.visible = false
  if (enemy.labelEl) enemy.labelEl.style.display = 'none'
}
