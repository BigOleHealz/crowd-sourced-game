import assert from 'node:assert/strict';
import {WakeTrail,wakeCapacity,wakeLife,stepWakeCrossings} from '../public/boat-wakes.js';
const trail=new WakeTrail(),pool=trail.pool;
const a={id:'a',x:0,y:0,z:0,yaw:0,speed:7};
for(let i=0;i<3000;i++){
  const t=i/30;a.x=10*Math.sin(t);a.z=10*Math.cos(t);a.yaw=t+Math.PI/2;
  trail.step(a,1/30);assert(trail.count<=wakeCapacity);
}
assert.equal(trail.pool,pool);assert(Math.abs(trail.at(0).s-trail.at(8).s)>.2);
a.speed=0;trail.step(a,.4);assert(trail.count>1);trail.step(a,wakeLife);assert.equal(trail.count,0);
const b={id:'b',x:6,y:0,z:0,yaw:-.45,speed:5},world={boats:[a,b]};
Object.assign(a,{x:0,z:0,yaw:0,speed:6});let peak=0;
for(let i=0;i<140;i++){
  a.z-=.2;b.x-=.055;b.z-=.15;
  stepWakeCrossings(world,1/30);peak=Math.max(peak,Math.abs(b.wakeRoll??0));
}
assert(peak>.006 && peak<.07);
b.x=99;for(let i=0;i<100;i++)stepWakeCrossings(world,1/30);assert(!b.wakeRoll);
assert(!('trail' in b));console.log('PASS bounded curved trails, decay, crossing roll and unattended cleanup',peak);
