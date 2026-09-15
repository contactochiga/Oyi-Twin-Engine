import { createServer } from 'vite';
import assert from 'node:assert/strict';
const server = await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const {lunaRepresentationPolicy:policy,LUNA_PRIVATE_UNIT_REFS:privateRefs}=await server.ssrLoadModule('/src/luna/policy/lunaRepresentationPolicy.ts');
 const {identityForScope}=await server.ssrLoadModule('/src/luna/intelligence/lunaScope.ts');
 const {LUNA_LEVELS,LUNA_CORES}=await server.ssrLoadModule('/src/luna/lunaProgramme.ts');
 const {LUNA_INTERIORS}=await server.ssrLoadModule('/src/luna/interiors/lunaInteriors.ts');
 const {lunaTwinDataProvider:data}=await server.ssrLoadModule('/src/luna/operational/lunaTwinDataProvider.ts');
 const {floorPlanForLevel}=await server.ssrLoadModule('/src/luna/policy/lunaFloorPlans.ts');
 const {isFacilityOwnedUnitAsset}=await server.ssrLoadModule('/src/luna/policy/lunaUnitMepAssets.ts');
 const facility=identityForScope('facility'),resident=identityForScope('consumer');
 for(const ref of privateRefs){assert.equal(policy.resolveMode({ref,identity:facility}),'OPERATIONAL_2D');assert.equal(policy.resolveMode({ref,identity:resident}),ref==='LUNA-L06-APT-A'?'FULL_3D':'HIDDEN');}
 for(const spec of LUNA_INTERIORS.filter(s=>privateRefs.includes(s.interiorRef)))for(const room of spec.rooms)assert.equal(policy.resolveMode({ref:room.ref,identity:facility}),'OPERATIONAL_2D');
 for(const asset of data.listAssets().filter(a=>a.system==='apartment-devices'))assert.equal(policy.resolveMode({ref:asset.ref,identity:facility}),isFacilityOwnedUnitAsset(asset.ref)?'CONTEXT_3D':'HIDDEN');
 for(const ref of ['LUNA-GROUND-LOBBY','LUNA-L01-CLUB','LUNA-ROOFTOP-SKY'])assert.equal(policy.resolveMode({ref,identity:facility}),'FULL_3D');
 for(const level of LUNA_LEVELS){const plan=floorPlanForLevel(level.ref);assert.ok(plan);assert.equal(new Set(plan.units.map(r=>r.ref)).size,plan.units.length);for(const region of plan.units){assert.ok(Number.isFinite(region.x)&&region.width>0);if(region.kind==='room'){const room=LUNA_INTERIORS.flatMap(i=>i.rooms).find(r=>r.ref===region.ref);assert.ok(room);for(const axis of ['x','z','width','depth'])assert.equal(region[axis],room[axis]);}if(region.kind==='asset'){const asset=data.getAsset(region.ref);assert.ok(asset);assert.equal(region.x,asset.position.x);assert.equal(region.z,asset.position.z);}if(region.kind==='core')assert.ok(LUNA_CORES.some(c=>c.ref===region.ref));}}
 console.log('PASS: all 16 plans; canonical room/core/asset geometry; Facility private-unit and room OPERATIONAL_2D; private devices HIDDEN except existing Facility-owned service assets; resident own-home access; other homes HIDDEN; common interior FULL_3D.');
} finally {await server.close();}
