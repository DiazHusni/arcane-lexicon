import * as THREE from 'three'
import type { Enemy } from '../enemy'
import type { EnemyType } from '../../types/enemy'
import type { LoadedModel } from '../../types/animation'
import { intensityFromWave, setEnemyIntensityColor } from '../enemy'
import { ACUTUS_CONFIG, createAcutusInstance } from './acutus'
import { SOLIDUS_CONFIG, createSolidusInstance } from './solidus'
import { PERFECTUS_CONFIG, createPerfectusInstance } from './perfectus'
import { NEXUS_CONFIG, createNexusInstance } from './nexus'
import { DAMAGE_WARNING_MS } from '../../constants/game'
import { transitionTo } from '../../animation/animationController'

let nextId = 0

/** Stored base models for cloning. Set by initEnemyFactory(). */
let baseModels: Record<string, LoadedModel> | null = null

/**
 * Initialize the enemy factory with loaded GLTF models.
 * Must be called before spawnEnemy().
 */
export function initEnemyFactory(models: Record<string, LoadedModel>): void {
  baseModels = models
}

export function resetEnemyIds(): void {
  nextId = 0
}

export function spawnEnemy(
  type: EnemyType,
  word: string,
  position: THREE.Vector3,
  wave: number,
  scene: THREE.Scene,
  labelContainer: HTMLElement,
): Enemy {
  if (!baseModels) throw new Error('initEnemyFactory() must be called before spawnEnemy()')

  const config = getConfig(type)
  const { group, bodyMat, animController } = createInstance(type)
  group.position.copy(position)
  group.position.y = 0.5
  scene.add(group)

  // Start in 'idle' state (already initialized by createAnimController)
  // Transition to 'move' will happen when the enemy starts moving

  const labelEl = document.createElement('div')
  labelEl.className = 'enemy-label'
  labelEl.textContent = word
  labelContainer.appendChild(labelEl)

  const speedScale = Math.min(2.0, 1.0 + wave * 0.05)

  const enemy: Enemy = {
    id: nextId++,
    type,
    mesh: group,
    bodyMat,
    animTime: 0,
    labelEl,
    word,
    displayWord: word,
    position: new THREE.Vector3().copy(position).setY(0.5),
    prevPosition: new THREE.Vector3().copy(position).setY(0.5),
    velocity: new THREE.Vector3(),
    speed: config.baseSpeed * speedScale,
    health: config.health,
    maxHealth: config.health,
    threatRadius: config.threatRadius,
    tierPoints: config.tierPoints,
    markedForDeath: false,
    stunTimer: 0,
    speedMultiplier: 1.0,
    damageWarningTimer: DAMAGE_WARNING_MS,
    damageCooldown: 0,
    nexusPhase: 1,
    alive: true,
    deathTimer: 0,
    animController,
  }

  // Apply intensity-driven color at spawn
  setEnemyIntensityColor(enemy, intensityFromWave(wave))

  return enemy
}

export function despawnEnemy(enemy: Enemy, scene: THREE.Scene): void {
  scene.remove(enemy.mesh)
  enemy.mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose())
      } else {
        ;(child.material as THREE.Material).dispose()
      }
    }
  })
  if (enemy.labelEl.parentElement) {
    enemy.labelEl.parentElement.removeChild(enemy.labelEl)
  }
}

function getConfig(type: EnemyType) {
  switch (type) {
    case 'acutus':    return ACUTUS_CONFIG
    case 'solidus':   return SOLIDUS_CONFIG
    case 'perfectus': return PERFECTUS_CONFIG
    case 'nexus':     return NEXUS_CONFIG
  }
}

function createInstance(type: EnemyType) {
  if (!baseModels) throw new Error('Models not loaded')

  switch (type) {
    case 'acutus':    return createAcutusInstance(baseModels.acutus)
    case 'solidus':   return createSolidusInstance(baseModels.solidus)
    case 'perfectus': return createPerfectusInstance(baseModels.perfectus)
    case 'nexus':     return createNexusInstance(baseModels.nexus)
  }
}
