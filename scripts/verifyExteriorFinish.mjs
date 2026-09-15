// Local screenshot audit of the real app. Camera only; never changes canonical data.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const stage=process.argv[2]??'after';
const dir=`artifacts/exterior-gold-standard/${stage}`;mkdirSync(dir,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage();await page.setViewport({width:1600,height:1100,deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle0'});
 await page.waitForSelector('canvas');
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('@react-three_fiber'));const fiber=await import(url);window.twin=()=>fiber._roots.get(document.querySelector('canvas')).store.getState();});
 await page.waitForFunction(()=>Boolean(window.twin().controls),{timeout:60000});
 const views=[
 ['front',[0,29,108],[0,26,0]],['three-quarter',[72,58,88],[0,26,0]],
 ['street-entrance',[0,1.7,43],[0,3,16]],['porte-cochere',[13,2,35],[0,3,19]],
 ['podium',[31,9,41],[0,6,12]],['residential-detail',[30,28,32],[14,27,14]],
 ['crown',[40,65,47],[0,52,0]],['daylight',[72,58,88],[0,26,0]],['dusk',[72,58,88],[0,26,0]]];
 const metrics=[];
 for(const [name,position,target] of views){
  if(name==='dusk'){
   await page.click('[aria-label="Weather and lighting"]');
   await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Evening'))?.click());
   await page.mouse.click(1500,900);await pause(1500);
  }
  await page.evaluate(({position,target})=>{const s=window.twin();s.controls.target.set(...target);s.camera.position.set(...position);s.controls.update();},{position,target});
  await pause(1800);await page.screenshot({path:`${dir}/${name}.png`});
  metrics.push(await page.evaluate(name=>{const s=window.twin();return {name,position:s.camera.position.toArray(),target:s.controls.target.toArray(),calls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles,geometries:s.gl.info.memory.geometries,textures:s.gl.info.memory.textures};},name));
  console.log(name,metrics.at(-1));
 }
 let entrance;
 if(stage==='after'){
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle0'});
  await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('@react-three_fiber'));const fiber=await import(url);window.twin=()=>fiber._roots.get(document.querySelector('canvas')).store.getState();});
  await page.waitForFunction(()=>Boolean(window.twin().controls),{timeout:60000});
  entrance=await page.evaluate(()=>{
    const s=window.twin(),door=s.scene.getObjectByName('LUNA-GROUND-ACCESS-MAIN-01');
    if(!door)throw Error('Canonical entrance missing');
    const p=door.getWorldPosition(s.camera.position.clone());p.y+=1.4;p.x+=.4;
    s.controls.target.copy(p);s.camera.position.copy(p);s.camera.position.z+=7;s.camera.position.y+=.2;s.controls.minDistance=.5;s.controls.update();
    s.camera.updateMatrixWorld();s.scene.updateMatrixWorld(true);
    s.raycaster.setFromCamera({x:0,y:0},s.camera);
    const hit=s.raycaster.intersectObjects(s.scene.children,true).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});
    const names=[];let o=hit?.object;while(o){if(o.name)names.push(o.name);o=o.parent;}
    const leaf=door.children.find(child=>child.type==='Group'&&Math.abs(child.position.x)>.5);
    window.entryLeaf=leaf;
    return {hitNames:names,eyeHeight:s.camera.position.y,startLeafX:leaf?.position.x};
  });
  assert(entrance.hitNames.includes('LUNA-GROUND-ACCESS-MAIN-01'),'Exterior detail must not intercept the canonical entrance ray');
  await pause(1000);await page.screenshot({path:`${dir}/human-height-entrance.png`});
  await page.mouse.click(800,550);
  await page.waitForFunction(()=>Math.abs(window.entryLeaf?.position.x??0)>1.2,{timeout:30000});
  entrance.movingLeafX=await page.evaluate(()=>window.entryLeaf.position.x);
  assert(Math.abs(entrance.movingLeafX)>Math.abs(entrance.startLeafX),'Real pointer must open the runtime-driven sliding leaf');
  await page.screenshot({path:`${dir}/entrance-opening.png`});
  console.log('Canonical entrance pointer proof',entrance);
 }
 writeFileSync(`${dir}/result.json`,JSON.stringify({errors,metrics,entrance},null,2));
 if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}
