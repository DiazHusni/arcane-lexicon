import type { EnemyConfig } from '../../types/enemy'
import { HEX } from '../../constants/colors'
import * as THREE from 'three'

export const PERFECTUS_CONFIG: EnemyConfig = {
  type: 'perfectus',
  baseSpeed: 0.36,
  health: 1,
  threatRadius: 1.1,
  tierPoints: 30,
  geometryRadius: 0.6,
}

/**
 * Perfectus — tall, elegant wraith.
 * Tall narrow 8-sided cone, round head, wide hood-rim collar, glowing white eyes.
 */
export function createPerfectusGroup(): { group: THREE.Group; bodyMat: THREE.MeshLambertMaterial } {
  const bodyMat = new THREE.MeshLambertMaterial({
    color:       HEX.COLD_BLUE,
    emissive:    new THREE.Color(HEX.COLD_BLUE).multiplyScalar(0.15),
    flatShading: true,
  })
  const eyeMat = new THREE.MeshLambertMaterial({
    color:             0xffffff,
    emissive:          new THREE.Color(0xffffff),
    emissiveIntensity: 1.0,
  })

  const group = new THREE.Group()

  // Tall narrow cone body — elevated slightly to emphasize height
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.3, 8), bodyMat)
  body.position.y = 0.08
  group.add(body)

  // Round head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bodyMat)
  head.position.y = 0.87
  group.add(head)

  // Glowing white eyes
  const eyeGeo = new THREE.SphereGeometry(0.055, 6, 6)
  const eyeL   = new THREE.Mesh(eyeGeo, eyeMat)
  eyeL.position.set(-0.10, 0.91, 0.19)
  group.add(eyeL)

  const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
  eyeR.position.set(0.10, 0.91, 0.19)
  group.add(eyeR)

  // Hood-rim collar — wide flat ring at shoulder height, marks this as refined
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 8), bodyMat)
  collar.position.y = 0.62
  group.add(collar)

  return { group, bodyMat }
}
