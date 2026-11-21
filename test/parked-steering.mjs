import assert from 'node:assert/strict';
import {newExpedition} from '../public/expedition.js';
import {newCityTraffic} from '../public/city-traffic.js';
import {driveRover} from '../public/rover.js';
import {driverPrediction} from '../public/driver-prediction.js';
import {stepTank} from '../public/tank.js';
import {CITY} from '../public/world.js';

const keys=['rover','sedan','hatchback','van'];
if(CITY)keys.push('supercar');
for(const key of keys){
  const w=newExpedition();w.traffic=newCityTraffic();
  const car=w[key]??w.traffic.find(v=>v.model===key);
  Object.assign(car,{driver:1,npcDriver:null,x:0,z:CITY?-186:0,speed:0,lateralSpeed:0,yaw:.14});
  const original=[car.x,car.z,car.yaw],driver=driverPrediction(w,1);
  for(const steer of [1,-1,0]){
    for(let i=0;i<90;i++){
      const input={steer,throttle:0};
      driveRover(w,input,1/30,undefined,car.kind);
      driver.step(input,1/30);
    }
    assert.deepEqual([car.x,car.z,car.yaw],original,key);
    assert.equal(car.lateralSpeed,0,key);
    assert.equal(car.steer,steer,key);
    assert.equal(driver.pose(1).steer,steer,key);
    assert.equal(driver.pose(1).yaw,original[2],key);
  }
}
if(CITY){
  const w=newExpedition(),tank=w.tank;tank.driver=1;
  const yaw=tank.yaw;for(let i=0;i<30;i++)stepTank(w,{steer:1},1/30);
  assert(Math.abs(yaw-tank.yaw)>.4);
}
console.log('PASS wheeled drivers and local prediction hold position and yaw through prolonged stationary steering; tank retains pivot turning.');
