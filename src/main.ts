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
import { createWorldState, update as worldUpdate, handleInput, startGame, restartGame, getEnemyMaps } from './game/state'
import { createPlayer } from './entities/player'
import { FIXED_STEP } from './constants/game'

// ── Bootstrap ──────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const labelContainer = document.getElementById('enemy-labels') as HTMLElement
const renderCtx = createRenderContext(canvas)
const hud = initHud()

createPlayer(renderCtx.scene)

let inputState = createInputState()
const world = createWorldState(renderCtx.scene, labelContainer)
let accumulator = 0
let lastTimestamp = 0

// ── Input ─────────────────────────────────────────────────────────────────

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Backspace') e.preventDefault()

  const gd = world.gameData

  // Title screen → start game on Enter / Space
  if (gd.phase === 'TITLE') {
    if (e.key === 'Enter' || e.key === ' ') startGame(world)
    return
  }

  // Dead screen → restart on Enter / Space
  if (gd.phase === 'DEAD') {
    if (e.key === 'Enter' || e.key === ' ') restartGame(world)
    return
  }

  if (gd.phase !== 'PLAYING') return

  const result = handleKeydown(inputState, e.key, gd.spells)
  inputState = result.newState
  handleInput(world, result)
})

// ── Game update (fixed step) ──────────────────────────────────────────────

function update(dt: number): void {
  worldUpdate(world, dt)
}

// ── Render (variable, per rAF) ────────────────────────────────────────────

function render(_alpha: number): void {
  renderCtx.composer.render()

  const gd = world.gameData
  const buffer = getBufferString(inputState)

  // Compute auto-focus
  const { words: enemyWords, positions: enemyPositions } = getEnemyMaps(world)
  const focusedId = findAutoFocusEnemy(buffer, enemyWords, 0, 0, enemyPositions)

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

  const result = processTick(accumulator, rawDt, update, FIXED_STEP)
  accumulator = result.accumulator

  render(result.alpha)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
