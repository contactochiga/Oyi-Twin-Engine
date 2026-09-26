import * as THREE from 'three';
import {exteriorMaterials} from '../../exterior/exteriorMaterials';
import {bindExteriorMaps} from '../../exterior/exteriorTextureMaps';
import {leafMaterial} from '../../exterior/plantGeometry';

/** Local, deterministic finish maps. No fetched assets, operational metadata or
 * loading boundary. Shared textures; every mounted finish owns its materials. */
const maps=new Map<string,THREE.DataTexture>();
function finishMap(kind:'stone'|'floor'|'wood'|'fabric'|'dark') {
 const cached=maps.get(kind);if(cached)return cached;
 const n=512,data=new Uint8Array(n*n*4);let seed=91273;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296-.5;
  const u=x/n,v=y/n;
  const vein=Math.sin(v*75+Math.sin(u*16)*1.4)+.4*Math.sin(v*191+u*33);
  let value=228+vein*4+noise*10;
  if(kind==='floor'&&(x<1||y<1))value=178;
  if(kind==='wood')value=170+24*Math.sin(u*175+Math.sin(v*7)*2)+noise*10;
  if(kind==='fabric')value=218+noise*28+((x+y)%2)*12;
  if(kind==='dark') { const strata=Math.sin(v*47+Math.sin(u*19)*2.4+Math.sin(v*13+u*61)*.7); value=125+Math.pow(Math.max(0,strata),42)*52+noise*12; }
  const i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=Math.max(0,Math.min(255,value));data[i+3]=255;
 }
 const t=new THREE.DataTexture(data,n,n);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;maps.set(kind,t);return t;
}
function finish(color:string,roughness:number,kind:Parameters<typeof finishMap>[0]) {
 const material=new THREE.MeshStandardMaterial({color,roughness,map:finishMap(kind),metalness:0,envMapIntensity:.4});
 if(kind==='wood')bindExteriorMaps(material,'timber');
 if(kind==='floor')bindExteriorMaps(material,'paving');
 return material;
}
export const groundInteriorMaterials={
 floor:()=>finish('#d3bd99',.37,'floor'),
 stone:()=>finish('#d2bc98',.63,'stone'),
 darkStone:()=>finish('#5e5b53',.31,'dark'),
 timber:()=>finish('#816344',.58,'wood'),
 cream:()=>finish('#ded4c2',.93,'fabric'),
 olive:()=>finish('#6f7357',.96,'fabric'),
 rug:()=>finish('#9d9587',1,'fabric'),
 bronze:()=>new THREE.MeshStandardMaterial({color:'#514238',metalness:.72,roughness:.36,envMapIntensity:.65}),
 warmMetal:()=>new THREE.MeshStandardMaterial({color:'#aa8d62',metalness:.7,roughness:.4}),
 dark:()=>new THREE.MeshStandardMaterial({color:'#272724',roughness:.75}),
 light:()=>new THREE.MeshStandardMaterial({color:'#ffe6b9',emissive:'#ffd9a0',emissiveIntensity:1.4,roughness:.45,toneMapped:false}),
 shadow:()=>exteriorMaterials.contactShadow(),
 foliage:()=>leafMaterial(),
 plaster:()=>new THREE.MeshStandardMaterial({color:'#ded9ca',roughness:.94,side:THREE.DoubleSide}),
};
export type GroundMaterialKey=keyof typeof groundInteriorMaterials;
/** World-metre UVs, without altering a vertex or any canonical bounds. */
export function groundMetricUV(g:THREE.BufferGeometry,scale=1.2) {
 const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){
  const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
  uv[i*2]=(ax>ay&&ax>az?p.getZ(i):p.getX(i))/scale;
  uv[i*2+1]=(ay>ax&&ay>az?p.getZ(i):p.getY(i))/scale;
 }
 g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return g;
}
