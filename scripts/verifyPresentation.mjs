import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage();
await page.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const pause=()=>new Promise(resolve=>setTimeout(resolve,400));
const click=async(text,scope="body")=>{ const handle=await page.evaluateHandle(({text,scope})=>[...document.querySelector(scope).querySelectorAll('button')].find(el=>!el.closest('[inert]')&&(el.textContent.trim()===text || el.getAttribute('aria-label')===text)),{text,scope});const el=handle.asElement();assert.ok(el,`Button ${text}`);await el.click();await pause();};
try {
await page.goto('http://127.0.0.1:5173',{waitUntil:'networkidle0'});
await page.waitForSelector('.sidebar-toggle');
const railX=()=>page.$eval('.luna-rail',el=>el.getBoundingClientRect().x);
const closedX=await railX();await click('Toggle sidebar');assert.equal(await railX()-closedX,240);
assert.ok(await page.$eval('#luna-sidebar',el=>el.textContent.includes('Ochiga Properties')));
await page.screenshot({path:'artifacts/sidebar.png'});await click('Toggle sidebar');assert.equal(await railX(),closedX);
const plans={};
for(const label of ['B1','G','L01','L02','L03','L04','L05','L06','L07','L08','L09','L10','L11','L12','PH','ROOF']){
 await click(label);const plan=await page.$('svg[aria-label$="operational floor plan"]');assert.ok(plan,`Plan ${label}`);
 plans[label]=await plan.$$eval('[role="button"]',els=>els.map(el=>el.getAttribute('aria-label')));assert.ok(plans[label].length);
 if(['B1','G','L01','PH','ROOF'].includes(label)){const region=await plan.$('[role="button"]');await region.click();await pause();assert.equal(await plan.$$eval('[aria-pressed="true"]',els=>els.length),1);if(label==='PH')assert.equal(await page.$$eval('.plan-enter',els=>els.length),0);await page.screenshot({path:`artifacts/plan-${label}.png`});}
}
await click('G');
const reception=await page.$('svg [aria-label="Reception · Modeled space"]');await reception.evaluate(el=>el.focus());await page.keyboard.press('Enter');await pause();assert.equal(await reception.evaluate(el=>el.getAttribute('aria-pressed')),'true');
await click('Enter Reception');assert.ok(await page.$eval('.context-surface',el=>el.textContent.includes('Reception')));
await click('L06');const apartment=await page.$('svg [aria-label="Apartment A · Occupied · Normal"]');await apartment.click();await pause();assert.ok(await page.$eval('.context-surface',el=>el.textContent.includes('Apartment A')));assert.equal(await page.$$eval('.context-surface button',els=>els.filter(el=>el.textContent.startsWith('Enter')).length),0);

// Read the actual R3F camera from the already-loaded dependency: no test scene,
// app hooks, or duplicate state. Event counters prove gestures reach the canvas.
await page.evaluate(async()=>{
 const url=performance.getEntriesByType('resource').map(r=>r.name).find(name=>name.includes('@react-three_fiber'));
 if(!url)throw new Error('R3F module URL unavailable');
 const fiber=await import(url);
 window.readTwin=()=>{const state=fiber._roots.get(document.querySelector('canvas'))?.store.getState();return {position:state?.camera.position.toArray(),quaternion:state?.camera.quaternion.toArray(),orbitReady:Boolean(state?.controls)};};
 window.canvasPointerDowns=0;document.querySelector('canvas').addEventListener('pointerdown',()=>window.canvasPointerDowns++);
});
const stable=()=>page.waitForFunction(()=>window.readTwin().orbitReady,{timeout:60000});
const camera=()=>page.evaluate(()=>window.readTwin());
const outside=async()=>{assert.equal(await page.evaluate(()=>document.elementFromPoint(1380,120)?.tagName),'CANVAS');await page.mouse.click(1380,120);await pause();};
const isOpen=selector=>page.$eval(selector,el=>el.getAttribute('aria-hidden')==='false');
const engineering='[data-engineering-tray]',view='[data-view-tray]';
await click('Architecture','.luna-rail');
const tray=await page.$(engineering);
const layout=await tray.evaluate(el=>{const cards=[...el.querySelectorAll('button[aria-pressed]')];const rects=cards.map(c=>c.getBoundingClientRect());return {ys:rects.map(r=>r.top),scroll:cards[0].parentElement.scrollWidth>cards[0].parentElement.clientWidth,height:el.getBoundingClientRect().height};});
assert.equal(new Set(layout.ys).size,1);assert.ok(layout.scroll);assert.ok(layout.height<230);
assert.equal(await tray.$$eval('button',els=>els.some(el=>/Cutaway|Explode/.test(el.textContent))),false);
const labels={};
for(const [label,icon] of [['Architecture','architecture'],['All Systems','all'],['Structure','structure'],['Electrical','electrical'],['Water','water'],['Drainage','drainage'],['Fire','fire'],['HVAC','hvac'],['Elevators','vertical-transport'],['Security','security'],['Access','access'],['Network / Edge','network-edge']]){
 await click(label,engineering);assert.ok(await isOpen(engineering),`${label} keeps tray open`);
 labels[label]=await page.$eval('[data-engineering-launcher]',el=>({label:el.textContent.trim(),icon:el.querySelector('[data-system-icon]').dataset.systemIcon,svg:el.querySelector('svg').innerHTML}));
 assert.equal(labels[label].label,label);assert.equal(labels[label].icon,icon);assert.ok(labels[label].svg);
 if(["Architecture","All Systems","Structure","Water","Drainage"].includes(label))await (await page.$("[data-engineering-launcher]")).screenshot({path:`artifacts/launcher-${icon}.png`});
}
assert.equal(new Set(Object.values(labels).map(value=>value.svg)).size,Object.keys(labels).length);
await click('Water',engineering);await stable();await pause();
await page.screenshot({path:'artifacts/engineering-open.png'});
const beforeTray=await camera();const eventsBefore=await page.evaluate(()=>window.canvasPointerDowns);
const rect=await tray.boundingBox();await page.mouse.move(rect.x+400,rect.y+18);await page.mouse.down();await page.mouse.move(rect.x+550,rect.y+20,{steps:10});await page.mouse.up();await pause();
assert.deepEqual(await camera(),beforeTray,'tray drag must not orbit');assert.equal(await page.evaluate(()=>window.canvasPointerDowns),eventsBefore);assert.ok(await isOpen(engineering));
await outside();assert.equal(await isOpen(engineering),false);
await click('Water','.luna-rail');await click('Close Engineering Layers',engineering);assert.equal(await isOpen(engineering),false);
await click('Toggle sidebar');await click('More options','#luna-sidebar');assert.equal(await page.$eval('.sidebar-toggle',el=>el.getAttribute('aria-expanded')),'true');await outside();assert.equal(await railX(),closedX);
await click('View','.luna-rail');assert.ok(await isOpen(view));
for(const label of ['Cutaway','Explode','Normal','Cutaway','Explode']){
 await click(label==='Normal'?'NormalUnsectioned building':label==='Cutaway'?'CutawayReveal building section':'ExplodeSeparate building levels',view);
 assert.ok(await isOpen(view));assert.equal(await page.$eval('[data-engineering-launcher]',el=>el.textContent.trim()),'Water');
 assert.equal(await page.$eval('[data-view-tray] [aria-pressed="true"]',(el,label)=>el.textContent.startsWith(label),label),true);
}
await page.screenshot({path:'artifacts/water-composed.png'});
await click('Water','.luna-rail');assert.equal(await isOpen(view),false);await click('Structure',engineering);await click('View','.luna-rail');
assert.ok(await page.$eval('[data-view-tray] [aria-pressed="true"]',el=>el.textContent.startsWith('Explode')));
await stable();await pause();const beforeView=await camera();const viewEvents=await page.evaluate(()=>window.canvasPointerDowns);const viewBox=await (await page.$(view)).boundingBox();await page.mouse.move(700,viewBox.y+14);await page.mouse.down();await page.mouse.move(850,viewBox.y+18,{steps:10});await page.mouse.up();await pause();assert.deepEqual(await camera(),beforeView);assert.equal(await page.evaluate(()=>window.canvasPointerDowns),viewEvents);
await outside();assert.equal(await isOpen(view),false);
const beforeOrbit=await camera();await page.mouse.move(1380,120);await page.mouse.down();await page.mouse.move(1170,240,{steps:15});await page.mouse.up();await pause();const afterOrbit=await camera();assert.notDeepEqual(afterOrbit.position,beforeOrbit.position,'outside drag must orbit');
await click('View','.luna-rail');await click('NormalUnsectioned building',view);await click('Close View',view);assert.equal(await isOpen(view),false);
await click('Structure','.luna-rail');await click('Architecture',engineering);await outside();
await click('G');await click('Enter Lobby');await page.screenshot({path:'artifacts/lobby.png'});
await page.type('input[aria-label="Ask Oyi about the building"]','Take me to Apartment 6A');await page.keyboard.press('Enter');await pause();
assert.equal(await page.$eval('.context-surface',el=>el.textContent.includes('Interior')),false);
assert.equal(await page.$$eval('.context-surface button',els=>els.filter(el=>el.textContent.startsWith('Enter')).length),0);
await page.type('input[aria-label="Ask Oyi about the building"]','Take me to Luna Sky');await page.keyboard.press('Enter');await pause();assert.ok(await page.$eval('.context-surface',el=>el.textContent.includes('Luna Sky')));
await page.setViewport({width:390,height:844,deviceScaleFactor:1});await click('Toggle sidebar');await page.screenshot({path:'artifacts/mobile-sidebar.png'});assert.equal(await page.$eval('.context-surface',el=>getComputedStyle(el).display),'none');await click('Toggle sidebar');
await click('Architecture','.luna-rail');assert.ok(await tray.evaluate(el=>el.getBoundingClientRect().right<=390));await click('Water',engineering);assert.ok(await isOpen(engineering));await click('Close Engineering Layers',engineering);
assert.deepEqual(errors,[]);
console.log(JSON.stringify({result:'PASS',plans,tray:layout,labels,pointerChecks:{trayDragCameraUnchanged:true,viewDragCameraUnchanged:true,canvasDragCameraChanged:true,canvasPointerDowns:await page.evaluate(()=>window.canvasPointerDowns)},errors},null,2));
} finally {await browser.close();}
