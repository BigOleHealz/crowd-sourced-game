import assert from 'node:assert/strict';
import { MAP, groundHeight, stepPlayer } from '../public/world.js';

function move(state, input, ticks) {
  for (let i=0; i<ticks; i++) state=stepPlayer(state,input,1/30);
  return state;
}

// Cross the rural bank at several angles on the terrain's relief. The prior
// steep rim could admit a swimmer and block their walk out at the same point.
for (const x of [-26,-12,0,12,26]) {
  const start={x,z:32,y:groundHeight(x,32),grounded:true};
  const edge=move(start,{z:1},300);
  assert.equal(edge.z,MAP.bounds);
  assert.equal(edge.vz,0);
  assert.equal(edge.swimming,true);
  assert.ok(Math.abs(edge.y-(MAP.waterY-.72))<.001);
  const landed=move(edge,{z:-1},140);
  assert.equal(landed.grounded,true);
  assert.ok(!landed.swimming && landed.z<33);
}
const water={x:0,z:36,y:MAP.waterY-.72,swimming:true,grounded:false,swimDepth:0};
const bare=stepPlayer(water,{x:1},1/30);
const geared=stepPlayer({...water,scuba:true},{x:1},1/30);
assert.ok(geared.x-bare.x>.03,'flippers increase horizontal swim distance');
assert.ok(geared.vx>bare.vx,'flippers increase swim speed');
const stowed=stepPlayer({...water,scuba:true},{x:1,toggleScuba:true},1/30);
assert.equal(stowed.scuba,undefined);
assert.equal(stowed.vx,bare.vx,'stowing gear restores ordinary swim speed immediately');
console.log('PASS: five rural shore crossings, swimming boundary, surface height and return to land.');
