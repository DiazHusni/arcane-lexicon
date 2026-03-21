import * as THREE from 'three'
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass }      from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass }      from 'three/examples/jsm/postprocessing/OutputPass.js'
import {
  ARENA_HALF_SIZE,
  ARENA_WALL_HEIGHT,
  CAMERA_Y,
  CAMERA_Z_OFFSET,
  BLOOM_STRENGTH_BASE,
  BLOOM_STRENGTH_MAX,
  BLOOM_RADIUS,
  BLOOM_THRESHOLD,
  VIGNETTE_BASE,
  VIGNETTE_FADE_MS,
  FOG_DENSITY,
  GROUND_RADIUS,
} from '../constants/game'

// ── Vignette shader ────────────────────────────────────────────────────────

const VIGNETTE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const VIGNETTE_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float vignetteStrength;
varying vec2 vUv;
void main() {
  vec4  color    = texture2D(tDiffuse, vUv);
  vec2  uv       = vUv - 0.5;
  float vignette = 1.0 - dot(uv, uv) * vignetteStrength * 2.0;
  gl_FragColor   = vec4(color.rgb * vignette, color.a);
}
`

// ── Camera shake state ─────────────────────────────────────────────────────

interface ShakeState {
  amplitude: number
  duration:  number
  elapsed:   number
  active:    boolean
}

// ── Render context ─────────────────────────────────────────────────────────

export interface RenderContext {
  scene:    THREE.Scene
  camera:   THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  composer: EffectComposer

  /** Call once per frame with the real dt (ms) to apply shake and fade vignette. */
  update(dtMs: number): void

  /** Queue a camera shake event. Largest amplitude wins if overlapping. */
  triggerShake(amplitude: number, durationMs: number): void

  /** Set bloom strength (driven by intensity system, clamped 0–1.2). */
  setBloomStrength(strength: number): void

  /** Trigger a vignette flash (player hit). Fades back to base over VIGNETTE_FADE_MS. */
  triggerVignette(strength: number): void
}

export function createRenderContext(canvas: HTMLCanvasElement): RenderContext {
  // ── Scene ────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x3D7028)
  scene.fog = new THREE.FogExp2(0x4A8530, FOG_DENSITY)

  // ── Camera ───────────────────────────────────────────────────────────────
  const aspect = window.innerWidth / window.innerHeight
  const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200)
  const BASE_CAM_X = 0
  const BASE_CAM_Z = CAMERA_Z_OFFSET
  camera.position.set(BASE_CAM_X, CAMERA_Y, BASE_CAM_Z)
  camera.lookAt(0, 0, 0)

  // ── Renderer ─────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // ── Post-processing ──────────────────────────────────────────────────────
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5),
    BLOOM_STRENGTH_BASE,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  )
  composer.addPass(bloomPass)

  const vignettePass = new ShaderPass({
    uniforms: {
      tDiffuse:         { value: null },
      vignetteStrength: { value: VIGNETTE_BASE },
    },
    vertexShader:   VIGNETTE_VERT,
    fragmentShader: VIGNETTE_FRAG,
  })
  composer.addPass(vignettePass)
  composer.addPass(new OutputPass())

  // ── Lighting ─────────────────────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x90C858, 3)
  scene.add(ambient)
  const dirLight = new THREE.DirectionalLight(0xFFFAC0, 3)
  dirLight.position.set(5, 12, 8)
  scene.add(dirLight)

  // ── Arena ─────────────────────────────────────────────────────────────────
  buildArena(scene)

  // ── Resize handler ────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer.setSize(w, h)
    bloomPass.resolution.set(w * 0.5, h * 0.5)
  })

  // ── Shake state ───────────────────────────────────────────────────────────
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const shake: ShakeState = { amplitude: 0, duration: 0, elapsed: 0, active: false }

  // ── Vignette state ────────────────────────────────────────────────────────
  let vignetteTarget  = VIGNETTE_BASE
  let vignetteElapsed = VIGNETTE_FADE_MS

  // ── Frame update (called from main.ts before composer.render) ─────────────
  function update(dtMs: number): void {
    // Camera shake
    if (!reducedMotion && shake.active) {
      shake.elapsed += dtMs
      if (shake.elapsed >= shake.duration) {
        shake.active = false
        camera.position.set(BASE_CAM_X, CAMERA_Y, BASE_CAM_Z)
        camera.lookAt(0, 0, 0)
      } else {
        const decay = 1 - shake.elapsed / shake.duration
        camera.position.x = BASE_CAM_X + (Math.random() * 2 - 1) * shake.amplitude * decay
        camera.position.z = BASE_CAM_Z + (Math.random() * 2 - 1) * shake.amplitude * decay
        camera.lookAt(0, 0, 0)
      }
    }

    // Vignette fade back to base
    if (vignetteElapsed < VIGNETTE_FADE_MS) {
      vignetteElapsed += dtMs
      const t = Math.min(1, vignetteElapsed / VIGNETTE_FADE_MS)
      const strength = vignetteTarget + (VIGNETTE_BASE - vignetteTarget) * t
      vignettePass.uniforms['vignetteStrength'].value = strength
    }
  }

  function triggerShake(amplitude: number, durationMs: number): void {
    if (reducedMotion) return
    if (!shake.active || amplitude > shake.amplitude) {
      shake.amplitude = amplitude
      shake.duration  = durationMs
      shake.elapsed   = 0
      shake.active    = true
    }
  }

  function setBloomStrength(strength: number): void {
    bloomPass.strength = Math.max(BLOOM_STRENGTH_BASE, Math.min(BLOOM_STRENGTH_MAX, strength))
  }

  function triggerVignette(strength: number): void {
    vignetteTarget  = strength
    vignetteElapsed = 0
    vignettePass.uniforms['vignetteStrength'].value = strength
  }

  return { scene, camera, renderer, composer, update, triggerShake, setBloomStrength, triggerVignette }
}

// ── Arena construction ─────────────────────────────────────────────────────

function buildArena(scene: THREE.Scene): void {
  // Large outer ground plane — fills the screen to the horizon
  const outerGeo = new THREE.PlaneGeometry(GROUND_RADIUS * 2, GROUND_RADIUS * 2)
  const outerMat = new THREE.MeshLambertMaterial({ color: 0x4A8530 })
  const outerGround = new THREE.Mesh(outerGeo, outerMat)
  outerGround.rotation.x = -Math.PI / 2
  outerGround.position.y = -0.08   // just below arena floor (avoids z-fighting)
  scene.add(outerGround)

  const radius = ARENA_HALF_SIZE
  const wallH  = ARENA_WALL_HEIGHT

  // Hexagonal floor — CylinderGeometry with 6 radial segments = regular hexagon
  const floorGeo = new THREE.CylinderGeometry(radius, radius, 0.15, 6, 1)
  const floorMat = new THREE.MeshLambertMaterial({
    color:             0x5A9B3A,
    emissive:          new THREE.Color(0x000000),
    emissiveIntensity: 0,
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.position.y = -0.075
  scene.add(floor)

  // Bevel accent lines on hex floor edges
  const edgesGeo = new THREE.EdgesGeometry(floorGeo)
  const edgesMat = new THREE.LineBasicMaterial({
    color:       0x3A7820,
    transparent: true,
    opacity:     0.7,
  })
  const edges = new THREE.LineSegments(edgesGeo, edgesMat)
  edges.position.y = -0.075
  scene.add(edges)

  // Boundary walls — 6 panels along hex edges
  const wallMat = new THREE.MeshLambertMaterial({
    color:       0x2A6018,
    side:        THREE.DoubleSide,
    transparent: true,
    opacity:     0.35,
  })

  // For a regular hexagon, the 6 edges connect vertices at angles k*60°
  // Each edge midpoint is at angle (k + 0.5)*60° at distance radius * cos(30°)
  const edgeDist = radius * Math.cos(Math.PI / 6) // apothem

  for (let i = 0; i < 6; i++) {
    const midAngle = (i + 0.5) / 6 * Math.PI * 2
    const cx = Math.cos(midAngle) * edgeDist
    const cz = Math.sin(midAngle) * edgeDist
    const panelW = radius // side length of regular hex with circumradius = radius
    const wallGeo = new THREE.PlaneGeometry(panelW, wallH)
    const wall = new THREE.Mesh(wallGeo, wallMat)
    wall.position.set(cx, wallH / 2, cz)
    wall.rotation.y = -midAngle
    scene.add(wall)
  }
}
