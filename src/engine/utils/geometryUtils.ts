import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface BoxSpec {
  size: [number, number, number];
  position: [number, number, number];
  rotationY?: number;
}

/** Merges many boxes into one BufferGeometry so a whole facade detail or
 * furniture cluster costs one draw call / one material instance instead of
 * one per box — used by both LevelFacade (exterior) and the interior
 * furniture/room system (Phase 3). */
export function mergedBoxGeometry(specs: BoxSpec[]): THREE.BufferGeometry {
  const geometries = specs.map((spec) => {
    const geo = new THREE.BoxGeometry(...spec.size);
    const matrix = new THREE.Matrix4();
    const quaternion = spec.rotationY ? new THREE.Quaternion().setFromEuler(new THREE.Euler(0, spec.rotationY, 0)) : new THREE.Quaternion();
    matrix.compose(new THREE.Vector3(...spec.position), quaternion, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(matrix);
    return geo;
  });
  return mergeGeometries(geometries, false) ?? new THREE.BoxGeometry(0.001, 0.001, 0.001);
}
