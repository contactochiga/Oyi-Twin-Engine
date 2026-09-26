import { useEffect, useState } from 'react';
import * as THREE from 'three';

export interface LandscapeVisual {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
}

/** Vetted decorative species only. Never mount the imported scene or its metadata. */
export function prepareShrubVisual(scene: THREE.Group): LandscapeVisual {
  scene.updateMatrixWorld(true);
  const source = scene.getObjectByName('fern_02_b');
  if (!(source instanceof THREE.Mesh) || !(source.material instanceof THREE.MeshStandardMaterial)) {
    throw new Error('Unexpected landscape asset');
  }
  const geometry = source.geometry.clone().applyMatrix4(source.matrixWorld);
  const vertices = geometry.getAttribute('position');
  const triangles = (geometry.index?.count ?? vertices.count) / 3;
  if (vertices.count > 6000 || triangles > 6000) { geometry.dispose(); throw new Error('Landscape mesh exceeds budget'); }
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = box.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every(n => Number.isFinite(n) && n > 0)) { geometry.dispose(); throw new Error('Invalid landscape bounds'); }
  // Uniform fit inside the prior 1m × .7m × 1m decorative envelope. Existing
  // placement matrices remain authoritative; no stretched species or new routes.
  const scale = Math.min(1 / size.x, .7 / size.y, 1 / size.z);
  const center = box.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -box.min.y, -center.z).scale(scale, scale, scale);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const material = source.material.clone();
  material.name = 'Exterior landscape — reference species';
  material.normalScale.set(.45, .45);
  for (const texture of [material.map, material.normalMap, material.roughnessMap]) {
    if (texture) texture.anisotropy = 4;
  }
  return { geometry, material };
}

let pending: Promise<LandscapeVisual | null> | undefined;
function loadShrub() {
  pending ??= import('three/examples/jsm/loaders/GLTFLoader.js')
    .then(({ GLTFLoader }) => new GLTFLoader().loadAsync('/exterior-landscape/fern_02_1k.gltf')).then(gltf => {
    let visual: LandscapeVisual | undefined;
    try {
      const source = gltf.scene.getObjectByName('fern_02_b') as THREE.Mesh | undefined;
      const material = source?.material as THREE.MeshStandardMaterial | undefined;
      // GLTFLoader may resolve despite a failed image request. Keep the usable
      // fallback instead of mounting an incomplete visual in that case.
      if (!material?.map?.image || !material.normalMap?.image || !material.roughnessMap?.image) {
        throw new Error('Landscape textures incomplete');
      }
      visual = prepareShrubVisual(gltf.scene);
      return visual;
    } finally {
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      gltf.scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            materials.add(material);
            for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
          }
        }
      });
      materials.forEach(material => material.dispose());
      // A successful shared visual owns the source textures for the session.
      // On failure none are retained, including any decoded ImageBitmaps.
      if (!visual) textures.forEach(texture => {
        texture.dispose();
        const image = texture.image as { close?: () => void } | undefined;
        if (typeof image?.close === 'function') image.close();
      });
    }
  }).catch(error => {
    console.warn('Optional landscape unavailable; procedural planting retained.', error);
    return null;
  });
  return pending;
}

/** Optional asset never suspends the Twin or blocks canonical interactions. */
export function useShrubVisual() {
  const [visual, setVisual] = useState<LandscapeVisual | null>(null);
  useEffect(() => {
    let active = true;
    void loadShrub().then(value => { if (active) setVisual(value); });
    return () => { active = false; };
  }, []);
  return visual;
}
