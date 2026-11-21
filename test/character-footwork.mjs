import assert from 'node:assert/strict';
import {newGait,newFoot,advanceGait,placeFoot,bootSupport} from '../public/locomotion.js';
for(const rate of [30,60,144]){
  const dt=1/rate,state={x:0,z:0,yaw:0},g=newGait(state,0),feet=[newFoot(),newFoot()];
  let contacts=0,turnLift=0;
  function frame(speed,yaw){
    state.z-=speed*dt;state.yaw=yaw;advanceGait(g,state,dt);
    feet.forEach((foot,i)=>{
      const old={...foot};placeFoot(g,foot,i?1:-1);
      if(g.weight>.95 && old.planted && foot.planted){
        assert(Math.hypot(foot.wx-old.wx,foot.wz-old.wz)<.001);contacts++;
      }
    });
  }
  for(let i=0;i<rate;i++)frame(6.8,0);
  assert(contacts>6);
  for(let i=0;i<rate;i++)frame(0,0);
  assert(!g.finishStep && feet.every(f=>f.lift<.001));
  for(let i=0;i<rate;i++){frame(0,Math.PI*(i+1)/rate);turnLift=Math.max(turnLift,...feet.map(f=>f.lift));}
  assert(turnLift>.075,'visible stepping as body turns');
}
const boot={wx:0,wz:0};
assert.equal(bootSupport(boot,1,0,{},()=>.82),-.18000000000000005);
boot.wz=1;bootSupport(boot,1,0,{},(x,z)=>1-(z-1)*.25);assert(Math.abs(boot.floorPitch-Math.atan(.25))<.0001);
boot.wz=2;bootSupport(boot,1,0,{},(x,z)=>z<2?1.18:1);assert.equal(boot.floorPitch,0);
console.log('PASS planted boots, stair and slope support, alternating turn steps and sprint settling at 30/60/144 Hz');
