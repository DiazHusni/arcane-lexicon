import type * as THREE from 'three'

export type AnimState = 'idle' | 'move' | 'cast' | 'death'

export interface AnimController {
  mixer: THREE.AnimationMixer
  actions: Partial<Record<AnimState, THREE.AnimationAction>>
  currentState: AnimState
}

export interface LoadedModel {
  scene: THREE.Group
  animations: THREE.AnimationClip[]
}
