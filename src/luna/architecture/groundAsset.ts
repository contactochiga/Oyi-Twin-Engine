import * as THREE from 'three';
import type { RepresentationIdentity, RepresentationPolicy } from '../../engine/representationPolicy';
import { is3D } from '../../engine/representationPolicy';

/** Trusted host configuration, never taken from glTF extras or user input.
 * Foundation scope: Ground envelope only. No interiors, equipment or private refs. */
export interface GroundAssetSource {
  revision: string;
  url: string;
  sha256: string;
  ownerLevelRef: 'LUNA-GROUND';
  coordinateFrame: 'ground-floor-local-metres-y-up';
  bindings: { nodeName: string; canonicalRef: 'LUNA-GROUND'; role: 'envelope' }[];
}
export interface GroundAsset {
  scene: THREE.Group;
  meshes: THREE.Mesh[];
  dispose: () => void;
}
const MAX_BYTES = 20 * 1024 * 1024;

export function validateGroundSource(source: GroundAssetSource) {
  if (!source || source.ownerLevelRef !== 'LUNA-GROUND' || source.coordinateFrame !== 'ground-floor-local-metres-y-up') throw Error('Only the registered Ground envelope frame is supported');
  if (!source.revision || !/^[a-f0-9]{64}$/.test(source.sha256)) throw Error('Revision and SHA-256 are required');
  if (!/^\/architectural-assets\/[a-zA-Z0-9_/-]+\.(glb|gltf)$/.test(source.url)) throw Error('Only local architectural-assets packages are supported');
  if (!Array.isArray(source.bindings) || !source.bindings.length || source.bindings.length > 256) throw Error('Invalid binding count');
  const names = new Set<string>();
  for (const binding of source.bindings) {
    if (binding.canonicalRef !== 'LUNA-GROUND' || binding.role !== 'envelope' || !binding.nodeName || names.has(binding.nodeName)) throw Error('Unknown, duplicate or out-of-scope binding');
    names.add(binding.nodeName);
  }
}

export function admitGroundSource(source: GroundAssetSource, policy: RepresentationPolicy, identity: RepresentationIdentity) {
  // Registry validation precedes policy: unknown refs must never reach its fallback.
  validateGroundSource(source);
  if (!is3D(policy.resolveMode({ ref: 'LUNA-GROUND', identity }))) throw Error('Ground 3D representation is not permitted');
}

/** Reject external dependencies BEFORE GLTFLoader can request them. Initial
 * format supports self-contained GLB or glTF with embedded buffers/images.
 * Compression, extensions and animation require a separately verified adapter. */
