// The same fixed control packets are used by the browser and server.
import assert from 'node:assert/strict';
import { newExpedition } from '../public/expedition.js';
import { driveRover, interactRover, nearestVehicle } from '../public/rover.js';
import { groundHeight, solidTopAt, spawn } from '../public/world.js';

const world=newExpedition(), r=world.rover;
const a={ id:1,state:{...spawn(),x:r.x,y:r.y,z:r.z+1} }, b={id:2,state:{...a.state}};
assert.equal(nearestVehicle(world,a.state),'rover');
assert.equal(nearestVehicle(world,{x:3,y:groundHeight(3,14),z:14,grounded:true}),'heli');
interactRover(world,a); interactRover(world,b); assert.equal(r.driver,1);
const dt=1/30;
function run(throttle,steer,ticks) {
  for(let i=0;i<ticks;i++)driveRover(world,{throttle,steer},dt);
}
run(-1,0,65);run(0,0,15);
assert.equal(r.speed,0);
assert.ok(Math.hypot(r.x+3,r.z-23)<1.3,'reverse into the supply area');
const yaw=Math.atan2(world.heli.x-r.x,r.z-world.heli.z);
run(0,1,Math.round(yaw/(1.55*dt)));
run(1,0,100);
const toHeli=Math.hypot(r.x-world.heli.x,r.z-world.heli.z);
assert.ok(toHeli<4.6 && toHeli>1.5,'approach helicopter without driving through it');
assert.equal(r.speed,0);
r.cargo=3;
interactRover(world,a);
assert.equal(r.cargo,3);
assert.equal(r.driver,null);
assert.ok(a.state.grounded && solidTopAt(a.state.x,a.state.z,world.hp)<=a.state.y+.01);
const before=r.x;run(1,0,30);assert.equal(r.x,before,'empty rover stays parked');
console.log('PASS: exclusive boarding, seat choice, reverse to depot, pivot and drive to helicopter, stop, safe exit and cargo retention.');
