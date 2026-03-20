const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300]
const PARTICLE_RADIUS = 32 // px

/** Spawn a floating score delta and particle burst at the given screen position. */
export function spawnKillVfx(screenX: number, screenY: number, points: number): void {
  const container = document.getElementById('enemy-labels')
  if (!container) return

  // Score delta — floats upward and fades
  const score = document.createElement('div')
  score.className = 'kill-score'
  score.textContent = `+${points}`
  score.style.left = `${screenX}px`
  score.style.top = `${screenY - 20}px`
  container.appendChild(score)
  score.addEventListener('animationend', () => score.remove(), { once: true })

  // Particle burst — 6 dots fly outward
  for (const angleDeg of PARTICLE_ANGLES) {
    const rad = (angleDeg * Math.PI) / 180
    const dx = Math.cos(rad) * PARTICLE_RADIUS
    const dy = Math.sin(rad) * PARTICLE_RADIUS

    const p = document.createElement('div')
    p.className = 'kill-particle'
    p.style.left = `${screenX}px`
    p.style.top = `${screenY}px`
    p.style.setProperty('--dx', `${dx}px`)
    p.style.setProperty('--dy', `${dy}px`)
    container.appendChild(p)
    p.addEventListener('animationend', () => p.remove(), { once: true })
  }
}
