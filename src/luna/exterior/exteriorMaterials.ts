import * as THREE from 'three';

// LUNA_REFERENCE_DESIGN finish library. Textures are shared, materials are NOT:
// level fade/clipping/selection own their material instance. No remote assets.
const textures = new Map<string, THREE.DataTexture>();
function grain(kind: 'stone' | 'paving' | 'timber' | 'soil') {
  if (textures.has(kind)) return textures.get(kind)!;
  const n=256, data=new Uint8Array(n*n*4);
  let seed=413;
  for(let y=0;y<n;y++) for(let x=0;x<n;x++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=(seed/4294967296-.5);
    const joint=kind==='paving' && (x%64<1 || y%64<1);
    const vein=kind==='timber' ? Math.sin(x*.45+Math.sin(y*.034)*1.4)*18 : Math.sin(y*.13+Math.sin(x*.032)*3)*2;
    const value=Math.max(0,Math.min(255,joint?140:235+noise*(kind==='soil'?65:14)+vein));
    const i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const t=new THREE.DataTexture(data,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;
  t.anisotropy=4;t.needsUpdate=true;textures.set(kind,t);return t;
}
function surface(color:string,roughness:number,kind:'stone'|'paving'|'timber'|'soil') {
  return new THREE.MeshStandardMaterial({color,roughness,metalness:0,bumpMap:grain(kind),bumpScale:kind==='timber'?.018:.009,roughnessMap:grain(kind)});
}
export const exteriorMaterials={
  limestone:()=>surface('#d6d0c3',.76,'stone'),
  soffit:()=>surface('#a79880',.86,'stone'),
  paving:()=>surface('#aaa497',.8,'paving'),
  driveway:()=>surface('#565650',.85,'paving'),
  timber:()=>surface('#79614b',.7,'timber'),
  soil:()=>surface('#393b2e',1,'soil'),
  bronze:()=>new THREE.MeshStandardMaterial({color:'#645346',roughness:.37,metalness:.72}),
  metal:()=>new THREE.MeshStandardMaterial({color:'#343735',roughness:.4,metalness:.65}),
  joint:()=>new THREE.MeshStandardMaterial({color:'#403f38',roughness:.92}),
  glass:()=>new THREE.MeshPhysicalMaterial({color:'#9eadad',roughness:.14,metalness:0,ior:1.5,transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:.85}),
  // Opaque reflective backing retains the existing exterior privacy envelope.
  glazing:()=>new THREE.MeshPhysicalMaterial({color:'#536566',roughness:.28,metalness:.18,emissive:'#ffce95',emissiveIntensity:0,side:THREE.DoubleSide,clearcoat:1,clearcoatRoughness:.1,envMapIntensity:1.05}),
  warmLight:()=>new THREE.MeshStandardMaterial({color:'#ebd5ab',emissive:'#ffd59b',emissiveIntensity:0,roughness:.45}),
};

// Optical curtain/depth impression within the pre-existing visual bay grid.
// No room scene, occupancy signal, or view into a private apartment is produced.
let bayTexture:THREE.DataTexture|undefined;
export function exteriorWindowMaterial(){
  if(!bayTexture){
    const n=128,data=new Uint8Array(n*n*4);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const u=x/(n-1),v=y/(n-1);
      const folds=.65+.35*Math.cos(u*Math.PI*24);
      const upper=Math.exp(-Math.pow((v-.82)*4,2));
      const shade=(u<.1||u>.9)?.5:1;
      const value=Math.round(255*(.018+.17*upper)*folds*shade);
      const i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
    }
    bayTexture=new THREE.DataTexture(data,n,n);bayTexture.magFilter=THREE.LinearFilter;bayTexture.needsUpdate=true;
  }
  const m=exteriorMaterials.glazing();m.emissiveMap=bayTexture;
  m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-1;return m;
}
