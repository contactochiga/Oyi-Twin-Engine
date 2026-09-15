import { useMemo } from "react";
import * as THREE from "three";
import { LUNA_LEVELS } from "./lunaProgramme";
import { lunaMaterialFactories } from "./lunaMaterials";

// Renders "LUNA RESIDENCES" onto an in-memory <canvas> and uses that as a
// texture. Deliberately NOT drei's <Text> (troika-three-text): that
// fetches a font file from a remote CDN by default, which is exactly the
// class of failure Phase 1 hit with the remote HDR environment (a slow or
// blocked request leaves the scene silently stuck). Canvas 2D text uses
// whatever system font is already on the device — zero network requests,
// zero Suspense, guaranteed to render.
function createSignageTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#141210";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e9d6ad";
  ctx.font = "600 84px -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
  ctx.letterSpacing = "14px";
  ctx.fillText("LUNA RESIDENCES", canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function LunaSignage() {
  const ground = LUNA_LEVELS.find((l) => l.ref === "LUNA-GROUND")!;
  const texture = useMemo(createSignageTexture, []);
  const panelMaterial = useMemo(() => lunaMaterialFactories.signagePanel(), []);
  const textMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: "#ffe6b0",
        emissiveIntensity: 0.5,
        roughness: 0.4,
        metalness: 0.2,
      }),
    [texture]
  );

  // Architectural Reality V1 (Grand Lobby) — offset off the entrance
  // centerline and raised, rather than centered directly above the real
  // Main Entrance door (GroundEntrance: x=0, z=16, height 2.8) on this
  // same building face. At the old position (x=0, y=+2.6) this 9.5m-wide
  // panel sat almost exactly on the door's own approach axis and at
  // z=17.32 — only 1.32m further out than the door itself — so the new
  // entranceApproach camera (which looks straight down that axis at the
  // door) framed the sign edge-to-edge instead of the entrance, and
  // raycasts meant for the door mesh hit the sign instead. Moving it to
  // one side (still on the same building face, still legible as arrival
  // signage — real monument signs read this way too) clears both the
  // sightline and the click path without touching the door itself.
  const y = ground.baseElevation + 3.2;
  const z = ground.footprint.depth / 2 + 0.32;
  const x = -16;

  return (
    <group position={[x, y, z]}>
      <mesh material={panelMaterial}>
        <boxGeometry args={[9.5, 1.5, 0.12]} />
      </mesh>
      <mesh position={[0, 0, 0.07]} material={textMaterial}>
        <planeGeometry args={[9, 1.1]} />
      </mesh>
    </group>
  );
}
