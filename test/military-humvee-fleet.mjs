import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

if(process.env.GOY_THEFT_AUTO_MAP!=='brickell'){
  execFileSync(process.execPath,[fileURLToPath(import.meta.url)],{
    env:{...process.env,GOY_THEFT_AUTO_MAP:'brickell'},stdio:'inherit'});
}else{
  const {newExpedition}=await import('../public/expedition.js');
  const {roverKinds,nearestVehicle,interactRover,driveRover,damageRover,recoverRover,MILITARY_ROVER_PADS}=await import('../public/rover.js');
  const {gunnerVehicle,vehicleById}=await import('../public/mounts.js');
  const {driverPrediction}=await import('../public/driver-prediction.js');
  const {militaryRunway,militaryHangars,militaryHelipads,militaryAccessRoad}=await import('../public/military-island.js');
  const world=newExpedition(),players=new Map();
  assert.deepEqual(roverKinds,['rover','rover2','rover3']);
  for(const kind of ['rover2','rover3']){
    const car=world[kind],pad=MILITARY_ROVER_PADS[kind];
    assert.deepEqual([car.x,car.z],[pad.x,pad.z]);
    assert(car.x>militaryRunway.east+3 && car.z>militaryAccessRoad.south+3);
    assert(militaryHangars.every(h=>Math.hypot(car.x-h.x,car.z-h.z)>h.w/2+4));
    assert(militaryHelipads.every(h=>Math.hypot(car.x-h.x,car.z-h.z)>h.r+3));
    assert.equal(nearestVehicle(world,{...car,grounded:true}),kind);
    const player={id:kind==='rover2'?101:102,state:{x:car.x,y:car.y,z:car.z,grounded:true},inputs:[]};
    players.set(player.id,player);
    interactRover(world,player,kind);
    assert.equal(car.driver,player.id);
    assert.equal(vehicleById(world,kind),car);
    assert.equal(driverPrediction(world,player.id).kind,kind);
  }
  const second=world.rover2,third=world.rover3,otherStart={x:third.x,z:third.z};
  for(let i=0;i<45;i++)driveRover(world,{throttle:1},1/30,players,'rover2');
  assert(Math.hypot(second.x-MILITARY_ROVER_PADS.rover2.x,second.z-MILITARY_ROVER_PADS.rover2.z)>1);
  assert.deepEqual([third.x,third.z],[otherStart.x,otherStart.z],'other driver stays parked');
  for(let i=0;i<45;i++)driveRover(world,{throttle:1},1/30,players,'rover3');
  assert(Math.hypot(third.x-otherStart.x,third.z-otherStart.z)>1,'both bays have an independent pullout');
  const gunner={id:103,state:{x:third.x,y:third.y,z:third.z,grounded:true},inputs:[]};
  players.set(gunner.id,gunner);interactRover(world,gunner,'rover3');
  assert.equal(third.gunner,gunner.id);
  assert.equal(gunnerVehicle(world,gunner.id),'rover3');
  damageRover(world,third.hp,players,'rover3');
  assert(third.wrecked && !second.wrecked);
  for(let i=0;i<180;i++)recoverRover(world,1/30,'rover3');
  assert.equal(world.rover3.wrecked,false);
  assert.deepEqual([world.rover3.x,world.rover3.z],[otherStart.x,otherStart.z]);
  assert.equal(world.rover2.driver,101);
  console.log('PASS two additional independent drivable Humvees, seats, prediction, damage and recovery.');
}
