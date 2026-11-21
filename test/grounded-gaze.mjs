import assert from 'node:assert/strict';
import {advanceGait,newGait} from '../public/locomotion.js';

const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
for(const hz of [30,60,144]){
  for(const direction of [-1,1]){
    // Cross the +/- pi boundary in both directions.
    const start=direction*2.9,end=wrap(start+direction*Math.PI/2);
    const actor={x:0,z:0,yaw:-end},gait=newGait(actor,start);
    const times=[];
    for(let frame=1;frame<=hz;frame++){
      advanceGait(gait,actor,1/hz);
      const chest=gait.yaw+gait.twist,head=chest+gait.neckYaw;
      for(const [index,yaw] of [head,chest,gait.yaw].entries()){
        if(direction*wrap(yaw-start)>.4 && times[index]==null)times[index]=frame/hz;
      }
      assert(Math.abs(gait.twist)<=.57 && Math.abs(gait.neckYaw)<=.72);
    }
    assert(times[0]<times[1] && times[1]<times[2] && times[2]<.2);
    assert(Math.abs(wrap(gait.yaw-end))<.001);
  }
}
console.log('PASS head, shoulders and hips turn in order across either heading seam at 30/60/144 Hz');
