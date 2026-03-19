export interface HudElements {
  wordEl: HTMLElement
  healthBarFill: HTMLElement
  waveEl: HTMLElement
}

export interface HudState {
  wordBuffer: string
  health: number
  wave: number
}

export function initHud(): HudElements {
  const wordEl = document.getElementById('hud-word')
  const healthEl = document.getElementById('hud-health')
  const waveEl = document.getElementById('hud-wave')

  if (!wordEl || !healthEl || !waveEl) {
    throw new Error('HUD elements not found in DOM')
  }

  const healthBarFill = healthEl.querySelector<HTMLElement>('.health-bar-fill')
  if (!healthBarFill) {
    throw new Error('.health-bar-fill not found')
  }

  return { wordEl, healthBarFill, waveEl }
}

export function syncHud(hud: HudElements, state: HudState): void {
  hud.wordEl.textContent = state.wordBuffer

  const pct = Math.max(0, Math.min(100, state.health))
  hud.healthBarFill.style.width = `${pct}%`
  hud.healthBarFill.style.backgroundColor =
    pct > 60 ? '#4ade80' : pct > 30 ? '#facc15' : '#ef4444'

  hud.waveEl.textContent = `WAVE ${state.wave}`
}