export function inspectGroundPayload(bytes: ArrayBuffer, source?: GroundAssetSource) {
  if (bytes.byteLength > MAX_BYTES || bytes.byteLength < 4) throw Error('Invalid package size');
  const view = new DataView(bytes);
  let jsonBytes = new Uint8Array(bytes);
  let binary: Uint8Array | undefined;
  if (view.getUint32(0, true) === 0x46546c67) {
    if (bytes.byteLength < 20 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw Error('Invalid GLB header');
    const length = view.getUint32(12, true);
    if (length > bytes.byteLength - 20) throw Error('Invalid GLB JSON length');
    jsonBytes = new Uint8Array(bytes, 20, length);
    const next = 20 + length;
    if (next < bytes.byteLength) {
      if (next + 8 > bytes.byteLength || view.getUint32(next + 4, true) !== 0x004e4942 || next + 8 + view.getUint32(next, true) !== bytes.byteLength) throw Error('Invalid GLB binary chunk');
      binary = new Uint8Array(bytes, next + 8, view.getUint32(next, true));
    }
  }
  const json = JSON.parse(new TextDecoder().decode(jsonBytes));
  if (json.asset?.version !== '2.0' || json.extensionsUsed?.length || json.extensionsRequired?.length || json.animations?.length || json.skins?.length || json.cameras?.length) throw Error('Unsupported glTF feature');
  // Reject undeclared extension objects as well as extension declarations.
  function inspect(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'extensions' || key === 'targets') throw Error('Extensions and morph targets are unsupported');
      if (key === 'uri' && (typeof child !== 'string' || !/^data:(application\/(octet-stream|gltf-buffer)|image\/(png|jpeg));base64,[A-Za-z0-9+/=]+$/.test(child))) throw Error('External or unsupported dependency');
      inspect(child);
    }
  }
  inspect(json);
  if (json.scenes?.length !== 1) throw Error('Exactly one scene is required');
  if ((json.nodes?.length ?? 0) > 512 || (json.materials?.length ?? 0) > 128 || (json.textures?.length ?? 0) > 32) throw Error('Package exceeds foundation budget');
  const declaredBytes = (json.buffers ?? []).reduce((sum: number, b: { byteLength: number }) => sum + b.byteLength, 0);
  if (!Number.isFinite(declaredBytes) || declaredBytes > MAX_BYTES) throw Error('Buffer budget exceeded');
  const vertices = (json.accessors ?? []).reduce((sum: number, a: { count: number }) => sum + a.count, 0);
  if (!Number.isFinite(vertices) || vertices > 2000000) throw Error('Accessor budget exceeded');
  let pixels = 0;
  const decodeData = (uri: string) => Uint8Array.from(atob(uri.slice(uri.indexOf(',') + 1)), c => c.charCodeAt(0));
  for (const image of json.images ?? []) {
    let data: Uint8Array;
    if (image.uri) data = decodeData(image.uri);
    else {
      const range = json.bufferViews?.[image.bufferView];
      const buffer = json.buffers?.[range?.buffer];
      const content = buffer?.uri ? decodeData(buffer.uri) : binary;
      const start = range?.byteOffset ?? 0;
      if (!range || !content || start < 0 || range.byteLength < 1 || start + range.byteLength > content.length) throw Error('Invalid image buffer view');
      data = content.subarray(start, start + range.byteLength);
    }
    const [width, height] = imageDimensions(data);
    pixels += width * height;
    if (width < 1 || height < 1 || width > 4096 || height > 4096 || pixels > 32 * 1024 * 1024) throw Error('Decoded image budget exceeded');
  }
  const nodes = json.nodes ?? [];
  const visited = new Set<number>(), meshIds = new Set<number>();
  const names = new Set<string>();
  function visit(index: number) {
    if (!Number.isInteger(index) || !nodes[index] || visited.has(index)) throw Error('Invalid or repeated scene node');
    visited.add(index);
    const node = nodes[index];
    if (node.mesh !== undefined) {
      if (meshIds.has(node.mesh) || !json.meshes?.[node.mesh]) throw Error('Mesh reuse requires an explicit instance adapter');
      meshIds.add(node.mesh);
      if (names.has(node.name) || !source?.bindings.some(b => b.nodeName === node.name)) {
        if (source) throw Error('Payload contains unbound mesh');
      }
      names.add(node.name);
      if (json.meshes[node.mesh].primitives?.some((p: { mode?: number }) => p.mode !== undefined && p.mode !== 4)) throw Error('Only triangle primitives are supported');
    }
    for (const child of node.children ?? []) visit(child);
  }
  for (const root of json.scenes[0].nodes ?? []) visit(root);
  if (visited.size !== nodes.length || meshIds.size !== (json.meshes?.length ?? 0)) throw Error('Unreachable package content');
  if (source && names.size !== source.bindings.length) throw Error('Missing payload binding');
  return json;
}

/** Read dimensions before the browser allocates decoded image memory. */
function imageDimensions(data: Uint8Array): [number, number] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a && view.getUint32(12) === 0x49484452) return [view.getUint32(16), view.getUint32(20)];
  if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
    let cursor = 2;
    while (cursor + 4 <= data.length) {
      if (data[cursor++] !== 0xff) break;
      while (data[cursor] === 0xff) cursor++;
      const marker = data[cursor++];
      if (cursor + 2 > data.length) break;
      const length = view.getUint16(cursor);
      if (length < 2 || cursor + length > data.length) break;
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 7) return [view.getUint16(cursor + 5), view.getUint16(cursor + 3)];
      cursor += length;
    }
  }
  throw Error('Only bounded PNG and baseline/progressive JPEG images are supported');
}

export function disposeGroundScene(scene: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  textures.forEach(t => { t.dispose(); if (typeof ImageBitmap !== 'undefined' && t.image instanceof ImageBitmap) t.image.close(); });
}

/** The loader owns an uncached scene. Clone mutable materials per mesh;
 * geometry/textures remain shared only inside this single owned package. */
