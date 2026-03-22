import type { EnemyConfig } from '../../types/enemy'
import { HEX } from '../../constants/colors'
import * as THREE from 'three'

export const SOLIDUS_CONFIG: EnemyConfig = {
  type: 'solidus',
  baseSpeed: 0.6,
  health: 1,
  threatRadius: 0.95,
  tierPoints: 20,
  geometryRadius: 0.5,
}

/**
 * Solidus — stocky, medium-tier wraith.
 * Wider 8-sided cone body, round head, side arm-masses, glowing white eyes.
 */
export function createSolidusGroup(): { group: THREE.Group; bodyMat: THREE.MeshLambertMaterial } {
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

  // Wider stocky cone body
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.0, 8), bodyMat)
  body.position.y = -0.02
  group.add(body)

  // Round head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), bodyMat)
  head.position.y = 0.68
  group.add(head)

  // Glowing white eyes
  const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6)
  const eyeL   = new THREE.Mesh(eyeGeo, eyeMat)
  eyeL.position.set(-0.09, 0.71, 0.17)
  group.add(eyeL)

  const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
  eyeR.position.set(0.09, 0.71, 0.17)
  group.add(eyeR)

  // Side arm-masses — give the stocky silhouette extra width
  const armGeo = new THREE.SphereGeometry(0.09, 6, 6)
  const armL   = new THREE.Mesh(armGeo, bodyMat)
  armL.position.set(-0.33, 0.1, 0)
  group.add(armL)

  const armR = new THREE.Mesh(armGeo, bodyMat)
  armR.position.set(0.33, 0.1, 0)
  group.add(armR)

  return { group, bodyMat }
}
