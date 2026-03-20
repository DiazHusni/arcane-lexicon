import * as THREE from 'three'
import type { GameData } from '../types/index'
import type { Enemy } from '../entities/enemy'
import { COLORS, SPELL_COLORS } from '../constants/colors'

export interface HudElements {
  wordEl: HTMLElement
  healthBarFill: HTMLElement
  waveEl: HTMLElement
  spellSlots: HTMLElement[]
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

  if (!wordEl || !healthEl || !waveEl || !spellbookEl) {
    throw new Error('HUD elements not found in DOM')
  }

  const healthBarFill = healthEl.querySelector<HTMLElement>('.health-bar-fill')
  if (!healthBarFill) throw new Error('.health-bar-fill not found')

  const spellSlots = Array.from(spellbookEl.querySelectorAll<HTMLElement>('.spell-slot'))

  return { wordEl, healthBarFill, waveEl, spellSlots }
}

export function syncHud(hud: HudElements, data: HudSyncData): void {
  const { wordBuffer, gameData, enemies, camera, canvasWidth, canvasHeight, focusedEnemyId } = data

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

    const isFocused = enemy.id === focusedEnemyId
    if (!enemy.markedForDeath) {
      enemy.labelEl.style.opacity = isFocused ? '1.0' : '0.4'
      enemy.labelEl.style.fontSize = isFocused ? '14px' : '11px'
    }
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
