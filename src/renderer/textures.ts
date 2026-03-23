import * as THREE from 'three'

const ARENA_SIZE = 1024
const GROUND_SIZE = 512

// ── Noise utilities ──────────────────────────────────────────────────────

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

function fbm(x: number, y: number, octaves: number): number {
  let v = 0, a = 0.5, f = 1
  for (let i = 0; i < octaves; i++) {
    v += a * smoothNoise(x * f, y * f)
    a *= 0.5
    f *= 2
  }
  return v
}

function clamp(v: number, lo = 0, hi = 255): number {
  return Math.max(lo, Math.min(hi, v))
}

// ── Arena floor texture ──────────────────────────────────────────────────

export function createArenaTexture(): THREE.CanvasTexture {
  const S = ARENA_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!

  // 1. Base fill — mossy green stone
  ctx.fillStyle = '#4a7838'
  ctx.fillRect(0, 0, S, S)

  // 2. Pixel-level stone grain noise
  const img = ctx.getImageData(0, 0, S, S)
  const d = img.data
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = (y * S + x) * 4
      const n1 = fbm(x * 0.012, y * 0.012, 5)    // large color patches
      const n2 = fbm(x * 0.05 + 50, y * 0.05 + 50, 3) // medium detail
      const n3 = hash(x * 3 + 1, y * 3 + 1)       // fine speckle
      const v = (n1 - 0.5) * 45 + (n2 - 0.5) * 18 + (n3 - 0.5) * 8
      d[idx]     = clamp(d[idx] + v * 0.5)
      d[idx + 1] = clamp(d[idx + 1] + v * 0.9)
      d[idx + 2] = clamp(d[idx + 2] + v * 0.3)
    }
  }
  ctx.putImageData(img, 0, 0)

  // 3. Hex tile grid outlines (stone pavement grout)
  drawHexTileGrid(ctx, S)

  // 4. Arcane circle markings at center
  drawArcaneCircle(ctx, S / 2, S / 2, S)

  // 5. Hex border glow (matches arena geometry — pointy-top in UV space)
  drawArenaBorderGlow(ctx, S)

  // 6. Radial vignette — subtle darkening at edges
  const grad = ctx.createRadialGradient(S / 2, S / 2, S * 0.15, S / 2, S / 2, S * 0.52)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.6, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.18)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, S, S)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Draw flat-top hex tile grid across the canvas (stone pavement effect) */
function drawHexTileGrid(ctx: CanvasRenderingContext2D, S: number): void {
  const R = 62          // circumradius of each tile
  const sqrt3 = Math.sqrt(3)
  const colStep = 1.5 * R
  const rowStep = sqrt3 * R

  ctx.save()

  // Per-tile subtle color fill for variation
  const cols = Math.ceil(S / colStep) + 2
  const rows = Math.ceil(S / rowStep) + 2
  for (let col = -1; col < cols; col++) {
    for (let row = -1; row < rows; row++) {
      const cx = col * colStep
      const cy = row * rowStep + (Math.abs(col) % 2 === 1 ? rowStep / 2 : 0)
      const h = hash(col + 50, row + 50)
      const alpha = 0.04 + h * 0.06   // very subtle per-tile tint
      ctx.globalAlpha = alpha
      ctx.fillStyle = h > 0.5 ? '#6aab4a' : '#3a6028'
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i
        const px = cx + R * Math.cos(angle)
        const py = cy + R * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
    }
  }

  // Grout lines on top
  ctx.globalAlpha = 1
  ctx.strokeStyle = 'rgba(22, 48, 10, 0.45)'
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  for (let col = -1; col < cols; col++) {
    for (let row = -1; row < rows; row++) {
      const cx = col * colStep
      const cy = row * rowStep + (Math.abs(col) % 2 === 1 ? rowStep / 2 : 0)
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i
        const px = cx + R * Math.cos(angle)
        const py = cy + R * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }

  ctx.restore()
}

/** Draw arcane circle with rune marks at the arena center */
function drawArcaneCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, S: number): void {
  const outerR = S * 0.34
  const innerR = S * 0.21
  const midR   = S * 0.275

  ctx.save()

  // Outer circle
  ctx.strokeStyle = 'rgba(150, 210, 110, 0.16)'
  ctx.lineWidth = 3
  ctx.shadowColor = 'rgba(120, 200, 80, 0.25)'
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  ctx.stroke()

  // Inner circle
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
  ctx.stroke()

  // Middle circle (thinner)
  ctx.shadowBlur = 6
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(150, 210, 110, 0.10)'
  ctx.beginPath()
  ctx.arc(cx, cy, midR, 0, Math.PI * 2)
  ctx.stroke()

  // 8 radial lines connecting inner → outer circles
  ctx.strokeStyle = 'rgba(150, 210, 110, 0.14)'
  ctx.lineWidth = 2
  ctx.shadowBlur = 8
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8
    ctx.beginPath()
    ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle))
    ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle))
    ctx.stroke()
  }

  // Small rune diamonds along the mid-circle
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(160, 220, 120, 0.09)'
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI * 2 * i) / 16 + Math.PI / 16
    const rx = cx + midR * Math.cos(angle)
    const ry = cy + midR * Math.sin(angle)
    const s = 7
    ctx.beginPath()
    ctx.moveTo(rx, ry - s)
    ctx.lineTo(rx + s * 0.5, ry)
    ctx.lineTo(rx, ry + s)
    ctx.lineTo(rx - s * 0.5, ry)
    ctx.closePath()
    ctx.fill()
  }

  // Tiny glyph cross at the very center
  ctx.strokeStyle = 'rgba(150, 210, 110, 0.10)'
  ctx.lineWidth = 1.5
  ctx.shadowColor = 'rgba(120, 200, 80, 0.15)'
  ctx.shadowBlur = 6
  const glyphR = S * 0.055
  ctx.beginPath()
  ctx.arc(cx, cy, glyphR, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - glyphR, cy)
  ctx.lineTo(cx + glyphR, cy)
  ctx.moveTo(cx, cy - glyphR)
  ctx.lineTo(cx, cy + glyphR)
  ctx.stroke()

  ctx.restore()
}

