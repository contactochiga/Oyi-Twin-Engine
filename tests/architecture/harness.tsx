// Local verification surface only; not a production entry or an architectural model.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../src/App';
import '../../src/index.css';
import type { GroundAssetSource } from '../../src/luna/architecture/groundAsset';
import fixture from './fixture-manifest.json';
export function Harness() {
  const [source, setSource] = useState<GroundAssetSource>();
  const base = fixture as GroundAssetSource;
  return <><App groundArchitecture={source} /><div style={{ position: 'fixed', top: 80, right: 12, zIndex: 10000, background: '#fff', color: '#000', padding: 8 }}>
    <strong>TEST FIXTURE — not architecture</strong><br />
    <button id="import" onClick={() => setSource(base)}>Import GLB fixture</button>
    <button id="gltf" onClick={() => setSource({ ...base, ...fixture.gltf })}>Import glTF fixture</button>
    <button id="rollback" onClick={() => setSource(undefined)}>Procedural rollback</button>
    <button id="bad" onClick={() => setSource({ ...base, sha256: '0'.repeat(64) })}>Bad checksum</button>
    <button id="unknown" onClick={() => setSource({ ...base, bindings: [{ ...base.bindings[0], canonicalRef: 'UNKNOWN' as 'LUNA-GROUND' }] })}>Unknown ref</button>
  </div></>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
