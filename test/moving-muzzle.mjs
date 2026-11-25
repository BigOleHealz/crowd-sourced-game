import assert from 'node:assert/strict';
import * as THREE from 'three';
import {flightRounds} from '../public/round-view.js';

const scene=new THREE.Scene(), draw=flightRounds(scene), mesh=scene.getObjectByName('Flying rounds');
const barrel=new THREE.Vector3(3,1,-.6), matrix=new THREE.Matrix4(), p=new THREE.Vector3();
const bullet={id:1,weapon:1,shooter:7,vx:0,vy:0,vz:-30,x:0,y:1,z:0,age:1};
function sample(age,id=1){
  draw([{...bullet,id,z:-age,visualAge:age}],(_actor,_gun,out)=>out.copy(barrel));
  mesh.getMatrixAt(0,matrix);
  return p.setFromMatrixPosition(matrix);
}
assert.ok(sample(0).distanceTo(barrel)<.00001);
barrel.x=9;
assert.equal(sample(1).x,2.25); // the airborne round was released from the old pose
assert.equal(sample(0,2).x,9); // next shot follows the shooter's new pose
assert.equal(sample(4,2).x,0); // converges on the replicated trajectory
draw([{...bullet,id:3,z:0,visualAge:0}],(_actor,_gun,out)=>out.copy(barrel),7);
mesh.getMatrixAt(0,matrix);
assert.equal(p.setFromMatrixPosition(matrix).x,0); // local round stays on the aim trajectory
draw([],()=>null);
assert.equal(mesh.count,0);
