import './style.css'
import { createRenderContext } from './renderer/context'
import { initHud, syncHud } from './renderer/hud'
import { createInputState, handleKeydown, getBufferString } from './game/input'
import { processTick } from './game/loop'
import { createGameData, update as gameUpdate } from './game/state'
import { createPlayer } from './entities/player'
import { FIXED_STEP } from './constants/game'

// ── Bootstrap ──────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const renderCtx = createRenderContext(canvas)
const hud = initHud()

createPlayer(renderCtx.scene)

let inputState = createInputState()
let gameData = createGameData()
let accumulator = 0
let lastTimestamp = 0

// ── Input ─────────────────────────────────────────────────────────────────

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Backspace') e.preventDefault()  // stop browser back navigation
  inputState = handleKeydown(inputState, e.key)
})

// ── Game update (fixed step) ──────────────────────────────────────────────

function update(dt: number): void {
  gameData = gameUpdate(gameData, dt)
}

// ── Render (variable, per rAF) ────────────────────────────────────────────

function render(_alpha: number): void {
  renderCtx.composer.render()
  syncHud(hud, {
    wordBuffer: getBufferString(inputState),
    health: gameData.health,
    wave: gameData.wave,
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
