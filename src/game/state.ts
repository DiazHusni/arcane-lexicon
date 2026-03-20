import * as THREE from 'three'
import type { GameData } from '../types/index'
import type { Enemy } from '../entities/enemy'
import type { Projectile } from '../entities/projectile'
import type { InputMatchResult } from './input'
import {
  move,
  tickProximityDamage,
  markForDeath,
  applyStun,
  applySpeedMultiplier,
  applyShorten,
  restoreWord,
  die,
} from '../entities/enemy'
import {
  createProjectilePool,
  acquireProjectile,
  moveProjectiles,
  releaseProjectile,
} from '../entities/projectile'
import { spawnEnemy, despawnEnemy, resetEnemyIds } from '../entities/enemies/factory'
import {
  registerEnemy,
  unregisterEnemy,
  clearRegistry,
  assignWord,
  assignNexusPhase2Word,
  checkPrefixCollisions,
} from '../entities/enemies/wordAssignment'
import { createSpellStates, checkUnlocks } from '../spells/unlocks'
import {
  tickCooldowns,
  startCooldown,
  castSpell,
  tickGeluEffect,
  tickArmaShield,
  tickBreveEffect,
} from '../spells/system'
import { SPELL_WORDS, getSpellDefinition } from '../spells/definitions'
import { getSpawnList, randomSpawnPosition } from './wave'
import { findAutoFocusEnemy } from './input'
import {
  PLAYER_HEALTH,
  PROJECTILE_POOL_SIZE,
  ARENA_HALF_SIZE,
  ARMA_PUSH_RADIUS,
  ARMA_STUN_MS,
  ARMA_SHIELD_EXPIRY_MS,
  GELU_SLOW_TOTAL_MS,
  BREVE_DURATION_MS,
  BREVE_SHORTEN_LETTERS,
  CONTACT_DAMAGE,
  WAVE_CLEAR_MS,
  DYING_MS,
  COMBO_RESET_MS,
  COMBO_MAX,
  COMBO_STEP,
} from '../constants/game'

// ── World state (mutable) ─────────────────────────────────────────────────

export interface WorldState {
  gameData: GameData
  enemies: Enemy[]
  projectilePool: Projectile[]
  scene: THREE.Scene | null
  labelContainer: HTMLElement | null
  waveUsedWords: Set<string>
}

export function createWorldState(
  scene: THREE.Scene | null,
  labelContainer: HTMLElement | null,
): WorldState {
  checkPrefixCollisions(SPELL_WORDS)

  return {
    gameData: createGameData(),
    enemies: [],
    projectilePool: scene ? createProjectilePool(scene, PROJECTILE_POOL_SIZE) : [],
    scene,
    labelContainer,
    waveUsedWords: new Set(),
  }
}

function createGameData(): GameData {
  return {
    phase: 'TITLE',
    health: PLAYER_HEALTH,
    maxHealth: PLAYER_HEALTH,
    wave: 1,
    score: 0,
    kills: 0,
    comboMultiplier: 1.0,
    comboTimer: 0,
    dyingTimer: 0,
    waveClearTimer: 0,
    spells: createSpellStates(),
    playerShieldActive: false,
    playerShieldExpiry: 0,
    geluRemaining: 0,
    breveRemaining: 0,
    focusedEnemyId: null,
  }
}

// ── State transitions ─────────────────────────────────────────────────────

/** Start the game from TITLE → PLAYING (Wave 1). */
export function startGame(world: WorldState): void {
  world.gameData = { ...world.gameData, phase: 'PLAYING', wave: 1 }
  spawnWave(world)
}

/** Restart: full scene cleanup then Wave 1. */
export function restartGame(world: WorldState): void {
  cleanupScene(world)
  world.gameData = createGameData()
  world.gameData = { ...world.gameData, phase: 'PLAYING' }
  spawnWave(world)
}

