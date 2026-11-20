import assert from 'node:assert/strict';
import {church,churchRoom} from '../public/ridge-church.js';
import {MAP,groundHeight,buildingTopAt,stepPlayer} from '../public/world.js';
import {newExpedition} from '../public/expedition.js';
const world=newExpedition(), dt=1/30;
let p={x:5,z:-47,y:groundHeight(5,-47),grounded:true};
function walk(x,z){
  for(let i=0;i<250;i++){
    const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
    if(d<.13)return;
    p=stepPlayer(p,{x:dx/d,z:dz/d},dt,world.hp,world);
  }
  assert.fail('Stopped at '+JSON.stringify(p)+' walking to '+[x,z]);
}
const route=[[0,-50],[0,-54],[0,-62],[0,-65],[-1.35,-66.8],[-1.35,-72.55],[1.35,-72.55],[1.35,-66.85],[-1.35,-66.85],[-1.35,-70]];
for(const [x,z] of route)walk(x,z);
assert(Math.abs(p.y-church.base-7.24)<.02 && churchRoom(p.x,p.y,p.z),'walk to open belfry');
assert(buildingTopAt(-2.74,-70,0,p.y+1.3)<p.y+1.3,'standing sightline over rail');
for(const [x,z] of [...route].reverse())walk(x,z);
walk(5,-47);assert(p.grounded && !p.swimming);
assert(MAP.trees.every(t=>Math.abs(t.x)>5.5 || t.z< -74 || t.z> -52.4));
console.log('PASS walk from the trail through the nave, ascend both belfry flights, sightline and walk back out');
