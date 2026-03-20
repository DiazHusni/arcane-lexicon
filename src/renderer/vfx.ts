/**
 * VFX — visual effects: point light pool, spell effects, kill DOM effects.
 */
import * as THREE from 'three'
import { POINT_LIGHT_POOL_SIZE } from '../constants/game'
import { HEX } from '../constants/colors'
import type { ParticleSystem } from './particles'

// ── Point light pool ───────────────────────────────────────────────────────

interface PooledLight {
  light:     THREE.PointLight
  active:    boolean
  elapsed:   number
  duration:  number
  intensity: number
}

let lightPool: PooledLight[] = []

export function initLightPool(scene: THREE.Scene): void {
  lightPool = []
  for (let i = 0; i < POINT_LIGHT_POOL_SIZE; i++) {
    const light = new THREE.PointLight(0xffffff, 0, 12)
    light.visible = false
    scene.add(light)
    lightPool.push({ light, active: false, elapsed: 0, duration: 0, intensity: 0 })
  }
}

export function triggerPointLight(
  position:   THREE.Vector3,
  color:      number,
  intensity:  number,
  durationMs: number,
): void {
  const slot = lightPool.find(l => !l.active)
  if (!slot) return
  slot.light.color.setHex(color)
  slot.light.intensity = intensity
  slot.light.position.copy(position)
  slot.light.visible = true
  slot.active        = true
  slot.elapsed       = 0
  slot.duration      = durationMs
  slot.intensity     = intensity
}

/** Call each frame to fade and release lights. */
export function tickLightPool(dtMs: number): void {
  for (const slot of lightPool) {
    if (!slot.active) continue
    slot.elapsed += dtMs
    if (slot.elapsed >= slot.duration) {
      slot.light.intensity = 0
      slot.light.visible   = false
      slot.active          = false
    } else {
      const t = 1 - slot.elapsed / slot.duration
      slot.light.intensity = slot.intensity * t * t // quadratic fade
    }
  }
}

// ── Spell VFX (3D particles + point light) ────────────────────────────────

export function triggerSpellVfx(
  spellWord: string,
  playerPos: THREE.Vector3,
  particles: ParticleSystem,
): void {
  switch (spellWord) {
    case 'fulmen': vfxFulmen(playerPos, particles); break
    case 'gelu':   vfxGelu(playerPos, particles);   break
    case 'arma':   vfxArma(playerPos, particles);   break
    case 'breve':  vfxBreve(playerPos, particles);  break
  }
}

function vfxFulmen(origin: THREE.Vector3, particles: ParticleSystem): void {
  // Gold arc particles — lightning chains
  particles.emit({
    count: 500, origin, speed: 8, lifetime: 400,
    startSize: 0.02, endSize: 0.00,
    color: new THREE.Color(HEX.GOLD), spread: Math.PI,
  })
  triggerPointLight(origin, HEX.GOLD, 8, 400)
}

function vfxGelu(origin: THREE.Vector3, particles: ParticleSystem): void {
  // Teal expanding ring in XZ plane
  particles.emit({
    count: 300, origin, speed: 3, lifetime: 600,
    startSize: 0.03, endSize: 0.03,
    color: new THREE.Color(HEX.TEAL), spread: Math.PI, radialXZ: true,
  })
  triggerPointLight(origin, HEX.TEAL, 5, 600)
}

function vfxArma(origin: THREE.Vector3, particles: ParticleSystem): void {
  // Soft white particles drifting upward (dome rising)
  particles.emit({
    count: 150, origin, speed: 1, lifetime: 1000,
    startSize: 0.04, endSize: 0.00,
    color: new THREE.Color(HEX.SOFT_WHITE), spread: Math.PI / 2,
  })
  triggerPointLight(origin, HEX.SOFT_WHITE, 4, 800)
}

function vfxBreve(origin: THREE.Vector3, particles: ParticleSystem): void {
  // Cold blue staccato burst
  particles.emit({
    count: 200, origin, speed: 4, lifetime: 300,
    startSize: 0.02, endSize: 0.00,
    color: new THREE.Color(HEX.COLD_BLUE), spread: Math.PI, radialXZ: true,
  })
  triggerPointLight(origin, HEX.COLD_BLUE, 3, 300)
}

/** ARMA shield shatter VFX — white burst + light flash. */
export function triggerArmaShatter(playerPos: THREE.Vector3, particles: ParticleSystem): void {
  particles.emit({
    count: 250, origin: playerPos, speed: 5, lifetime: 600,
    startSize: 0.04, endSize: 0.00,
    color: new THREE.Color(HEX.SOFT_WHITE), spread: Math.PI,
  })
  triggerPointLight(playerPos, HEX.SOFT_WHITE, 6, 300)
}

/** Kill projectile impact: particle burst scaled by word length + amber flash. */
export function triggerImpactVfx(
  position: THREE.Vector3,
  wordLength: number,
  particles: ParticleSystem,
): void {
  particles.emit({
    count: 50 + wordLength * 20, origin: position, speed: 4, lifetime: 1000,
    startSize: 0.05, endSize: 0.00,
    color: new THREE.Color(HEX.AMBER), spread: Math.PI,
  })
  triggerPointLight(position, HEX.AMBER, 6, 150)
}

/** Enemy death (not from projectile — e.g. self-destruct, FULMEN chain). */
export function triggerEnemyDeathVfx(
  position: THREE.Vector3,
  particles: ParticleSystem,
  color: number,
): void {
  particles.emit({
    count: 300, origin: position, speed: 4, lifetime: 1000,
    startSize: 0.05, endSize: 0.00,
    color: new THREE.Color(color), spread: Math.PI,
  })
  triggerPointLight(position, color, 4, 200)
}

/** Player hit — red burst from player. */
export function triggerPlayerHitVfx(position: THREE.Vector3, particles: ParticleSystem): void {
  particles.emit({
    count: 100, origin: position, speed: 3, lifetime: 300,
    startSize: 0.03, endSize: 0.00,
    color: new THREE.Color(0xef4444), spread: Math.PI,
  })
}

// ── Kill DOM VFX (floating score + CSS particle burst) ────────────────────

const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300]
const PARTICLE_RADIUS = 32 // px

/** Spawn a floating score delta and CSS particle burst at the given screen position. */
export function spawnKillVfx(screenX: number, screenY: number, points: number): void {
  const container = document.getElementById('enemy-labels')
  if (!container) return

  const score = document.createElement('div')
  score.className = 'kill-score'
  score.textContent = `+${points}`
  score.style.left = `${screenX}px`
  score.style.top = `${screenY - 20}px`
  container.appendChild(score)
  score.addEventListener('animationend', () => score.remove(), { once: true })

  for (const angleDeg of PARTICLE_ANGLES) {
    const rad = (angleDeg * Math.PI) / 180
    const dx  = Math.cos(rad) * PARTICLE_RADIUS
    const dy  = Math.sin(rad) * PARTICLE_RADIUS
    const p = document.createElement('div')
    p.className = 'kill-particle'
    p.style.left = `${screenX}px`
    p.style.top  = `${screenY}px`
    p.style.setProperty('--dx', `${dx}px`)
    p.style.setProperty('--dy', `${dy}px`)
    container.appendChild(p)
    p.addEventListener('animationend', () => p.remove(), { once: true })
  }
}
