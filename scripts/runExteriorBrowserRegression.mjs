import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const dir='artifacts/exterior-gold-standard/regression';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const results=[];
for(const name of ['test:four-lift:browser','test:routed-traversal:browser','test:apt-a-teleport:browser','test:apt-a-map-privacy:browser','test:explore:browser','test:grand-lobby:browser']){
 const command=pkg.scripts[name].split(' '),started=Date.now();let status='PASS',output='';console.log('START',name);
 try{output=execFileSync(command[0],command.slice(1),{encoding:'utf8',timeout:300000,maxBuffer:5e6,stdio:['ignore','pipe','pipe']});}catch(e){status='FAIL';output=(e.stdout??'')+'\n'+(e.stderr??'')+'\n'+e.message;}
 writeFileSync(`${dir}/${name.replaceAll(':','-')}.log`,output);results.push({name,status,ms:Date.now()-started});writeFileSync(`${dir}/browser.json`,JSON.stringify(results,null,2));console.log(name,status,output.slice(-600));
}
