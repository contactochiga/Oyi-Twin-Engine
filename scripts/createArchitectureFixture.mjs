// Synthetic panels prove ingestion only. Never use these as architecture.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
const crc32 = buffer => {let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
const pngChunk=(type,data)=>{const name=Buffer.from(type);const chunk=Buffer.alloc(12+data.length);chunk.writeUInt32BE(data.length);name.copy(chunk,4);data.copy(chunk,8);chunk.writeUInt32BE(crc32(Buffer.concat([name,data])),8+data.length);return chunk;};
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(Buffer.from([0,255,255,255,255]))),pngChunk('IEND',Buffer.alloc(0))]);
const vertices = new Float32Array([-6,0,0, 6,0,0, 6,3,0, -6,0,0, 6,3,0, -6,3,0]);
const bin = Buffer.from(vertices.buffer);
const names = ['LUNA-GROUND__envelope__fixture_front__LOD2','LUNA-GROUND__envelope__fixture_back__LOD2'];
const json = {
  asset:{version:'2.0',generator:'Luna TEST ONLY synthetic binding fixture'},scene:0,
  scenes:[{nodes:[0,1]}],
  nodes:names.map((name,i)=>({name,mesh:i,translation:[0,0,i===0?18:-18]})),
  meshes:names.map(()=>({primitives:[{attributes:{POSITION:0},material:0}]})),
  materials:[{name:'MAT__test_only__v01',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[0.12,0.65,0.7,1],metallicFactor:0,roughnessFactor:0.7,baseColorTexture:{index:0}}}],
  images:[{uri:'data:image/png;base64,'+png.toString('base64')}],textures:[{source:0}],
  buffers:[{byteLength:bin.length}],bufferViews:[{buffer:0,byteLength:bin.length}],
  accessors:[{bufferView:0,componentType:5126,count:6,type:'VEC3',min:[-6,0,0],max:[6,3,0]}]
};
const text = Buffer.from(JSON.stringify(json));
const jsonChunk=Buffer.alloc(Math.ceil(text.length/4)*4,0x20);text.copy(jsonChunk);
const glb=Buffer.alloc(12+8+jsonChunk.length+8+bin.length);
glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
glb.writeUInt32LE(jsonChunk.length,12);glb.writeUInt32LE(0x4e4f534a,16);jsonChunk.copy(glb,20);
const offset=20+jsonChunk.length;glb.writeUInt32LE(bin.length,offset);glb.writeUInt32LE(0x004e4942,offset+4);bin.copy(glb,offset+8);
json.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');
const gltf=Buffer.from(JSON.stringify(json));
await mkdir('tests/architecture/assets',{recursive:true});
await writeFile('tests/architecture/assets/ground-fixture.glb',glb);
await writeFile('tests/architecture/assets/ground-fixture.gltf',gltf);
const sha=b=>createHash('sha256').update(b).digest('hex');
await writeFile('tests/architecture/fixture-manifest.json',JSON.stringify({revision:'test-fixture-v1',url:'/architectural-assets/ground-fixture.glb',sha256:sha(glb),ownerLevelRef:'LUNA-GROUND',coordinateFrame:'ground-floor-local-metres-y-up',bindings:names.map(nodeName=>({nodeName,canonicalRef:'LUNA-GROUND',role:'envelope'})),gltf:{url:'/architectural-assets/ground-fixture.gltf',sha256:sha(gltf)}},null,2)+'\n');
console.log('Generated synthetic TEST ONLY GLB/glTF fixtures outside production public assets.');
