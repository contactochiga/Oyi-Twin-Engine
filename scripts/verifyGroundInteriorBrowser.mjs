import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const phase=process.argv.includes('--before')?'before':'after';
const dir=`artifacts/ground-interior-v1/${phase}`;mkdirSync(dir,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const result={phase,errors,views:[]};
try{
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{const u=performance.getEntriesByType('resource').map(r=>r.name).find(u=>u.includes('@react-three_fiber'));const f=await import(u);window.twin=()=>f._roots.get(document.querySelector('canvas')).store.getState();});
 const sel='input[aria-label="Ask Oyi about the building"]';await page.type(sel,'Take me to the lobby');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>Math.abs(window.twin().camera.position.z-8)<.06&&Math.abs(window.twin().camera.position.y-1.7)<.02,{timeout:45000});
 const views=[
 ['01-grand-arrival',[0,1.7,15.4],[2.5,1.9,5]],
 ['02-reception-to-gallery',[3.4,1.7,8.8],[.5,1.6,2.5]],
 ['03-residents-lounge',[-15,1.7,2.4],[-17,1.2,-3.4]],
 ['04-passenger-gallery',[.2,1.7,6.4],[0,1.55,1.4]],
 ['05-reverse-arrival',[0,1.7,7.5],[0,2,16.5]],
 ['06-reception-detail',[2,1.7,8.3],[5.5,1.2,6]],
 ['07-material-detail',[-17,1.4,.2],[-18.4,.55,-2.5]],
 ['08-lift-control',[1.6,1.55,4.2],[1,1.45,2.72]],
 ['09-ceiling-light',[0,1.7,8.8],[0,3.65,12]],
 ];
 for(const [name,position,target] of views){
  await page.waitForFunction(()=>window.twin().controls);
  await page.evaluate(({position,target})=>{const s=window.twin();s.controls.minDistance=.1;s.controls.maxPolarAngle=Math.PI;s.controls.target.set(...target);s.camera.position.set(...position);s.camera.fov=64;s.camera.updateProjectionMatrix();s.controls.update();},{position,target});await pause(1200);
  await page.screenshot({path:`${dir}/${name}.png`});result.views.push({name,position,target});
 }
 await page.evaluate(()=>{const s=window.twin();s.controls.target.set(0,1.7,4);s.camera.position.set(0,1.7,8);s.controls.update();});
 await page.click('[data-explore-activate]');await page.waitForSelector('[data-explore-controller]');
 const start=await page.evaluate(()=>window.twin().camera.position.toArray());await page.keyboard.down('w');await pause(750);await page.keyboard.up('w');await pause(400);
 const end=await page.evaluate(()=>window.twin().camera.position.toArray());assert(end[2]<start[2]-.5);assert(Math.abs(end[1]-start[1])<.01);
 await page.screenshot({path:`${dir}/10-explore.png`});result.explore={start,end};await page.keyboard.press('Escape');
 result.performance=await page.evaluate(()=>new Promise(resolve=>{const times=[];let last=performance.now();function tick(t){times.push(t-last);last=t;if(times.length<180)requestAnimationFrame(tick);else{const s=window.twin();resolve({frames:times.length,averageFps:1000/(times.reduce((a,b)=>a+b,0)/times.length),drawCalls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles,geometries:s.gl.info.memory.geometries,textures:s.gl.info.memory.textures});}}requestAnimationFrame(tick);}));
 if(phase==='after'){
  const frame=async(position,target)=>{await page.waitForFunction(()=>window.twin().controls);await page.evaluate(({position,target})=>{const s=window.twin();s.controls.minDistance=.1;s.controls.maxPolarAngle=Math.PI;s.controls.target.set(...target);s.camera.position.set(...position);s.controls.update();},{position,target});await pause(900);};
  await frame([1.2,1.7,12.5],[3,1.8,5]);await page.screenshot({path:dir+'/11-arrival-from-preserved-detour.png'});
  await frame([1.6,1.55,4.2],[1,1.35,2.83]);
  const pixel=await page.evaluate(()=>{const s=window.twin();const p=s.camera.position.clone().set(1,1.35,2.856).project(s.camera);return {x:(p.x+1)*720,y:(1-p.y)*500};});
  await page.mouse.click(pixel.x,pixel.y);await pause(500);
  const active=await page.$eval('[data-system-control-board="Elevators"] [role="tab"][aria-selected="true"]',e=>e.textContent);assert.equal(active,'Lift 02');result.canonicalControl={ref:'LUNA-LIFT-PASS-02',selectedThroughRealPointer:true};await page.screenshot({path:dir+'/12-canonical-lift-card.png'});
  await frame([-15,1.7,-5.1],[-20,1.7,-5.1]);
  await page.click('[data-explore-activate]');await page.waitForSelector('[data-explore-controller]');
  await page.keyboard.down('w');await pause(1600);await page.keyboard.up('w');await pause(350);
  const stop=await page.evaluate(()=>window.twin().camera.position.toArray());assert(stop[0]>-16.31&&stop[0]<-15.3,'existing collision API must stop at sofa, not pass through');assert(Math.abs(stop[1]-1.7)<.01);result.furnitureStop=stop;
  await page.screenshot({path:dir+'/13-explore-furniture-clearance.png'});await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);result.passed=true;
}catch(e){result.passed=false;result.error=e.stack;console.error(e);process.exitCode=1;await page.screenshot({path:dir+'/failure.png'});}
finally{writeFileSync(dir+'/result.json',JSON.stringify(result,null,2));await browser.close();}
