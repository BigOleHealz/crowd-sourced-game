import {approachPoint} from './helpers/rover-route.mjs';
import assert from 'node:assert/strict';
import {MAP,groundHeight,stepPlayer} from '../public/world.js';
import {newExpedition} from '../public/expedition.js';
import {driveRover} from '../public/rover.js';

const world=newExpedition(),dt=1/30;
assert.equal(MAP.northBound,-90);
assert.equal(MAP.bounds,38);
let hiker={x:MAP.lookout.x,z:MAP.lookout.z,y:groundHeight(MAP.lookout.x,MAP.lookout.z),grounded:true};
const trail=MAP.northTrail;
const circuit=[...trail,...trail.slice(0,2).reverse()];
for(const [x,z] of circuit){
  for(let tick=0;Math.hypot(x-hiker.x,z-hiker.z)>.14;tick++){
    assert(tick<150,'hiker reached '+[x,z]);
    const dx=x-hiker.x,dz=z-hiker.z,d=Math.hypot(dx,dz);
    hiker=stepPlayer(hiker,{x:dx/d,z:dz/d},dt,world.hp,world);
    assert(hiker.grounded && !hiker.swimming);
  }
}
const r=world.rover;
Object.assign(r,{x:0,z:-35,y:groundHeight(0,-35),yaw:0,driver:1});
for(const [x,z] of [...trail.slice(2),[0,-35]]){
  for(let tick=0;;tick++){
    const dx=x-r.x,dz=z-r.z,d=Math.hypot(dx,dz);
    if(d<.35 && r.speed<.08)break;
    assert(tick<1300,'rover reached '+[x,z]+' from '+[r.x,r.z]);
    driveRover(world,approachPoint(r,x,z,5),dt);
    assert.equal(r.hp,250);assert(r.y>MAP.waterY+.5);
  }
}
console.log('PASS grounded lookout / meadow / granite ridge hiking loop and undamaged dry round trip by rover.');
