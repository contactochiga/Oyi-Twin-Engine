// Local screenshot audit of the real app. Camera only; never changes canonical data.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const stage=process.argv[2]??'final';
const baseURL=process.env.EXTERIOR_BASE_URL??'http://127.0.0.1:5173/';
const selected=process.env.EXTERIOR_VIEWS?.split(',');
const dir=`artifacts/exterior-gold-standard/${stage}`;mkdirSync(dir,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage();await page.setViewport({width:1600,height:1100,deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await page.goto(baseURL,{waitUntil:'networkidle0'});
 await page.waitForSelector('canvas');
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('@react-three_fiber'));const fiber=await import(url);window.twin=()=>fiber._roots.get(document.querySelector('canvas')).store.getState();});
 await page.waitForFunction(()=>Boolean(window.twin().controls),{timeout:60000});
 const views=[
 ['front-day',[0,29,108],[0,26,0]],
 ['front-entrance',[0,1.65,30],[0,2.5,16]],
 ['porte-cochere',[12,1.65,29],[0,3.5,19]],
 ['podium',[27,8,38],[0,5,14]],
 ['residential-detail',[30,28,32],[14,27,14]],
 ['balcony-glazing',[10,26.8,23],[6,26.8,14]],
 ['landscape-palm',[22,1.65,31],[16.94,3.5,25]],
 ['vehicle-driveway',[-8,1.65,27],[-4.2,.8,21.95]],
 ['crown-day',[40,65,47],[0,52,0]],
 ['crown-human',[11,53.92,7],[1.56,52.7,0]],
 ['glazing-human',[9,26.4,15.3],[5,26.2,14.1]],
 ['three-quarter',[72,58,88],[0,26,0]],
 ['front-dusk',[0,29,108],[0,26,0]],
 ['crown-dusk',[40,65,47],[0,52,0]]];
 const metrics=[];
 for(const [name,position,target] of views){
  if(selected&&!selected.includes(name))continue;
  if(name==='front-dusk'){
   await page.click('[aria-label="Weather and lighting"]');
   await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Evening'))?.click());
   await page.mouse.click(1500,900);await pause(1500);
  }
  await page.evaluate(({position,target})=>{const s=window.twin();s.controls.maxPolarAngle=Math.PI; s.controls.minDistance=.5;s.controls.target.set(...target);s.camera.position.set(...position);s.controls.update();},{position,target});
  await pause(1800);await page.screenshot({path:`${dir}/${name}.png`});
  metrics.push(await page.evaluate(name=>{const s=window.twin();return {name,position:s.camera.position.toArray(),target:s.controls.target.toArray(),calls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles,geometries:s.gl.info.memory.geometries,textures:s.gl.info.memory.textures};},name));
  console.log(name,metrics.at(-1));
 }
 let entrance;
 if(stage==='after'){
  await page.goto(baseURL,{waitUntil:'networkidle0'});
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
