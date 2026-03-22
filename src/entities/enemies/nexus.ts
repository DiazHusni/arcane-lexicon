import type { EnemyConfig } from '../../types/enemy'
import { HEX } from '../../constants/colors'
import * as THREE from 'three'

export const NEXUS_CONFIG: EnemyConfig = {
  type: 'nexus',
  baseSpeed: 0.21,
  health: 2,           // survives Phase 1 hit; dies on Phase 2
  threatRadius: 1.5,
  tierPoints: 100,
  geometryRadius: 0.9,
}

/**
 * Nexus — boss wraith.
 * Massive 8-sided cone, large round head, broad shoulder masses,
 * glowing red-orange eyes that signal menace.
 */
export function createNexusGroup(): { group: THREE.Group; bodyMat: THREE.MeshLambertMaterial } {
  const bodyMat = new THREE.MeshLambertMaterial({
    color:       HEX.COLD_BLUE,
    emissive:    new THREE.Color(HEX.COLD_BLUE).multiplyScalar(0.2),
    flatShading: true,
  })
  const eyeMat = new THREE.MeshLambertMaterial({
    color:             0xff4400,
    emissive:          new THREE.Color(0xff4400),
    emissiveIntensity: 1.0,
  })

  const group = new THREE.Group()

  // Massive cone body
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 8), bodyMat)
  body.position.y = 0.1
  group.add(body)

  // Large round head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), bodyMat)
  head.position.y = 1.05
  group.add(head)

  // Red-orange menacing eyes
  const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6)
  const eyeL   = new THREE.Mesh(eyeGeo, eyeMat)
  eyeL.position.set(-0.13, 1.10, 0.25)
  group.add(eyeL)

  const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
  eyeR.position.set(0.13, 1.10, 0.25)
  group.add(eyeR)

  // Broad shoulder masses — imposing silhouette
  const shoulderGeo = new THREE.SphereGeometry(0.16, 7, 7)
  const shoulderL   = new THREE.Mesh(shoulderGeo, bodyMat)
  shoulderL.position.set(-0.55, 0.35, 0)
  group.add(shoulderL)

  const shoulderR = new THREE.Mesh(shoulderGeo, bodyMat)
  shoulderR.position.set(0.55, 0.35, 0)
  group.add(shoulderR)

  return { group, bodyMat }
}
