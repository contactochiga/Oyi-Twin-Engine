import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const server = await createServer({server:{middlewareMode:true},appType:'custom'});
const checks=[];
try {
 const load=path=>server.ssrLoadModule('/src/'+path);
 const {lunaSimulationProvider:p,lunaRuntimeInternals:i}=await load('luna/runtime/lunaSimulationProvider.ts');
 const {LIFT_02_REF:ref,LIFT_STOPS:stops,liftCamera,isLiftTracking}=await load('luna/lift/lunaLift.ts');
 const {initialLiftState,advanceLift,requestLift}=await load('luna/lift/liftSimulation.ts');
 const {LUNA_LEVELS}=await load('luna/lunaProgramme.ts');
 const {identityForScope,buildScopePolicy}=await load('luna/intelligence/lunaScope.ts');
 const {lunaTwinDataProvider:data}=await load('luna/operational/lunaTwinDataProvider.ts');
 const {parseIntent}=await load('luna/intelligence/lunaIntentParser.ts');
 const {TwinIntelligenceController}=await load('engine/twinIntelligence.ts');
 const actor=identityForScope('facility'),resident=identityForScope('consumer');
 const state=()=>p.getState(ref).state;
 const exec=(command,args={},who=actor)=>p.execute({assetRef:ref,command,args,actor:who});
 const runUntil=(predicate,max=5000)=>{let n=0;while(!predicate(state())&&n++<max)i.advanceLiftClock(.02);assert.ok(predicate(state()),'Timed out');};
 assert.equal(stops.length,14);for(const stop of stops)assert.equal(stop.y,LUNA_LEVELS.find(l=>l.ref===stop.ref).baseElevation);
 // 76 -> 82: Domestic Water Reference System V1 added 6 real canonical
 // assets (incoming-supply intake + 3 bathroom cold-water fixture
 // branches + 2 bathroom drains) — a legitimate catalog growth, not a
 // regression; nothing existing was renamed, moved, or duplicated.
 // 82 -> 86: Drainage V1 added 4 real canonical assets (single-stack vent
 // roof termination + roof drain/downpipe/site discharge stormwater
 // reference chain) — again legitimate catalog growth, nothing existing
 // renamed/moved/duplicated (see docs/LUNA_DRAINAGE_REFERENCE_SPEC.md).
 assert.equal(data.listAssets().length,86);assert.equal(data.listAssets().filter(a=>a.ref===ref).length,1);
 // Baseline bumped for True Floor Plan System V1 (L06 Gold Standard)'s
 // disclosed "unit" branch added to resolveLevelRefFor() — a real bug fix
 // (a private unit/common zone with no InteriorSpec, e.g. Apartment B/C/D
 // or the new L06 Lift Lobby, used to crash this function) — the guard
 // now protects that new baseline going forward.
 assert.equal(createHash('sha256').update(readFileSync('src/luna/policy/lunaRepresentationPolicy.ts')).digest('hex'),'2a301cf10a6dbaaf9e9f81d49a8b852d308ae193837612cbfcca68e59fe19d7e');checks.push('Identity, 86 assets, 14 current unequal datums, policy byte hash');
 assert.equal((await exec('setPosition',{floor:'LUNA-L06'},resident)).ok,false);
 assert.equal((await p.execute({assetRef:ref,command:'setPosition',args:{floor:'LUNA-L06'}})).ok,false);
 for(const floor of ['LUNA-PENTHOUSE','LUNA-ROOFTOP','unknown',NaN])assert.equal((await exec('setPosition',{floor})).ok,false);
 checks.push('Consumer/missing actor/unserved stop rejection');
 assert.ok((await exec('open')).ok);runUntil(s=>s.doorState==='OPEN');
 const before=state();assert.ok((await exec('setPosition',{floor:'LUNA-L10',requestId:'A'})).ok);
 assert.equal(state().positionY,before.positionY);assert.equal(state().currentFloor,'LUNA-GROUND');
 assert.ok((await exec('setPosition',{floor:'LUNA-L10',requestId:'A'})).ok);
 assert.equal((await exec('setPosition',{floor:'LUNA-L06',requestId:'B'})).ok,false);
 assert.equal((await exec('open')).ok,false);
 let previous=state().positionY,passing=new Set(),samples=0;
 while(state().currentFloor!=='LUNA-L10'||state().doorState!=='OPEN'){
  i.advanceLiftClock(.02);const s=state();assert.ok(s.positionY>=previous-1e-9);assert.ok(s.positionY-previous<=.051);previous=s.positionY;passing.add(s.passingFloorRef);samples++;
  if(s.speed>0){assert.equal(s.doorState,'CLOSED');assert.equal(s.currentFloor,null);assert.ok(Object.values(s.landingDoors).every(d=>d.locked));}
  assert.ok(samples<5000);
 }
 assert.equal(state().positionY,stops.find(s=>s.ref==='LUNA-L10').y);assert.equal(state().targetFloor,null);assert.ok(passing.size>=10);checks.push('A: continuous up travel, all passing floors, close/depart/arrival/open, busy rejection and idempotency');
 assert.ok((await exec('setPosition',{floor:'LUNA-B1'})).ok);
 previous=state().positionY;
 while(state().currentFloor!=='LUNA-B1'||state().doorState!=='OPEN'){i.advanceLiftClock(.02);assert.ok(state().positionY<=previous+1e-9);previous=state().positionY;}
 assert.equal(state().positionY,-4);checks.push('B: downward travel and B1 alignment');
 await exec('callLift',{originFloorRef:'LUNA-GROUND'});runUntil(s=>s.currentFloor==='LUNA-GROUND'&&s.doorState==='OPEN');
 const viewBefore=state();assert.equal(liftCamera('interior',state().positionY).position[1],1.65);assert.equal(state(),viewBefore);
 await exec('setPosition',{floor:'LUNA-L06'});runUntil(s=>s.currentFloor==='LUNA-L06'&&s.doorState==='OPEN');
 assert.equal(liftCamera('interior',state().positionY).position[1],state().positionY+1.65);checks.push('C: hall call, authorized reference boarding, Ground→L06, exit alignment');
 for(const view of ['shaft','follow','lobby','interior','engineering','structure'])assert.ok(liftCamera(view,state().positionY).position.every(Number.isFinite));
 assert.ok(isLiftTracking('follow'));assert.ok(isLiftTracking('interior'));assert.equal(isLiftTracking(null),false);
 const stable=state();for(const view of ['engineering','structure','shaft'])liftCamera(view,stable.positionY);assert.equal(state(),stable);
 const subscriber=p.subscribe(()=>{});subscriber();assert.equal(p.getState(ref).state,stable);checks.push('Camera anchors and state preservation through detached view consumers');
 await exec('setPosition',{floor:'LUNA-GROUND'});i.advanceLiftClock(2);i.setAssetState(ref,{...state(),faultState:'TEST_FAULT',serviceState:'fault'});const faultY=state().positionY;i.advanceLiftClock(10);assert.equal(state().positionY,faultY);assert.equal((await exec('open')).ok,false);assert.equal(p.getState(ref).status,'critical');
 i.resetAll();assert.equal(state().positionY,0);assert.equal(state().targetFloor,null);i.advanceLiftClock(10);assert.equal(state().positionY,0);checks.push('Fault halts progression; reset leaves no orphan timers');
 let a=requestLift(initialLiftState(),'setPosition',{floor:'LUNA-L10'}).state,b=a;
 for(let j=0;j<400;j++)a=advanceLift(a,.02);
 for(let j=0;j<100;j++)for(let k=0;k<4;k++)b=advanceLift(b,.02);
 assert.deepEqual(a,b);checks.push('Deterministic fixed-step trajectory independent of render batches');
 const scene={navigateToAsset(){},navigateToSpace(){},setSystemMode(){},assetView(){return true;}};
 const controller=new TwinIntelligenceController(data,p,scene,()=> 'Lift state');
 for(const phrase of ['Show me Passenger Lift 02.','Where is Lift 02?','Follow Lift 02.','Show Lift 02 in engineering view.','Show the Lift 02 shaft.'])assert.ok((await controller.handleIntent(parseIntent(phrase,{}),buildScopePolicy(actor),{})).ok,phrase);
 assert.equal((await controller.handleIntent(parseIntent('Follow Lift 02',{}),buildScopePolicy(resident),{})).ok,false);
 assert.equal((await controller.handleIntent(parseIntent('Take Lift 02 to Ground',{}),buildScopePolicy(resident),{})).ok,false);
 assert.ok((await controller.handleIntent(parseIntent('Take Lift 02 to Ground',{}),buildScopePolicy(actor),{})).ok);
 checks.push('Existing Oyi controller handles lookup/follow/shaft/engineering/commands; Consumer control/view refused');
 writeFileSync('artifacts/luna-lift-runtime-results.json',JSON.stringify({passed:true,checks},null,2));console.log(checks.map(c=>'PASS '+c).join('\n'));
} finally {await server.close();}
