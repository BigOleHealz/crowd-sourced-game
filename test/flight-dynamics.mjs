import assert from 'node:assert/strict';
import { parkedHelicopter, fly } from '../public/airframe.js';
function maneuver(hz) {
  const world={heli:parkedHelicopter(),hp:{}}, h=world.heli;
  const hold=(seconds,input={})=>{
    for(let i=0;i<Math.round(seconds*hz);i++) fly(world,{x:0,z:0,lift:0,aimYaw:0,...input},1/hz);
  };
  hold(2,{lift:1});
  const start=h.x;
  hold(.5,{x:1});
  assert.ok(h.roll<-.15 && h.x>start && h.x<start+2);
  const release=h.x;
  hold(.3);
  assert.ok(h.x>release+.5 && h.roll>0,'counter-bank brakes existing drift');
  hold(3);
  const hover=h.x;
  hold(1,{aimYaw:Math.PI/2});
  assert.ok(Math.abs(h.x-hover)<.02 && Math.abs(h.roll)<.01);
  assert.ok(h.yaw>1.3 && h.yaw<=Math.PI/2+.02);
  return h.x-start;
}
assert.ok(Math.abs(maneuver(30)-maneuver(120))<.15);
console.log('PASS: bank response, momentum, counter-bank, hover, yaw and timestep consistency');
