import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='artifacts/ground-l01-v1/openings';mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
const errors=[];page.on('pageerror',e=>errors.push(e.message));const result={errors};
try {
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{
  const urls=performance.getEntriesByType('resource').map(r=>r.name);
  const f=await import(urls.find(u=>u.includes('@react-three_fiber')));
  const p=await import(urls.find(u=>u.includes('lunaSimulationProvider')));
  const {identityForScope}=await import('/src/luna/intelligence/lunaScope.ts');
  window.twin=()=>f._roots.get(document.querySelector('canvas')).store.getState();window.provider=p.lunaSimulationProvider;window.actor=identityForScope('facility');
  window.refs=['LUNA-LIFT-PASS-01','LUNA-LIFT-PASS-02','LUNA-LIFT-PASS-03','LUNA-LIFT-SERVICE-01'];
  // Read actual generated triangles, ignoring material visibility/clipping. A faded
  // or clipped obstructing slab cannot pass this geometric test.
  window.layers=['ground-procedural-envelope','l01-coordinated-envelope','LUNA-STRUCT-L01-AMENITIES-SLAB-01','LUNA-STRUCT-L01-TRANSFER-01'];
  const s=window.twin();s.scene.updateMatrixWorld(true);const V=s.camera.position.constructor;
  window.boxOf=o=>{let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];o.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new V().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).toArray();for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],v[a]);hi[a]=Math.max(hi[a],v[a]);}}});return {lo,hi};};
  window.faces=[];
  for(const name of window.layers){const m=s.scene.getObjectByName(name);if(!m)throw Error('Missing layer '+name);const p=m.geometry.attributes.position,ind=m.geometry.index;const n=ind?ind.count:p.count;
   for(let i=0;i<n;i+=3){const v=[0,1,2].map(k=>new V().fromBufferAttribute(p,ind?ind.getX(i+k):i+k).applyMatrix4(m.matrixWorld).toArray());
    if(Math.max(...v.map(a=>a[1]))-Math.min(...v.map(a=>a[1]))>1e-6)continue;
    window.faces.push({name,y:v[0][1],minX:Math.min(...v.map(a=>a[0])),maxX:Math.max(...v.map(a=>a[0])),minZ:Math.min(...v.map(a=>a[2])),maxZ:Math.max(...v.map(a=>a[2]))});
   }
  }
  window.collisions=(b)=>window.faces.filter(f=>f.y>b.lo[1]+1e-6&&f.y<b.hi[1]-1e-6&&f.maxX>b.lo[0]+1e-6&&f.minX<b.hi[0]-1e-6&&f.maxZ>b.lo[2]+1e-6&&f.minZ<b.hi[2]-1e-6).map(f=>f.name);
  window.samples=[];window.sample=()=>{const s=window.twin();s.scene.updateMatrixWorld(true);for(const ref of window.refs){const car=s.scene.getObjectByName(ref+'::car'),state=window.provider.getState(ref).state,b=window.boxOf(car);window.samples.push({ref,y:state.positionY,meshY:car.getWorldPosition(new V()).y,doors:state.doorState,collisions:[...new Set(window.collisions(b))],landingCollisions:[...new Set(window.collisions(window.boxOf(s.scene.getObjectByName(ref+'::landing-LUNA-L01-AMENITIES'))))]});}};
  window.sampleTimer=setInterval(window.sample,50);
 });
 for(const floor of ['LUNA-L01-AMENITIES','LUNA-GROUND']) {
  const commands=await page.evaluate(async floor=>Promise.all(window.refs.map(assetRef=>window.provider.execute({assetRef,command:'setPosition',args:{floor},actor:window.actor}))),floor);
  assert(commands.every(c=>c.ok),JSON.stringify(commands));
  await page.waitForFunction(floor=>window.refs.every(ref=>{const s=window.provider.getState(ref).state;return s.currentFloor===floor&&s.motionState==='IDLE'&&s.doorState==='OPEN';}),{timeout:30000},floor);
 }
 result.motion=await page.evaluate(()=>{clearInterval(window.sampleTimer);window.sample();return window.samples;});
 assert(result.motion.every(s=>s.collisions.length===0&&s.landingCollisions.length===0),'Moving car intersects corrected solid slab cells');
 for(const ref of ['LUNA-LIFT-PASS-01','LUNA-LIFT-PASS-02','LUNA-LIFT-PASS-03','LUNA-LIFT-SERVICE-01']){const a=result.motion.filter(s=>s.ref===ref);assert(a.some(s=>s.y>1&&s.y<4),'real intermediate travel '+ref);assert(a.some(s=>Math.abs(s.y-5)<.01&&s.doors==='OPEN'));assert(Math.abs(a.at(-1).y)<.01);assert(a.every(s=>Math.abs(s.y-s.meshY)<.3),'runtime/mesh coupling');}
 result.landing=await page.evaluate(()=>window.refs.map(ref=>{const scene=window.twin().scene;const doors=window.boxOf(scene.getObjectByName(ref+'::landing-LUNA-L01-AMENITIES'));const threshold=window.boxOf(scene.getObjectByName(ref+'::threshold-LUNA-L01-AMENITIES'));return {ref,doors,doorCollisions:window.collisions(doors),threshold,thresholdTop:threshold.hi[1]};}));
 for(const d of result.landing){assert.equal(d.doorCollisions.length,0);assert(Math.abs(d.thresholdTop-5)<1e-5);assert(Math.abs(d.doors.lo[1]-5)<1e-5);}
 // Inspect the entire authorized opening, including the car's clearance margin.
 result.openingRays=await page.evaluate(async()=>{
  const {PODIUM_SLAB_OPENINGS}=await import('/src/luna/architecture/podiumSlabOpenings.ts');
  return PODIUM_SLAB_OPENINGS.map(h=>{const b={lo:[h.x-h.width/2+1e-5,4.64,h.z-h.depth/2+1e-5],hi:[h.x+h.width/2-1e-5,8.51,h.z+h.depth/2-1e-5]};return {ref:h.canonicalRef,hits:[...new Set(window.collisions(b))]};});
 });assert(result.openingRays.every(r=>!r.hits.length),JSON.stringify(result.openingRays));
 // Park via the real provider at L01 for the diagnostic: car floors must remain
 // aligned with the corrected slab top, not test-positioned geometry.
 await page.evaluate(async()=>Promise.all(window.refs.map(assetRef=>window.provider.execute({assetRef,command:'setPosition',args:{floor:'LUNA-L01-AMENITIES'},actor:window.actor}))));
 await page.waitForFunction(()=>window.refs.every(ref=>window.provider.getState(ref).state.currentFloor==='LUNA-L01-AMENITIES'&&window.provider.getState(ref).state.doorState==='OPEN'),{timeout:30000});
 // Real scene triangle snapshot; test-only diagnostic material, no source edits.
 await page.evaluate(()=>{
  const s=window.twin(),scene=s.scene.clone(false);scene.background=null;scene.environment=s.scene.environment;
  const names=['LUNA-STRUCT-L01-AMENITIES-SLAB-01','LUNA-STRUCT-L01-TRANSFER-01'];
  for(const [i,name]of names.entries()){const o=s.scene.getObjectByName(name),c=o.clone(false);o.matrixWorld.decompose(c.position,c.quaternion,c.scale);c.visible=true;const m=o.material.clone();m.opacity=1;m.transparent=false;m.clippingPlanes=[];m.color.set(i?'#a58ac0':'#64bcaf');m.emissive.copy(m.color);m.emissiveIntensity=.6;c.material=m;scene.add(c);}
  for(const ref of window.refs){const o=s.scene.getObjectByName(ref+'::car'),c=o.clone(true);o.matrixWorld.decompose(c.position,c.quaternion,c.scale);c.visible=true;c.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.emissive?.copy(m.material.color);m.material.emissiveIntensity=.4;}});scene.add(c);}
  const renderer=new s.gl.constructor({antialias:true});renderer.setSize(1440,1000);renderer.setClearColor('#15212c');const camera=s.camera.clone();camera.position.set(29,24,28);camera.lookAt(0,4,2);camera.fov=55;camera.updateProjectionMatrix();renderer.render(scene,camera);window.openingDebug={renderer,scene,camera};
  Object.assign(renderer.domElement.style,{position:'fixed',inset:0,zIndex:9998});document.body.append(renderer.domElement);
  const legend=document.createElement('div');legend.textContent='EXISTING CORE OPENINGS ONLY · L01 slab (green) / L01 transfer (purple) · actual mesh geometry · no atrium · stairs remain PARTIAL';Object.assign(legend.style,{position:'fixed',bottom:'20px',left:'20px',padding:'16px',color:'white',background:'#101820',zIndex:9999,font:'16px sans-serif'});document.body.append(legend);
 });await page.screenshot({path:out+'/actual-openings.png'});
 await page.evaluate(()=>{const {renderer,scene,camera}=window.openingDebug;camera.position.set(14,7.3,20);camera.lookAt(1,6,0);renderer.render(scene,camera);});await page.screenshot({path:out+'/cars-at-l01.png'});
 assert.deepEqual(errors,[]);result.passed=true;
 result.scope='Ground→L01→Ground, all four real provider-driven cars; corrected layers only. No claim of whole-building shaft clearance or continuous stair egress.';
 result.thresholdNote='Static threshold top is flush at datum5; existing bearing extension into slab is retained, not misclassified as moving-car collision.';
}catch(e){result.passed=false;result.error=e.stack;console.error(e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'});}
finally{writeFileSync(out+'/browser.json',JSON.stringify(result,null,2));await browser.close();}
