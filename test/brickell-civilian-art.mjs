import assert from 'node:assert/strict';
import * as THREE from 'three';
import {brickellResidents} from '../public/brickell-residents.js';
import {civilianLooks} from '../public/civilian-style.js';
import {dressCivilian} from '../public/civilian-view.js';
import {distantResidents} from '../public/resident-distance-view.js';
import {createRangerRig,poseRig} from '../public/ranger-pose.js';

const ids=['rival-fern','rival-rowan',...brickellResidents.map(resident=>resident.id)];
assert.deepEqual(new Set(Object.keys(civilianLooks)),new Set(ids));
assert.equal(new Set(Object.values(civilianLooks).map(p=>p.face)).size,ids.length);
const material=new THREE.MeshLambertMaterial(), textiles={faces:material,shirts:material};
// The complex art is baked by the scene batcher. Inspect the textured geometry
// directly so a malformed cross-section cannot leave a hole across the face.
class BatchStub { add(){} beam(){} mesh(){} }
const scene=new THREE.Scene(),distant=distantResidents(scene);
const origin={x:0,y:0,z:0};
distant.begin();
for(const [index,id] of ids.entries()){
  const look=civilianLooks[id],rig=createRangerRig();
  dressCivilian(rig,look,BatchStub,material,textiles);
  assert.equal(rig.tools.length,0);
  const face=rig.head.children.find(n=>n.isMesh);
  face.updateMatrixWorld();
  for(const node of [face,rig.upper.children.find(n=>n.isMesh)]){
    for(const attr of Object.values(node.geometry.attributes))assert(attr.array.every(Number.isFinite));
  }
  const ray=new THREE.Raycaster(new THREE.Vector3(.003,.145,-.35),new THREE.Vector3(0,0,1));
  assert(ray.intersectObject(face).length>0,'unbroken surface through the eyes');
  const state={id,x:130+index,y:0,z:12,yaw:0,grounded:true,moving:true};
  assert(distant.add(state,origin,1,0));
  poseRig(rig,state,1/60);
}
distant.finish();
const mesh=scene.children[0];
assert(mesh.count>=ids.length*16 && mesh.count<=mesh.instanceMatrix.count);
distant.begin();
assert.equal(distant.add({...origin,id:ids[0]},origin,1,0),false);
assert.equal(distant.add({...origin,id:ids[1],x:200,dead:true},origin,1,0),false);
distant.finish();assert.equal(mesh.count,0);
console.log('PASS unique civilian roster, textured facial surfaces, unarmed walking rigs and distant crowd capacity.');
