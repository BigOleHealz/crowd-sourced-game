import assert from 'node:assert/strict';
import {MAP,stepPlayer} from '../public/world.js';
import {cityGround,coastalBedHeight} from '../public/brickell-map.js';

assert.equal(MAP.waterY,-.14,'run this test on the Brickell map');

// The visible apron is higher than the old boat bed here. A diver swimming
// toward shore must stop against it and cannot dive beneath its triangles.
let diver={x:52,z:0,y:-3,swimming:true,swimDepth:2.14,swimAir:120,
  scuba:true,grounded:false,vx:0,vz:0,vy:0};
for(let i=0;i<90;i++){
  diver=stepPlayer(diver,{x:-1,swimY:0},1/30);
  assert(diver.y>=coastalBedHeight(diver.x,diver.z)+.099,'swimmer remains above visible sand');
}
assert(diver.x>48,'submerged swimmer stops before passing through the rising shore');
assert(cityGround(diver.x,diver.z,MAP.waterY)<coastalBedHeight(diver.x,diver.z)-1,
  'boats retain the surveyed deeper bed');

for(let i=0;i<120;i++)diver=stepPlayer(diver,{swimY:-1},1/30);
assert(Math.abs(diver.y-coastalBedHeight(diver.x,diver.z)-.1)<.001,
  'dive depth settles just above the rendered sand');
for(let i=0;i<60;i++)diver=stepPlayer(diver,{swimY:1},1/30);
assert(!diver.swimDepth && diver.swimming,'diver can surface normally beside shore');

let shallow={x:44,z:0,y:MAP.waterY-.72,swimming:true,grounded:false,vx:0,vz:0,vy:0};
shallow=stepPlayer(shallow,{swimY:-1},1/30);
assert(shallow.grounded && !shallow.swimming,'sand above the waterline cannot be dived through');
assert(Math.abs(shallow.y-coastalBedHeight(44,0))<.001,'feet land on visible sand');
shallow=stepPlayer(shallow,{},1/30);
assert(shallow.grounded && Math.abs(shallow.y-coastalBedHeight(44,0))<.001,
  'walking on the apron keeps its support on the next tick');

console.log('PASS submerged swimmer meets the sand apron, descends to its surface and can rise again.');
