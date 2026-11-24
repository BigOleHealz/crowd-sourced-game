import assert from 'node:assert/strict';
import * as THREE from 'three';
import {rigHumveeWheels} from '../public/humvee-wheel-rig.js';

const model=new THREE.Group(),tires=[],fixed=[];
for(const [index,name] of ['Object_33','Object_14','Object_8','Object_11'].entries()){
  const group=new THREE.Group();
  group.position.set(index<2?-2:2,0,index%2===0?-4:4);
  group.rotation.z=index%2===0?.09:Math.PI/2;
  model.add(group);
  const geometry=new THREE.CylinderGeometry(1,1,.55,24);
  if(index%2===0)geometry.rotateZ(Math.PI/2);
  geometry.translate(.8,.15,.3);
  const tire=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());
  tire.name=name;group.add(tire);tires.push(tire);
  const bracket=new THREE.Mesh(new THREE.BoxGeometry(.4,.3,.2),new THREE.MeshBasicMaterial());
  bracket.position.set(-.5,.4,-.3);group.add(bracket);fixed.push(bracket);
}
model.updateMatrixWorld(true);
const center=mesh=>new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
const before=tires.map(center),brackets=fixed.map(center);
const wheels=rigHumveeWheels(model);
assert.equal(wheels.length,4);
for(let i=0;i<4;i++){
  const entry=wheels[i];
  const steer=new THREE.Quaternion().setFromAxisAngle(entry.steerAxis,i%2===0?.23:0);
  const spin=new THREE.Quaternion().setFromAxisAngle(entry.spinAxis,1.17*entry.sign);
  entry.node.quaternion.copy(steer).multiply(spin);
}
model.updateMatrixWorld(true);
for(let i=0;i<4;i++){
  assert(center(tires[i]).distanceTo(before[i])<.025,`tire ${i} orbits its pivot`);
  assert(center(fixed[i]).distanceTo(brackets[i])<1e-6,`fixed suspension ${i} moved`);
}
