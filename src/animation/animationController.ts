import * as THREE from 'three'
import type { AnimState, AnimController } from '../types/animation'

/** Map animation clip names from Blender export to our state names. */
const CLIP_NAME_MAP: Record<string, AnimState> = {
  idle:  'idle',
  cast:  'cast',
  death: 'death',
  move:  'move',
}

/**
 * Create an AnimController from a loaded GLTF model's scene + clips.
 * Starts in the 'idle' state.
 */
export function createAnimController(
  model: THREE.Object3D,
  clips: THREE.AnimationClip[],
): AnimController {
  const mixer = new THREE.AnimationMixer(model)
  const actions: Partial<Record<AnimState, THREE.AnimationAction>> = {}

  for (const clip of clips) {
    const state = CLIP_NAME_MAP[clip.name]
    if (!state) continue

    const action = mixer.clipAction(clip)

    if (state === 'idle' || state === 'move') {
      action.setLoop(THREE.LoopRepeat, Infinity)
    } else {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
    }

    actions[state] = action
  }

  // Start idle immediately
  const idleAction = actions.idle
  if (idleAction) {
    idleAction.play()
  }

  return { mixer, actions, currentState: 'idle' }
}

/**
 * Transition the controller to a new animation state with crossfade.
 * No-op if already in the target state (except 'cast' which restarts).
 */
export function transitionTo(
  controller: AnimController,
  state: AnimState,
  fadeDuration: number = 0.15,
): void {
  const nextAction = controller.actions[state]
  if (!nextAction) return

  // Allow restarting cast animation, but skip redundant transitions otherwise
  if (controller.currentState === state && state !== 'cast') return

  const prevAction = controller.actions[controller.currentState]

  if (prevAction && prevAction !== nextAction) {
    prevAction.fadeOut(fadeDuration)
  }

  nextAction.reset()
  nextAction.fadeIn(fadeDuration)
  nextAction.play()

  controller.currentState = state
}

/**
 * Tick the animation mixer. Call once per frame with delta in seconds.
 */
export function tickAnimController(
  controller: AnimController,
  dtSec: number,
): void {
  controller.mixer.update(dtSec)
}

/**
 * Set up a listener so that when a one-shot animation finishes,
 * the controller auto-transitions back to 'idle'.
 */
export function onFinished(
  controller: AnimController,
  callback: (state: AnimState) => void,
): void {
  controller.mixer.addEventListener('finished', () => {
    callback(controller.currentState)
  })
}
