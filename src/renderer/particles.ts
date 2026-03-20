/**
 * Particle System — pre-allocated ring buffer, zero runtime allocation.
 *
 * Layout: 13 floats per particle
 * [0] x  [1] y  [2] z    — position
 * [3] vx [4] vy [5] vz   — velocity (world units/s)
 * [6] life               — remaining lifetime (ms)
 * [7] maxLife            — original lifetime (ms)
 * [8] startSize          — size at birth (world units)
 * [9] endSize            — size at death
 * [10] r [11] g [12] b   — color
 */
import * as THREE from 'three'

const PARTICLE_CAPACITY = 50_000
const FLOATS = 13

const VERT = /* glsl */ `
attribute float aSize;
attribute float aOpacity;
attribute vec3  aColor;
varying   vec3  vColor;
varying   float vOpacity;

void main() {
  vColor   = aColor;
  vOpacity = aOpacity;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / -mvPos.z);
  gl_Position  = projectionMatrix * mvPos;
}
`

const FRAG = /* glsl */ `
varying vec3  vColor;
varying float vOpacity;

void main() {
  vec2  c    = gl_PointCoord - 0.5;
  float dist = length(c);
  if (dist > 0.5) discard;
  float alpha = (0.5 - dist) * 2.0 * vOpacity;
  gl_FragColor = vec4(vColor, alpha);
}
`

export interface EmitConfig {
  count:     number
  origin:    THREE.Vector3
  speed:     number          // world units / second
  lifetime:  number          // ms
  startSize: number          // world units
  endSize:   number
  color:     THREE.Color
  /** Spread angle in radians — 0 = pure up, Math.PI = full sphere */
  spread:    number
  /** If true, spread is in XZ plane only (radial ring, no Y variance) */
  radialXZ?: boolean
}

export class ParticleSystem {
  private readonly data: Float32Array
  private head = 0

  private readonly posArr: Float32Array
  private readonly colorArr: Float32Array
  private readonly sizeArr: Float32Array
  private readonly opacityArr: Float32Array

  private readonly posAttr: THREE.BufferAttribute
  private readonly colorAttr: THREE.BufferAttribute
  private readonly sizeAttr: THREE.BufferAttribute
  private readonly opacityAttr: THREE.BufferAttribute

  readonly points: THREE.Points

  constructor(scene: THREE.Scene) {
    this.data = new Float32Array(PARTICLE_CAPACITY * FLOATS)

    this.posArr     = new Float32Array(PARTICLE_CAPACITY * 3)
    this.colorArr   = new Float32Array(PARTICLE_CAPACITY * 3)
    this.sizeArr    = new Float32Array(PARTICLE_CAPACITY)
    this.opacityArr = new Float32Array(PARTICLE_CAPACITY)

    const geo = new THREE.BufferGeometry()

    this.posAttr     = new THREE.BufferAttribute(this.posArr,     3)
    this.colorAttr   = new THREE.BufferAttribute(this.colorArr,   3)
    this.sizeAttr    = new THREE.BufferAttribute(this.sizeArr,    1)
    this.opacityAttr = new THREE.BufferAttribute(this.opacityArr, 1)

    geo.setAttribute('position', this.posAttr)
    geo.setAttribute('aColor',   this.colorAttr)
    geo.setAttribute('aSize',    this.sizeAttr)
    geo.setAttribute('aOpacity', this.opacityAttr)

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(geo, mat)
    this.points.frustumCulled = false
    scene.add(this.points)
  }

  emit(cfg: EmitConfig): void {
    const { count, origin, speed, lifetime, startSize, endSize, color, spread, radialXZ } = cfg

    for (let i = 0; i < count; i++) {
      const d = this.head * FLOATS

      // position (with tiny jitter)
      this.data[d + 0] = origin.x
      this.data[d + 1] = origin.y
      this.data[d + 2] = origin.z

      // velocity
      const s = speed * (0.6 + Math.random() * 0.8)
      let vx: number, vy: number, vz: number

      if (radialXZ) {
        const angle = Math.random() * Math.PI * 2
        vx = Math.cos(angle) * s
        vy = (Math.random() - 0.5) * s * 0.3
        vz = Math.sin(angle) * s
      } else {
        const theta = Math.random() * Math.PI * 2
        const phi   = Math.acos(1 - Math.random() * 2 * (spread / Math.PI))
        vx = Math.sin(phi) * Math.cos(theta) * s
        vy = Math.cos(phi) * s
        vz = Math.sin(phi) * Math.sin(theta) * s
      }

      this.data[d + 3] = vx
      this.data[d + 4] = vy
      this.data[d + 5] = vz

      // life
      this.data[d + 6] = lifetime
      this.data[d + 7] = lifetime

      // sizes
      this.data[d + 8] = startSize
      this.data[d + 9] = endSize

      // color
      this.data[d + 10] = color.r
      this.data[d + 11] = color.g
      this.data[d + 12] = color.b

      this.head = (this.head + 1) % PARTICLE_CAPACITY
    }
  }

  update(dtMs: number): void {
    const dtSec = dtMs / 1000

    for (let i = 0; i < PARTICLE_CAPACITY; i++) {
      const d = i * FLOATS
      const life = this.data[d + 6]

      const pi = i * 3

      if (life <= 0) {
        this.sizeArr[i]    = 0
        this.opacityArr[i] = 0
        continue
      }

      // Decrement life
      const newLife = life - dtMs
      this.data[d + 6] = newLife

      // Update position
      this.data[d + 0] += this.data[d + 3] * dtSec
      this.data[d + 1] += this.data[d + 4] * dtSec
      this.data[d + 2] += this.data[d + 5] * dtSec

      // Write position to GPU buffer
      this.posArr[pi]     = this.data[d + 0]
      this.posArr[pi + 1] = this.data[d + 1]
      this.posArr[pi + 2] = this.data[d + 2]

      // Write color
      this.colorArr[pi]     = this.data[d + 10]
      this.colorArr[pi + 1] = this.data[d + 11]
      this.colorArr[pi + 2] = this.data[d + 12]

      // Size interpolation: startSize → endSize
      const maxLife   = this.data[d + 7]
      const lifeRatio = Math.max(0, newLife) / maxLife
      const t         = 1 - lifeRatio
      this.sizeArr[i] = this.data[d + 8] + (this.data[d + 9] - this.data[d + 8]) * t

      // Opacity: fast in, slow fade
      this.opacityArr[i] = Math.pow(lifeRatio, 0.5)
    }

    this.posAttr.needsUpdate     = true
    this.colorAttr.needsUpdate   = true
    this.sizeAttr.needsUpdate    = true
    this.opacityAttr.needsUpdate = true
  }
}
