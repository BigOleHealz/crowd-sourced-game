// Fit the credited Mike Alger GLB to the game's existing joints at build time.
// Run with node tools/fit-player-scan.mjs source.glb public/mike-alger.glb
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Matrix4, Quaternion, Vector3} from 'three';
import {createRangerRig} from '../public/ranger-pose.js';

const [, , input, output] = process.argv;
const source = readFileSync(input);
if (createHash('sha256').update(source).digest('hex') !== '3227cd3e9e5cc69676f1172f81b5a7ed392bbb4e50af0e8e64187819238abd56') {
  throw new Error('Expected the credited occupant GLB specified in public/player-credits.txt');
}
const jsonSize = source.readUInt32LE(12);
const original = JSON.parse(source.subarray(20, 20 + jsonSize));
const binary = source.subarray(28 + jsonSize);
function view(index) {
  const v = original.bufferViews[index];
  return binary.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
}
const typed = {5121: Uint8Array, 5123: Uint16Array, 5126: Float32Array};
function read(index) {
  const a = original.accessors[index], bytes = view(a.bufferView);
  return new typed[a.componentType](bytes.buffer, bytes.byteOffset + (a.byteOffset ?? 0), bytes.length / typed[a.componentType].BYTES_PER_ELEMENT);
}
const turn = new Matrix4().makeRotationY(Math.PI / 2);
const skin = original.skins[0], inverse = read(skin.inverseBindMatrices);
const names = skin.joints.map(i => original.nodes[i].name.replace('mixamorig_', ''));
const points = Object.fromEntries(names.map((name, i) => [name, new Vector3().setFromMatrixPosition(new Matrix4().fromArray(inverse, i * 16).invert()).applyMatrix4(turn)]));
const rig = createRangerRig();
rig.root.updateMatrixWorld(true);
const nodes = [], native = new Map(), maps = new Map();
function register(name, joint) {
  const index = nodes.length;
  nodes.push({name, translation: joint.position.toArray()});
  native.set(joint, index);
  if (native.has(joint.parent)) (nodes[native.get(joint.parent)].children ??= []).push(index);
  return index;
}
register('body', rig.body);
register('spine', rig.spine);
register('upper', rig.upper);
register('head', rig.head);
function assign(joint, matrix, ...parts) {
  for (const part of parts) maps.set(part, {index: native.get(joint), matrix: matrix.clone().multiply(turn)});
}
const identity = new Matrix4();
assign(rig.body, identity, 'Hips');
assign(rig.spine, identity, 'Spine', 'Spine1', 'Spine2', 'Neck', 'LeftShoulder', 'RightShoulder');
assign(rig.head, identity, 'Head', 'HeadTop_End', 'LeftEye', 'RightEye');
const position = joint => new Vector3().setFromMatrixPosition(joint.matrixWorld);
// Map a scanned bone segment onto the game's corresponding segment, preserving
// its cross section. This folds the T-pose arms down without shortening the torso.
function fit(from, to, start, end) {
  const axis = to.clone().sub(from), dest = end.clone().sub(start);
  const ratio = dest.length() / axis.length();
  axis.normalize();
  const a = axis.toArray(), stretch = new Matrix4();
  for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) stretch.elements[4*col+row] += (ratio-1)*a[row]*a[col];
  return new Matrix4().makeTranslation(start).multiply(new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(axis, dest.normalize()))).multiply(stretch).multiply(new Matrix4().makeTranslation(from.clone().negate()));
}
for (const limb of rig.limbs) {
  const side = limb.side < 0 ? 'Left' : 'Right';
  for (const name of ['leg','knee','ankle','arm','forearm']) register(side + name, limb[name]);
  const at = key => points[side + key], arm = position(limb.arm), elbow = position(limb.forearm);
  const hip = position(limb.leg), knee = position(limb.knee), ankle = position(limb.ankle);
  const soleJoint = ankle.clone(); soleJoint.y = at('Foot').y;
  const wrist = elbow.clone(); wrist.y -= .195;
  const fingertips = wrist.clone(); fingertips.y -= .173; fingertips.z -= .043;
  assign(limb.arm, fit(at('Arm'), at('ForeArm'), arm, elbow), side+'Arm');
  assign(limb.forearm, fit(at('ForeArm'), at('Hand'), elbow, wrist), side+'ForeArm');
  assign(limb.forearm, fit(at('Hand'), at('HandMiddle4'), wrist, fingertips), ...names.filter(n => n.startsWith(side+'Hand')));
  assign(limb.leg, fit(at('UpLeg'), at('Leg'), hip, knee), side+'UpLeg');
  assign(limb.knee, fit(at('Leg'), at('Foot'), knee, soleJoint), side+'Leg');
  assign(limb.ankle, new Matrix4().makeTranslation(soleJoint.sub(at('Foot'))), ...names.filter(n => n.startsWith(side+'Foot') || n.startsWith(side+'Toe')));
}
const sourceMaps = names.map(n => { if (!maps.has(n)) throw new Error('Unmapped bone '+n); return maps.get(n); });
const primitive = original.meshes[0].primitives[0], attr = primitive.attributes;
const pos = read(attr.POSITION), originalNormals = read(attr.NORMAL), weights = read(attr.WEIGHTS_0), joints = read(attr.JOINTS_0);
const baked = new Float32Array(pos.length), normals = new Float32Array(pos.length);
const ids = new Uint8Array(joints.length), influences = new Uint8Array(weights.length);
const v = new Vector3(), normal = new Vector3(), p = new Vector3(), n = new Vector3(), temp = new Vector3();
const min = new Vector3(Infinity,Infinity,Infinity), max = min.clone().negate();
for (let i=0; i<pos.length/3; i++) {
  v.fromArray(pos,i*3); normal.fromArray(originalNormals,i*3); p.set(0,0,0); n.set(0,0,0);
  const summed = new Map();
  for (let j=0;j<4;j++) {
    const w = weights[4*i+j]; if (!w) continue;
    const {index,matrix} = sourceMaps[joints[4*i+j]];
    p.addScaledVector(temp.copy(v).applyMatrix4(matrix),w);
    n.addScaledVector(temp.copy(normal).transformDirection(matrix),w);
    summed.set(index,(summed.get(index)??0)+w);
  }
  p.toArray(baked,3*i); n.normalize().toArray(normals,3*i); min.min(p);max.max(p);
  const sorted = [...summed].sort((a,b)=>b[1]-a[1]);
  let total = 0;
  sorted.forEach(([idx,w],j)=>{ids[4*i+j]=idx;influences[4*i+j]=Math.round(w*255);total+=influences[4*i+j];});
  influences[4*i]+=255-total;
}
const chunks=[], bufferViews=[], accessors=[];
let size=0;
function append(bytes) {
  const b=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const pad=(4-b.length%4)%4;chunks.push(b,Buffer.alloc(pad));
  bufferViews.push({buffer:0,byteOffset:size,byteLength:b.length});size+=b.length+pad;
  return bufferViews.length-1;
}
function accessor(bytes, componentType, type, count, extra={}) {
  accessors.push({bufferView:append(bytes),componentType,type,count,...extra});return accessors.length-1;
}
const count=pos.length/3;
const attributes={
  POSITION:accessor(baked,5126,'VEC3',count,{min:min.toArray(),max:max.toArray()}),
  NORMAL:accessor(normals,5126,'VEC3',count),
  TEXCOORD_0:accessor(read(attr.TEXCOORD_0),5126,'VEC2',count),
  JOINTS_0:accessor(ids,5121,'VEC4',count),
  WEIGHTS_0:accessor(influences,5121,'VEC4',count,{normalized:true})
};
const indices=read(primitive.indices),index=accessor(indices,5123,'SCALAR',indices.length);
const bind=new Float32Array(nodes.length*16);
for(const [joint,i] of native) joint.matrixWorld.clone().invert().toArray(bind,i*16);
const binds=accessor(bind,5126,'MAT4',nodes.length);
const imageView=append(view(original.images[0].bufferView));
const jointIds=nodes.map((_,i)=>i);
nodes.push({name:'MikeAlger',mesh:0,skin:0});
const gltf={asset:{version:'2.0',copyright:'Mike Alger, Doob, High Fidelity — CC BY 4.0. See player-credits.txt.'},scene:0,scenes:[{nodes:[0,nodes.length-1]}],nodes,skins:[{joints:jointIds,inverseBindMatrices:binds}],meshes:[{primitives:[{attributes,indices:index,material:0}]}],materials:original.materials,textures:original.textures,samplers:original.samplers,images:[{bufferView:imageView,mimeType:'image/jpeg'}],buffers:[{byteLength:size}],bufferViews,accessors};
const json=Buffer.from(JSON.stringify(gltf)), padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
const header=Buffer.alloc(20), binaryHeader=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+size,8);header.writeUInt32LE(padded.length,12);header.write('JSON',16);
binaryHeader.writeUInt32LE(size);binaryHeader.write('BIN\0',4);
writeFileSync(output,Buffer.concat([header,padded,binaryHeader,...chunks]));
