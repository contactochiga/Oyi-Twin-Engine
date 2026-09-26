import assert from 'node:assert/strict';
import {writeFileSync}from'node:fs';
import puppeteer from'puppeteer-core';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const failure of [null,'sedan','palm.gltf','palm-color.png','palm-normal.jpg','all']){
  const page=await browser.newPage();await page.setViewport({width:1600,height:1100});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(failure){await page.setRequestInterception(true);page.on('request',r=>r.url().includes('/exterior-assets/')&&(failure==='all'||r.url().includes(failure))?r.abort():r.continue());}
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle0'});
  await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('@react-three_fiber'));const fiber=await import(url);window.twin=()=>fiber._roots.get(document.querySelector('canvas')).store.getState();});
  await page.waitForFunction(()=>window.twin().controls&&window.twin().gl.info.render.triangles>50000);
  await new Promise(r=>setTimeout(r,800));
  const info=await page.evaluate(()=>{const s=window.twin(),counts={sedan:0,palm:0},tris={sedan:0,palm:0};s.scene.traverse(o=>{for(const k of ['sedan','palm'])if(o.name.startsWith('exterior-hero-'+k+'-')){counts[k]++;tris[k]+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {counts,tris,entrance:!!s.scene.getObjectByName('LUNA-GROUND-ACCESS-MAIN-01'),camera:s.camera.position.toArray()};});
  assert.equal(info.counts.sedan>0, failure!=='sedan'&&failure!=='all');assert.equal(info.counts.palm>0,failure===null||failure==='sedan');assert(info.entrance);assert(info.camera.every(Number.isFinite));assert.deepEqual(errors,[]);
  if(!failure){await page.evaluate(()=>{const s=window.twin();s.controls.minDistance=.5;s.controls.maxPolarAngle=Math.PI;s.camera.position.set(-8,1.65,27);s.controls.target.set(-4.2,.8,21.95);s.controls.update();});await new Promise(r=>setTimeout(r,400));const near=await page.evaluate(()=>{let tris=0;window.twin().scene.traverse(o=>{if(o.name.startsWith('exterior-hero-sedan-'))tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return tris;});assert(near>info.tris.sedan,'Car geometry LOD follows actual camera distance');info.nearCarTriangles=near;}
  results.push({failure,...info,errors,status:'PASS'});await page.close();
 }
 writeFileSync('artifacts/exterior-gold-standard/hero-fallback.json',JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}
