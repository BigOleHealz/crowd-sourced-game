import assert from 'node:assert/strict';
import {advanceGait,newGait} from '../public/locomotion.js';

for(const hz of [30,60,144]){
  function cut(speed,side){
    const actor={x:0,z:0,yaw:0},gait=newGait(actor,0);
    let peak=0,vx=0,vz=0;
    for(let i=0;i<hz*3;i++){
      // Look sideways, then back ahead, while still running straight.
      actor.yaw=i>hz/2 && i<hz*.85 ? .7 : 0;
      const beforeCut=i<hz*1.5;
      const tx=beforeCut?0:side*speed,tz=beforeCut?-speed:0;
      const blend=Math.min(1,37/hz/Math.hypot(tx-vx,tz-vz));
      vx+=(tx-vx)*blend;vz+=(tz-vz)*blend;
      actor.x+=vx/hz;actor.z+=vz/hz;
      advanceGait(gait,actor,1/hz);
      if(i>hz/2 && i<hz*1.45)assert(Math.abs(gait.bank)<.012);
      if(i>=hz*1.5)peak=Math.max(peak,-side*gait.bank);
    }
    assert(Math.abs(gait.bank)<.002 && Math.abs(gait.brace)<.002);
    return peak;
  }
  for(const side of [-1,1]){
    const walk=cut(4.6,side),sprint=cut(7.4,side);
    assert(sprint>.20 && sprint<=.25 && walk<sprint*.5);
  }
}
console.log('PASS sprint cuts load either side, walking cuts stay subtle, looking and straight travel settle');
