import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createArchitectureServer } from './architectureFixtureServer.mjs';
import * as THREE from 'three';
import puppeteer from 'puppeteer-core';
const fixture = JSON.parse(await readFile('tests/architecture/fixture-manifest.json','utf8'));
const policyBytes=await readFile('src/luna/policy/lunaRepresentationPolicy.ts');
// Baseline bumped for True Floor Plan System V1 (L06 Gold Standard)'s
// disclosed, deliberate addition of the "unit" branch to
// resolveLevelRefFor() — a real bug fix (a private unit or common zone
// with no InteriorSpec, e.g. Apartment B/C/D or the new L06 Lift Lobby,
// used to crash this function); the guard now protects that new
// baseline going forward.
assert.equal(createHash('sha256').update(policyBytes).digest('hex'),'2a301cf10a6dbaaf9e9f81d49a8b852d308ae193837612cbfcca68e59fe19d7e','RepresentationPolicy must remain byte-for-byte unchanged');
const server=await createArchitectureServer();
let browser;
try {
 const api=await server.ssrLoadModule('/src/luna/architecture/groundAsset.ts');
 const {lunaRepresentationPolicy:policy}=await server.ssrLoadModule('/src/luna/policy/lunaRepresentationPolicy.ts');
 const {identityForScope}=await server.ssrLoadModule('/src/luna/intelligence/lunaScope.ts');
 for(const scope of ['facility','consumer'])api.admitGroundSource(fixture,policy,identityForScope(scope));
 let policyCalls=0;
 assert.throws(()=>api.admitGroundSource({...fixture,bindings:[{nodeName:'x',canonicalRef:'UNKNOWN',role:'envelope'}]}, {resolveMode(){policyCalls++;return 'FULL_3D';}},identityForScope('facility')));
 assert.equal(policyCalls,0);
 for(const mode of ['HIDDEN','OPERATIONAL_2D','CONTEXT_2D'])assert.throws(()=>api.admitGroundSource(fixture,{resolveMode:()=>mode},identityForScope('facility')));
 for(const change of [{ownerLevelRef:'LUNA-L06'},{coordinateFrame:'world-z-up'},{url:'https://example.com/model.glb'},{bindings:[...fixture.bindings,fixture.bindings[0]]}])assert.throws(()=>api.validateGroundSource({...fixture,...change}));
 const text=JSON.parse(await readFile('tests/architecture/assets/ground-fixture.gltf','utf8'));
 const encode=x=>new TextEncoder().encode(JSON.stringify(x)).buffer;
 api.inspectGroundPayload(encode(text),fixture);
 for(const edit of [j=>j.buffers[0].uri='https://example.com/private.bin',j=>j.nodes.push({mesh:0,name:'private'}),j=>j.extensionsUsed=['KHR_draco_mesh_compression'],j=>j.nodes[0].name='PRIVATE',j=>j.nodes[0].children=[0]]){
  const changed=structuredClone(text);edit(changed);assert.throws(()=>api.inspectGroundPayload(encode(changed),fixture));
 }
 const group=new THREE.Group();const shared=new THREE.MeshStandardMaterial({side:THREE.DoubleSide});
 for(const [i,b] of fixture.bindings.entries()){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(12,3),shared);mesh.name=b.nodeName;mesh.position.set(0,1.5,i? -18:18);group.add(mesh);}
 const bound=api.bindGroundScene(group,fixture);
 assert.notEqual(bound.meshes[0].material,bound.meshes[1].material);
 bound.meshes[0].material.opacity=.2;assert.equal(bound.meshes[1].material.opacity,1);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,1.5,30),new THREE.Vector3(0,0,-1));
 assert.ok(ray.intersectObject(group,true).length);
 bound.meshes.forEach(m=>m.material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,0,-1),0)]);
 assert.ok(ray.intersectObject(group,true).every(hit=>hit.point.z<=0));
 group.visible=false;assert.equal(ray.intersectObject(group,true).length,0);group.visible=true;
 let disposed=0;bound.meshes[0].geometry.addEventListener('dispose',()=>disposed++);bound.dispose();bound.dispose();assert.equal(disposed,1);
 const multi=new THREE.Group();
 const multiSource={...fixture,bindings:[fixture.bindings[0]]};
 const parts=new THREE.Group();parts.name=fixture.bindings[0].nodeName;multi.add(parts);
 for(let i=0;i<2;i++){const part=new THREE.Mesh(new THREE.BoxGeometry(),[new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial()]);part.position.set(i,1,0);parts.add(part);}
 const boundParts=api.bindGroundScene(multi,multiSource);assert.equal(boundParts.meshes.length,2);assert.ok(Array.isArray(boundParts.meshes[0].material));assert.notEqual(boundParts.meshes[0].material[0],boundParts.meshes[1].material[0]);boundParts.dispose();
 const oversized=structuredClone(text);const png=Buffer.from(oversized.images[0].uri.split(',')[1],'base64');png.writeUInt32BE(99999,16);oversized.images[0].uri='data:image/png;base64,'+png.toString('base64');assert.throws(()=>api.inspectGroundPayload(encode(oversized),fixture));
 const wrong=()=>{const g=new THREE.Group();fixture.bindings.forEach((b,i)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());mesh.name=b.nodeName;mesh.position.set(i,10,0);g.add(mesh);});return g;};
 const badFrame=wrong();assert.throws(()=>api.bindGroundScene(badFrame,fixture));api.disposeGroundScene(badFrame);
 await server.listen();
 browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage();await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});let requests=0;page.on('request',r=>{if(r.url().includes('/architectural-assets/'))requests++;});
 await page.goto('http://127.0.0.1:5184/tests/architecture/index.html',{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('@react-three_fiber'));const fiber=await import(url);window.twin=()=>fiber._roots.get(document.querySelector('canvas')).store.getState();const runtime=await import('/src/luna/runtime/lunaSimulationProvider.ts');window.runtime=runtime.lunaSimulationProvider;window.initialLight=JSON.stringify(window.runtime.getState('LUNA-L06-APT-A-LIVING-LIGHT-01'));window.initialRefs=window.runtime.listStates().map(s=>s.ref).sort().join(',');});
 const waitStatus=status=>page.waitForFunction(status=>window.twin().scene.getObjectByName('ground-architecture-status')?.userData.status===status,{timeout:30000},status);
 const snapshot=()=>page.evaluate(()=>{const {scene,camera}=window.twin();const imported=scene.getObjectByName('ground-imported-envelope');const status=scene.getObjectByName('ground-architecture-status');const parent=status.parent;return {status:status.userData.status,error:status.userData.error,imported:!!imported,parentUuid:parent.uuid,position:imported?.getWorldPosition(camera.position.clone()).toArray(),children:parent.children.length,camera:camera.position.toArray(),meshes:imported?.children[0].children.map(m=>({name:m.name,uuid:m.uuid,material:m.material.uuid,opacity:m.material.opacity,map:m.material.map?.colorSpace,clip:m.material.clippingPlanes?.length??0}))};});
 const pause=()=>new Promise(r=>setTimeout(r,500));
 const click=async(label,scope='body')=>{const h=await page.evaluateHandle(({label,scope})=>[...document.querySelector(scope).querySelectorAll('button')].find(e=>!e.closest('[inert]')&&(e.textContent.trim()===label||e.getAttribute('aria-label')===label)),{label,scope});assert.ok(h.asElement(),label);await h.asElement().click();await pause();};
 await waitStatus('procedural');const baseline=await snapshot();assert.equal(requests,0);
 await page.click('#import');await waitStatus('imported');const imported=await snapshot();assert.equal(imported.parentUuid,baseline.parentUuid);assert.deepEqual(imported.position,[0,0,0]);assert.equal(imported.meshes.length,2);assert.ok(imported.meshes.every(m=>m.map==='srgb'));assert.notEqual(imported.meshes[0].material,imported.meshes[1].material);
 // Synthetic front panel is in front of the preserved room geometry. Aim the
 // existing camera for an actual pointer hit, then let the App handle selection.
 await page.waitForFunction(()=>!!window.twin().controls,{timeout:60000});
 await page.evaluate(()=>{const s=window.twin();s.camera.position.set(0,2,55);s.controls.target.set(0,1.5,18);s.controls.update();});await pause();
 const point=await page.evaluate(()=>{const s=window.twin();const mesh=s.scene.getObjectByName('ground-imported-envelope').children[0].children[0];const p=mesh.position.clone().set(0,1.5,0);mesh.localToWorld(p);p.project(s.camera);const r=s.gl.domElement.getBoundingClientRect();return {x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};});
 await page.mouse.click(point.x,point.y);await pause();assert.ok(await page.$eval('.context-surface',e=>/Ground/.test(e.textContent)),'Imported pointer resolves Ground contextual card');
 await click('Architecture','.luna-rail');await click('Water','[data-engineering-tray]');await click('View','.luna-rail');await click('CutawayReveal building section','[data-view-tray]');
 assert.ok((await snapshot()).meshes.every(m=>m.clip===1));assert.equal(await page.$eval('[data-engineering-launcher]',e=>e.textContent.trim()),'Water');
 await click('ExplodeSeparate building levels','[data-view-tray]');await pause();assert.ok(Math.abs((await snapshot()).position[1]-3.5)<.1);
 await page.click('#rollback');await waitStatus('procedural');assert.equal((await snapshot()).parentUuid,baseline.parentUuid);
 await page.click('#import');await waitStatus('imported');assert.ok(Math.abs((await snapshot()).position[1]-3.5)<.1);assert.notEqual((await snapshot()).meshes[0].uuid,imported.meshes[0].uuid);
 await page.click('#bad');await waitStatus('failed');assert.equal((await snapshot()).imported,false);assert.match((await snapshot()).error,/checksum/);
 const beforeUnknown=requests;await page.click('#unknown');await waitStatus('rejected');assert.equal(requests,beforeUnknown);
 await page.click('#gltf');await waitStatus('imported');
 await click('View','.luna-rail');await click('NormalUnsectioned building','[data-view-tray]');await click('Close View','[data-view-tray]');
 await click('Water','.luna-rail');await click('Architecture','[data-engineering-tray]');await click('Close Engineering Layers','[data-engineering-tray]');
 await click('L06');await pause();assert.ok((await snapshot()).meshes.every(m=>m.opacity<.08));
 await click('G');await click('Enter Lobby');assert.ok(await page.$eval('.context-surface',e=>/Lobby/.test(e.textContent)));
 await page.type('input[aria-label="Ask Oyi about the building"]','Take me to Apartment 6A');await page.keyboard.press('Enter');await pause();assert.equal(await page.$$eval('.context-surface button',es=>es.filter(e=>e.textContent.startsWith('Enter')).length),0);
 // Existing host scope controls must still admit common Ground for Consumer.
 await click('Toggle sidebar');await click('More options','#luna-sidebar');await click('Development Mode','#luna-sidebar');
 await click('Consumer','.oyi-panel__scope');await waitStatus('imported');assert.equal((await snapshot()).parentUuid,baseline.parentUuid);
 await click('Facility','.oyi-panel__scope');await waitStatus('imported');await click('Presentation Mode');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.runtime.getState('LUNA-L06-APT-A-LIVING-LIGHT-01'))===window.initialLight),true);
 assert.equal(await page.evaluate(()=>window.runtime.listStates().map(s=>s.ref).sort().join(',')===window.initialRefs),true);
 // Cancel in-flight decode/fetch and ensure it cannot replace rollback.
 await page.click('#rollback');await waitStatus('procedural');
 await page.setRequestInterception(true);let pending;
 page.on('request',request=>{if(request.url().includes('/architectural-assets/'))pending=request;else request.continue();});
 await page.click('#import');await waitStatus('loading');await page.click('#rollback');await waitStatus('procedural');if(pending)await pending.continue().catch(()=>{});await pause();assert.equal((await snapshot()).imported,false);
 await page.screenshot({path:'artifacts/architecture-regression.png'});
 assert.deepEqual(errors,[]);
 const result={result:'PASS',policyHashUnchanged:true,unitChecks:'registry-before-policy, 2D/hidden denial, local paths, checksum, external dependency rejection, orphan/cyclic content rejection, coordinates, material isolation, clipped/hidden CPU picking, idempotent disposal',browserChecks:'real GLB/glTF load, canonical pointer selection, same level parent, floor-local origin, Water + Cutaway/Explode, rollback/re-import, failed checksum fallback, rejected binding without request, floor isolation, lobby/Oyi privacy, Consumer/Facility scope switching, runtime identity/state continuity, canceled request cannot mount',baseline,imported,requests,errors};
 await writeFile('artifacts/architecture-regression.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
} finally {await browser?.close();await server.close();}
