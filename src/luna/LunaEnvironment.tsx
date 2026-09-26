import { useMemo } from "react";
import * as THREE from "three";
import { ExteriorPalm, ExteriorShrubBatch, type ShrubPlacement } from "./exterior/ExteriorPlanting";
import { metricFinishUV } from "./exterior/exteriorTextureMaps";
import { exteriorMaterials } from "./exterior/exteriorMaterials";
import { sitePalmPlacements } from "./exterior/sitePlantingLayout";
import { LUNA_SITE } from "./lunaProgramme";
import { lunaMaterialFactories } from "./lunaMaterials";
import { useLightingMode } from "../engine";
import { mergedBoxGeometry, type BoxSpec } from "../engine/utils/geometryUtils";

// Phase 15C — after the anchor moved ~99m north to establish a credible
// Ahmadu Bello Way frontage (see lunaSite.ts's LUNA_SITE_ANCHOR note),
// the real Ahmadu Bello Way trunk-road carriageway itself now sits at
// approximately local (2.5, 45) per the re-projected OSM data (see
// src/luna/site/lunaRing2Data.ts) — a short, direct, one-segment
// connector reads correctly now (previously, at the old anchor, this
// reached a distant side street via a two-segment bend).
const ACCESS_CONNECTOR_POINTS: Array<[number, number]> = [
  [0, LUNA_SITE.depth / 2 + 18],
  [2.5, 45],
];

/** Ring 1 (conceptual Luna site, ~0-100m) immediate context: an arrival
 * driveway, forecourt lawn, boundary treatment, bollard lighting, and a
 * handful of taller palm clusters near the entrance. Everything here is
 * static (no fade/selection — it isn't part of the addressable twin
 * hierarchy), so it's plain meshes, not engine primitives.
 *
 * Phase 15B: this component used to also own an arbitrary west-facing
 * (-X) "waterfront" plane and six freestanding silhouette-block
 * placeholders standing in for an unspecified urban backdrop — both were
 * always non-geographic artistic choices (flagged as such in the Phase
 * 15A audit). Now that real Victoria Island context exists in every
 * direction (see ./site/LunaSiteContext.tsx's Ring 2 real OSM-derived
 * neighbours and Ring 3's art-directed horizon + south-facing water,
 * matching this site's actual heading — see lunaSite.ts), those two
 * pieces have been retired rather than left to visually conflict with
 * real geometry occupying the same space — removed here once Ring 2/3
 * were built as their visual replacement (Phase 15B report §6), subject
 * to the same regression pass as every other Phase 15B change. */
