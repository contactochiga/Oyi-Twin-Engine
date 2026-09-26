// Local observational benchmark, not a cross-device pass/fail certification.
import puppeteer from 'puppeteer-core';
import {writeFileSync} from 'node:fs';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();await page.setViewport({width:1600,height:1100,deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('@react-three_fiber'));const fiber=await import(url);window.twin=()=>fiber._roots.get(document.querySelector('canvas')).store.getState();});
 await page.waitForFunction(()=>window.twin().controls&&window.twin().gl.info.render.triangles>50000);
 await new Promise(r=>setTimeout(r,3000));
 const results=[];
 for(const moving of [false,true])results.push(await page.evaluate(moving=>new Promise(resolve=>{
  const s=window.twin(),samples=[];let start,last;const original=s.camera.position.clone(),target=s.controls.target.clone(),offset=original.clone().sub(target);
  const radius=Math.hypot(offset.x,offset.z),angle=Math.atan2(offset.x,offset.z);
  function frame(now){
   start??=now;if(last!==undefined)samples.push(now-last);last=now;
   if(moving){const a=angle+(now-start)*.00012;s.camera.position.set(target.x+Math.sin(a)*radius,original.y,target.z+Math.cos(a)*radius);s.controls.update();}
   if(now-start<5000){requestAnimationFrame(frame);return;}
   samples.sort((a,b)=>a-b);const gl=s.gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
   resolve({mode:moving?'exterior orbit':'stationary exterior',durationMs:now-start,frames:samples.length,averageFps:samples.length/((now-start)/1000),medianFrameMs:samples[Math.floor(samples.length*.5)],p95FrameMs:samples[Math.floor(samples.length*.95)],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[1600,1100],pixelRatio:s.gl.getPixelRatio(),calls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles});
  }requestAnimationFrame(frame);
 }),moving));
 writeFileSync('artifacts/exterior-gold-standard/performance.json',JSON.stringify({environment:'Local headless Chrome; rAF intervals include browser scheduling; no other verification browser running',samples:results,limitations:['Single five-second sample per view after warmup','No before-patch frame-time sample','Not mobile/tablet, interior or thermal endurance certification']},null,2));console.log(results);
}finally{await browser.close();}
