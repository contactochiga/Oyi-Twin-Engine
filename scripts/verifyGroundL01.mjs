import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
const out='artifacts/ground-l01-v1';mkdirSync(out,{recursive:true});
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
const checks=[];
const check=(label,fn)=>{fn();checks.push(label);};
try{
 const load=p=>server.ssrLoadModule('/src/'+p);
 const {LUNA_LEVELS,LUNA_CORES}=await load('luna/lunaProgramme.ts');
 const {LUNA_GROUND_LOBBY,LUNA_L01_CLUB}=await load('luna/interiors/lunaInteriors.ts');
 const {PODIUM_CEILINGS,PODIUM_CORE_OPENINGS}=await load('luna/architecture/podiumCoordination.ts');
 const {LUNA_STRUCTURAL_ELEMENTS}=await load('luna/structure/lunaStructuralElements.ts');
 const {PODIUM_PASSAGES}=await load('luna/architecture/podiumPassages.ts');
 const {podiumStepAllowed}=await load('luna/explore/podiumWalkability.ts');
 const {resolveLunaExploreSpace}=await load('luna/explore/lunaExploreAwareness.ts');
 const {LUNA_MAIN_ENTRANCE_TRANSITION:entry}=await load('luna/transitions/lunaTransitions.ts');
 const {rectangularPanels}=await load('engine/utils/rectangularPanels.ts');
 const {matchSpace}=await load('luna/intelligence/lunaVocabulary.ts');
 const {passengerStopAllowed}=await load('luna/runtime/lunaPassengerAccess.ts');
 const {identityForScope}=await load('luna/intelligence/lunaScope.ts');
 const {lunaRepresentationPolicy}=await load('luna/policy/lunaRepresentationPolicy.ts');
 const {buildLunaReferenceModel}=await load('luna/ingestion/lunaSpatialModel.ts');
 const {buildNavigationGraph}=await load('engine/spatial/navigationGraph.ts');
 const {bindTransitionCapabilities}=await load('engine/spatial/transitionBinding.ts');
 const {LUNA_TRANSITION_BINDINGS}=await load('luna/transitions/lunaRouteTransitions.ts');
 const {podiumTraversalWaypoints}=await load('luna/architecture/podiumPassages.ts');
 check('Walking waypoints retain human-scale zoom; unrelated routes unchanged',()=>{
  assert(podiumTraversalWaypoints(entry).every(p=>p.minDistance===.1 && p.maxPolarAngle===Math.PI));
  assert(podiumTraversalWaypoints({...entry,fromSpaceRef:'LUNA-L06',toSpaceRef:'LUNA-L06-APT-A'}).every(p=>p.minDistance===undefined));
 });
 const model=buildLunaReferenceModel();const graph=bindTransitionCapabilities(buildNavigationGraph(model),LUNA_TRANSITION_BINDINGS);
 check('L01 Oyi alias cannot consume Level 10 or Level 12',()=>{
  assert.equal(matchSpace('take me to level 1')?.ref,'LUNA-L01-AMENITIES');
  assert.equal(matchSpace('take me to level 10')?.ref,'LUNA-L10');
  assert.notEqual(matchSpace('take me to level 12')?.ref,'LUNA-L01-AMENITIES');
 });
 check('Ground and L01 programme/datum frozen',()=>{
  for(const [ref,w,d,y,h] of [['LUNA-GROUND',44,34,0,5],['LUNA-L01-AMENITIES',40,30,5,3.5]]) {const l=LUNA_LEVELS.find(l=>l.ref===ref);assert.deepEqual([l.footprint.width,l.footprint.depth,l.baseElevation,l.height],[w,d,y,h]);}
 });
 check('Finished slabs match existing lift/walk datums; no change to L06',()=>{
  for(const ref of ['LUNA-GROUND','LUNA-L01-AMENITIES']){const l=LUNA_LEVELS.find(l=>l.ref===ref),s=LUNA_STRUCTURAL_ELEMENTS.find(s=>s.ownerLevelRef===ref&&s.elementType==='slab');assert(Math.abs(l.height/2+s.position.y+s.size.y/2)<1e-12);}
  const s=LUNA_STRUCTURAL_ELEMENTS.find(s=>s.ownerLevelRef==='LUNA-L06'&&s.elementType==='slab');assert.equal(s.size.y,.35);
 });
 check('Ceilings fit existing structure and provide target clearances',()=>{assert.equal(PODIUM_CEILINGS.arrival,4.2);assert.equal(PODIUM_CEILINGS.lounge,3.6);assert.equal(PODIUM_CEILINGS.gallery,2.95);assert(PODIUM_CEILINGS.arrival+.06<4.65);assert(5+PODIUM_CEILINGS.amenities+.06<7.9);});
 check('L01 rooms do not overlap protected stairs',()=>{for(const r of LUNA_L01_CLUB.rooms)for(const c of LUNA_CORES.filter(c=>c.ref.includes('STAIR')))assert(!(Math.abs(r.x-c.x)<(r.width+c.width)/2&&Math.abs(r.z-c.z)<(r.depth+c.depth)/2));});
 check('All eight Ground/L01 lift core portals admit a human-width approach',()=>{assert.equal(PODIUM_CORE_OPENINGS.length,8);for(const o of PODIUM_CORE_OPENINGS){assert(o.width>=1.2);assert(o.height>=2.2);}});
 check('Panel subtraction preserves net solid area and true openings',()=>{const b=rectangularPanels(10,5,.4,[{x:0,y:-1,width:2,height:3}]);assert.equal(b.reduce((n,b)=>n+b.size[0]*b.size[1],0),44);assert(!b.some(b=>Math.abs(b.position[0])<b.size[0]/2&&Math.abs(-1-b.position[1])<b.size[1]/2));});
 check('Existing Reception future study footprint retained',()=>{const r=LUNA_GROUND_LOBBY.rooms[0];assert.deepEqual([r.x,r.z,r.width,r.depth],[0,6,14,6]);});
 check('Entrance path avoids retained column and ends inside Reception',()=>{for(let i=1;i<entry.crossingPath.length;i++)assert(podiumStepAllowed(entry.crossingPath[i-1],entry.crossingPath[i],true),`entry segment ${i}`);const p=entry.exitPoint;assert(p.z>=3&&p.z<=9);});
 check('All common passage segments clear column/core/room barriers',()=>{for(const p of PODIUM_PASSAGES)for(let i=1;i<p.crossingPath.length;i++)assert(podiumStepAllowed(p.crossingPath[i-1],p.crossingPath[i],true),`${p.transitionId} segment ${i}`);});
 check('Common passages are bound to actual canonical graph edges',()=>{for(const p of PODIUM_PASSAGES)assert(graph.edges.some(e=>((e.fromRef===p.fromSpaceRef&&e.toRef===p.toSpaceRef)||(e.fromRef===p.toSpaceRef&&e.toRef===p.fromSpaceRef))&&e.transitionRef?.startsWith('PASSAGE:')),p.transitionId);});
 check('Explore stops before column; cannot tunnel on long frame',()=>assert.equal(podiumStepAllowed({x:0,y:1.7,z:15},{x:0,y:1.7,z:13},true),false));
 check('Closed entrance blocks crossing; real open boundary permits it',()=>{const a={x:0,y:1.7,z:17},b={x:0,y:1.7,z:15.5};assert.equal(podiumStepAllowed(a,b,false),false);assert.equal(podiumStepAllowed(a,b,true),true);});
 check('L01 door gap admits travel; adjacent wall blocks',()=>{assert(podiumStepAllowed({x:-14.5,y:6.7,z:5.2},{x:-14.5,y:6.7,z:2.8},true));assert.equal(podiumStepAllowed({x:-12,y:6.7,z:5.2},{x:-12,y:6.7,z:2.8},true),false);});
 check('Space awareness uses real Y: same XZ resolves different floors',()=>{assert.equal(resolveLunaExploreSpace({x:-15,y:1.7,z:0},null),'LUNA-GROUND-LOBBY-LOUNGE');assert.equal(resolveLunaExploreSpace({x:-15,y:6.7,z:0},null),'LUNA-L01-CLUB-POOL');});
 check('Resident common-amenity stop does not grant engineering/private-floor access',()=>{
  const resident=identityForScope('consumer');
  assert(passengerStopAllowed(resident,'LUNA-LIFT-PASS-02','LUNA-L01-AMENITIES'));
  assert(!passengerStopAllowed(resident,'LUNA-LIFT-PASS-02','LUNA-L10'));
  assert(!passengerStopAllowed(resident,'LUNA-LIFT-SERVICE-01','LUNA-L01-AMENITIES'));
  assert.notEqual(lunaRepresentationPolicy.resolveMode({ref:'LUNA-LIFT-PASS-02',identity:resident}),'FULL_3D');
  assert.notEqual(lunaRepresentationPolicy.resolveMode({ref:'LUNA-L06-APT-A',identity:identityForScope('facility')}),'FULL_3D');
 });
 check('No scope expansion of collision into L06',()=>assert(podiumStepAllowed({x:0,y:26.7,z:15},{x:0,y:26.7,z:13},false)));
 writeFileSync(`${out}/measurements.json`,JSON.stringify({levels:LUNA_LEVELS.filter(l=>['LUNA-GROUND','LUNA-L01-AMENITIES'].includes(l.ref)),ground:LUNA_GROUND_LOBBY,l01:LUNA_L01_CLUB,cores:LUNA_CORES,ceilings:PODIUM_CEILINGS,coreOpenings:PODIUM_CORE_OPENINGS,passages:PODIUM_PASSAGES,structure:LUNA_STRUCTURAL_ELEMENTS.filter(e=>['LUNA-GROUND','LUNA-L01-AMENITIES'].includes(e.ownerLevelRef))},null,2));
 writeFileSync(`${out}/deterministic.json`,JSON.stringify({passed:true,checks},null,2));console.log(checks.join('\n'));
}finally{await server.close();}
