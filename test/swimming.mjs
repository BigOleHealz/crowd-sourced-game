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
console.log('PASS: five rural shore crossings, swimming boundary, surface height and return to land.');
