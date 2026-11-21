import assert from 'node:assert/strict';
import {stepPatrolCruisers} from '../public/patrol-cruisers.js';
import {CITY} from '../public/world.js';
const [x,z]=CITY?[3,1]:[-10,8.5];
const world={},players=new Map([[7,{state:{x,z}}]]);
const officers=Array.from({length:3},(_,i)=>({id:'officer-'+i,targetId:7,life:{hp:100},state:{x,z}}));
const start=stepPatrolCruisers(world,officers,players,0).map(c=>({...c}));
assert.equal(start.length,2);assert(officers[0].cruiserId);assert(!officers[2].cruiserId);
let velocity=start[0].speed,lastDoor=1,frames=0,braked=false;
for(let tick=1;tick<360;tick++){
  const [car]=stepPatrolCruisers(world,officers,players,tick);
  assert(Math.abs(car.speed-velocity)<=.19,'bounded longitudinal acceleration');
  if(car.braking && car.speed>1)braked=true;
  if(car.boarding){
    assert.equal(car.speed,0);assert(car.npcDriver && officers[0].cruiserId);
    assert(car.boarding.progress<lastDoor);lastDoor=car.boarding.progress;frames++;
    assert(Number.isFinite(officers[0].state.x));assert(Number.isFinite(car.suspension.pitch));
  }
  velocity=car.speed;
}
assert(braked && frames>=20 && frames<=26);
const [car]=world.patrolCars;
assert.equal(car.npcDriver,null);assert.equal(car.speed,0);assert(!officers[0].cruiserId);
assert(Math.hypot(car.x-start[0].x,car.z-start[0].z)>2);
stepPatrolCruisers(world,[],players,361);assert(!world.patrolCars);
console.log('PASS bounded responding sedans, driving, officer dismount and clear');
