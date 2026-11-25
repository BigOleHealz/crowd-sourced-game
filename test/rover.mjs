// The same fixed control packets are used by the browser and server.
import assert from 'node:assert/strict';
import { newExpedition, fire, advanceRounds, tracePulse } from '../public/expedition.js';
import { driveRover, interactRover, nearestVehicle, recoverRover } from '../public/rover.js';
import { MAP, groundHeight, solidTopAt, spawn } from '../public/world.js';

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
const parkedYaw=r.yaw;run(0,1,30);assert.equal(r.yaw,parkedYaw);
for(let i=0;i<115;i++){
  const target=Math.atan2(world.heli.x-r.x,r.z-world.heli.z);
  const error=Math.atan2(Math.sin(target-r.yaw),Math.cos(target-r.yaw));
  run(.50,Math.max(-1,Math.min(1,error*3)),1);
}
const toHeli=Math.hypot(r.x-world.heli.x,r.z-world.heli.z);
assert.ok(toHeli<4.6 && toHeli>1.5,'approach helicopter without driving through it');
assert.equal(r.speed,0);
r.cargo=3;
interactRover(world,a);
assert.equal(r.cargo,3);
assert.equal(r.driver,null);
assert.ok(a.state.grounded && solidTopAt(a.state.x,a.state.z,world.hp)<=a.state.y+.01);
const before=r.x;run(1,0,30);assert.equal(r.x,before,'empty rover stays parked');
console.log('PASS: exclusive boarding, seat choice, reverse to depot, steer a moving approach to helicopter, stop, safe exit and cargo retention.');

const fight=newExpedition(), car=fight.rover;
assert.equal(car.hp,250); assert.equal(car.maxHp,250);
assert.equal(fight.heli.hp,500); assert.equal(fight.heli.maxHp,500);
const driver={id:2,life:{hp:100},inputs:[],state:{...car,grounded:true}};
const shooter={id:1,life:{hp:100},weapon:1,fireReady:0,state:{x:car.x,y:car.y,z:car.z+4}};
const players=new Map([[1,shooter],[2,driver]]);
interactRover(fight,driver);
const shot={aimYaw:0,aimPitch:0};
function fireAtRover(tick) {
  fire(fight,shooter,shot,tick,players,[]);
  for(let t=tick;t<tick+6;t++) advanceRounds(fight,players,[],t);
}
fireAtRover(30);
assert.equal(car.hp,225);
assert.equal(fight.shots.at(-1).targetId,'rover');
shooter.weapon=2;
for(let n=1;n<=6;n++) fireAtRover(30+21*n);
assert.equal(car.hp,0); assert(car.wrecked); assert.equal(car.driver,null);
assert.equal(driver.life.hp,0); assert.equal(driver.life.deathKind,'blast');
interactRover(fight,driver); assert.equal(car.driver,null);
for(let n=0;n<180;n++) recoverRover(fight,dt);
assert.equal(fight.rover.hp,250); assert.equal(fight.rover.wrecked,false);
const tree=MAP.trees.find(t=>t.height>2);
const from={x:tree.x,y:groundHeight(tree.x,tree.z)+1,z:tree.z+2};
const hpBefore={...fight.hp};
for(let n=0;n<20;n++){
  const hit=tracePulse(fight,[],from,{x:0,y:0,z:-1},12);
  assert.equal(hit.hitKind,null); assert.ok(hit.to.z>tree.z-.3);
}
assert.deepEqual(fight.hp,hpBefore);
console.log('PASS: rover carbine and sidearm damage, driver ejection, six-second recovery and indestructible tree cover.');
