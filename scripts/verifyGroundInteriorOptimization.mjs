import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='artifacts/ground-interior-optimization';mkdirSync(dir,{recursive:true});
const baseline=JSON.parse(readFileSync(dir+'/source-baseline.json','utf8'));
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {buildGroundInterior}=await server.ssrLoadModule('/src/luna/architecture/groundInterior/groundInteriorGeometry.ts');
 const {GROUND_FURNISHINGS:items}=await server.ssrLoadModule('/src/luna/architecture/groundInterior/groundInteriorLayout.ts');
 const batches=buildGroundInterior(),checks=[];
 const test=(name,f)=>{f();checks.push(name)};
 test('All existing application contracts outside Ground decorative modules are byte-identical',()=>{for(const [p,hash]of Object.entries(baseline))assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),hash,p);});
 test('Three preserved planter positions share one full-density crown geometry',()=>{
  const f=batches.find(b=>b.key==='foliage');assert.deepEqual(f.instances,items.filter(f=>f.kind==='planter').map(f=>[f.x,0,f.z]));
  assert.equal(f.instances.length,3);assert.equal(f.geometry.index.count/3,6480); // all 27 original clusters remain after instancing
 });
 let uploaded=0,expanded=0,bytes=0;
 for(const b of batches){const n=b.geometry.index.count/3;uploaded+=n;expanded+=n*(b.instances?.length??1);bytes+=b.geometry.index.array.byteLength+Object.values(b.geometry.attributes).reduce((s,a)=>s+a.array.byteLength,0);}
 test('Every decorative batch uses indexed geometry; expanded budget reduces without deleting plants',()=>{assert(batches.every(b=>b.geometry.index));assert(expanded<57062);assert(bytes<3000000);assert.equal(batches.length,13);});
 test('Static batching does not freeze parent world transforms',()=>{
  const source=readFileSync('src/luna/architecture/groundInterior/GroundInteriorFinishes.tsx','utf8');assert(!source.includes('matrixWorldAutoUpdate={false}'));assert(source.includes('matrixAutoUpdate:false'));assert(source.includes('computeBoundingSphere()'));
 });
 const result={passed:true,checks,uploadedTriangles:uploaded,expandedDecorativeTriangles:expanded,geometryBufferBytes:bytes,materialBatches:batches.length,batches:batches.map(b=>({key:b.key,uploadedTriangles:b.geometry.index.count/3,instances:b.instances?.length??1}))};
 writeFileSync(dir+'/deterministic.json',JSON.stringify(result,null,2));console.log(result);batches.forEach(b=>b.geometry.dispose());
}finally{await server.close();}
