import puppeteer from 'puppeteer-core';import assert from 'node:assert/strict';import{mkdirSync,writeFileSync}from'node:fs';
const dir='artifacts/l01-interior-v1/journey';mkdirSync(dir,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
const result={errors:[],manual:[]};page.on('pageerror',e=>result.errors.push(e.message));const pause=ms=>new Promise(r=>setTimeout(r,ms));
const ask=async text=>{const s='input[aria-label="Ask Oyi about the building"]';await page.click(s,{clickCount:3});await page.keyboard.press('Backspace');await page.type(s,text);await page.keyboard.press('Enter')};
async function walk(key,axis,value,sign){const start=await page.evaluate(()=>window.twin().camera.position.toArray());await page.keyboard.down(key);try{await page.waitForFunction(({axis,value,sign})=>sign*(window.twin().camera.position[axis]-value)>=0,{timeout:22000,polling:'raf'},{axis,value,sign})}finally{await page.keyboard.up(key)}await pause(450);const end=await page.evaluate(()=>window.twin().camera.position.toArray());assert(Math.abs(end[1]-start[1])<.001);result.manual.push({key,start,end});}
try{
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle0'});await page.evaluate(async()=>{const u=performance.getEntriesByType('resource').map(r=>r.name).find(u=>u.includes('@react-three_fiber'));const f=await import(u);window.twin=()=>f._roots.get(document.querySelector('canvas')).store.getState()});
 await ask('Take me to the lobby');await page.waitForFunction(()=>Math.abs(window.twin().camera.position.z-8)<.06&&window.twin().controls,{timeout:45000});
 await ask('Take me to Level 1');await page.waitForFunction(()=>Math.abs(window.twin().camera.position.y-6.65)<.1&&window.twin().controls,{timeout:90000});await pause(1800);
 result.liftArrival=await page.evaluate(()=>window.twin().camera.position.toArray());
 // Orientation only at the actual lift-route arrival. All following positions
 // are driven by real Explore keyboard input, never assigned camera positions.
 await page.evaluate(()=>{const s=window.twin();s.controls.minDistance=.1;s.controls.maxPolarAngle=Math.PI;s.controls.target.copy(s.camera.position).add({x:0,y:0,z:-4});s.controls.update()});
 await page.click('[data-explore-activate]');await page.waitForSelector('[data-explore-controller]');
 await walk('d','x',14.35,1);await walk('w','z',2.95,-1);
 result.lounge=await page.evaluate(()=>({position:window.twin().camera.position.toArray(),text:document.body.innerText,livePosition:document.documentElement.getAttribute('data-oyi-explore-position')}));assert.match(result.lounge.text,/Lounge/);assert(result.lounge.livePosition);
 await page.screenshot({path:dir+'/08-explore-lift-to-lounge.png'});
 await walk('s','z',5.03,1);await walk('a','x',-14.35,-1);await walk('w','z',2.95,-1);
 result.pool=await page.evaluate(()=>({position:window.twin().camera.position.toArray(),text:document.body.innerText,livePosition:document.documentElement.getAttribute('data-oyi-explore-position')}));assert.match(result.pool.text,/Pool/);assert(result.pool.livePosition);await page.screenshot({path:dir+'/09-explore-lounge-to-pool.png'});
 await page.keyboard.down('w');await pause(2600);await page.keyboard.up('w');await pause(450);
 result.poolStop=await page.evaluate(()=>window.twin().camera.position.toArray());assert(result.poolStop[2]>-.15&&result.poolStop[2]<.5,'manual movement stops before visual-study edge');await page.screenshot({path:dir+'/11-pool-study-stop.png'});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>window.twin().controls);
 // Existing route graph, not a substitute teleport: return via its room door.
 await ask('Take me to the amenity lounge');await page.waitForFunction(()=>Math.abs(window.twin().camera.position.x-14.5)<.08&&Math.abs(window.twin().camera.position.z-2.8)<.08&&window.twin().controls,{timeout:45000});
 result.canonicalTour=true;
 // Close pointer proof of the existing canonical context control; camera setup
 // is only for this detail shot, separate from the unbroken manual journey.
 await page.evaluate(()=>{const s=window.twin();s.camera.position.set(1.6,6.55,4.2);s.controls.target.set(1,6.35,2.83);s.controls.minDistance=.1;s.controls.update()});await pause(500);
 const pixel=await page.evaluate(()=>{const s=window.twin(),p=s.camera.position.clone().set(1,6.35,2.856).project(s.camera);return{x:(p.x+1)*720,y:(1-p.y)*500}});await page.mouse.click(pixel.x,pixel.y);await pause(500);
 assert.equal(await page.$eval('[data-system-control-board="Elevators"] [role="tab"][aria-selected="true"]',e=>e.textContent),'Lift 02');result.control={canonicalRef:'LUNA-LIFT-PASS-02',realPointer:true};await page.screenshot({path:dir+'/12-l01-canonical-lift-control.png'});
 assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.passed=false;result.error=e.stack;console.error(e);process.exitCode=1;await page.screenshot({path:dir+'/failure.png'})}
finally{writeFileSync(dir+'/result.json',JSON.stringify(result,null,2));await browser.close()}
