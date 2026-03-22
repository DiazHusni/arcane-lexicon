import * as THREE from 'three'
import type { EnemyType } from '../types/enemy'
import { DAMAGE_WARNING_MS, DAMAGE_COOLDOWN_MS, ENEMY_DEATH_ANIM_MS } from '../constants/game'
import { HEX } from '../constants/colors'

export interface Enemy {
  id: number
  type: EnemyType
  mesh: THREE.Group
  /** Shared body/head material — updated by setEnemyIntensityColor. */
  bodyMat: THREE.MeshLambertMaterial
  /** Accumulated move time in ms — drives bob animation. */
  animTime: number
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
  deathTimer: number        // > 0 = playing death animation; 0 = fully dead
}

// ── Intensity color system ─────────────────────────────────────────────────

/** Compute intensity (0–1) from wave number. */
export function intensityFromWave(wave: number): number {
  return Math.min(1, (wave - 1) / 6)
}

/** Interpolate enemy color from cold blue → amber based on intensity. */
export function enemyColorFromIntensity(intensity: number): THREE.Color {
  const cold = new THREE.Color(HEX.COLD_BLUE)
  const warm = new THREE.Color(HEX.AMBER)
  return cold.lerp(warm, intensity)
}

/** Apply intensity-driven color to an enemy's body material. */
export function setEnemyIntensityColor(enemy: Enemy, intensity: number): void {
  const col = enemyColorFromIntensity(intensity)
  enemy.bodyMat.color.copy(col)
  enemy.bodyMat.emissive.copy(col).multiplyScalar(0.15)
}

// ── Movement ───────────────────────────────────────────────────────────────

const SEEK_WEIGHT       = 1.0
const SEPARATION_WEIGHT = 0.8

export function move(
  enemy: Enemy,
  playerPos: THREE.Vector3,
  allEnemies: Enemy[],
  dt: number,
): void {
  if (!enemy.alive) return
  if (enemy.stunTimer > 0) {
    enemy.stunTimer = Math.max(0, enemy.stunTimer - dt)
    return
  }

  const dtSec = dt / 1000
  const effectiveSpeed = enemy.speed * enemy.speedMultiplier

  const seekDir = new THREE.Vector3()
    .subVectors(playerPos, enemy.position)
    .normalize()

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

  const steering = new THREE.Vector3()
    .addScaledVector(seekDir, SEEK_WEIGHT)
    .addScaledVector(separDir, SEPARATION_WEIGHT)

  if (steering.lengthSq() > 0) {
    steering.normalize().multiplyScalar(effectiveSpeed * dtSec)
  }

  enemy.prevPosition.copy(enemy.position)
  enemy.position.add(steering)
  enemy.animTime += dt

  // Sync visual position with bob
  const bob = Math.sin(enemy.animTime * 0.003) * 0.07
  enemy.mesh.position.copy(enemy.position)
  enemy.mesh.position.y += bob

  // Face movement direction
  const dx = enemy.position.x - enemy.prevPosition.x
  const dz = enemy.position.z - enemy.prevPosition.z
  if (dx * dx + dz * dz > 0.000001) {
    enemy.mesh.rotation.y = Math.atan2(dx, dz)
  }
}

// ── Proximity damage ───────────────────────────────────────────────────────

export interface DamageEvent {
  damage: number
  enemyId: number
}

export function tickProximityDamage(
  enemy: Enemy,
  playerPos: THREE.Vector3,
  dt: number,
): DamageEvent | null {
  if (!enemy.alive) return null

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

// ── State changes ──────────────────────────────────────────────────────────

export function markForDeath(enemy: Enemy): void {
  enemy.markedForDeath = true
  if (enemy.labelEl) enemy.labelEl.style.opacity = '0.2'
}

export function applyStun(enemy: Enemy, durationMs: number): void {
  enemy.stunTimer = Math.max(enemy.stunTimer, durationMs)
}

export function applySpeedMultiplier(enemy: Enemy, multiplier: number): void {
  enemy.speedMultiplier = multiplier
}

export function applyShorten(enemy: Enemy, letters: number): void {
  const keepLen = Math.max(1, enemy.word.length - letters)
  enemy.displayWord = enemy.word.slice(0, keepLen)
  if (enemy.labelEl) {
    const dots = '·'.repeat(enemy.word.length - keepLen)
    enemy.labelEl.textContent = enemy.displayWord + dots
  }
}

export function restoreWord(enemy: Enemy): void {
  enemy.displayWord = enemy.word
  if (enemy.labelEl) enemy.labelEl.textContent = enemy.word
}

// ── Death animation ────────────────────────────────────────────────────────

/**
 * Begin death animation — sets alive=false (stops movement/damage)
 * but keeps mesh visible for ENEMY_DEATH_ANIM_MS.
 */
export function startDeath(enemy: Enemy): void {
  enemy.alive      = false
  enemy.deathTimer = ENEMY_DEATH_ANIM_MS
  if (enemy.labelEl) enemy.labelEl.style.display = 'none'
}

/**
 * Tick the death animation each frame.
 * Returns true when the animation is complete (caller should call die()).
 */
export function tickDeathAnim(enemy: Enemy, dt: number): boolean {
  if (enemy.deathTimer <= 0) return true

  enemy.deathTimer -= dt
  if (enemy.deathTimer <= 0) {
    die(enemy)
    return true
  }

  // Shattering effect: expand outward then collapse
  const lifeRatio = enemy.deathTimer / ENEMY_DEATH_ANIM_MS // 1→0
  const expand = Math.sin(lifeRatio * Math.PI) * 0.5       // peak mid-animation
  const scale  = lifeRatio * (1 + expand)
  enemy.mesh.scale.setScalar(Math.max(0, scale))

  // Spin faster while dying
  enemy.mesh.rotation.y += dt * 0.008
  enemy.mesh.rotation.x += dt * 0.005

  return false
}

/** Hide the enemy completely — call after death animation completes. */
export function die(enemy: Enemy): void {
  enemy.alive      = false
  enemy.deathTimer = 0
  enemy.mesh.visible = false
  enemy.mesh.scale.setScalar(1) // reset for potential pool reuse
  if (enemy.labelEl) enemy.labelEl.style.display = 'none'
}
