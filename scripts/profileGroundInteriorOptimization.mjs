import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const phase=process.argv.includes('--after')?'after':'before';
const dir=`artifacts/ground-interior-optimization/${phase}`;mkdirSync(dir,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const pause=ms=>new Promise(r=>setTimeout(r,ms));const result={phase,errors,condition:{viewport:[1440,1000],fov:64,frames:180},stationary:[],movement:[],profile:[]};
try{
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{const u=performance.getEntriesByType('resource').map(r=>r.name).find(u=>u.includes('@react-three_fiber'));const f=await import(u);window.twin=()=>f._roots.get(document.querySelector('canvas')).store.getState();});
 await page.type('input[aria-label="Ask Oyi about the building"]','Take me to the lobby');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>Math.abs(window.twin().camera.position.z-8)<.06&&Math.abs(window.twin().camera.position.y-1.7)<.02&&window.twin().controls,{timeout:45000});
 const frame=async(position,target)=>{await page.evaluate(({position,target})=>{const s=window.twin();s.controls.minDistance=.1;s.controls.maxPolarAngle=Math.PI;s.camera.fov=64;s.camera.updateProjectionMatrix();s.camera.position.set(...position);s.controls.target.set(...target);s.controls.update();},{position,target});await pause(1200);};
 const views=[['01-grand-arrival',[0,1.7,15.4],[2.5,1.9,5]],['02-reception-to-gallery',[3.4,1.7,8.8],[.5,1.6,2.5]],['03-residents-lounge',[-15,1.7,2.4],[-17,1.2,-3.4]],['04-passenger-gallery',[.2,1.7,6.4],[0,1.55,1.4]],['05-reverse-arrival',[0,1.7,7.5],[0,2,16.5]]];
 for(const [name,p,t]of views){await frame(p,t);await page.screenshot({path:`${dir}/${name}.png`});}
 await frame([0,1.7,6.485339841934729],[0,1.7,2.485339841934729]);
 await page.evaluate(()=>{window.sample=()=>new Promise(resolve=>{const frames=[];let last=performance.now();function tick(t){frames.push(t-last);last=t;if(frames.length<180)requestAnimationFrame(tick);else{const s=window.twin();resolve({fps:1000/(frames.reduce((a,b)=>a+b)/frames.length),drawCalls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles,textures:s.gl.info.memory.textures,geometries:s.gl.info.memory.geometries,programs:s.gl.info.programs.length,jsHeap:performance.memory?.usedJSHeapSize});}}requestAnimationFrame(tick);});});
 result.inventory=await page.evaluate(()=>{const s=window.twin(),g=s.scene.getObjectByName('ground-interior-gold-standard'),meshes=[],materials=new Map(),textures=new Map(),lights=[];let sceneObjects=0;const geometryIds=new Set();let bytes=0;s.scene.traverse(()=>sceneObjects++);g.traverse(o=>{if(o.isLight)lights.push({name:o.name,type:o.type,castShadow:o.castShadow,intensity:o.intensity});if(!o.isMesh)return;const geo=o.geometry;meshes.push({name:o.name,triangles:(geo.index?.count??geo.attributes.position.count)/3,castShadow:o.castShadow,receiveShadow:o.receiveShadow,matrixAutoUpdate:o.matrixAutoUpdate,worldAutoUpdate:o.matrixWorldAutoUpdate});if(!geometryIds.has(geo.uuid)){geometryIds.add(geo.uuid);for(const a of Object.values(geo.attributes))bytes+=a.array.byteLength;if(geo.index)bytes+=geo.index.array.byteLength;}for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.set(m.uuid,{type:m.type,transparent:m.transparent,side:m.side,slots:Object.keys(m).filter(k=>m[k]?.isTexture)});for(const v of Object.values(m))if(v?.isTexture)textures.set(v.uuid,{width:v.image?.width,height:v.image?.height,source:v.image?.src??'local canvas/data'});}});const gl=s.gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {meshes,materials:[...materials.values()],textures:[...textures.values()],lights,geometryBytes:bytes,sceneObjects,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),sceneShadowCasters:(()=>{let n=0;s.scene.traverse(o=>{if(o.isMesh&&o.castShadow)n++});return n})()};});
 for(let i=0;i<3;i++){await pause(800);result.stationary.push(await page.evaluate(()=>window.sample()));}
 if(process.argv.includes('--profile')){
  for(const mode of ['foliage','soft-contact','ground-shadows','ground-lights','furniture-batches','all-ground-detail']){
   await page.evaluate(mode=>{const g=window.twin().scene.getObjectByName('ground-interior-gold-standard');window.restore=[];g.traverse(o=>{if((mode==='foliage'&&o.name==='ground-finish-foliage')||(mode==='soft-contact'&&o.name==='ground-finish-shadow')||(mode==='ground-lights'&&o.isLight)||(mode==='furniture-batches'&&['ground-finish-cream','ground-finish-olive','ground-finish-darkStone','ground-finish-rug'].includes(o.name))||(mode==='all-ground-detail'&&o===g)){window.restore.push([o,'visible',o.visible]);o.visible=false;}if(mode==='ground-shadows'&&o.isMesh&&o.castShadow){window.restore.push([o,'castShadow',true]);o.castShadow=false;}});},mode);
   await pause(1200);result.profile.push({disabled:mode,...await page.evaluate(()=>window.sample())});
   await page.evaluate(()=>window.restore.forEach(([o,key,value])=>{o[key]=value;}));await pause(800);
  }
 }
 for(let i=0;i<3;i++){
  await frame([0,1.7,8],[0,1.7,4]);await page.click('[data-explore-activate]');await page.waitForSelector('[data-explore-controller]');
  const move=await page.evaluate(()=>new Promise(resolve=>{const times=[],positions=[];let last=performance.now(),n=0,key='w';const event=(type,k)=>window.dispatchEvent(new KeyboardEvent(type,{key:k,code:k==='w'?'KeyW':'KeyS',bubbles:true}));event('keydown',key);function tick(t){times.push(t-last);last=t;positions.push(window.twin().camera.position.toArray());n++;if(n%45===0){event('keyup',key);key=key==='w'?'s':'w';if(n<180)event('keydown',key);}if(n<180)requestAnimationFrame(tick);else resolve({fps:1000/(times.reduce((a,b)=>a+b)/180),positions});}requestAnimationFrame(tick);}));
  assert(Math.max(...move.positions.map(p=>p[2]))-Math.min(...move.positions.map(p=>p[2]))>.5,'real manual movement');assert(move.positions.every(p=>Math.abs(p[1]-1.7)<.02));result.movement.push(move);await page.keyboard.press('Escape');await page.waitForFunction(()=>window.twin().controls);
 }
 assert.deepEqual(errors,[]);result.passed=true;
}catch(e){result.passed=false;result.error=e.stack;console.error(e);process.exitCode=1;}
finally{writeFileSync(`${dir}/profile.json`,JSON.stringify(result,null,2));await browser.close();}
