import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Batch} from '../public/scene.js';
import {jetView} from '../public/jet-view.js';
import {flightRounds} from '../public/round-view.js';

const round={id:1,weapon:'turret',source:'jet',shooter:5,x:15,y:50,z:-45,vx:0,vy:0,vz:-62};
for(const lag of [0,.09]){
  const scene=new THREE.Scene(),jet=jetView(scene,Batch),draw=flightRounds(scene);
  const displayed={pilot:5,x:18-lag*30,y:52,z:-43,pitch:.29,roll:-.60,yaw:.64-lag, speed:31};
  jet.update(displayed,1/60);
  const tip=new THREE.Vector3(),axis=new THREE.Vector3();
  jet.cannonMuzzle(tip,axis);
  const rotation=new THREE.Euler(displayed.pitch,-displayed.yaw,displayed.roll,'YXZ');
  const expected=new THREE.Vector3(-.232,1.03,-2.817).applyEuler(rotation).add(displayed);
  assert.ok(tip.distanceTo(expected)<.00001,'rendered gun follows the banked airframe');
  const matrix=new THREE.Matrix4(),flight=scene.getObjectByName('Flying rounds');
  let captures=0;
  function sample(id,age){
    draw([{...round,id,z:round.z+round.vz*age/30,visualAge:age}],(shooter,weapon,out,source,forward)=>{
      assert.equal(shooter,displayed.pilot);assert.equal(source,'jet');assert.equal(weapon,'turret');
      captures++;
      return jet.cannonMuzzle(out,forward);
    });
    flight.getMatrixAt(0,matrix);
    return new THREE.Vector3().setFromMatrixPosition(matrix);
  }
  assert.ok(sample(1,0).distanceTo(tip)<.00001);
  assert.ok(new THREE.Vector3(0,1,0).transformDirection(matrix).distanceTo(axis)<.00001);
  jet.flashCannon();
  const flash=scene.getObjectByName('Jet cannon flash');
  assert.ok(flash.visible);
  const oldShot=sample(1,1);
  jet.update({...displayed,x:displayed.x+2,yaw:.91,roll:.27},1/60);
  assert.ok(sample(1,1).distanceTo(oldShot)<.00001);
  const nextTip=jet.cannonMuzzle(new THREE.Vector3());
  assert.ok(flash.getWorldPosition(new THREE.Vector3()).distanceTo(nextTip)<.081);
  jet.update(displayed,.1);
  assert.equal(flash.visible,false);
  jet.update({...displayed,x:displayed.x+2,yaw:.91,roll:.27},1/60);
  assert.ok(sample(2,0).distanceTo(nextTip)<.00001);
  assert.ok(sample(2,4).distanceTo(new THREE.Vector3(round.x,round.y,round.z+round.vz*4/30))<.00001);
  assert.equal(captures,2);
}