export function LunaEnvironment() {
  const finishPlanes = useMemo(() => [ [14,20], [2.4,16] ].map(([width,depth]) => {
    const source=new THREE.PlaneGeometry(width,depth);
    const geometry=metricFinishUV(source);source.dispose();return geometry;
  }), []);
  const drivewayMaterial = useMemo(() => exteriorMaterials.driveway(), []);
  const connectorRoadMaterial = useMemo(() => lunaMaterialFactories.contextRoad(), []);
  const connectorSidewalkMaterial = useMemo(() => exteriorMaterials.paving(), []);
  const connectorGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    for (let i = 0; i < ACCESS_CONNECTOR_POINTS.length - 1; i++) {
      const [x1, z1] = ACCESS_CONNECTOR_POINTS[i];
      const [x2, z2] = ACCESS_CONNECTOR_POINTS[i + 1];
      const length = Math.hypot(x2 - x1, z2 - z1);
      const rotationY = Math.atan2(x2 - x1, z2 - z1);
      specs.push({ size: [6, 0.08, length], position: [(x1 + x2) / 2, 0.01, (z1 + z2) / 2], rotationY });
    }
    return mergedBoxGeometry(specs);
  }, []);
  const connectorSidewalkGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    for (let i = 0; i < ACCESS_CONNECTOR_POINTS.length - 1; i++) {
      const [x1, z1] = ACCESS_CONNECTOR_POINTS[i];
      const [x2, z2] = ACCESS_CONNECTOR_POINTS[i + 1];
      const length = Math.hypot(x2 - x1, z2 - z1);
      const rotationY = Math.atan2(x2 - x1, z2 - z1);
      const dx = (x2 - x1) / length, dz = (z2 - z1) / length;
      // Perpendicular offset (right-hand side of travel) for a single
      // continuous sidewalk edge alongside the connector.
      const offX = dz * 4, offZ = -dx * 4;
      specs.push({
        size: [1.6, 0.05, length],
        position: [(x1 + x2) / 2 + offX, 0.015, (z1 + z2) / 2 + offZ],
        rotationY,
      });
    }
    return metricFinishUV(mergedBoxGeometry(specs));
  }, []);
  const lawnMaterial = useMemo(() => new THREE.MeshStandardMaterial({color:"#4e5b3a",roughness:1}), []);
  const pavingMaterial = useMemo(() => exteriorMaterials.paving(), []);
  const boundaryGeometry = useMemo(()=>metricFinishUV(new THREE.BoxGeometry(.6,.7,LUNA_SITE.depth+30)),[]);
  const medianGeometry = useMemo(()=>metricFinishUV(new THREE.BoxGeometry(4,.5,10)),[]);
  const boundaryMaterial = useMemo(() => exteriorMaterials.limestone(), []);
  const bollardPostMaterial = useMemo(() => lunaMaterialFactories.darkAluminium(), []);
  const lightingMode = useLightingMode();
  const bollardLightMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3a2c1a", emissive: "#ffb877", emissiveIntensity: lightingMode === "evening" ? 1.6 : 0.25 }),
    [lightingMode]
  );

  // Non-canonical landscape relocation: the inherited x=±8 palms grew
  // through the canopy. Derived setback clears its unchanged width and the
  // Ground envelope; it does not move building/circulation/access geometry.
  const palmSpots=useMemo(()=>sitePalmPlacements(LUNA_SITE.depth),[]);

  return (
    <group>
      {/* Forecourt lawn — a green setting for the arrival sequence, behind
          the driveway loop so the site reads as landscaped, not paved-over. */}
      <mesh raycast={()=>null} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, LUNA_SITE.depth / 2 + 14]} receiveShadow>
        <planeGeometry args={[LUNA_SITE.width - 6, 16]} />
        <primitive object={lawnMaterial} attach="material" />
      </mesh>

      {/* Arrival driveway / drop-off loop, leading to the entrance at +z,
          with a planted median suggesting a real loop rather than a single
          straight apron. */}
      <mesh raycast={()=>null} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, LUNA_SITE.depth / 2 + 8]} receiveShadow>
        <primitive object={finishPlanes[0]} attach="geometry" />
        <primitive object={drivewayMaterial} attach="material" />
      </mesh>
      <mesh raycast={()=>null} position={[0, 0.25, LUNA_SITE.depth / 2 + 8]} castShadow>
        <primitive object={medianGeometry} attach="geometry" />
        <primitive object={boundaryMaterial} attach="material" />
      </mesh>
      {/* Planting stays within the existing raised median below. The two old
          outliers at x=±2.2 grew through the adjacent vehicle paving. */}

      {/* Pedestrian path from the drop-off loop toward the entrance canopy,
          distinct paving from the vehicular driveway surface. */}
      <mesh raycast={()=>null} rotation={[-Math.PI / 2, 0, 0]} position={[7.5, -0.02, LUNA_SITE.depth / 2 + 6]} receiveShadow>
        <primitive object={finishPlanes[1]} attach="geometry" />
        <primitive object={pavingMaterial} attach="material" />
      </mesh>

      {/* Phase 15C — access connector: a short, direct link from the
          site's own drop-off apron to the real Ahmadu Bello Way
          carriageway itself (see ACCESS_CONNECTOR_POINTS above). This is
          the visual transition the brief asks for between the fictional
          Ring 1 parcel and the geographically grounded Ring 2 environment
          — Luna's own road surface literally continues into the real
          street network rather than the two simply floating near each
          other. */}
      <mesh raycast={()=>null} geometry={connectorGeometry} material={connectorRoadMaterial} receiveShadow={false} />
      <mesh raycast={()=>null} geometry={connectorSidewalkGeometry} material={connectorSidewalkMaterial} receiveShadow={false} />

      {/* Low boundary treatment along both site edges. */}
      {[-LUNA_SITE.width / 2 + 1, LUNA_SITE.width / 2 - 1].map((x, i) => (
        <mesh raycast={()=>null} key={`boundary-${i}`} position={[x, 0.35, 0]} receiveShadow castShadow material={boundaryMaterial}>
          <primitive object={boundaryGeometry} attach="geometry" />
        </mesh>
      ))}

      {/* Bollard lights along the driveway edge — subtle by day, a warm
          site-lighting accent in evening mode (Phase 11 section 14). */}
      {[-5, -1.5, 2, 5.5].map((z, i) => (
        <group key={`bollard-${i}`} position={[6, 0, LUNA_SITE.depth / 2 + 4 + z]}>
          <mesh raycast={()=>null} position={[0, 0.35, 0]} castShadow material={bollardPostMaterial}>
            <cylinderGeometry args={[0.08, 0.08, 0.7, 8]} />
          </mesh>
          <mesh raycast={()=>null} position={[0, 0.72, 0]} material={bollardLightMaterial}>
            <sphereGeometry args={[0.09, 8, 8]} />
          </mesh>
        </group>
      ))}

      {palmSpots.map((position,i)=><ExteriorPalm key={i} position={position}/>)}
      <ArrivalSurfaceDetail />
    </group>
  );
}

