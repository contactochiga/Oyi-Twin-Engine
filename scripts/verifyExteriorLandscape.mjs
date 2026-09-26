// Local optional-material failure regression. No network writes or app hooks.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const results=[];
try {
 for(const failure of [null, ".gltf", ".bin", ".jpg"]) {
  const page=await browser.newPage();await page.setViewport({width:1280,height:900});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(failure) {
   await page.setRequestInterception(true);
   page.on('request',r=>r.url().includes('/exterior-landscape/')&&r.url().endsWith(failure)?r.abort():r.continue());
  }
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle0'});
  await page.waitForSelector('canvas');
  await page.evaluate(async()=>{
   const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('@react-three_fiber'));
   const fiber=await import(url);window.twin=()=>fiber._roots.get(document.querySelector('canvas')).store.getState();
  });
  await page.waitForFunction(()=>window.twin().controls&&window.twin().gl.info.render.triangles>50000);
  const result=await page.evaluate(failure=>{
   const s=window.twin(),maps=new Set();
   let instances=0,trianglesPerPlant=0;s.scene.traverse(o=>{if(o.material?.name==='Exterior landscape — reference species'){instances+=o.isInstancedMesh?o.count:1;trianglesPerPlant=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])for(const slot of ['map','normalMap','roughnessMap'])if(m.name==='Exterior landscape — reference species'&&m[slot]?.image)maps.add(m[slot].name||m[slot].uuid);});
   return {failure,instances,trianglesPerPlant,calls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles,loadedMaps:[...maps].sort(),camera:s.camera.position.toArray(),entrancePresent:!!s.scene.getObjectByName('LUNA-GROUND-ACCESS-MAIN-01')};
  },failure);
  assert.equal(errors.length,0,errors.join('\n'));
  assert(result.camera.every(Number.isFinite));assert(result.entrancePresent);
  assert.equal(result.loadedMaps.length,failure?0:3,'Three local plant maps, or procedural fallback');
  assert.equal(result.instances,failure?0:30);assert(result.trianglesPerPlant<=6000);
  results.push({...result,errors,status:'PASS'});await page.close();
 }
 writeFileSync('artifacts/exterior-gold-standard/landscape-fallback.json',JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}
