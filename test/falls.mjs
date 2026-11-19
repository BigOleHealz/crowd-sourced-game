import assert from 'node:assert/strict';
import { advanceFall } from '../public/falls.js';
import { newLife, vehicleContacts, damageActor } from '../public/rivals.js';
import { groundHeight } from '../public/world.js';

const dt = 1/30;
function strike(kind, speed, { crew = false, shield = false, altitude = 0 } = {}) {
  const v = { x:0,y:groundHeight(0,15)+altitude,z:15,yaw:0 };
  const world = { rover:{}, heli:{}, [kind]:v };
  const actor = { id:2, yaw:0, life:newLife(0,shield), state:{x:0,y:groundHeight(0,15),z:15,grounded:true} };
  if (crew) v.gunner = actor.id;
  vehicleContacts(world,kind,{ ...v,z:v.z+speed*dt },[actor],0,dt);
  return actor;
}
const reverse = strike('rover', -2.8);
assert(reverse.life.hp > 0 && reverse.life.hp < 100);
assert(reverse.state.vz > 0 && reverse.state.vy > 0);
const start = reverse.state.z;
for (let tick=1;tick<90;tick++) advanceFall(reverse,tick,dt,{});
assert(reverse.state.z > start && reverse.state.grounded);
assert.equal(reverse.state.vz,0);
assert.equal(reverse.life.fall,undefined);

for (const [kind,speed,options] of [['rover',0,{}],['rover',5,{crew:true}],['rover',5,{shield:true}],['heli',5,{altitude:4}]]) {
  const actor = strike(kind,speed,options);
  assert.equal(actor.life.hp,100);
  assert.equal(actor.life.fall,undefined);
}
const airframe = strike('heli',7);
assert.equal(airframe.life.hp,0);
assert.equal(airframe.life.fall.cause,'heli');
assert(airframe.state.vz < 0);

const running = strike('rover',0);
running.state.vx = 5;
damageActor(running,100,12,{x:0,z:1});
assert.equal(running.state.vx,5);
assert.equal(running.life.fall.cause,'defeat');
for(let tick=13;tick<92;tick++) advanceFall(running,tick,dt,{});
assert(running.life.fall.settled && running.state.grounded);
assert.equal(running.state.vx,0);
console.log('PASS: reverse knockdown, recovery, crew, shield, vertical clearance, helicopter collision and inherited defeat momentum.');
