import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='artifacts/ground-interior-v1';mkdirSync(dir,{recursive:true});
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const load=p=>server.ssrLoadModule('/src/'+p);
 const {GROUND_FURNISHINGS:items,GROUND_FURNITURE_OBSTACLES:bounds,GROUND_FINISH_LIMITS:limits}=await load('luna/architecture/groundInterior/groundInteriorLayout.ts');
 const {PODIUM_PASSAGES:paths}=await load('luna/architecture/podiumPassages.ts');
 const {podiumStepAllowed:allowed}=await load('luna/explore/podiumWalkability.ts');
 const {buildGroundInterior}=await load('luna/architecture/groundInterior/groundInteriorGeometry.ts');
 const {LUNA_LEVELS:levels}=await load('luna/lunaProgramme.ts');
 const checks=[];const check=(label,f)=>{f();checks.push(label);};
 check('Every preserved Ground common route clears furniture with 0.45m half-width',()=>{
  for(const t of paths.filter(t=>t.fromSpaceRef.startsWith('LUNA-GROUND'))){const p=t.crossingPath;for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.025);for(let j=0;j<=n;j++){const x=a.x+(b.x-a.x)*j/n,z=a.z+(b.z-a.z)*j/n;assert(!bounds.some(r=>Math.abs(x-r.x)<r.width/2+.45&&Math.abs(z-r.z)<r.depth/2+.45),t.transitionId);}}}
 });
 check('Entrance detour and all four lift approaches remain open',()=>{
  const p=[[0,22],[0,16],[1.2,15.5],[1.2,12.5],[0,8]];for(let i=1;i<p.length;i++)assert(allowed({x:p[i-1][0],y:1.7,z:p[i-1][1]},{x:p[i][0],y:1.7,z:p[i][1]},true));
  for(const x of [-3,0,3,6.5])assert(allowed({x,y:1.7,z:5},{x,y:1.7,z:2.96},true));
 });
 check('Existing Explore admission stops at furniture, without affecting L01',()=>{
  for(const f of bounds){assert(!allowed({x:f.x,y:1.7,z:f.z+f.depth/2+.6},{x:f.x,y:1.7,z:f.z},true),JSON.stringify(f));}
  assert(allowed({x:-14.5,y:6.7,z:5.2},{x:-14.5,y:6.7,z:2.8},true));
 });
 check('All four existing lift-lobby camera anchors retain a 0.9m clear approach',()=>{for(const x of [-3,0,3,6.5])for(let z=2.96;z<=5;z+=.025)assert(!bounds.some(r=>Math.abs(x-r.x)<r.width/2+.45&&Math.abs(z-r.z)<r.depth/2+.45));});
 check('Furniture remains in Reception/Lounge and approved arrival side, no new room',()=>{
  assert.equal(items.filter(x=>x.kind==='desk').length,1);assert.equal(items.filter(x=>x.kind==='sofa').length,2);
  assert(items.every(f=>f.x>=-21&&f.x<=7&&f.z>=-7&&f.z<=15));
 });
 check('Suspended fixture remains safely above head height and below 4.20m',()=>{assert(limits.pendantBottom>=3.1);assert(limits.pendantTop<4.2);assert.equal(limits.realLightCount,3);});
 const geometry=buildGroundInterior();
 const triangles=geometry.reduce((n,b)=>n+(b.geometry.index?.count??b.geometry.attributes.position.count)/3,0);
 check('Decorative geometry has a bounded real-time budget',()=>{assert(geometry.length<=14);assert(triangles<140000);for(const b of geometry){b.geometry.computeBoundingBox();assert(Number.isFinite(b.geometry.boundingBox.max.y));}});
 check('Canonical Ground/L01 envelopes and datums preserved',()=>{for(const [ref,y,w,d]of [['LUNA-GROUND',0,44,34],['LUNA-L01-AMENITIES',5,40,30]]){const l=levels.find(l=>l.ref===ref);assert.equal(l.baseElevation,y);assert.deepEqual(l.footprint,{width:w,depth:d});}});
 const policy='src/luna/policy/lunaRepresentationPolicy.ts';
 check('RepresentationPolicy byte-identical to accepted Phase 2',()=>assert.equal(createHash('sha256').update(readFileSync(policy)).digest('hex'),'2a301cf10a6dbaaf9e9f81d49a8b852d308ae193837612cbfcca68e59fe19d7e'));
 geometry.forEach(b=>b.geometry.dispose());
 writeFileSync(dir+'/deterministic.json',JSON.stringify({passed:true,checks,decorativeTriangles:triangles,materialBatches:geometry.length,items,bounds,limits},null,2));console.log(checks.join('\n'));
}finally{await server.close();}