function spawnWave(world: WorldState): void {
  if (!world.scene || !world.labelContainer) return

  clearRegistry()
  world.waveUsedWords = new Set()

  const types = getSpawnList(world.gameData.wave)

  for (const type of types) {
    const word = assignWord(type, world.gameData.wave, world.waveUsedWords)
    world.waveUsedWords.add(word)

    const pos2d = randomSpawnPosition(ARENA_HALF_SIZE)
    const pos = new THREE.Vector3(pos2d.x, 0.5, pos2d.z)

    const enemy = spawnEnemy(
      type, word, pos, world.gameData.wave, world.scene, world.labelContainer,
    )
    registerEnemy(enemy.id, enemy.word)
    world.enemies.push(enemy)
  }

  // Apply BREVE if currently active
  if (world.gameData.breveRemaining > 0) {
    for (const e of world.enemies) applyShorten(e, BREVE_SHORTEN_LETTERS)
  }
  // Apply GELU if currently active
  if (world.gameData.geluRemaining > 0) {
    const mult = geluMultiplierFromRemaining(world.gameData.geluRemaining)
    for (const e of world.enemies) applySpeedMultiplier(e, mult)
  }
}

function cleanupScene(world: WorldState): void {
  if (!world.scene) return

  for (const enemy of world.enemies) {
    despawnEnemy(enemy, world.scene)
  }
  world.enemies = []

  for (const proj of world.projectilePool) {
    releaseProjectile(proj)
  }

  clearRegistry()
  resetEnemyIds()
}

// ── Per-frame input handling ──────────────────────────────────────────────

/** Call this each time an input event fires (outside the fixed-step loop). */
export function handleInput(world: WorldState, result: InputMatchResult): void {
  if (world.gameData.phase !== 'PLAYING') return

  switch (result.type) {
    case 'enemy':
      if (result.enemyId !== null) handleEnemyKill(world, result.enemyId)
      break
    case 'spell':
      if (result.spellWord !== null) handleSpellCast(world, result.spellWord)
      break
    default:
      break
  }
}

function handleEnemyKill(world: WorldState, enemyId: number): void {
  const enemy = world.enemies.find(e => e.id === enemyId && e.alive && !e.markedForDeath)
  if (!enemy) return

  // Nexus two-phase fight
  if (enemy.type === 'nexus' && enemy.nexusPhase === 1) {
    transitionNexusPhase2(world, enemy)
    return
  }

  markForDeath(enemy)
  unregisterEnemy(enemy.id, enemy.word)

  // Launch projectile
  if (world.scene) {
    const playerPos = new THREE.Vector3(0, 0.5, 0)
    acquireProjectile(world.projectilePool, playerPos, enemy, enemy.word.length)
  }
}

function transitionNexusPhase2(world: WorldState, nexus: Enemy): void {
  nexus.nexusPhase = 2
  unregisterEnemy(nexus.id, nexus.word)

  const usedNow = new Set([...world.waveUsedWords])
  const phase2Word = assignNexusPhase2Word(nexus.word, usedNow)
  world.waveUsedWords.add(phase2Word)

  nexus.word = phase2Word
  nexus.displayWord = phase2Word
  if (nexus.labelEl) nexus.labelEl.textContent = phase2Word
  registerEnemy(nexus.id, phase2Word)

  // Spawn 2 Acutus minions
  if (world.scene && world.labelContainer) {
    for (let i = 0; i < 2; i++) {
      const minionWord = assignWord('acutus', world.gameData.wave, world.waveUsedWords)
      world.waveUsedWords.add(minionWord)
      const offset = new THREE.Vector3(
        nexus.position.x + (i === 0 ? -1.5 : 1.5),
        0.5,
        nexus.position.z,
      )
      const minion = spawnEnemy('acutus', minionWord, offset, world.gameData.wave, world.scene, world.labelContainer)
      registerEnemy(minion.id, minion.word)
      world.enemies.push(minion)
    }
  }
}

