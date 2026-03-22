import * as THREE from 'three'
import type { GameData } from '../types/index'
import type { Enemy } from '../entities/enemy'
import { COLORS, SPELL_COLORS } from '../constants/colors'
import { DAMAGE_WARNING_MS } from '../constants/game'

export interface HudElements {
  wordEl: HTMLElement
  healthBarFill: HTMLElement
  waveEl: HTMLElement
  spellSlots: HTMLElement[]
  screenTitle: HTMLElement
  screenWave: HTMLElement
  screenDead: HTMLElement
  deadStats: HTMLElement
  screenPause: HTMLElement
  pauseOptContinue: HTMLElement
  pauseOptRestart: HTMLElement
}

export interface HudSyncData {
  wordBuffer: string
  gameData: GameData
  enemies: Enemy[]
  camera: THREE.Camera
  canvasWidth: number
  canvasHeight: number
  focusedEnemyId: number | null
}

export function initHud(): HudElements {
  const wordEl = document.getElementById('hud-word')
  const healthEl = document.getElementById('hud-health')
  const waveEl = document.getElementById('hud-wave')
  const spellbookEl = document.getElementById('hud-spellbook')
  const screenTitle = document.getElementById('screen-title')
  const screenWave = document.getElementById('screen-wave')
  const screenDead = document.getElementById('screen-dead')
  const screenPause = document.getElementById('screen-pause')

  if (!wordEl || !healthEl || !waveEl || !spellbookEl || !screenTitle || !screenWave || !screenDead || !screenPause) {
    throw new Error('HUD elements not found in DOM')
  }

  const healthBarFill = healthEl.querySelector<HTMLElement>('.health-bar-fill')
  if (!healthBarFill) throw new Error('.health-bar-fill not found')

  const deadStats = screenDead.querySelector<HTMLElement>('.dead-stats')
  if (!deadStats) throw new Error('.dead-stats not found')

  const pauseOptContinue = document.getElementById('pause-opt-continue')
  const pauseOptRestart = document.getElementById('pause-opt-restart')
  if (!pauseOptContinue || !pauseOptRestart) throw new Error('Pause option elements not found in DOM')

  const spellSlots = Array.from(spellbookEl.querySelectorAll<HTMLElement>('.spell-slot'))

  return { wordEl, healthBarFill, waveEl, spellSlots, screenTitle, screenWave, screenDead, deadStats, screenPause, pauseOptContinue, pauseOptRestart }
}

export function syncHud(hud: HudElements, data: HudSyncData): void {
  const { wordBuffer, gameData, enemies, camera, canvasWidth, canvasHeight, focusedEnemyId } = data

  // Screen overlays — show/hide based on phase
  const isTitle = gameData.phase === 'TITLE'
  const isDead = gameData.phase === 'DEAD'
  const isWaveClear = gameData.phase === 'WAVE_CLEAR'
  const isPaused = gameData.phase === 'PAUSED'

  hud.screenTitle.classList.toggle('hidden', !isTitle)
  hud.screenDead.classList.toggle('hidden', !isDead)
  hud.screenWave.classList.toggle('hidden', !isWaveClear)
  hud.screenPause.classList.toggle('hidden', !isPaused)

  if (isPaused) {
    renderPauseOption(hud.pauseOptContinue, 'CONTINUE', wordBuffer)
    renderPauseOption(hud.pauseOptRestart, 'RESTART', wordBuffer)
  }

  if (isDead) {
    hud.deadStats.textContent = `wave ${gameData.wave}  ·  score ${gameData.score}  ·  kills ${gameData.kills}`
  }

  // Typed word
  hud.wordEl.textContent = wordBuffer.toUpperCase()

  // Health bar
  const pct = Math.max(0, Math.min(100, (gameData.health / gameData.maxHealth) * 100))
  hud.healthBarFill.style.width = `${pct}%`
  hud.healthBarFill.style.backgroundColor = pct > 25 ? COLORS.HEALTH_FULL : COLORS.HEALTH_LOW

  // Wave counter
  hud.waveEl.textContent = `WAVE ${gameData.wave}`

  // Spell slots
  for (let i = 0; i < hud.spellSlots.length; i++) {
    const slot = hud.spellSlots[i]
    const spell = gameData.spells[i]
    if (!spell) continue

    if (!spell.unlocked) {
      slot.textContent = '····'
      slot.className = 'spell-slot locked'
      slot.style.color = ''
      slot.style.borderColor = ''
    } else if (spell.cooldownRemaining > 0) {
      slot.textContent = spell.word.toUpperCase()
      slot.className = 'spell-slot cooldown'
      slot.style.color = COLORS.HUD_DIM
      slot.style.borderColor = ''
    } else {
      slot.textContent = spell.word.toUpperCase()
      slot.className = 'spell-slot ready'
      slot.style.color = SPELL_COLORS[spell.word] ?? COLORS.HUD_TEXT
      slot.style.borderColor = SPELL_COLORS[spell.word] ?? ''
    }
  }

  // Enemy word billboard positions (project 3D → 2D screen)
  for (const enemy of enemies) {
    if (!enemy.alive || !enemy.labelEl) continue

    const screenPos = projectToScreen(enemy.position, camera, canvasWidth, canvasHeight)
    enemy.labelEl.style.left = `${screenPos.x}px`
    enemy.labelEl.style.top = `${screenPos.y - 40}px`

    if (!enemy.markedForDeath) {
      enemy.labelEl.style.opacity = '0.9'
      enemy.labelEl.style.fontSize = '12px'
      const inWarning = enemy.damageWarningTimer < DAMAGE_WARNING_MS && enemy.damageCooldown === 0
      enemy.labelEl.style.color = inWarning ? COLORS.CRIMSON : ''
    }
  }
}

/**
 * Highlight the matching prefix of a pause menu option in Sheikah blue.
 * Uses innerHTML — safe because `word` is a hardcoded constant and buffer
 * is validated to A-Z only before being passed here.
 */
function renderPauseOption(el: HTMLElement, word: string, buffer: string): void {
  const prefix = buffer.toUpperCase()
  if (prefix.length > 0 && word.startsWith(prefix)) {
    el.innerHTML = `<span class="pause-match">${word.slice(0, prefix.length)}</span>${word.slice(prefix.length)}`
  } else {
    el.textContent = word
  }
}

function projectToScreen(
  position: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
): { x: number; y: number } {
  const vec = position.clone().project(camera)
  return {
    x: Math.round(((vec.x + 1) / 2) * width),
    y: Math.round(((-vec.y + 1) / 2) * height),
  }
}
