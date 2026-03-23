export interface LoadingScreen {
  setProgress(ratio: number): void
  fadeOut(): Promise<void>
}

export function createLoadingScreen(): LoadingScreen {
  const overlay = document.createElement('div')
  overlay.id = 'loading-overlay'
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: #1a1a2e;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    transition: opacity 0.6s ease-out;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
  `

  const title = document.createElement('div')
  title.textContent = 'A R C A N E   L E X I C O N'
  title.style.cssText = `
    color: #C8C4BC; font-size: 1.6rem; font-weight: 800;
    letter-spacing: 0.3em; margin-bottom: 2rem;
  `

  const barBg = document.createElement('div')
  barBg.style.cssText = `
    width: 240px; height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px; overflow: hidden;
  `

  const barFill = document.createElement('div')
  barFill.style.cssText = `
    width: 0%; height: 100%;
    background: #00D4FF;
    transition: width 0.2s ease-out;
    border-radius: 2px;
  `

  barBg.appendChild(barFill)
  overlay.appendChild(title)
  overlay.appendChild(barBg)
  document.body.appendChild(overlay)

  return {
    setProgress(ratio: number) {
      barFill.style.width = `${Math.min(100, ratio * 100)}%`
    },

    fadeOut() {
      return new Promise<void>((resolve) => {
        overlay.style.opacity = '0'
        overlay.addEventListener('transitionend', () => {
          overlay.remove()
          resolve()
        }, { once: true })
        // Fallback if transitionend doesn't fire
        setTimeout(() => {
          if (overlay.parentElement) overlay.remove()
          resolve()
        }, 800)
      })
    },
  }
}
