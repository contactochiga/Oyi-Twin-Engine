import * as THREE from "three";

// Luna's material language. Phase 2 note: several of these materials are
// applied to meshes belonging to DIFFERENT levels (e.g. the standard tower
// glazing tone is used by 8 separate residential floors). Because each
// level independently fades its own materials' opacity when a sibling
// level is isolated (see useLevelFadeOpacity), those materials must never
// be shared THREE.Material *instances* across levels — mutating one
// level's opacity would visibly fight every other level using the same
// object. Every function below returns a brand-new instance; callers are
// expected to useMemo() the result once per mesh.

// Massing-tier materials (see massingMaterialForTier below) all render
// THREE.DoubleSide deliberately: a level's massing is a single convex box,
// and a box's default single-sided faces have outward normals — a camera
// that ends up *inside* one (any level without its own InteriorLayer, e.g.
// B1's electrical/water/fire zones in Phase 4) would otherwise see every
// face as a backface and look straight through the level to whatever's
// beyond it. DoubleSide costs nothing visually from outside (where these
// were already the only faces rendered) and is what actually makes "fly
// the camera inside B1 to frame a pump" read as a room instead of a void.
// Phase 11 — retuned toward the reference elevation: warm travertine-like
// stone, deep aluminium-black framing, a richer champagne/bronze (not
// yellow-gold), and glazing with a believable cool-green low-E tint rather
// than a flat slate grey. Values chosen to read correctly under the warm
// directional key light in Lighting.tsx, not in isolation.
function stone() {
  return new THREE.MeshStandardMaterial({ color: "#d6c7a8", roughness: 0.8, metalness: 0.03, side: THREE.DoubleSide });
}
function amenityStone() {
  return new THREE.MeshStandardMaterial({ color: "#c2b190", roughness: 0.68, metalness: 0.05, side: THREE.DoubleSide });
}
function timberScreen() {
  return new THREE.MeshStandardMaterial({ color: "#77543a", roughness: 0.6, metalness: 0.08 });
}
function basementConcrete() {
  return new THREE.MeshStandardMaterial({ color: "#403d3a", roughness: 0.95, metalness: 0.05, side: THREE.DoubleSide });
}
// Glazing tiers carry a warm amber emissive channel at zero intensity by
// default (invisible in day mode) — LevelMassing's nightGlowIntensity prop
// lerps it up in evening mode so occupied windows glow without a second
// material or a mesh swap. Every other massing material (stone, concrete,
// etc.) is left with THREE's default black emissive, so the same generic
// lerp is a harmless no-op for them.
function towerGlazing() {
  // No env map is loaded (see Lighting.tsx) — a highly glossy/transmissive
  // physical material reads as a harsh mirror streak under a single key
  // light instead of looking like glass, so this stays a tuned standard
  // material rather than MeshPhysicalMaterial + transmission. Kept light
  // enough to read as sky-reflecting daylight glass rather than a near-
  // black void — real low-E curtain wall is a mid-tone, not near-black.
  return new THREE.MeshStandardMaterial({ color: "#4f6672", roughness: 0.22, metalness: 0.5, emissive: "#ffb877", emissiveIntensity: 0, side: THREE.DoubleSide });
}
// Phase 14 — brightened/clearer than standard towerGlazing so the L10-12
// premium tier reads as a distinct upper band from a distance, not just a
// slightly-deeper-balcony repeat of the same tone (the audit's own "no
// visible upper-floor expression" finding).
function premiumGlazing() {
  return new THREE.MeshStandardMaterial({ color: "#6a8794", roughness: 0.15, metalness: 0.5, emissive: "#ffb877", emissiveIntensity: 0, side: THREE.DoubleSide });
}
function penthouseGlazing() {
  return new THREE.MeshStandardMaterial({ color: "#4a6470", roughness: 0.14, metalness: 0.6, emissive: "#ffcf9a", emissiveIntensity: 0, side: THREE.DoubleSide });
}
// Phase 14 — warmed from a flat chocolate-brown toward the reference's
// brighter champagne-bronze (the audit's own finding: the fins read too
// dark/muddy against the reference's warm metallic accent lines).
function bronzeFin() {
  return new THREE.MeshStandardMaterial({ color: "#c49a63", roughness: 0.25, metalness: 0.88 });
}
function darkAluminium() {
  return new THREE.MeshStandardMaterial({ color: "#202225", roughness: 0.35, metalness: 0.9 });
}
function glassBalustrade() {
  return new THREE.MeshStandardMaterial({ color: "#dfe7ee", roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.28 });
}
function balconySlab() {
  return new THREE.MeshStandardMaterial({ color: "#ddd6c8", roughness: 0.75, metalness: 0.05 });
}
// A dark opaque band between residential glazing courses — real curtain-
// wall floor plates read as a spandrel/slab-edge line, not a single sheet
// of continuous glass. Reused per-floor so the facade gains horizontal
// rhythm to match its vertical fins.
function spandrelBand() {
  return new THREE.MeshStandardMaterial({ color: "#232527", roughness: 0.45, metalness: 0.6, side: THREE.DoubleSide });
}
// Slim vertical mullions subdividing a glazing bay — same tone as the
// aluminium framing family but its own instance per FacadeMesh discipline.
function mullion() {
  return new THREE.MeshStandardMaterial({ color: "#1c1e21", roughness: 0.35, metalness: 0.85 });
}
// Frosted privacy glass for select residential/premium screens — distinct
// from the clear glassBalustrade (structural rail) and from timberScreen
// (amenity level), used sparingly per section 7's "credible" instruction.
function privacyScreen() {
  return new THREE.MeshStandardMaterial({ color: "#e7e3d8", roughness: 0.55, metalness: 0.05, transparent: true, opacity: 0.55 });
}
// Very clear, minimally tinted glazing for the Ground lobby frontage —
// deliberately more transparent than the tower's tinted curtain wall so
// the podium reads as "materially richer and more transparent" per
// section 5, with reception/concierge visible through it.
function lobbyGlass() {
  return new THREE.MeshStandardMaterial({ color: "#dfeaf0", roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
}
function poolWater() {
  return new THREE.MeshStandardMaterial({ color: "#2fb7c9", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.88 });
}
function paving() {
  return new THREE.MeshStandardMaterial({ color: "#8f8778", roughness: 0.85, metalness: 0.02 });
}
function lawn() {
  return new THREE.MeshStandardMaterial({ color: "#5c7d4a", roughness: 0.95, metalness: 0 });
}
// DoubleSide defensively (Phase 14): a camera preset that ever ends up
// close to or inside one of these small boxes should still see a lit
// surface, not an unlit single-sided backface rendering as solid black —
// exactly what happened to the original groundArrival preset.
function carBody() {
  return new THREE.MeshStandardMaterial({ color: "#15171a", roughness: 0.25, metalness: 0.7, side: THREE.DoubleSide });
}
function carGlass() {
  return new THREE.MeshStandardMaterial({ color: "#0d1114", roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide });
}
function unitGlass() {
  return new THREE.MeshStandardMaterial({ color: "#dfe7ee", roughness: 0.45, metalness: 0.1, transparent: true, opacity: 0.55 });
}
// A unit that has an authored interior (Phase 3) gets a much more
// transparent shell than one still shown only as an exterior placeholder
// (B/C/D) — otherwise the shell box visually buries the rooms/furniture
// nested inside it.
function unitGlassWithInterior() {
  return new THREE.MeshStandardMaterial({ color: "#dfe7ee", roughness: 0.45, metalness: 0.1, transparent: true, opacity: 0.12 });
}
function warmInteriorGlow() {
  // Simulates a lit apartment behind the glazing when its level/unit is
  // the active selection — an emissive-forward variant of towerGlazing.
  return new THREE.MeshStandardMaterial({ color: "#4a4030", roughness: 0.3, metalness: 0.2, emissive: "#ffb066", emissiveIntensity: 0.55 });
}
// Phase 14 — per-window occupied-building glow. Previously the entire
// level massing box carried one uniform emissive channel, so "evening
// mode" read as a single flat orange wash across the whole facade instead
// of individual lit windows (the Phase 14 visual audit's own words). These
// are small, separate emissive quads placed per window bay instead — two
// discrete brightness tiers (not per-vertex/per-pixel shader work) is
// enough to read as "some rooms lit, some dim, some dark" while staying
// two merged draw calls per level, matching "efficient variation... not
// hundreds of expensive lights."
function windowGlowBright() {
  return new THREE.MeshStandardMaterial({ color: "#2c2416", roughness: 0.4, metalness: 0.1, emissive: "#ffb877", emissiveIntensity: 0 });
}
function windowGlowDim() {
  return new THREE.MeshStandardMaterial({ color: "#241d16", roughness: 0.45, metalness: 0.1, emissive: "#e59a5a", emissiveIntensity: 0 });
}
function bronzePergola() {
  return new THREE.MeshStandardMaterial({ color: "#af8552", roughness: 0.28, metalness: 0.85 });
}
function rooftopDeck() {
  return new THREE.MeshStandardMaterial({ color: "#5b4636", roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide });
}
function rooftopGreenery() {
  return new THREE.MeshStandardMaterial({ color: "#4f7a4a", roughness: 0.9, metalness: 0 });
}
function core() {
  return new THREE.MeshStandardMaterial({ color: "#232426", roughness: 0.6, metalness: 0.3 });
}
function selectedHighlight() {
  return new THREE.MeshStandardMaterial({ color: "#ffb454", roughness: 0.3, metalness: 0.4, emissive: "#7a3d00", emissiveIntensity: 0.4 });
}
function water() {
  return new THREE.MeshStandardMaterial({ color: "#0e2a3a", roughness: 0.15, metalness: 0.35 });
}
function driveway() {
  return new THREE.MeshStandardMaterial({ color: "#333029", roughness: 0.92, metalness: 0.03 });
}
// Phase 14 — tinted toward the sky/haze rather than near-black: distant
// context reads as atmospheric recession, not a flat cardboard cutout.
// Phase 15B: now used specifically for Ring 3's art-directed distant
// skyline massing (the closer, real-data-driven Ring 2 neighbours use
// contextMassing() below instead, for a slightly more articulated,
// slightly-less-atmospheric read appropriate to their closer distance).
function silhouette() {
  return new THREE.MeshStandardMaterial({ color: "#4a5568", roughness: 1, metalness: 0 });
}
// Phase 15B — Ring 2 neighbouring building massing, sourced from real OSM
// footprints (see OSM_ATTRIBUTION.md). Deliberately neutral/desaturated —
// these are simplified massing blocks, not modelled facades, so a muted
// warm-grey stays honest about the fidelity level rather than drawing the
// eye away from Luna itself.
// Phase 15C — transparent:true + explicit opacity:1 so LunaSiteContext's
// DistanceFadeMesh can lerp opacity for a smooth Ring 1/2 transition
// instead of a hard visibility snap; at opacity 1 this renders visually
// identically to a plain opaque material.
function contextMassing() {
  return new THREE.MeshStandardMaterial({ color: "#6b6a63", roughness: 0.95, metalness: 0.02, transparent: true, opacity: 1 });
}
// Phase 15B — Ring 2 real road surface (Ahmadu Bello Way and connected
// streets). Distinct from Luna's own driveway() so the real public road
// network reads as a different, slightly lighter surface than Luna's
// private arrival apron. Phase 15C: transparent/opacity for the same
// DistanceFadeMesh reason as contextMassing() above.
function contextRoad() {
  return new THREE.MeshStandardMaterial({ color: "#4a473f", roughness: 0.96, metalness: 0.01, transparent: true, opacity: 1 });
}
// Phase 15B — the ground plane under Ring 2/3, sitting slightly below
// Ring 1's own SiteBase plate (see LunaSiteContext.tsx) so Luna's nicer
// landscaped ground always reads as the foreground surface. A muted
// urban ground tone (not lawn green) — this is dense Victoria Island
// fabric, not a park.
function contextGround() {
  return new THREE.MeshStandardMaterial({ color: "#39392f", roughness: 1, metalness: 0 });
}
function signagePanel() {
  return new THREE.MeshStandardMaterial({ color: "#181614", roughness: 0.4, metalness: 0.6 });
}

// --- Phase 3 interior materials ---
function floorLiving() {
  return new THREE.MeshStandardMaterial({ color: "#c9b79a", roughness: 0.55, metalness: 0.05 }); // warm timber-look
}
function floorBedroom() {
  return new THREE.MeshStandardMaterial({ color: "#cfc3ac", roughness: 0.65, metalness: 0.02 });
}
function floorBathroom() {
  return new THREE.MeshStandardMaterial({ color: "#e4e2dc", roughness: 0.25, metalness: 0.05 }); // tile
}
function floorKitchen() {
  return new THREE.MeshStandardMaterial({ color: "#d8d3c8", roughness: 0.35, metalness: 0.1 });
}
function floorNeutral() {
  return new THREE.MeshStandardMaterial({ color: "#b8b2a6", roughness: 0.7, metalness: 0.03 });
}
function floorOutdoor() {
  return new THREE.MeshStandardMaterial({ color: "#a99d86", roughness: 0.8, metalness: 0.02 });
}
function floorWet() {
  return new THREE.MeshStandardMaterial({ color: "#7fa9b0", roughness: 0.2, metalness: 0.1 }); // pool/spa
}
function interiorWall() {
  return new THREE.MeshStandardMaterial({ color: "#efe9dd", roughness: 0.9, metalness: 0 });
}
function furnitureWood() {
  return new THREE.MeshStandardMaterial({ color: "#8a6a4a", roughness: 0.55, metalness: 0.05 });
}
function furnitureFabric() {
  return new THREE.MeshStandardMaterial({ color: "#5f6b73", roughness: 0.85, metalness: 0 });
}
function furnitureStone() {
  return new THREE.MeshStandardMaterial({ color: "#dcd6c9", roughness: 0.3, metalness: 0.05 });
}
function furnitureMetal() {
  return new THREE.MeshStandardMaterial({ color: "#8a8f96", roughness: 0.35, metalness: 0.7 });
}
function greenAccent() {
  return new THREE.MeshStandardMaterial({ color: "#4f7a4a", roughness: 0.85, metalness: 0 });
}

// --- Grand Lobby (Architectural Reality V1) — LUNA_REFERENCE_DESIGN ---
// A warm-white matte architectural ceiling field, distinct from the
// bright-white/neutral apartment ceilings (interiorWall reused there) —
// premium lobby ceilings read warmer and less clinical.
function ceilingFeature() {
  return new THREE.MeshStandardMaterial({ color: "#f2ede1", roughness: 0.88, metalness: 0 });
}
function ceilingSoffit() {
  return new THREE.MeshStandardMaterial({ color: "#e4dcc9", roughness: 0.85, metalness: 0 });
}
// Recessed downlight lens — emissive at zero by default (day mode reads
// as a small dark fixture aperture against the ceiling, exactly like a
// real unlit downlight), lerped up for night/golden-hour, same convention
// LevelFacade's windowGlowBright/Dim already established.
function downlightGlow() {
  return new THREE.MeshStandardMaterial({ color: "#1c1a16", roughness: 0.4, metalness: 0, emissive: "#ffdfb0", emissiveIntensity: 0 });
}
// Concealed linear cove lighting — a soft warm strip at the soffit/field
// transition.
function linearLightGlow() {
  return new THREE.MeshStandardMaterial({ color: "#2a2419", roughness: 0.5, metalness: 0, emissive: "#ffc98a", emissiveIntensity: 0 });
}
// The reception feature wall — a distinct, richer stone tone from the
// general lobby floor/stone() so the reception backdrop reads as a
// deliberate feature, not a repeat of the floor finish.
function receptionFeatureWall() {
  return new THREE.MeshStandardMaterial({ color: "#a89478", roughness: 0.55, metalness: 0.06 });
}
// Large-format premium floor stone — deliberately smoother/more
// reflective than the exterior stone() so the lobby floor reads as
// polished interior porcelain/stone, not the same finish as the facade.
function lobbyFloorStone() {
  return new THREE.MeshStandardMaterial({ color: "#ddd4c2", roughness: 0.35, metalness: 0.04 });
}
function lobbyFeaturePendant() {
  return new THREE.MeshStandardMaterial({ color: "#3a3226", roughness: 0.3, metalness: 0.7, emissive: "#ffcf9a", emissiveIntensity: 0.15 });
}

export const lunaMaterialFactories = {
  stone,
  amenityStone,
  timberScreen,
  basementConcrete,
  towerGlazing,
  premiumGlazing,
  penthouseGlazing,
  bronzeFin,
  darkAluminium,
  glassBalustrade,
  balconySlab,
  unitGlass,
  unitGlassWithInterior,
  warmInteriorGlow,
  windowGlowBright,
  windowGlowDim,
  bronzePergola,
  rooftopDeck,
  rooftopGreenery,
  core,
  selectedHighlight,
  water,
  driveway,
  silhouette,
  contextMassing,
  contextRoad,
  contextGround,
  signagePanel,
  spandrelBand,
  mullion,
  privacyScreen,
  lobbyGlass,
  poolWater,
  paving,
  lawn,
  carBody,
  carGlass,
  floorLiving,
  floorBedroom,
  floorBathroom,
  floorKitchen,
  floorNeutral,
  floorOutdoor,
  floorWet,
  interiorWall,
  furnitureWood,
  furnitureFabric,
  furnitureStone,
  furnitureMetal,
  greenAccent,
  ceilingFeature,
  ceilingSoffit,
  downlightGlow,
  linearLightGlow,
  receptionFeatureWall,
  lobbyFloorStone,
  lobbyFeaturePendant,
};

export type FloorTint = "living" | "bedroom" | "bathroom" | "kitchen" | "neutral" | "outdoor" | "wet";

export function floorMaterialForTint(tint: FloorTint) {
  switch (tint) {
    case "living":
      return floorLiving();
    case "bedroom":
      return floorBedroom();
    case "bathroom":
      return floorBathroom();
    case "kitchen":
      return floorKitchen();
    case "outdoor":
      return floorOutdoor();
    case "wet":
      return floorWet();
    case "neutral":
    default:
      return floorNeutral();
  }
}

export type LevelTier = "basement" | "ground" | "amenity" | "standard" | "premium" | "penthouse" | "rooftop";

const TIER_BY_LEVEL_REF: Record<string, LevelTier> = {
  "LUNA-B1": "basement",
  "LUNA-GROUND": "ground",
  "LUNA-L01-AMENITIES": "amenity",
  "LUNA-L10": "premium",
  "LUNA-L11": "premium",
  "LUNA-L12": "premium",
  "LUNA-PENTHOUSE": "penthouse",
  "LUNA-ROOFTOP": "rooftop",
};

export function tierForLevel(ref: string): LevelTier {
  return TIER_BY_LEVEL_REF[ref] ?? "standard";
}

export function massingMaterialForTier(tier: LevelTier): THREE.Material {
  switch (tier) {
    case "basement":
      return basementConcrete();
    case "ground":
      return stone();
    case "amenity":
      return amenityStone();
    case "premium":
      return premiumGlazing();
    case "penthouse":
      return penthouseGlazing();
    case "rooftop":
      return rooftopDeck();
    case "standard":
    default:
      return towerGlazing();
  }
}
