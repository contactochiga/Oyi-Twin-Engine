// Local-only fixture middleware. This is not included in vite.config or builds.
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
export function createArchitectureServer(port=5184) {
  return createServer({server:{host:'127.0.0.1',port,strictPort:true},plugins:[{
    name:'local-architecture-fixtures',
    configureServer(server){server.middlewares.use(async(req,res,next)=>{
      const match=/^\/architectural-assets\/(ground-fixture\.(glb|gltf))$/.exec(req.url??'');
      if(!match)return next();
      try {
        const data=await readFile('tests/architecture/assets/'+match[1]);
        res.setHeader('Content-Type',match[2]==='glb'?'model/gltf-binary':'model/gltf+json');
        res.end(data);
      }catch(error){next(error);}
    });}
  }]});
}
