import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
const baseline=JSON.parse(readFileSync('artifacts/exterior-gold-standard/baseline-source-sha256.json','utf8'));
const allowed=new Set(['src/luna/LevelFacade.tsx','src/luna/LunaEnvironment.tsx','src/luna/LunaBuilding.tsx','src/luna/LunaLevel.tsx']);
const changed=[];
for(const [file,hash] of Object.entries(baseline)){
 const actual=createHash('sha256').update(readFileSync(file)).digest('hex');
 if(actual!==hash){assert(allowed.has(file),`Unexpected source change: ${file}`);changed.push(file);}
}
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {LUNA_LEVELS,LUNA_SITE}=await server.ssrLoadModule('/src/luna/lunaProgramme.ts');
 const {exteriorMaterials}=await server.ssrLoadModule('/src/luna/exterior/exteriorMaterials.ts');
 const {balconyFinish,arrivalCarGeometry}=await server.ssrLoadModule('/src/luna/exterior/exteriorGeometry.ts');
 const {palmLeaves,shrubGeometry}=await server.ssrLoadModule('/src/luna/exterior/plantGeometry.ts');
 assert.equal(LUNA_LEVELS.length,16);assert.deepEqual([LUNA_SITE.width,LUNA_SITE.depth],[62,52]);
 const glass=exteriorMaterials.glass(),other=exteriorMaterials.glass();assert.notEqual(glass,other);glass.opacity=.01;assert.equal(other.opacity,.26);assert.equal(other.depthWrite,false);
 const a=exteriorMaterials.limestone(),b=exteriorMaterials.limestone();assert.notEqual(a,b);assert.equal(a.bumpMap,b.bumpMap,'bounded shared textures');
 for(const level of LUNA_LEVELS){if(!/L\d+$/.test(level.ref))continue;const g=balconyFinish(level.footprint.width,level.footprint.depth,1.7,-level.height/2);for(const geo of Object.values(g)){geo.computeBoundingBox();assert(Number.isFinite(geo.boundingBox.min.x));assert(geo.getAttribute('position').count<10000);geo.dispose();}}
 const car=arrivalCarGeometry();car.body.computeBoundingBox();assert.equal(car.body.boundingBox.min.z,Math.fround(-2.2));assert.equal(car.body.boundingBox.max.z,Math.fround(2.2));
 for(const g of [palmLeaves(),shrubGeometry()]){assert(g.getAttribute('position').count<6000);g.dispose();}
 const result={status:'PASS',canonicalFilesUnchanged:Object.keys(baseline).length-changed.length,changed,checks:['16 levels / site dimensions','canonical sources byte-identical','private material ownership','shared local textures','bounded detail meshes','original decorative car length']};
 writeFileSync('artifacts/exterior-gold-standard/contracts.json',JSON.stringify(result,null,2));console.log(result);
}finally{await server.close();}