function handleSpellCast(world: WorldState, spellWord: string): void {
  const def = getSpellDefinition(spellWord)
  if (!def) return

  const castResult = castSpell(world.gameData.spells, spellWord)
  world.gameData = { ...world.gameData, spells: castResult.spells }

  if (castResult.shieldActivated) {
    world.gameData = {
      ...world.gameData,
      playerShieldActive: true,
      playerShieldExpiry: ARMA_SHIELD_EXPIRY_MS,
    }
  }

  if (castResult.geluActivated) {
    world.gameData = { ...world.gameData, geluRemaining: GELU_SLOW_TOTAL_MS }
    const mult = geluMultiplierFromRemaining(GELU_SLOW_TOTAL_MS)
    for (const e of world.enemies) if (e.alive) applySpeedMultiplier(e, mult)
  }

  if (castResult.breveActivated) {
    world.gameData = { ...world.gameData, breveRemaining: BREVE_DURATION_MS }
    for (const e of world.enemies) if (e.alive) applyShorten(e, BREVE_SHORTEN_LETTERS)
  }

  if (castResult.aoeRadius !== null) {
    // FULMEN — kill all enemies in radius
    const playerPos = new THREE.Vector3(0, 0.5, 0)
    for (const e of world.enemies) {
      if (!e.alive || e.markedForDeath) continue
      if (e.position.distanceTo(playerPos) <= castResult.aoeRadius) {
        markForDeath(e)
        unregisterEnemy(e.id, e.word)
        if (world.scene) {
          acquireProjectile(world.projectilePool, playerPos, e, e.word.length)
        }
      }
    }
  }
}

// ── Fixed-step update ─────────────────────────────────────────────────────

export function update(world: WorldState, dt: number): void {
  const gd = world.gameData

  switch (gd.phase) {
    case 'TITLE':
      return
    case 'DYING':
      tickDying(world, dt)
      return
    case 'DEAD':
      return
    case 'WAVE_CLEAR':
      tickWaveClear(world, dt)
      return
    case 'PLAYING':
      tickPlaying(world, dt)
      return
  }
}

function tickPlaying(world: WorldState, dt: number): void {
  const playerPos = new THREE.Vector3(0, 0.5, 0)

  // Tick spell cooldowns
  world.gameData = {
    ...world.gameData,
    spells: tickCooldowns(world.gameData.spells, dt),
  }

  // Tick GELU
  if (world.gameData.geluRemaining > 0) {
    const { remaining, speedMultiplier } = tickGeluEffect(world.gameData.geluRemaining, dt)
    world.gameData = { ...world.gameData, geluRemaining: remaining ?? 0 }
    for (const e of world.enemies) if (e.alive) applySpeedMultiplier(e, speedMultiplier)
    if (remaining === null) {
      // GELU expired: restore full speed
      for (const e of world.enemies) if (e.alive) applySpeedMultiplier(e, 1.0)
    }
  }

  // Tick BREVE
  if (world.gameData.breveRemaining > 0) {
    const next = tickBreveEffect(world.gameData.breveRemaining, dt)
    world.gameData = { ...world.gameData, breveRemaining: next ?? 0 }
    if (next === null) {
      for (const e of world.enemies) if (e.alive) restoreWord(e)
    }
  }

  // Tick ARMA shield
  if (world.gameData.playerShieldActive) {
    const { remaining, expired } = tickArmaShield(world.gameData.playerShieldExpiry, dt)
    if (expired) {
      world.gameData = {
        ...world.gameData,
        playerShieldActive: false,
        playerShieldExpiry: 0,
        spells: startCooldown(world.gameData.spells, 'arma'),
      }
    } else {
      world.gameData = { ...world.gameData, playerShieldExpiry: remaining }
    }
  }

  // Tick combo timer
  if (world.gameData.comboTimer > 0) {
    const newComboTimer = world.gameData.comboTimer + dt
    if (newComboTimer > COMBO_RESET_MS) {
      world.gameData = { ...world.gameData, comboMultiplier: 1.0, comboTimer: 0 }
    } else {
      world.gameData = { ...world.gameData, comboTimer: newComboTimer }
    }
  }

  // Move enemies + proximity damage
  for (const e of world.enemies) {
    if (!e.alive) continue
    move(e, playerPos, world.enemies, dt)

    const dmgEvent = tickProximityDamage(e, playerPos, dt)
    if (dmgEvent) {
      applyDamage(world, dmgEvent.damage, e)
    }
  }

  // Move projectiles
  const impacts = moveProjectiles(world.projectilePool, dt)
  for (const { enemy } of impacts) {
    killEnemy(world, enemy)
  }

  // Sync label positions handled by HUD renderer (passed via syncHud)

  // Check wave complete
  const aliveEnemies = world.enemies.filter(e => e.alive || e.markedForDeath)
  if (aliveEnemies.length === 0 && world.enemies.length > 0) {
    world.gameData = {
      ...world.gameData,
      phase: 'WAVE_CLEAR',
      waveClearTimer: WAVE_CLEAR_MS,
    }
  }

  // Update spell unlock state
  const { spells, newlyUnlocked } = checkUnlocks(world.gameData.spells, world.gameData.kills)
  if (newlyUnlocked.length > 0) {
    world.gameData = { ...world.gameData, spells }
  }
}

