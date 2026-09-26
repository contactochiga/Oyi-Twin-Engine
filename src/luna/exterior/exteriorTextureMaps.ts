import * as THREE from 'three';

// The packaged CC0 maps are optional visual enrichment, never a Suspense gate.
// Scalar/procedural materials render immediately; a failed map retains them.
// URLs are local, fixed, and do not come from glTF metadata or runtime assets.
const loaded = new Map<string, THREE.Texture>();
const pending = new Map<string, Array<(texture: THREE.Texture) => void>>();
function localMap(path: string, srgb: boolean, apply: (texture: THREE.Texture) => void) {
  if (typeof document === 'undefined') return;
  const cached = loaded.get(path);
  if (cached) { apply(cached); return; }
  const waiting = pending.get(path);
  if (waiting) { waiting.push(apply); return; }
  pending.set(path, [apply]);
  new THREE.TextureLoader().load(path, texture => {
    texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    loaded.set(path, texture);
    for (const bind of pending.get(path) ?? []) bind(texture);
    pending.delete(path);
  }, undefined, () => {
    pending.delete(path);
    console.warn(`Exterior texture unavailable; retaining procedural material: ${path}`);
  });
}
const stems = {
  stone: 'concrete_wall_008',
  paving: 'concrete_floor_02',
  timber: 'oak_wood_planks',
} as const;
export function bindExteriorMaps(material: THREE.MeshStandardMaterial, kind: keyof typeof stems) {
  const stem = stems[kind];
  for (const [slot, suffix, srgb] of [
    ['map', 'diff', true], ['normalMap', 'nor_gl', false], ['roughnessMap', 'rough', false],
  ] as const) {
    // The scanned paving albedo is weathered; use its micro-surface only.
    // The clean, restrained finish colour remains the material's own tint.
    if (kind === 'paving' && slot === 'map') continue;
    localMap(`/exterior-materials/${stem}_${suffix}_1k.jpg`, srgb, texture => {
      material[slot] = texture;
      material.needsUpdate = true;
    });
  }
  material.normalScale.set(kind === 'timber' ? .3 : .18, kind === 'timber' ? .3 : .18);
}
/** Finish UVs only. Geometry positions, transforms and canonical plan untouched.
 * Four metres per tile, based on the existing level-local mesh coordinates. */
export function metricFinishUV(source: THREE.BufferGeometry) {
  const g = source.clone(), p = g.getAttribute('position'), n = g.getAttribute('normal');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    uv[i * 2] = (nx > ny && nx > nz ? p.getZ(i) : p.getX(i)) / 4;
    uv[i * 2 + 1] = (ny > nx && ny > nz ? p.getZ(i) : p.getY(i)) / 4;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
