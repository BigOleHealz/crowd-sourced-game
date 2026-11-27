import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newExpedition} from '../public/expedition.js';
import {stepJet} from '../public/jet.js';

for(const direction of [-1,1]){
  const world=newExpedition(),jet=world.jet;
  Object.assign(jet,{pilot:1,grounded:false,y:35,speed:20});
  const crew=new Map();
  stepJet(world,{jetRoll:direction},1/30,crew);
  assert(Math.abs(jet.roll-direction*1.6/30)<1e-9,'a tap rolls only one frame');
  for(let frame=1;frame<15;frame++)stepJet(world,{jetRoll:direction},1/30,crew);
  const bank=jet.roll,heading=jet.yaw;
  assert(Math.abs(bank)<1,'a short hold does not force a full rotation');
  stepJet(world,{jetRoll:0},1/30,crew);
  assert.equal(jet.roll,bank,'releasing the key holds the bank angle');
  assert((jet.yaw-heading)*direction<0,'bank turns the plane');
  stepJet(world,{jetRoll:-direction},1/30,crew);
  assert(Math.abs(jet.roll)<Math.abs(bank),'opposite input levels the wings');
  const held=jet.roll;
  stepJet(world,{steer:.5},1/30,crew);
  assert.equal(jet.roll,held,'cursor steering does not level a held bank');
  assert(!jet.wrecked,'rolling preserves flight');
}

const continuous=newExpedition();
Object.assign(continuous.jet,{pilot:1,grounded:false,y:80,speed:20});
for(let frame=0;frame<Math.ceil(Math.PI*2/1.6*30);frame++)
  stepJet(continuous,{jetRoll:1},1/30,new Map());
assert(continuous.jet.roll>=Math.PI*2,'holding the key can complete a full roll');
assert(continuous.jet.roll<Math.PI*2+.06,'the roll stops immediately when released');

const world=newExpedition();
world.jet.pilot=1;
stepJet(world,{jetRoll:1},1/30,new Map());
assert.equal(world.jet.roll,0,'grounded aircraft stays level');
const forward=j=>new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(j.pitch,-j.yaw,j.roll,'YXZ'));
const screenUp=j=>new THREE.Vector3(0,1,0).applyEuler(new THREE.Euler(j.pitch,-j.yaw,j.roll,'YXZ'));
for(const pitch of [.2,1.2,1.5,2.2])for(const roll of [-Math.PI*2,-Math.PI*1.5,-Math.PI,-Math.PI/2,0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2]){
  const base={pilot:1,grounded:false,y:80,speed:20,pitch,yaw:0,roll};
  const neutral=newExpedition();Object.assign(neutral.jet,base);
  stepJet(neutral,{jetPitch:0},1/30,new Map());
  for(const direction of [-1,1]){
    const steered=newExpedition();Object.assign(steered.jet,base);
    stepJet(steered,{jetPitch:direction*.8},1/30,new Map());
    const screenMotion=forward(steered.jet).sub(forward(neutral.jet)).dot(screenUp(base));
    assert(screenMotion*direction>.005,
      'cursor pitch moves the nose toward the cursor through either barrel roll');
  }
}
console.log('PASS jet roll follows held A/D input, holds bank on release, and turns with bank');
