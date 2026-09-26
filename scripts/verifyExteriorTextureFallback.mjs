// Local optional-material failure regression. No network writes or app hooks.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const results=[];
try {
 for(const failTextures of [false,true]) {
  const page=await browser.newPage();await page.setViewport({width:1280,height:900});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(failTextures) {
   await page.setRequestInterception(true);
   page.on('request',r=>r.url().includes('/exterior-materials/')?r.abort():r.continue());
  }
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle0'});
  await page.waitForSelector('canvas');
  await page.evaluate(async()=>{
   const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('@react-three_fiber'));
   const fiber=await import(url);window.twin=()=>fiber._roots.get(document.querySelector('canvas')).store.getState();
  });
  await page.waitForFunction(()=>window.twin().controls&&window.twin().gl.info.render.triangles>50000);
  const result=await page.evaluate(failTextures=>{
   const s=window.twin(),maps=new Set();
   s.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])for(const slot of ['map','normalMap','roughnessMap'])if(m[slot]?.image?.src?.includes('/exterior-materials/'))maps.add(m[slot].image.src.split('/').at(-1));});
   return {failTextures,hdrReflection:s.scene.environment?.isDataTexture===true,calls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles,loadedMaps:[...maps].sort(),camera:s.camera.position.toArray(),entrancePresent:!!s.scene.getObjectByName('LUNA-GROUND-ACCESS-MAIN-01')};
  },failTextures);
  assert.equal(errors.length,0,errors.join('\n'));
  assert(result.camera.every(Number.isFinite));assert(result.entrancePresent);
  assert.equal(result.loadedMaps.length,failTextures?0:8,'Eight selected local maps, or procedural fallback');
  assert.equal(result.hdrReflection,!failTextures,'Optional packaged HDR also falls back without suspending the Twin');
  results.push({...result,errors,status:'PASS'});await page.close();
 }
 writeFileSync('artifacts/exterior-gold-standard/texture-fallback.json',JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}
