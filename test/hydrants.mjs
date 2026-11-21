import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hydrants,repairTicks,sprayTicks,stepHydrants} from '../public/hydrants.js';
import {CITY} from '../public/world.js';
const p=hydrants[0],car={...p,yaw:0,speed:0},world={doors:{},traffic:[car]};
stepHydrants(world);assert.equal(world.doors.hydrants,undefined);
car.speed=15;car.y+=2;stepHydrants(world);assert.equal(world.doors.hydrants,undefined);
car.y=p.y;stepHydrants(world);assert.equal(world.doors.hydrants[p.id],repairTicks);
for(let i=0;i<sprayTicks;i++)stepHydrants(world);
assert.equal(world.doors.hydrants[p.id],repairTicks-sprayTicks);
car.speed=0;
for(let i=0;i<repairTicks;i++)stepHydrants(world);
assert.equal(world.doors.hydrants[p.id],1,'does not repair inside a parked car');
car.z+=12;stepHydrants(world);assert.equal(world.doors.hydrants[p.id],undefined);
console.log('PASS roadside hydrant overlap, airborne clearance, spray expiry and unobstructed repair on '+(CITY?'Brickell':'Outpost'));
if(!CITY){
 const r=spawnSync(process.execPath,[fileURLToPath(import.meta.url)],{env:{...process.env,PINEWATCH_MAP:'brickell'},stdio:'inherit'});
 assert.equal(r.status,0);
}
