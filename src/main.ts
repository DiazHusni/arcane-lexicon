import './style.css'
import { createRenderContext } from './renderer/context'
import { initHud, syncHud } from './renderer/hud'
import {
  createInputState,
  handleKeydown,
  getBufferString,
  findAutoFocusEnemy,
} from './game/input'
import { processTick } from './game/loop'
import {
  createWorldState,
  update as worldUpdate,
  handleInput,
  startGame,
  startGameDebug,
  restartGame,
  exitToTitle,
  getEnemyMaps,
} from './game/state'
import { createPlayer, tickPlayer, triggerCastAnim } from './entities/player'
import { ParticleSystem } from './renderer/particles'
import { initLightPool, tickLightPool, spawnKillVfx } from './renderer/vfx'
import { initSfx, startAmbient } from './renderer/sfx'
import { FIXED_STEP } from './constants/game'

// ── Bootstrap ──────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const labelContainer = document.getElementById('enemy-labels') as HTMLElement
const renderCtx = createRenderContext(canvas)
const hud = initHud()

const player = createPlayer(renderCtx.scene)

// Particle system — pre-allocated 50K ring buffer, single Points mesh
const particles = new ParticleSystem(renderCtx.scene)

// Point light pool — 6 pooled PointLights for spell/impact flashes
initLightPool(renderCtx.scene)

// Audio — lazy-initialized on first user gesture (AudioContext policy)
const sfxCtx = initSfx()
let audioStarted = false

function ensureAudioStarted(): void {
  if (audioStarted) return
  audioStarted = true
  sfxCtx.ctx.resume().then(() => startAmbient(sfxCtx))
}

let inputState = createInputState()
const world = createWorldState(renderCtx.scene, labelContainer)

// Inject Phase 3 systems into world
world.renderCtx          = renderCtx
world.particles          = particles
world.sfx                = sfxCtx
world.onCast             = (targetPos) => triggerCastAnim(player, targetPos)
world.getProjectileOrigin = () => player.staffWorldPos.clone()

let accumulator   = 0
let lastTimestamp = 0

// ── Pause state ────────────────────────────────────────────────────────────

/** Typed buffer while the pause menu is open. */
let pauseBuffer = ''

const PAUSE_WORDS = ['resume', 'restart', 'exit'] as const

function handlePauseKey(key: string): void {
  if (key === 'Backspace') {
    pauseBuffer = pauseBuffer.slice(0, -1)
    return
  }
  if (!key.match(/^[A-Z]$/i)) return

  pauseBuffer += key.toLowerCase()

  if (pauseBuffer === 'resume') {
    world.gameData = { ...world.gameData, phase: 'PLAYING' }
    pauseBuffer = ''
    return
  }
  if (pauseBuffer === 'restart') {
    restartGame(world)
    pauseBuffer = ''
    return
  }
  if (pauseBuffer === 'exit') {
    exitToTitle(world)
    inputState = createInputState()
    pauseBuffer = ''
    return
  }

  // Dead-end: no pause option starts with this prefix
  if (!PAUSE_WORDS.some(w => w.startsWith(pauseBuffer))) {
    pauseBuffer = ''
  }
}

// ── Input ─────────────────────────────────────────────────────────────────

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Backspace') e.preventDefault()

  ensureAudioStarted()

  const gd = world.gameData

  if (gd.phase === 'TITLE') {
    if (e.key === 'Enter' && e.shiftKey) startGameDebug(world)
    else if (e.key === 'Enter' || e.key === ' ') startGame(world)
    return
  }

  if (gd.phase === 'DEAD') {
    if (e.key === 'Enter' || e.key === ' ') restartGame(world)
    return
  }

  // Esc opens the pause menu from PLAYING — typing required to exit pause
  if (e.key === 'Escape') {
    if (gd.phase === 'PLAYING') {
      world.gameData = { ...world.gameData, phase: 'PAUSED' }
      pauseBuffer = ''
    }
    return
  }

  if (gd.phase === 'PAUSED') {
    handlePauseKey(e.key)
    return
  }

  if (gd.phase !== 'PLAYING') return

  const result = handleKeydown(inputState, e.key, gd.spells)
  inputState = result.newState
  handleInput(world, result)
})

window.addEventListener('click', () => ensureAudioStarted())

// ── Game update (fixed step) ──────────────────────────────────────────────

function update(dt: number): void {
  worldUpdate(world, dt)
}

// ── Render (variable, per rAF) ────────────────────────────────────────────

function render(rawDt: number): void {
  // Camera shake + vignette fade
  renderCtx.update(rawDt)

  // Player mage animation
  tickPlayer(player, rawDt)

  // Particle system update
  particles.update(rawDt)

  // Point light fade
  tickLightPool(rawDt)

  // Render frame via EffectComposer (bloom + vignette + output)
  renderCtx.composer.render()

  const gd     = world.gameData
  const isPaused = gd.phase === 'PAUSED'
  const buffer = isPaused ? pauseBuffer : getBufferString(inputState)

  const { words: enemyWords, positions: enemyPositions } = getEnemyMaps(world)
  const focusedId = isPaused ? null : findAutoFocusEnemy(buffer, enemyWords, 0, 0, enemyPositions)

  // Consume pending kill VFX events (project 3D position → screen coords)
  for (const vfx of world.pendingKillVfx) {
    const v  = vfx.worldPos.clone().project(renderCtx.camera)
    const sx = Math.round(((v.x + 1) / 2) * window.innerWidth)
    const sy = Math.round(((-v.y + 1) / 2) * window.innerHeight)
    spawnKillVfx(sx, sy, vfx.points)
  }
  world.pendingKillVfx = []

  syncHud(hud, {
    wordBuffer: buffer,
    gameData: gd,
    enemies: world.enemies,
    camera: renderCtx.camera,
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
    focusedEnemyId: focusedId,
  })
}

// ── Game loop (fixed timestep + rAF interpolation) ────────────────────────

function frame(timestamp: number): void {
  const rawDt = lastTimestamp === 0 ? 0 : timestamp - lastTimestamp
  lastTimestamp = timestamp

  // Freeze game logic while paused; accumulator stays put so no tick burst on resume
  if (world.gameData.phase !== 'PAUSED') {
    const result = processTick(accumulator, rawDt, update, FIXED_STEP)
    accumulator = result.accumulator
  }

  render(rawDt)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