/**
 * Draw a faint glowing hex border matching the arena geometry.
 * Three.js CylinderGeometry(6 sides) UV maps the top cap so vertex θ=k*60°
 * lands at canvas position (S/2 + S/2*sinθ, S/2 − S/2*cosθ).
 * This is a pointy-top hex in canvas space (vertices at top & bottom).
 */
function drawArenaBorderGlow(ctx: CanvasRenderingContext2D, S: number): void {
  const cx = S / 2
  const cy = S / 2
  const borderR = S * 0.47   // slightly inside the UV-circle edge

  ctx.save()
  ctx.strokeStyle = 'rgba(130, 200, 90, 0.12)'
  ctx.lineWidth = 5
  ctx.shadowColor = 'rgba(100, 180, 70, 0.20)'
  ctx.shadowBlur = 16
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    // Match CylinderGeometry cap UV: θ = i * 60°
    const theta = (i * Math.PI) / 3
    const px = cx + borderR * Math.sin(theta)
    const py = cy - borderR * Math.cos(theta)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.stroke()

  // Second pass — thinner, brighter inner line
  ctx.strokeStyle = 'rgba(160, 220, 120, 0.08)'
  ctx.lineWidth = 2
  ctx.shadowBlur = 8
  const innerBorderR = borderR - 8
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const theta = (i * Math.PI) / 3
    const px = cx + innerBorderR * Math.sin(theta)
    const py = cy - innerBorderR * Math.cos(theta)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.stroke()

  ctx.restore()
}

// ── Outer ground texture ─────────────────────────────────────────────────

export function createGroundTexture(): THREE.CanvasTexture {
  const S = GROUND_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!

  // Base grass color
  ctx.fillStyle = '#3a6622'
  ctx.fillRect(0, 0, S, S)

  // Multi-layer grass noise
  const img = ctx.getImageData(0, 0, S, S)
  const d = img.data
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = (y * S + x) * 4
      const n1 = fbm(x * 0.006, y * 0.006, 4)          // large patches
      const n2 = fbm(x * 0.025 + 200, y * 0.025 + 200, 3)  // medium
      const n3 = fbm(x * 0.08 + 500, y * 0.08 + 500, 2)    // fine
      const streak = smoothNoise(x * 0.01, y * 0.15)         // directional grass
      const v = (n1 - 0.5) * 55 + (n2 - 0.5) * 25 + (n3 - 0.5) * 12 + (streak - 0.5) * 15
      d[idx]     = clamp(d[idx] + v * 0.3)
      d[idx + 1] = clamp(d[idx + 1] + v * 0.85)
      d[idx + 2] = clamp(d[idx + 2] + v * 0.15)
    }
  }
  ctx.putImageData(img, 0, 0)

  // Subtle grass blade strokes
  ctx.save()
  ctx.globalAlpha = 0.07
  for (let i = 0; i < 400; i++) {
    const x = hash(i + 10, 0) * S
    const y = hash(0, i + 10) * S
    const len = 6 + hash(i, i + 5) * 16
    const angle = -Math.PI / 2 + (hash(i + 3, 1) - 0.5) * 0.5
    ctx.strokeStyle = hash(i + 2, 2) > 0.5 ? '#5aa035' : '#2a5818'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
    ctx.stroke()
  }
  ctx.restore()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(10, 10)
  tex.anisotropy = 4
  return tex
}
