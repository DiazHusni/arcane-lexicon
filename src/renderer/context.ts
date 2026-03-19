import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ARENA_HALF_SIZE, ARENA_WALL_HEIGHT, CAMERA_Y, CAMERA_Z_OFFSET } from '../constants/game'

export interface RenderContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  composer: EffectComposer
}

export function createRenderContext(canvas: HTMLCanvasElement): RenderContext {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x080810)

  const aspect = window.innerWidth / window.innerHeight
  const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200)
  camera.position.set(0, CAMERA_Y, CAMERA_Z_OFFSET)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // EffectComposer pipeline — Phase 1: RenderPass + OutputPass only.
  // UnrealBloomPass will be added in Phase 3 without touching this setup.
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new OutputPass())

  // Lighting
  const ambient = new THREE.AmbientLight(0x1a1830, 2)
  scene.add(ambient)
  const dirLight = new THREE.DirectionalLight(0x9090cc, 1.5)
  dirLight.position.set(5, 12, 8)
  scene.add(dirLight)

  buildArena(scene)

  window.addEventListener('resize', () => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer.setSize(w, h)
  })

  return { scene, camera, renderer, composer }
}

function buildArena(scene: THREE.Scene): void {
  const size = ARENA_HALF_SIZE * 2
  const wallH = ARENA_WALL_HEIGHT

  // Floor
  const floorGeo = new THREE.PlaneGeometry(size, size)
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x12111e })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  // Grid overlay
  const grid = new THREE.GridHelper(size, 20, 0x1e1c30, 0x1e1c30)
  scene.add(grid)

  // Boundary walls (DoubleSide so they're visible from both angles)
  const wallMat = new THREE.MeshLambertMaterial({
    color: 0x1a1830,
    side: THREE.DoubleSide,
  })

  // North / South — span X direction, stand in XY plane
  const nsGeo = new THREE.PlaneGeometry(size, wallH)
  for (const z of [-ARENA_HALF_SIZE, ARENA_HALF_SIZE]) {
    const mesh = new THREE.Mesh(nsGeo, wallMat)
    mesh.position.set(0, wallH / 2, z)
    scene.add(mesh)
  }

  // West / East — span Z direction, rotate Y by 90°
  const weGeo = new THREE.PlaneGeometry(size, wallH)
  for (const x of [-ARENA_HALF_SIZE, ARENA_HALF_SIZE]) {
    const mesh = new THREE.Mesh(weGeo, wallMat)
    mesh.position.set(x, wallH / 2, 0)
    mesh.rotation.y = Math.PI / 2
    scene.add(mesh)
  }
}
