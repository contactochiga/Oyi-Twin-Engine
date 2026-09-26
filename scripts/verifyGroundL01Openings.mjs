import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='artifacts/ground-l01-v1/openings';mkdirSync(out,{recursive:true});
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const load=p=>server.ssrLoadModule('/src/'+p);
 const {PODIUM_SLAB_OPENINGS:holes,podiumSlabPanels:panels}=await load('luna/architecture/podiumSlabOpenings.ts');
 const {LUNA_CORES:cores,LUNA_LEVELS:levels}=await load('luna/lunaProgramme.ts');
 const {buildLunaReferenceModel}=await load('luna/ingestion/lunaSpatialModel.ts');
 const {LUNA_STAIR_CAPABLE_REFS}=await load('luna/transitions/lunaRouteTransitions.ts');
 const checks=[];const check=(label,fn)=>{fn();checks.push(label);};
 const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2-1e-9&&Math.abs(a.z-b.z)<(a.d+b.d)/2-1e-9;
 check('Exactly seven apertures equal existing canonical footprints',()=>assert.deepEqual(holes,cores.map(c=>({canonicalRef:c.ref,x:c.x,z:c.z,width:c.width,depth:c.depth}))));
 const layers=[['Ground roof skin',44,34,.16],['L01 floor finish',40,30,.08],['L01 structural slab',39.2,29.4,.35],['L01 transfer',37,29,.6],['L01 roof skin',40,30,.06]];
 const schedule=layers.map(([label,w,d,t])=>{
  const cells=panels(w,d,t);
  check(label+': no solid cell overlaps any authorized aperture',()=>{for(const b of cells)for(const h of holes)assert(!overlap({x:b.position[0],z:b.position[2],w:b.size[0],d:b.size[2]},{x:h.x,z:h.z,w:h.width,d:h.depth}));});
  const net=cells.reduce((a,b)=>a+b.size[0]*b.size[2],0),removed=holes.reduce((a,h)=>a+h.width*h.depth,0);
  check(label+': no additional void and no atrium',()=>{assert(Math.abs(net-(w*d-removed))<1e-7);assert(cells.some(b=>6>=b.position[2]-b.size[2]/2&&6<=b.position[2]+b.size[2]/2&&0>=b.position[0]-b.size[0]/2&&0<=b.position[0]+b.size[0]/2));});
  return {label,width:w,depth:d,thickness:t,grossArea:w*d,openingArea:removed,netSolidArea:net};
 });
 const model=buildLunaReferenceModel();
 const stairAudit=model.stairs.map(stair=>({ref:stair.canonicalRef,servedRequestedLevels:['LUNA-B1','LUNA-GROUND','LUNA-L01-AMENITIES','LUNA-L02'].filter(ref=>stair.servedLevelRefs.includes(ref)),doors:model.doors.filter(d=>d.toSpaceRef===stair.canonicalRef||d.fromSpaceRef===stair.canonicalRef).map(d=>({ref:d.canonicalRef,levelRef:d.levelRef,readiness:d.animationReadiness})),functionalEgress:'PARTIAL',missing:['No authored flight/run/rise or intermediate landing profile','No B1/L02 doorway and approach geometry','No stair traversal binding or door actuation','No headroom/swing/handrail/egress clearance specification']}));
 check('Do not misrepresent service-level topology as executable stair egress',()=>{assert.equal(LUNA_STAIR_CAPABLE_REFS.size,0);for(const s of stairAudit){assert.equal(s.servedRequestedLevels.length,4);assert(!s.doors.some(d=>d.levelRef==='LUNA-B1'||d.levelRef==='LUNA-L02'));}});
 check('Existing floor datums unchanged',()=>assert.deepEqual(['LUNA-B1','LUNA-GROUND','LUNA-L01-AMENITIES','LUNA-L02'].map(ref=>levels.find(l=>l.ref===ref).baseElevation),[-4,0,5,8.5]));
 const result={passed:true,checks,holes,layers:schedule,stairAudit,futureAtrium:'DEFERRED',scope:'Ground/L01 interface layers and L01-owned transfer/roof only; B1 and L02 slab geometry remains unchanged'};
 writeFileSync(out+'/deterministic.json',JSON.stringify(result,null,2));console.log(checks.join('\n'));
}finally{await server.close();}