export function bindGroundScene(scene: THREE.Group, source: GroundAssetSource): GroundAsset {
  validateGroundSource(source);
  const bindings = new Map(source.bindings.map(b => [b.nodeName, b]));
  const meshes: THREE.Mesh[] = [], used = new Set<string>();
  const roots = new Map<string, THREE.Object3D>();
  scene.traverse(object => {
    if (!bindings.has(object.name)) return;
    if (roots.has(object.name)) throw Error('Duplicate bound node');
    roots.set(object.name, object);
  });
  scene.updateMatrixWorld(true);
  let triangles = 0;
  scene.traverse(object => {
    if (object.type !== 'Group' && object.type !== 'Object3D' && object.type !== 'Mesh') throw Error('Unsupported scene object');
    if (!(object instanceof THREE.Mesh)) return;
    // GLTFLoader expands multi-primitive mesh nodes into a named Group.
    // All its material parts inherit the one validated semantic binding.
    let owner: THREE.Object3D | null = object;
    while (owner && roots.get(owner.name) !== owner) owner = owner.parent;
    if (!owner) throw Error('Unbound mesh');
    used.add(owner.name);
    const position = object.geometry.getAttribute('position');
    if (!position || !position.count) throw Error('Missing mesh positions');
    for (let i = 0; i < position.count; i++) if (![position.getX(i), position.getY(i), position.getZ(i)].every(Number.isFinite)) throw Error('Non-finite geometry');
    triangles += (object.geometry.index?.count ?? position.count) / 3;
    for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(mat instanceof THREE.MeshStandardMaterial)) throw Error('Only standard PBR materials are supported');
    }
    meshes.push(object);
  });
  if (used.size !== bindings.size || triangles > 100000) throw Error('Missing binding or triangle budget exceeded');
  const box = new THREE.Box3().setFromObject(scene);
  // Explicit Ground floor-local frame; never auto-center/scale. Modest envelope
  // allowance covers facade projections but cannot overlap adjacent floors.
  if (box.isEmpty() || ![...box.min, ...box.max].every(Number.isFinite) || box.min.x < -24 || box.max.x > 24 || box.min.z < -19 || box.max.z > 19 || box.min.y < -0.1 || box.max.y > 5) throw Error('Ground coordinate bounds exceeded');
  const originals = new Set<THREE.Material>();
  for (const mesh of meshes) {
    const clone = (m: THREE.Material) => { originals.add(m); return m.clone(); };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
    mesh.castShadow = mesh.receiveShadow = true;
    // Exported metadata is never the semantic authority.
    mesh.userData = { canonicalRef: 'LUNA-GROUND', architectureRole: 'envelope' };
    const originalRaycast = mesh.raycast.bind(mesh);
    mesh.raycast = (raycaster, hits) => {
      for (let ancestor: THREE.Object3D | null = mesh; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
      const candidates: THREE.Intersection[] = [];
      originalRaycast(raycaster, candidates);
      for (const hit of candidates) {
        const material = Array.isArray(mesh.material) ? mesh.material[hit.face?.materialIndex ?? 0] : mesh.material;
        if (!material || !material.visible || material.opacity <= 0.051 || material.clippingPlanes?.some(p => p.distanceToPoint(hit.point) < 0)) continue;
        hits.push(hit);
      }
    };
  }
  originals.forEach(m => m.dispose());
  let disposed = false;
  return { scene, meshes, dispose: () => { if (!disposed) { disposed = true; disposeGroundScene(scene); } } };
}

export async function loadGroundAsset(source: GroundAssetSource, policy: RepresentationPolicy, identity: RepresentationIdentity, signal: AbortSignal): Promise<GroundAsset> {
  admitGroundSource(source, policy, identity);
  const response = await fetch(source.url, { signal, credentials: 'same-origin', redirect: 'error' });
  if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES) throw Error('Package request failed or too large');
  const reader = response.body?.getReader();
  if (!reader) throw Error('Package body missing');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > MAX_BYTES) throw Error('Package byte budget exceeded');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
  if (digest !== source.sha256) throw Error('Package checksum mismatch');
  inspectGroundPayload(bytes.buffer, source);
  signal.throwIfAborted();
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const manager = new THREE.LoadingManager();
  let dependencyFailed = false;
  manager.onError = () => { dependencyFailed = true; };
  manager.setURLModifier(url => {
    if (!url.startsWith('data:') && !url.startsWith('blob:')) throw Error('External dependency blocked');
    return url;
  });
  const gltf = await new GLTFLoader(manager).parseAsync(bytes.buffer, '');
  try {
    signal.throwIfAborted();
    if (dependencyFailed) throw Error('An embedded dependency failed to decode');
    admitGroundSource(source, policy, identity);
    return bindGroundScene(gltf.scene, source);
  } catch (error) { disposeGroundScene(gltf.scene); throw error; }
}
