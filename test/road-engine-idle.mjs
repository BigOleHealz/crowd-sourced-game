import assert from 'node:assert/strict';
import {Group} from 'three';
import {roadEngineIdle} from '../public/road-engine-idle.js';
const signatures=new Set();
for(const model of ['jeep','pickup','supercar','sedan','hatchback','van']){
  const body=new Group(),idle=roadEngineIdle(model,'test'),car={speed:0,driver:null,npcDriver:null};
  function sample(){body.position.y=.07;body.rotation.set(.02,0,-.03);idle(body,car,1/60);return body.position.y-.07;}
  assert.equal(sample(),0);
  car.npcDriver='resident';const trace=Array.from({length:180},sample);
  assert(Math.max(...trace)>.001 && Math.max(...trace)<.006);
  assert(Math.min(...trace)<-.001 && Math.min(...trace)>-.006);signatures.add(trace.slice(-12).join(','));
  car.npcDriver=null;for(let i=0;i<60;i++)sample();assert.equal(sample(),0);
  car.driver=1;car.speed=25;assert.equal(sample(),0);
  car.speed=0;car.wrecked=true;assert.equal(sample(),0);
  car.wrecked=false;car.bridgeFlight={};assert.equal(sample(),0);
}
assert.equal(signatures.size,6);
console.log('PASS distinct six-model idle waveforms, millimetre travel, empty, rolling, airborne and wrecked vehicles.');
