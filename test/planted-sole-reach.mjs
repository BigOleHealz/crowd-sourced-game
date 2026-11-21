import assert from 'node:assert/strict';
import {bootSupport,fitPlantedBoot} from '../public/locomotion.js';
const g={x:0,z:0,yaw:0,pelvisY:-.10,pelvisX:.01},leg={x:.108,y:.975};
for(const grade of [-.43,-.19,0,.19,.43])for(const stride of [-.71,.71]){
  const floor=(x,z)=>2+grade*z,foot={planted:true,sideOffset:.12,forwardOffset:stride,wx:.12,wz:stride};
  fitPlantedBoot(g,foot,leg,2,1,{},floor);
  const down=leg.y+g.pelvisY-.126-bootSupport(foot,2,0,{},floor);
  assert(Math.hypot(down,foot.forwardOffset,foot.sideOffset-leg.x-g.pelvisX)<=.8001);
  assert(Math.sign(stride)===Math.sign(foot.forwardOffset));
  assert.equal(foot.wz,foot.forwardOffset);
}
const reachable={planted:true,sideOffset:.12,forwardOffset:.03,wx:.12,wz:.03};
fitPlantedBoot(g,reachable,leg,2,1,{},()=>2);
assert.equal(reachable.forwardOffset,.03);
console.log('PASS physical planted-foot reach on level and +/-19%/43% grades, preserving reachable steps.');
