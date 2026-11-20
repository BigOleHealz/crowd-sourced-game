import assert from 'node:assert/strict';
import {newExpedition} from '../public/expedition.js';
import {driverPrediction} from '../public/driver-prediction.js';
import {flightState,fly} from '../public/airframe.js';
import {driveRover} from '../public/rover.js';
for(const kind of ['rover','heli']){
  const w=newExpedition(),vehicle=w[kind];
  vehicle[kind==='heli'?'pilot':'driver']=1;
  const snapshot=structuredClone(w),v=snapshot[kind];
  if(kind==='heli')v.motion=structuredClone(flightState(vehicle));
  const start=JSON.stringify(snapshot);
  const p=driverPrediction(snapshot,1);
  const cmd={x:0,z:-1,aimYaw:0,lift:1,steer:.1,throttle:1};
  for(let n=0;n<10;n++){
    p.step(cmd,1/30);
    if(kind==='heli')fly(w,cmd,1/30,new Map());else driveRover(w,cmd,1/30,new Map(),kind);
    const pose=p.pose(1);
    for(const k of ['x','y','z','yaw'])assert(Math.abs(pose[k]-vehicle[k])<1e-8);
  }
  assert.equal(JSON.stringify(snapshot),start);
  assert(Math.hypot(p.pose(.5).y-v.y,p.pose(.5).z-v.z)>.01);
}
console.log('PASS local driving and flight move before an acknowledgement and match authoritative physics');
