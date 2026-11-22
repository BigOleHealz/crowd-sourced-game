import {spiralRoute} from './fixtures/spiral-route.mjs';
import {casaSpiral} from '../public/residential-spirals.js';
import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {blocked,stepPlayer}=await import('../public/world.js');
const {casaRoomAt,casaCeiling}=await import('../public/casa-luma.js');
const {newExpedition}=await import('../public/expedition.js');
const world=newExpedition();
let p={x:-25,y:.8,z:-379,grounded:true};
function walk(x,z,height){
  for(let i=0;i<320;i++){
    const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
    if(d<.085)break;
    p=stepPlayer(p,{x:dx/d*Math.min(1,d*4),z:dz/d*Math.min(1,d*4)},1/30,world.hp,world);
    assert(p.grounded && !p.climb,'walking surface at '+[p.x,p.y,p.z]);
  }
  assert(Math.hypot(x-p.x,z-p.z)<.09,'stuck at '+[p.x,p.y,p.z]+' heading to '+[x,z]);
  if(height!==undefined)assert(Math.abs(p.y-height)<.01,'floor at '+[x,z]+' was '+p.y);
}
// Enter the bedroom from the pool, continue into the gallery and climb the open flight.
walk(-25,-383);walk(-31.55,-383);walk(-31.55,-387);walk(-34.2,-387,1.07);
walk(-34.2,-400);walk(-36.45,-400);walk(-36.45,-403,1.07);
walk(-36.45,-406.05);walk(-28,-406.05);
for(const [x,z] of spiralRoute(casaSpiral))walk(x,z);
assert(casaRoomAt(p.x,p.y,p.z));
walk(-28,-406.05);walk(-28,-403);walk(-13.75,-403);walk(-13.75,-397.6,4.9);
assert(!casaRoomAt(p.x,p.y,p.z));
walk(-13.75,-403);walk(-36.45,-403);walk(-36.45,-397.5,4.9);
// Return to the lower gallery, cross the kitchen and exit its garden doors.
walk(-36.45,-403);walk(-28,-403);walk(-28,-406.05);
for(const [x,z] of spiralRoute(casaSpiral,false))walk(x,z);
walk(-28.8,-403);walk(-13.75,-403);walk(-13.75,-397.3,1.07);
walk(-18.4,-397.3,.8);walk(-18.4,-387);walk(-16.4,-387,1.07);
walk(-18.4,-387);walk(-18.4,-383);walk(-25,-383);walk(-25,-379,.8);
// Cross the narrow promenade beyond the pool and use the central gallery doors.
walk(-25,-383);walk(-31.55,-383);walk(-31.55,-400.15);walk(-25,-400.15);walk(-25,-403,1.07);
walk(-25,-400.15);walk(-31.55,-400.15);walk(-31.55,-397.3);walk(-34.2,-397.3,1.07);
assert(blocked(-39.99,1.07,-391,world.hp,world.doors),'west glazing');
assert(blocked(-37.95,1.07,-388.8,world.hp,world.doors),'bed');
assert(blocked(-14,1.07,-394.3,world.hp,world.doors),'kitchen island');
assert(blocked(-14,4.9,-384.14,world.hp,world.doors),'terrace guard');
assert.equal(casaCeiling(-27.9,1.07,-404),4.25);
console.log('PASS Casa de Luma courtyard, both suites, gallery stair up/down and both roof terraces');
