import assert from 'node:assert/strict';
import {readFileSync,writeFileSync}from'node:fs';
import {createHash}from'node:crypto';
import {createServer}from'vite';
import * as T from'three';
import {GLTFLoader}from'three/examples/jsm/loaders/GLTFLoader.js';
globalThis.ProgressEvent=class{};
const root='artifacts/exterior-gold-standard/';const hash=b=>createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(readFileSync(root+'convergence-baseline.json','utf8'));
const allowed=new Set(['src/luna/LevelFacade.tsx','src/luna/exterior/ExteriorPlanting.tsx']);
const changed=[];for(const [p,h]of Object.entries(baseline)){if(hash(readFileSync(p))!==h){assert(allowed.has(p),'Unexpected frozen source edit: '+p);changed.push(p);}}
const manifest=JSON.parse(readFileSync('public/exterior-assets/sources.json','utf8'));
for(const a of manifest.files)assert.equal(hash(readFileSync(a.path)),a.sha256,a.path);
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
try{
 const {glazingAssembly,glazingAssemblyMaterials}=await server.ssrLoadModule('/src/luna/exterior/glazingAssembly.ts');
 const {prepareHero}=await server.ssrLoadModule('/src/luna/exterior/heroAssets.ts');
 const assembly=glazingAssembly(36,28,3.25,18,14,6);
 for(const g of Object.values(assembly)){g.computeBoundingBox();assert(g.attributes.position.count<50000);assert(g.boundingBox.min.x>=-18.31&&g.boundingBox.max.x<=18.31);assert(g.boundingBox.min.z>=-14.31&&g.boundingBox.max.z<=14.31);}
 const shadow=glazingAssemblyMaterials.shadow();assert.equal(shadow.opacity,1);assert.equal(shadow.transparent,false,'Permanent privacy backing');
 const back=glazingAssemblyMaterials.glass();assert(back.opacity<.3&&back.depthWrite===false,'Façade glazing separate from opaque privacy card');
 let counts={};
 for(const name of ['sedan-near','sedan-far','palm','palm-far']){
  const doc=JSON.parse(readFileSync('public/exterior-assets/'+name+'.gltf','utf8'));
  delete doc.images;delete doc.textures;for(const m of doc.materials){delete m.normalTexture;delete m.pbrMetallicRoughness.baseColorTexture;}
  const {scene}=await new GLTFLoader().parseAsync(JSON.stringify(doc),'');
  if(name.startsWith('palm'))scene.traverse(o=>{if(o.isMesh){o.material.map=new T.DataTexture(new Uint8Array(4),1,1);o.material.normalMap=o.material.map;}});
  const sourceGeometry=scene.getObjectByProperty('isMesh',true).geometry;const original=[...sourceGeometry.attributes.position.array];
  const prepared=prepareHero(scene,name.startsWith('palm')?'palm':'sedan');
  counts[name]=prepared.reduce((n,p)=>n+(p.geometry.index?.count??p.geometry.attributes.position.count)/3,0);
  assert.notEqual(prepared[0].geometry,sourceGeometry);assert.deepEqual([...sourceGeometry.attributes.position.array],original,'Source geometry never mutated');
  const box=new T.Box3().setFromObject(scene);assert(Math.abs(box.min.y)<1e-5,'Ground contact');
  if(name.startsWith('palm')){const radius=Math.max(Math.abs(box.min.x),Math.abs(box.max.x),Math.abs(box.min.z),Math.abs(box.max.z));assert(radius<2.9,'Existing palm clearance envelope retained');}
  scene.scale.setScalar(100);assert.throws(()=>prepareHero(scene,name.startsWith('palm')?'palm':'sedan'),/bounds/);
 }
 assert(counts['sedan-far']<counts['sedan-near']);assert(counts['palm-far']<counts.palm);
 assert.throws(()=>prepareHero(new T.Group(),'sedan'),/bounds|Empty/);
 const result={status:'PASS',changedInheritedSource:changed,unchangedInheritedSource:Object.keys(baseline).length-changed.length,counts,checks:['frozen sources','local provenance hashes','bounded facade projection','opaque privacy backing','authored geometry budgets','source ownership','ground contact','palm clearance','LOD reduction','invalid asset rejection']};writeFileSync(root+'convergence-contracts.json',JSON.stringify(result,null,2));console.log(result);
}finally{await server.close();}
