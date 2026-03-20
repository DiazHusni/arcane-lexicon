import * as THREE from 'three'
import type { Enemy } from '../enemy'
import type { EnemyType } from '../../types/enemy'
import { intensityFromWave, setEnemyIntensityColor } from '../enemy'
import { ACUTUS_CONFIG, createAcutusMesh } from './acutus'
import { SOLIDUS_CONFIG, createSolidusMesh } from './solidus'
import { PERFECTUS_CONFIG, createPerfectusMesh } from './perfectus'
import { NEXUS_CONFIG, createNexusMesh } from './nexus'
import { DAMAGE_WARNING_MS } from '../../constants/game'

let nextId = 0

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
  const config = getConfig(type)
  const mesh = createMesh(type)
  mesh.position.copy(position)
  mesh.position.y = 0.5
  scene.add(mesh)

  const labelEl = document.createElement('div')
  labelEl.className = 'enemy-label'
  labelEl.textContent = word
  labelContainer.appendChild(labelEl)

  const speedScale = Math.min(2.0, 1.0 + wave * 0.05)

  const enemy: Enemy = {
    id: nextId++,
    type,
    mesh,
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
  }

  // Apply intensity-driven color at spawn
  setEnemyIntensityColor(enemy, intensityFromWave(wave))

  return enemy
}

export function despawnEnemy(enemy: Enemy, scene: THREE.Scene): void {
  scene.remove(enemy.mesh)
  enemy.mesh.geometry.dispose()
  ;(enemy.mesh.material as THREE.Material).dispose()
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

function createMesh(type: EnemyType): THREE.Mesh {
  switch (type) {
    case 'acutus':    return createAcutusMesh()
    case 'solidus':   return createSolidusMesh()
    case 'perfectus': return createPerfectusMesh()
    case 'nexus':     return createNexusMesh()
  }
}
