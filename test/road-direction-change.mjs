import assert from 'node:assert/strict';
import {newExpedition} from '../public/expedition.js';
import {newCityTraffic} from '../public/city-traffic.js';
import {driveRover} from '../public/rover.js';
import {driverPrediction} from '../public/driver-prediction.js';
import {CITY} from '../public/world.js';

for(const key of ['rover','sedan','hatchback','van',...(CITY?['supercar']:[])])
for(const sign of [-1,1]){
  const w=newExpedition();w.traffic=newCityTraffic();
  const car=w[key]??w.traffic.find(v=>v.model===key);
  Object.assign(car,{x:0,z:CITY?-187:0,yaw:0,speed:sign*1.1,lateralSpeed:0,driver:1,npcDriver:null});
  const input={steer:1,throttle:-sign},dt=1/30;
  let rest,stillTicks=0;
  for(let i=0;i<50;i++){
    const predicted=driverPrediction(w,1);
    driveRover(w,input,dt,undefined,car.kind);
    predicted.step(input,dt);
    const pose=predicted.pose(1);
    for(const field of ['x','z','yaw'])assert(Math.abs(pose[field]-car[field])<1e-9,field);
    if(car.speed===0){
      rest??=[car.x,car.z,car.yaw];
      assert.deepEqual([car.x,car.z,car.yaw],rest,key);
      assert(car.braking);stillTicks++;
    }else if(sign*car.speed<0)break;
  }
  assert(stillTicks>=9 && stillTicks<=11,key+' '+stillTicks);
  assert(sign*car.speed<0 && !car.braking,key);
  car.speed=sign*.1;
  driveRover(w,input,dt,undefined,car.kind);assert.equal(car.speed,0);
  driveRover(w,{throttle:0},dt,undefined,car.kind);
  driveRover(w,input,dt,undefined,car.kind);
  assert(sign*car.speed<0,'separate keypress can engage immediately');
}
console.log('PASS all road transmissions brake to a stable stop, pause on held pedal and engage reverse/first with prediction parity.');
