import type { EnemyConfig } from '../../types/enemy'
import { HEX } from '../../constants/colors'
import * as THREE from 'three'

export const ACUTUS_CONFIG: EnemyConfig = {
  type: 'acutus',
  baseSpeed: 0.9,
  health: 1,
  threatRadius: 0.8,
  tierPoints: 10,
  geometryRadius: 0.45,
}

/**
 * Acutus — small, fast wraith.
 * Narrow 7-sided draping cone body, round head, glowing white eyes.
 */
export function createAcutusGroup(): { group: THREE.Group; bodyMat: THREE.MeshLambertMaterial } {
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

  // Draping cone body — base near ground, tip pointing up
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 7), bodyMat)
  body.position.y = -0.05
  group.add(body)

  // Round head above the cone tip
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), bodyMat)
  head.position.y = 0.52
  group.add(head)

  // Glowing white eyes
  const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6)
  const eyeL   = new THREE.Mesh(eyeGeo, eyeMat)
  eyeL.position.set(-0.07, 0.55, 0.13)
  group.add(eyeL)

  const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
  eyeR.position.set(0.07, 0.55, 0.13)
  group.add(eyeR)

  return { group, bodyMat }
}
