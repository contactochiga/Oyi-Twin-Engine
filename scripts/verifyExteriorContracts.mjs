import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
const baseline=JSON.parse(readFileSync('artifacts/exterior-gold-standard/baseline-source-sha256.json','utf8'));
const allowed=new Set(['src/luna/LevelFacade.tsx','src/luna/LunaEnvironment.tsx','src/luna/LunaBuilding.tsx','src/luna/LunaLevel.tsx','src/engine/components/Lighting.tsx','src/App.tsx']);
const changed=[];
for(const [file,hash] of Object.entries(baseline)){
 const actual=createHash('sha256').update(readFileSync(file)).digest('hex');
 if(actual!==hash){assert(allowed.has(file),`Unexpected source change: ${file}`);changed.push(file);}
}
const originalApp=execFileSync('tar',['-xOf','artifacts/exterior-gold-standard/baseline-source.tar.gz','src/App.tsx'],{encoding:'utf8'});
assert.equal(readFileSync('src/App.tsx','utf8'),originalApp.replace('<Lighting mode={lightingMode} quality="high" />','<Lighting mode={lightingMode} quality="high" outdoorReflections reflectionMap="/exterior-materials/venice_sunset_1k.hdr" />'),'App change must be limited to opting in to outdoor reflections');
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
try{
 const {LUNA_LEVELS,LUNA_SITE}=await server.ssrLoadModule('/src/luna/lunaProgramme.ts');
 const {exteriorMaterials}=await server.ssrLoadModule('/src/luna/exterior/exteriorMaterials.ts');
 const {balconyFinish,arrivalCarGeometry,windowFaceGeometry}=await server.ssrLoadModule('/src/luna/exterior/exteriorGeometry.ts');
 const {palmLeaves,shrubGeometry}=await server.ssrLoadModule('/src/luna/exterior/plantGeometry.ts');
 assert.equal(LUNA_LEVELS.length,16);assert.deepEqual([LUNA_SITE.width,LUNA_SITE.depth],[62,52]);
 const glass=exteriorMaterials.glass(),other=exteriorMaterials.glass();assert.notEqual(glass,other);glass.opacity=.01;assert.equal(other.opacity,.26);assert.equal(other.depthWrite,false);
 const a=exteriorMaterials.limestone(),b=exteriorMaterials.limestone();assert.notEqual(a,b);assert.equal(a.bumpMap,b.bumpMap,'bounded shared textures');
 for(const level of LUNA_LEVELS){if(!/L\d+$/.test(level.ref))continue;const g=balconyFinish(level.footprint.width,level.footprint.depth,1.7,-level.height/2);for(const geo of Object.values(g)){geo.computeBoundingBox();assert(Number.isFinite(geo.boundingBox.min.x));assert(geo.getAttribute('position').count<10000);geo.dispose();}}
 const panels=windowFaceGeometry([{size:[2,2,.03],position:[1,0,14.015]},{size:[.03,2,2],position:[-18.015,0,1]}]);
 assert.equal(panels.index.count,12,'Two faces, without the old reflective box rims');
 const panePositions=panels.getAttribute('position');
 for(let i=0;i<4;i++)assert.equal(panePositions.getZ(i),Math.fround(14.03),'Existing outer glazing plane preserved');
 for(let i=4;i<8;i++)assert.equal(panePositions.getX(i),Math.fround(-18.03),'Existing side glazing plane preserved');
 panels.dispose();
 const car=arrivalCarGeometry();car.body.computeBoundingBox();assert.equal(car.body.boundingBox.min.z,Math.fround(-2.2));assert.equal(car.body.boundingBox.max.z,Math.fround(2.2));
 const palm=palmLeaves();assert(palm.getAttribute('position').count<65000,'Curved palm leaflet budget');palm.computeBoundingBox();assert(palm.boundingBox.min.x>=-2.901&&palm.boundingBox.max.x<=2.901&&palm.boundingBox.min.z>=-2.901&&palm.boundingBox.max.z<=2.901,'Palm crown stays within prior clearance envelope');palm.dispose();const farPalm=palmLeaves('far');assert(farPalm.getAttribute('position').count<14000,'Far palm LOD budget');farPalm.dispose();const shrub=shrubGeometry();assert(shrub.getAttribute('position').count<6000);shrub.dispose();
 const {metricFinishUV}=await server.ssrLoadModule('/src/luna/exterior/exteriorTextureMaps.ts');
 const {PlaneGeometry}=await import('three');
 const plane=new PlaneGeometry(62,52),finished=metricFinishUV(plane);
 assert.deepEqual([...finished.attributes.position.array],[...plane.attributes.position.array],'UV refinement must preserve all positions');
 assert.deepEqual([...plane.attributes.uv.array],[0,1,1,1,0,0,1,0],'source geometry must remain untouched');
 assert.equal(Math.abs(finished.attributes.uv.getX(1)-finished.attributes.uv.getX(0)),15.5,'62m surface uses 4m material repeats');
 const manifest=JSON.parse(readFileSync('public/exterior-materials/sources.json','utf8'));
 for(const asset of manifest){const bytes=readFileSync(asset.file);assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);}
 const landscapeManifest=JSON.parse(readFileSync('public/exterior-landscape/sources.json','utf8'));
 for(const asset of landscapeManifest){const bytes=readFileSync(asset.file);assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);}
 const {prepareShrubVisual}=await server.ssrLoadModule('/src/luna/exterior/landscapeAsset.ts');
 const THREE=await import('three');
 const scene=new THREE.Group(),source=new THREE.Mesh(new THREE.BoxGeometry(2,3,2),new THREE.MeshStandardMaterial());
 source.name='fern_02_b';source.position.set(10,4,2);scene.add(source);
 const original=[...source.geometry.attributes.position.array],visual=prepareShrubVisual(scene);
 const bounds=visual.geometry.boundingBox;
 assert(bounds.min.y>=-1e-6&&bounds.max.y<=.700001);
 assert(bounds.min.x>=-.500001&&bounds.max.x<=.500001&&bounds.min.z>=-.500001&&bounds.max.z<=.500001);
 assert.deepEqual([...source.geometry.attributes.position.array],original,'Imported source stays unchanged');
 assert.notEqual(visual.material,source.material,'No mutations to imported/shared source material');
 assert.throws(()=>prepareShrubVisual(new THREE.Group()),/Unexpected/);
 source.geometry=new THREE.SphereGeometry(1,128,128);
 assert.throws(()=>prepareShrubVisual(scene),/budget/);
 const {sitePlantingLayout}=await server.ssrLoadModule('/src/luna/exterior/sitePlantingLayout.ts');
 const beds=sitePlantingLayout(62,52);assert.equal(beds.length,14);
 for(const {position:[x,,z]} of beds){
  assert(Math.abs(x)-1.05>=22||Math.abs(z)-1.05>=17,'Beds must not intersect the canonical Ground footprint');
  assert(Math.abs(x)+1.05<=31&&Math.abs(z)+1.05<=26,'Beds remain within the current site plane');
  if(z>17)assert(Math.abs(x)-1.05>=7,'Keep the arrival axis clear');
 }
 const {sitePalmPlacements}=await server.ssrLoadModule('/src/luna/exterior/sitePlantingLayout.ts');
 for(const [x,,z] of sitePalmPlacements(52)){
  assert(Math.abs(x)-2.9>13.64,'Palm fronds clear the 27.28m canopy');
  if(z<20)assert(Math.abs(x)-2.9>22.175,'Side palms clear the outer Ground column, not only the massing');
  assert(Math.abs(x)+2.9<29.7,'Palm fronds clear the site boundary');
 }
 for(const g of Object.values(car)){g.computeBoundingBox();assert(g.getAttribute('position').count<30000,'Bounded vehicle component');g.dispose();}
 const result={status:'PASS'   ,unchangedBaselineSourceFiles:Object.keys(baseline).length-changed.length,changed,checks:['16 levels / site dimensions','canonical sources byte-identical','private material ownership','shared local textures','bounded detail meshes','original decorative car length','metric UVs preserve positions/source geometry','packaged texture hashes','window panels retain exact outward planes without box rims','landscape provenance, envelope, source ownership and mesh budget']};
 writeFileSync('artifacts/exterior-gold-standard/contracts.json',JSON.stringify(result,null,2));console.log(result);
}finally{await server.close();}
