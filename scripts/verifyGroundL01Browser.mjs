import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir='artifacts/ground-l01-v1/browser';mkdirSync(dir,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const results={errors,views:[],journeys:[]};
async function shot(name){results.views.push(await page.evaluate(name=>({name,position:window.twin().camera.position.toArray(),target:window.twin().controls?.target.toArray()}),name));await page.screenshot({path:`${dir}/${name}.png`});console.log(name);}
async function bind(){await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('@react-three_fiber'));const f=await import(url);window.twin=()=>f._roots.get(document.querySelector('canvas')).store.getState();});await page.waitForFunction(()=>window.twin().controls);}
async function frame(position,target){await page.waitForFunction(()=>window.twin().controls);await page.evaluate(({position,target})=>{const s=window.twin();s.controls.maxPolarAngle=Math.PI;s.controls.minDistance=.1;s.controls.target.set(...target);s.camera.position.set(...position);s.camera.fov=65;s.camera.updateProjectionMatrix();s.controls.update();},{position,target});await pause(900);}
async function ask(text){const sel='input[aria-label="Ask Oyi about the building"]';await page.click(sel,{clickCount:3});await page.keyboard.press('Backspace');await page.type(sel,text);await page.keyboard.press('Enter');await pause(250);}
async function waitPosition(test,timeout=45000){await page.waitForFunction(test,{timeout});await pause(400);}
try{
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle0'});await bind();assert.equal(await page.$('vite-error-overlay'),null);
 await frame([0,1.7,23],[0,1.7,16]);await shot('01-exterior-entrance');
 // Real canonical transition; observe intermediate camera points, not only DOM arrival.
 await page.evaluate(()=>{window.samples=[];window.sampleTimer=setInterval(()=>window.samples.push(window.twin().camera.position.toArray()),70);});
 await ask('Take me to the lobby');
 await waitPosition(()=>Math.abs(window.twin().camera.position.z-8)<.08 && Math.abs(window.twin().camera.position.y-1.7)<.08);
 const entry=await page.evaluate(()=>{clearInterval(window.sampleTimer);return window.samples;});
 assert(entry.some(p=>p[2]>16&&p[2]<21),'entrance approach must move physically');
 assert(entry.some(p=>p[0]>.8&&p[2]>12.5&&p[2]<15.5),'must take the real column detour');
 assert(entry.every(p=>!(Math.abs(p[0])<.47&&Math.abs(p[2]-14)<.47)),'camera must not traverse retained column');
 results.entranceCameraSamples=entry;
 assert(entry.every(p=>Math.abs(p[1]-1.7)<.02),'waypoint settlement must retain walking eye height');
 assert(entry.slice(1).every((p,i)=>Math.hypot(...p.map((v,j)=>v-entry[i][j]))<2),'no building-scale OrbitControls pullback between walking waypoints');
 results.journeys.push({name:'Entrance physical traversal',samples:entry});await shot('02-crossed-entrance');
 await ask('Take me to the waiting lounge');
 await waitPosition(()=>Math.abs(window.twin().camera.position.x+15)<.08&&Math.abs(window.twin().camera.position.z)<.08);
 results.journeys.push({name:'Ground arrival to Waiting Lounge: real common passage'});
 await ask('Take me to reception');
 await waitPosition(()=>Math.abs(window.twin().camera.position.x+4)<.08&&Math.abs(window.twin().camera.position.z-5)<.08);
 results.journeys.push({name:'Waiting Lounge to Reception: real connected passages'});
 await ask('Take me to the lobby');
 await waitPosition(()=>Math.abs(window.twin().camera.position.x)<.08&&Math.abs(window.twin().camera.position.z-8)<.08);
 await frame([0,1.7,8],[0,2.1,3]);await shot('03-grand-arrival');
 await frame([-5,1.7,8],[2,2.1,4]);await shot('04-reception-zone');
 await frame([-18.5,1.7,-5.5],[-14,1.7,2]);await shot('05-waiting-lounge');
 await frame([0,1.7,6],[0,1.7,1.43]);await shot('06-passenger-lift-approach');
 await frame([-4.5,1.7,2.95],[3,1.6,1.43]);await shot('07-lift-gallery');
 await frame([0,1.7,10],[0,4.2,6]);await shot('08-ground-ceiling');
 // Source-derived named ceiling geometry is measured in the live renderer.
 results.ceilings=await page.evaluate(()=>{const s=window.twin();return [...['LUNA-GROUND-LOBBY-RECEPTION','LUNA-GROUND-LOBBY-LOUNGE','LUNA-GROUND-LOBBY-LIFTS'].map(ref=>{const g=s.scene.getObjectByName('ceiling-'+ref),m=g.children[0];m.geometry.computeBoundingBox();return {ref,underside:m.localToWorld(m.geometry.boundingBox.min.clone()).y};})];});
 assert.deepEqual(results.ceilings.map(c=>Math.round(c.underside*100)/100),[4.2,3.6,2.95]);
 // Reset to the route's actual current-space anchor before the next real journey.
 await frame([0,1.7,8],[0,1.7,5]);
 await ask('Take me to Level 1');
 await waitPosition(()=>Math.abs(window.twin().camera.position.y-6.65)<.15,90000);
 await pause(1800);await shot('09-l01-lift-arrival');
 results.journeys.push({name:'Ground to L01 via existing lift runtime',position:await page.evaluate(()=>window.twin().camera.position.toArray())});
 await ask('Take me to the amenity lounge');
 await waitPosition(()=>Math.abs(window.twin().camera.position.x-14.5)<.08&&Math.abs(window.twin().camera.position.z-2.8)<.08);
 results.journeys.push({name:'L01 lift gallery to Lounge: real doorway passage'});
 await ask('Take me to the amenity pool');
 await waitPosition(()=>Math.abs(window.twin().camera.position.x+14.5)<.08&&Math.abs(window.twin().camera.position.z-2.8)<.08);
 results.journeys.push({name:'L01 Lounge to Pool zone: doorway → common corridor → doorway'});
 await frame([0,6.7,5.2],[0,6.5,1.43]);await shot('10-l01-gallery');
 await frame([14.5,6.7,2.8],[14.5,6.7,-6]);await shot('11-l01-lounge');
 await frame([-14.5,6.7,2.8],[-14.5,6.7,-6]);await shot('12-l01-pool-reserved-zone');
 await frame([-11.5,6.7,4.8],[-14,6.7,6.25]);await shot('13-l01-egress-approach');
 // Manual movement through the real L01 wall opening. Setup camera only;
 // keyboard movement drives all subsequent positions and current-space changes.
 await frame([-14.5,6.7,5.2],[-14.5,6.7,0]);
 await page.click('[data-explore-activate]');await page.waitForSelector('[data-explore-controller]');
 await page.keyboard.down('KeyW');await pause(1450);await page.keyboard.up('KeyW');await pause(500);
 const manual=await page.evaluate(()=>({position:window.twin().camera.position.toArray(),text:document.body.innerText}));
 assert(manual.position[2]<3.6,'manual walk must cross the north door opening');assert(Math.abs(manual.position[1]-6.7)<.02,'manual walk is planar');assert.match(manual.text,/Pool/);
 results.journeys.push({name:'L01 manual door crossing',position:manual.position});await shot('14-l01-manual-pool-arrival');await page.keyboard.press('Escape');
 // Section/debug proof from actual scene boxes, not an invented architectural drawing.
 results.section=await page.evaluate(()=>{
  const s=window.twin();s.scene.updateMatrixWorld(true);
  return ['LUNA-STRUCT-GROUND-SLAB-01','LUNA-STRUCT-L01-AMENITIES-SLAB-01','LUNA-STRUCT-L01-TRANSFER-01'].map(ref=>{const o=s.scene.getObjectByName(ref);o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;return {ref,min:o.localToWorld(b.min.clone()).toArray(),max:o.localToWorld(b.max.clone()).toArray()};});
 });
 assert(Math.abs(results.section[0].max[1])<1e-5);assert(Math.abs(results.section[1].max[1]-5)<1e-5);assert(Math.abs(results.section[2].min[1]-7.9)<1e-5);
 await page.evaluate(()=>[...document.querySelectorAll('.luna-rail button')].find(b=>b.textContent.trim()==='View').click());
 await page.evaluate(()=>[...document.querySelectorAll('[data-view-tray] button')].find(b=>b.textContent.startsWith('Cutaway')).click());
 await page.mouse.click(1350,150);
 await frame([28,10,22],[0,4,0]);await shot('15-section-debug');
 // Snapshot actual mesh geometry/world matrices into a diagnostic-only renderer.
 // Detached clones prevent live visibility/fade hooks from hiding the measured layers.
 await frame([42,13,35],[0,3.9,0]);
 await page.evaluate(()=>{
  const s=window.twin();s.scene.updateMatrixWorld(true);
  const debug=s.scene.clone(false);debug.background=null;debug.environment=s.scene.environment;
  const refs=['LUNA-STRUCT-GROUND-SLAB-01','LUNA-STRUCT-L01-AMENITIES-SLAB-01','LUNA-STRUCT-L01-TRANSFER-01'];
  s.scene.traverse(o=>{
   if(!o.isMesh)return;
   let ceiling=false;for(let p=o.parent;p;p=p.parent)if(p.name?.startsWith('ceiling-LUNA-GROUND'))ceiling=true;
   const index=refs.indexOf(o.name);if(index<0&&!ceiling)return;
   const copy=o.clone(false);o.matrixWorld.decompose(copy.position,copy.quaternion,copy.scale);copy.visible=true;copy.layers.set(0);
   const old=Array.isArray(o.material)?o.material[0]:o.material;const m=old.clone();m.transparent=false;m.opacity=1;m.clippingPlanes=[];m.depthWrite=true;
   const color=ceiling?'#edb965':['#708daa','#50bca5','#ae89c9'][index];m.color?.set(color);m.emissive?.set(color);m.emissiveIntensity=.65;copy.material=m;debug.add(copy);
  });
  const renderer=new s.gl.constructor({antialias:true});renderer.setSize(1440,1000);renderer.setClearColor('#17212c');
  Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',zIndex:'9998'});document.body.append(renderer.domElement);
  const camera=s.camera.clone();camera.layers.set(0);renderer.render(debug,camera);
  const legend=document.createElement('div');legend.textContent='ACTUAL MESH LAYERS · blue: Ground slab top 0.00m · green: L01 slab top 5.00m · purple: transfer underside 7.90m · amber: Ground ceilings 2.95 / 3.60 / 4.20m. Diagnostic isolation; unchanged geometry.';
  Object.assign(legend.style,{position:'fixed',left:'20px',bottom:'20px',right:'20px',padding:'16px',background:'#101820',color:'white',zIndex:'9999',font:'14px sans-serif'});document.body.append(legend);
 });
 await shot('16-actual-layer-section');
 assert.deepEqual(errors,[]);
 results.passed=true;
}catch(e){results.passed=false;results.error=e.stack;await shot('failure');console.error(e);process.exitCode=1;}
finally{writeFileSync(`${dir}/result.json`,JSON.stringify(results,null,2));await browser.close();}
