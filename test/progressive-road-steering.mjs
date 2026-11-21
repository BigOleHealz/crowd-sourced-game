import assert from 'node:assert/strict';
import {steerRoadWheels,frontWheelAngle} from '../public/road-steering.js';

for(const model of ['rover','supercar','sedan','van','hatchback']){
 for(const fps of [30,60,120]){
  const car={model,kind:model},dt=1/fps;
  function sample(speed){
    car.speed=speed;car.steer=0;
    for(let t=0;t<2*fps;t++)steerRoadWheels(car,1,dt);
    return frontWheelAngle(car);
  }
  const parking=sample(2),cruise=sample(12),fast=sample(25);
  assert(parking>.55 && cruise<parking*.55 && fast<cruise*.5);
  car.steer=0;const tap=steerRoadWheels(car,1,dt)*dt;
  assert(tap>0 && tap<.008,'a brief steering tap at speed is fine grained');
  const held=car.steer;
  steerRoadWheels(car,0,dt);assert(car.steer>0 && car.steer<held);
  for(let t=0;t<2*fps;t++)steerRoadWheels(car,0,dt);
  assert.equal(car.steer,0);
  car.speed=2;car.steer=1;const forward=steerRoadWheels(car,1,dt);
  car.speed=-2;car.steer=1;assert.equal(steerRoadWheels(car,1,dt),-forward);
 }
}
console.log('PASS parking lock, progressively finer high-speed corrections, smooth turn-in and return at 30/60/120 Hz, and mirrored reverse arcs for every wheeled model.');
