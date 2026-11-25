// Run with node tools/fit-army-man.mjs source.glb public/army-man-fitted.glb.
// The credited source is an OBJ conversion with no joints. Its T pose is fitted
// to the game's existing rig, preserving its mesh, UVs and original textures.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Matrix4,Vector3} from 'three';
import {createRangerRig} from '../public/ranger-pose.js';

const [, ,input,output]=process.argv;
if(!input || !output)throw new Error('Usage: node tools/fit-army-man.mjs source.glb output.glb');
const source=readFileSync(input);
const digest=createHash('sha256').update(source).digest('hex');
if(digest!=='69c48ff24ffcadf26abaa7e8ce85f10574b189afd0bc4e47020f756b5c9d2d0c')
  throw new Error('Expected the credited Army Man GLB specified in player-credits.txt');
const jsonSize=source.readUInt32LE(12);
const original=JSON.parse(source.subarray(20,20+jsonSize));
if(original.skins?.length || original.animations?.length)throw new Error('Expected unrigged Army Man source');
const binary=source.subarray(28+jsonSize);
const view=index=>{
  const v=original.bufferViews[index];
  return binary.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);
};
const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const getters={5121:'getUint8',5123:'getUint16',5125:'getUint32',5126:'getFloat32'};
const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
function read(index){
  const a=original.accessors[index],width=widths[a.type],Type=types[a.componentType];
  const bytes=view(a.bufferView),stride=original.bufferViews[a.bufferView].byteStride??width*Type.BYTES_PER_ELEMENT;
  const data=new DataView(bytes.buffer,bytes.byteOffset+(a.byteOffset??0)),result=new Type(a.count*width);
  for(let i=0;i<a.count;i++)for(let j=0;j<width;j++)result[i*width+j]=data[getters[a.componentType]](i*stride+j*Type.BYTES_PER_ELEMENT,true);
  return result;
}
const rig=createRangerRig();rig.root.updateMatrixWorld(true);
const nodes=[],jointIds=new Map();
function register(name,joint){
  const index=nodes.length;nodes.push({name,translation:joint.position.toArray()});jointIds.set(joint,index);
  const parent=jointIds.get(joint.parent);if(parent!==undefined)(nodes[parent].children??=[]).push(index);
}
for(const name of ['body','spine','upper','head'])register(name,rig[name]);
for(const limb of rig.limbs)for(const name of ['leg','knee','ankle','arm','forearm'])register((limb.side<0?'Left':'Right')+name,limb[name]);
const bone=name=>nodes.findIndex(n=>n.name===name);
const rootTransform=new Matrix4().fromArray(original.nodes[0].matrix).multiply(new Matrix4().fromArray(original.nodes[1].matrix));
// The Sketchfab transform makes Z vertical. Normalize its 2.9 m height to 1.8 m.
const sourceHeight=182.66648864746094*0.01582726091146469;
const scale=1.8/sourceHeight;
const turn=new Matrix4().makeRotationY(Math.PI).multiply(new Matrix4().makeScale(scale,scale,scale)).multiply(rootTransform);
const pieces=[];
const p=new Vector3(),n=new Vector3(),out=new Vector3();
for(const mesh of original.meshes)for(const primitive of mesh.primitives){
  const attr=primitive.attributes,positions=read(attr.POSITION),normals=read(attr.NORMAL),count=positions.length/3;
  const baked=new Float32Array(positions.length),normalOut=new Float32Array(normals.length);
  const ids=new Uint8Array(count*4),weights=new Uint8Array(count*4);
  const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
  for(let i=0;i<count;i++){
    p.fromArray(positions,i*3).applyMatrix4(turn);
    n.fromArray(normals,i*3).transformDirection(turn);
    const side=p.x<0?'Left':'Right',distance=Math.abs(p.x),height=p.y;
    let name='body';
    if(height>1.52 && distance<.28)name='head';
    else if(height>1.04 && distance>.26){
      // Rotate the straight T-pose sleeves down to the rig's resting arms.
      const armDistance=(distance-.203)*.70,across=(height-1.447)*.35;
      p.set((p.x<0?-1:1)*(.32+across),1.447-armDistance,p.z);
      n.set((p.x<0?-1:1)*n.y,-Math.sign(p.x)*n.x,n.z).normalize();
      name=side+(distance>.59?'forearm':'arm');
    }else if(height<1.01 && distance>.035){
      name=side+(height>.58?'leg':height>.20?'knee':'ankle');
    }else if(height>1.04)name='spine';
    out.copy(p);out.toArray(baked,i*3);n.toArray(normalOut,i*3);min.min(out);max.max(out);
    ids[i*4]=bone(name);weights[i*4]=255;
  }
  pieces.push({baked,normals:normalOut,uv:read(attr.TEXCOORD_0),ids,weights,indices:read(primitive.indices),indexType:original.accessors[primitive.indices].componentType,min,max,material:primitive.material??0});
}
const chunks=[],bufferViews=[],accessors=[];let size=0;
function append(bytes){
  const b=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength),padding=(4-b.length%4)%4;
  chunks.push(b,Buffer.alloc(padding));bufferViews.push({buffer:0,byteOffset:size,byteLength:b.length});size+=b.length+padding;
  return bufferViews.length-1;
}
function accessor(bytes,componentType,type,count,extra={}){
  accessors.push({bufferView:append(bytes),componentType,type,count,...extra});return accessors.length-1;
}
const meshes=[];
for(const piece of pieces){
  const count=piece.baked.length/3;
  const attributes={
    POSITION:accessor(piece.baked,5126,'VEC3',count,{min:piece.min.toArray(),max:piece.max.toArray()}),
    NORMAL:accessor(piece.normals,5126,'VEC3',count),
    TEXCOORD_0:accessor(piece.uv,5126,'VEC2',count),
    JOINTS_0:accessor(piece.ids,5121,'VEC4',count),
    WEIGHTS_0:accessor(piece.weights,5121,'VEC4',count,{normalized:true}),
  };
  meshes.push({primitives:[{attributes,indices:accessor(piece.indices,piece.indexType,'SCALAR',piece.indices.length),material:piece.material}]});
}
const bind=new Float32Array(nodes.length*16);
for(const [joint,index] of jointIds)joint.matrixWorld.clone().invert().toArray(bind,index*16);
const bindAccessor=accessor(bind,5126,'MAT4',nodes.length),joints=nodes.map((_,i)=>i);
const images=original.images.map(image=>({bufferView:append(view(image.bufferView)),mimeType:image.mimeType}));
for(let i=0;i<meshes.length;i++)nodes.push({name:'Army Man part '+i,mesh:i,skin:0});
const gltf={asset:{version:'2.0',copyright:'Darksider Crood — CC BY 4.0. See player-credits.txt.',extras:{sourceSha256:digest}},scene:0,
  scenes:[{nodes:[0,...meshes.map((_,i)=>joints.length+i)]}],nodes,
  skins:[{joints,inverseBindMatrices:bindAccessor}],meshes,
  materials:original.materials,textures:original.textures,samplers:original.samplers,images,
  buffers:[{byteLength:size}],bufferViews,accessors};
const json=Buffer.from(JSON.stringify(gltf)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
const header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+size,8);header.writeUInt32LE(padded.length,12);header.write('JSON',16);
binaryHeader.writeUInt32LE(size);binaryHeader.write('BIN\0',4);
writeFileSync(output,Buffer.concat([header,padded,binaryHeader,...chunks]));
