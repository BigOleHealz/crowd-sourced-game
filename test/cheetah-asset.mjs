import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Matrix4,Vector3} from 'three';
import {civilianProfiles} from '../public/civilian-fleet.js';
import {supercarLayout} from '../public/supercar-layout.js';
import {wheelsFor} from '../public/road-wheel-layout.js';

const bytes=readFileSync(new URL('../public/cheetah-supercar.glb',import.meta.url));
assert.equal(bytes.toString('ascii',0,4),'glTF');
const jsonLength=bytes.readUInt32LE(12);
const gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
const parents=new Map(gltf.nodes.flatMap((node,i)=>(node.children??[]).map(child=>[child,i])));
function worldMatrix(index){
  const node=gltf.nodes[index],local=new Matrix4().fromArray(node.matrix??new Matrix4().toArray());
  return parents.has(index)?worldMatrix(parents.get(index)).multiply(local):local;
}
const scaledPosition=name=>{
  const i=gltf.nodes.findIndex(node=>node.name===name);
  assert(i>=0,`missing GLB node ${name}`);
  return new Vector3().setFromMatrixPosition(worldMatrix(i)).multiplyScalar(.89);
};
const names=['Wheel_FL','Wheel_RL','Wheel_FR','Wheel_RR'];
const centers=names.map(scaledPosition);
for(const [kind,stations] of [['supercar',wheelsFor({kind:'supercar'})],
  ...['falco','veloce'].map(model=>[model,wheelsFor({model})])]){
  for(let i=0;i<4;i++){
    assert(Math.abs(centers[i].x-stations[i][0])<.025,`${kind} wheel ${i} track`);
    assert(Math.abs(centers[i].z-stations[i][1])<.025,`${kind} wheel ${i} wheelbase`);
    assert(Math.abs(centers[i].y-supercarLayout.tire)<.025,`${kind} wheel ${i} height`);
  }
}
assert.equal(civilianProfiles.falco.halfLength,supercarLayout.halfLength);
assert.equal(civilianProfiles.veloce.halfWidth,supercarLayout.halfWidth);
assert.equal(gltf.meshes.length,21);
console.log('PASS Cheetah GLB wheel pivots, tire height, and shared physics dimensions match all three cars.');
