// Offline only: convert explicitly downloaded CC0 source files to bounded local
// visual assets. No runtime/canonical metadata is carried into the exported scene.
import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import {MeshoptSimplifier} from 'meshoptimizer';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices,toCreasedNormals} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result=`data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;this.onloadend?.();});}};
const carDir=process.argv[2],palmDir=process.argv[3];if(!carDir||!palmDir)throw Error('Supply extracted sedan root and palm root');
const root='public/exterior-assets/';
async function car(file,name){
 const bytes=readFileSync(file),scene=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');scene.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),scale=4.4/size.z;
 const parts=new Map();
 scene.traverse(o=>{if(!o.isMesh)return;let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();g.translate(-center.x,-bounds.min.y,-center.z).scale(scale,scale,scale);
 const mats=Array.isArray(o.material)?o.material:[o.material];
 for(const group of g.groups.length?g.groups:[{start:0,count:g.attributes.position.count,materialIndex:0}]){
  const source=mats[group.materialIndex],n=source.name.replace(/\.\d+$/,'');let category=/Metallic|Indigo/.test(n)?'paint':/Window.*Glass/.test(n)?'glass':/Alloy|Steel/.test(n)?'metal':/HeadlightsMain/.test(n)?'lens':/HeadlightsBack/.test(n)?'tail':/HeadlightsCorner/.test(n)?'amber':'rubber';
  const p=new T.BufferGeometry();for(const attr of ['position','normal']){const a=g.getAttribute(attr);p.setAttribute(attr,new T.Float32BufferAttribute(a.array.slice(group.start*a.itemSize,(group.start+group.count)*a.itemSize),a.itemSize));}
  if(!parts.has(category))parts.set(category,[]);
  if(/^Tires/.test(n)&&name==='sedan-near.gltf'){
   p.computeBoundingBox();const b=p.boundingBox,c=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3()),radius=size.y/2,half=size.x/2;
   // Preserve authored wheel centres/radius/contact, replace the coarse tyre
   // ring only with a rounded 64-segment tread/sidewall profile.
   const profile=[[radius*.66,-half],[radius*.88,-half],[radius*.98,-half*.7],[radius,-half*.3],[radius,half*.3],[radius*.98,half*.7],[radius*.88,half],[radius*.66,half],[radius*.66,-half]].map(([r,x])=>new T.Vector2(r,x));
   parts.get(category).push(new T.LatheGeometry(profile,64).rotateZ(Math.PI/2).translate(c.x,c.y,c.z));p.dispose();
  }else parts.get(category).push(p);
 }
 });
 const result=new T.Group();for(const [category,gs]of parts){let g=mergeGeometries(gs.map(g=>{if(g.index)g=g.toNonIndexed();g.deleteAttribute('uv');return g;}));g=mergeVertices(toCreasedNormals(g,Math.PI*.3));const m=new T.MeshStandardMaterial({color:'#ffffff'});m.name=category;const mesh=new T.Mesh(g,m);mesh.name=category;result.add(mesh);}
 await save(result,name);console.log(name,new T.Box3().setFromObject(result));
}
async function save(scene,name,edit){const doc=await new GLTFExporter().parseAsync(scene,{binary:false});edit?.(doc);writeFileSync(root+name,JSON.stringify(doc));console.log(name,'triangles',doc.meshes.reduce((n,m)=>n+m.primitives.reduce((n,p)=>n+doc.accessors[p.indices??p.attributes.POSITION].count/3,0),0));}
await car(`${carDir}/FBX/Midsize_Sedan-BLUE.fbx`,'sedan-near.gltf');await car(`${carDir}/FBX/LOD2/LOD2_Midsize_Sedan-BLUE.fbx`,'sedan-far.gltf');
const scene=new OBJLoader().parse(readFileSync(`${palmDir}/palm_tree.obj`,'utf8'));const g=scene.children[0].geometry.clone().scale(6.1/439.7392883300781,6.1/439.7392883300781,6.1/439.7392883300781);for(let i=0;i<g.attributes.uv.count;i++)g.attributes.uv.setY(i,1-g.attributes.uv.getY(i));const mesh=new T.Mesh(mergeVertices(g),new T.MeshStandardMaterial({roughness:.85,side:T.DoubleSide}));mesh.name='palm';
await save(mesh,'palm.gltf',doc=>{doc.images=[{uri:'palm-color.png'},{uri:'palm-normal.jpg'}];doc.samplers=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];doc.textures=[{source:0,sampler:0},{source:1,sampler:0}];doc.materials[0].pbrMetallicRoughness.baseColorTexture={index:0};doc.materials[0].normalTexture={index:1,scale:.55};doc.materials[0].alphaMode='MASK';doc.materials[0].alphaCutoff=.4;doc.materials[0].doubleSided=true;});

await MeshoptSimplifier.ready;
const far=mesh.clone();far.geometry=mesh.geometry.clone();const indices=Uint32Array.from(far.geometry.index.array);const [reduced]=MeshoptSimplifier.simplify(indices,far.geometry.attributes.position.array,3,1800,.01);far.geometry.setIndex(new T.BufferAttribute(reduced,1));
await save(far,'palm-far.gltf',doc=>{const original=JSON.parse(readFileSync(root+'palm.gltf'));for(const key of ['images','textures','samplers','materials'])doc[key]=original[key];});