function applyDamage(world: WorldState, damage: number, sourceEnemy: Enemy): void {
  if (world.gameData.playerShieldActive) {
    // Shield absorbs hit — push + stun nearby enemies, start cooldown
    world.gameData = {
      ...world.gameData,
      playerShieldActive: false,
      playerShieldExpiry: 0,
      spells: startCooldown(world.gameData.spells, 'arma'),
    }
    const playerPos = new THREE.Vector3(0, 0.5, 0)
    for (const e of world.enemies) {
      if (!e.alive || e.markedForDeath) continue
      if (e.position.distanceTo(playerPos) <= ARMA_PUSH_RADIUS) {
        applyStun(e, ARMA_STUN_MS)
        const pushDir = new THREE.Vector3()
          .subVectors(e.position, playerPos)
          .normalize()
          .multiplyScalar(2.0)
        e.position.add(pushDir)
        e.mesh.position.copy(e.position)
      }
    }
    return
  }

  const newHealth = Math.max(0, world.gameData.health - damage)
  world.gameData = {
    ...world.gameData,
    health: newHealth,
    comboMultiplier: 1.0,
    comboTimer: 0,
  }

  if (newHealth <= 0) {
    world.gameData = { ...world.gameData, phase: 'DYING', dyingTimer: DYING_MS }
    // Mark source enemy so it doesn't keep damaging during dying
    sourceEnemy.markedForDeath = true
  }
}

function killEnemy(world: WorldState, enemy: Enemy): void {
  if (!enemy.alive) return

  die(enemy)
  unregisterEnemy(enemy.id, enemy.word)

  const points = Math.floor(enemy.tierPoints * world.gameData.comboMultiplier)
  const newCombo = Math.min(COMBO_MAX, world.gameData.comboMultiplier + COMBO_STEP)

  world.gameData = {
    ...world.gameData,
    score: world.gameData.score + points,
    kills: world.gameData.kills + 1,
    comboMultiplier: newCombo,
    comboTimer: 0,
  }
}

function tickDying(world: WorldState, dt: number): void {
  const next = world.gameData.dyingTimer - dt
  if (next <= 0) {
    world.gameData = { ...world.gameData, phase: 'DEAD', dyingTimer: 0 }
  } else {
    world.gameData = { ...world.gameData, dyingTimer: next }
  }
}

function tickWaveClear(world: WorldState, dt: number): void {
  const next = world.gameData.waveClearTimer - dt
  if (next <= 0) {
    const nextWave = world.gameData.wave + 1
    world.gameData = {
      ...world.gameData,
      phase: 'PLAYING',
      wave: nextWave,
      waveClearTimer: 0,
    }
    // Remove dead enemies from array before spawning new wave
    world.enemies = world.enemies.filter(e => e.alive)
    spawnWave(world)
  } else {
    world.gameData = { ...world.gameData, waveClearTimer: next }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function geluMultiplierFromRemaining(remaining: number): number {
  const { speedMultiplier } = tickGeluEffect(remaining, 0)
  return speedMultiplier
}

/** Build maps for the HUD billboard sync. */
export function getEnemyMaps(world: WorldState): {
  words: Map<number, string>
  positions: Map<number, { x: number; z: number }>
} {
  const words = new Map<number, string>()
  const positions = new Map<number, { x: number; z: number }>()
  for (const e of world.enemies) {
    if (!e.alive) continue
    words.set(e.id, e.displayWord)
    positions.set(e.id, { x: e.position.x, z: e.position.z })
  }
  return { words, positions }
}
