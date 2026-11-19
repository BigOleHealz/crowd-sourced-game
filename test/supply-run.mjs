import assert from 'node:assert/strict';
import { newExpedition } from '../public/expedition.js';
import { HELIPAD } from '../public/world.js';
import { fly, damageHelicopter, recoverHelicopter, parkedHelicopter } from '../public/airframe.js';
import { DEPOT, OUTPOST, updateSupplyRun, replaySupplyRun, supplyGuidance } from '../public/supply-run.js';

const world = newExpedition();
const dt = 1/30;
const step = (n, fn = () => {}) => {
  for (let i=0;i<n;i++) { fn(); updateSupplyRun(world,dt); }
};
const waitStage = expected => assert.equal(world.mission.stage,expected);
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const at = (obj,point) => Object.assign(obj,point);
const combined = !!world.rover;
world.rover ??= {x:-3,z:17,speed:0,driver:null};
const rover = world.rover;
replaySupplyRun(world);
waitStage('pickup');
assert.equal(supplyGuidance(world,rover,1).label,'Trail rover');

// Drive the shipping route using real rover physics whenever both features are installed.
if (combined) {
  const {driveRover} = await import('../public/rover.js');
  rover.driver = 1;
  step(53,()=>driveRover(world,{throttle:-1,steer:0},dt));
  step(50,()=>driveRover(world,{throttle:0,steer:0},dt));
  assert.ok(distance(rover,DEPOT)<2.4);
  waitStage('transfer');
  const aim = Math.atan2(HELIPAD.x-rover.x,rover.z-HELIPAD.z);
  while (rover.yaw < aim-.05) {
    const prev = rover.yaw;
    step(1,()=>driveRover(world,{throttle:0,steer:1},dt));
    assert.ok(rover.yaw > prev,'rover can turn at the depot');
  }
  for (let i=0;i<150 && distance(rover,HELIPAD)>4;i++)
    step(1,()=>driveRover(world,{throttle:1,steer:0},dt));
  step(50,()=>driveRover(world,{throttle:0,steer:0},dt));
  assert.ok(distance(rover,HELIPAD)<4.6);
  waitStage('delivery');
} else {
  at(rover,DEPOT); step(45); waitStage('pickup');
  rover.driver = 1; rover.speed = 1; step(45); waitStage('pickup');
  rover.speed = 0; step(15); rover.speed = 1; step(1); assert.equal(world.mission.hold,0);
  rover.speed = 0; step(30); waitStage('transfer');
  assert.equal(rover.cargo,3);
  // Disconnecting the driver keeps the cargo available to a teammate.
  rover.driver = null; at(rover,HELIPAD); step(45); waitStage('transfer');
  at(world.heli,OUTPOST); rover.driver = 2; step(45); waitStage('transfer');
  at(world.heli,HELIPAD); world.heli.grounded = false; step(45); waitStage('transfer');
  world.heli.grounded = true; step(30); waitStage('delivery');
}
assert.equal(rover.cargo,0);
assert.equal(world.heli.cargo,3);
damageHelicopter(world,world.heli.maxHp);
step(3); waitStage('delivery');
assert.equal(world.heli.cargo,0);
step(181,()=>recoverHelicopter(world,dt));
assert.equal(world.heli.cargo,3);
// The server replaces a disconnected pilot's aircraft at the H.
world.heli = parkedHelicopter(); step(1); assert.equal(world.heli.cargo,3);
world.heli.pilot = 2; rover.driver = null;
const flight = (x,z,lift) => fly(world,{x,z,lift,aimYaw:0},dt);
step(105,()=>flight(0,0,1));
const h = world.heli;
for (let i=0;i<210 && distance(h,OUTPOST)>0.5;i++) {
  const d = distance(h,OUTPOST);
  step(1,()=>flight((OUTPOST.x-h.x)/d,(OUTPOST.z-h.z)/d,0));
}
step(20,()=>flight(0,0,0));
assert.ok(distance(h,OUTPOST)<1.6);
assert.equal(h.grounded,false);
waitStage('delivery');
step(155,()=>flight(0,0,-1));
assert.ok(h.grounded && !h.wrecked,'real terrain supports an outpost landing');
waitStage('complete'); assert.equal(world.mission.delivered,1);
step(90); assert.equal(world.mission.delivered,1);
assert.equal(supplyGuidance(world,h,2).label,'Delivery complete');
const landing = {x:h.x,z:h.z};
replaySupplyRun(world); replaySupplyRun(world); step(2);
waitStage('pickup'); assert.equal(world.mission.delivered,1);
assert.equal(distance(landing,h),0); assert.equal(h.pilot,2);
assert.equal(supplyGuidance(world,h,2).label,'Trailhead helipad');
console.log('Supply route, cargo recovery, completion and replay passed' + (combined ? ' with real rover and flight physics.' : ' with real flight physics.'));
