import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const dir='artifacts/exterior-gold-standard/regression';mkdirSync(dir,{recursive:true});
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const names=Object.keys(pkg.scripts).filter(k=>k.startsWith('test:')&&!k.includes('browser')&&!['test:presentation','test:architecture'].includes(k));
const results=[];
for(const name of names){
 const command=pkg.scripts[name].split(' ');const started=Date.now();let status='PASS',output='';
 try{output=execFileSync(command[0],command.slice(1),{encoding:'utf8',timeout:120000,maxBuffer:5e6});}catch(e){status='FAIL';output=(e.stdout??'')+'\n'+(e.stderr??'')+'\n'+e.message;}
 writeFileSync(`${dir}/${name.replaceAll(':','-')}.log`,output);results.push({name,status,ms:Date.now()-started});
 writeFileSync(`${dir}/deterministic.json`,JSON.stringify(results,null,2));console.log(name,status);
}

// Propagate any recorded failure; known baseline failures remain visible.
process.exitCode = results.some(result => result.status !== 'PASS') ? 1 : 0;