// Finish overlays follow existing driveway (14 x 20), median (4 x 10),
// pedestrian path (2.4 x 16) and boundary extents. No operational drainage,
// gate, ramp or changed circulation is inferred from these surface seams.
function ArrivalSurfaceDetail(){
  const shrubs=useMemo(()=>Array.from({length:16},(_,i)=>({position:[(i%2===0?-1:1)*1.15,.5,30.0+Math.floor(i/2)*1.12],scale:[1.5,.6,1.1]} as ShrubPlacement)),[]);
  const paving=useMemo(()=>exteriorMaterials.paving(),[]),soil=useMemo(()=>exteriorMaterials.soil(),[]);
  const seams=useMemo(()=>{
    const a:BoxSpec[]=[];
    for(let z=24;z<=44;z+=1.25)a.push({size:[14,.006,.012],position:[0,-.024,z]});
    for(let x=-7;x<=7;x+=1.4)a.push({size:[.012,.006,20],position:[x,-.024,34]});
    for(let z=24;z<=40;z+=1)a.push({size:[2.4,.006,.012],position:[7.5,-.014,z]});
    return mergedBoxGeometry(a);
  },[]);
  const edge=useMemo(()=>mergedBoxGeometry([
    {size:[.12,.05,20],position:[-6.94,-.008,34]},
    {size:[.12,.05,20],position:[6.94,-.008,34]},
    {size:[4.04,.06,.12],position:[0,.51,29]},
    {size:[4.04,.06,.12],position:[0,.51,39]},
    {size:[.12,.06,10],position:[-1.96,.51,34]},
    {size:[.12,.06,10],position:[1.96,.51,34]},
    {size:[.64,.055,82],position:[-30,.725,0]},
    {size:[.64,.055,82],position:[30,.725,0]},
  ]),[]);
  return <group>
    <mesh geometry={seams} raycast={()=>null}><meshStandardMaterial color="#393c36" roughness={1}/></mesh>
    <mesh geometry={edge} material={paving} raycast={()=>null} receiveShadow/>
    <mesh position={[0,.515,34]} rotation={[-Math.PI/2,0,0]} material={soil} raycast={()=>null}><planeGeometry args={[3.8,9.8]}/></mesh>
    <ExteriorShrubBatch placements={shrubs}/>
  </group>;
}
