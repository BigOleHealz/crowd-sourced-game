import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

if(process.env.GOY_THEFT_AUTO_MAP!=='brickell'){
  execFileSync(process.execPath,[fileURLToPath(import.meta.url)],{
    env:{...process.env,GOY_THEFT_AUTO_MAP:'brickell'},stdio:'inherit'});
}else{
  const {newExpedition}=await import('../public/expedition.js');
  const {militaryHelipads}=await import('../public/military-island.js');
  const {fly,interact,damageHelicopter,recoverHelicopter}=await import('../public/airframe.js');
  const {nearestVehicle}=await import('../public/rover.js');
  const {gunnerVehicle,vehicleById}=await import('../public/mounts.js');
  const {driverPrediction}=await import('../public/driver-prediction.js');
  const world=newExpedition();
  assert.notEqual(world.heli,world.heli2);
  for(const [kind,pad] of [['heli',militaryHelipads[0]],['heli2',militaryHelipads[1]]]){
    assert.deepEqual([world[kind].x,world[kind].z],[pad.x,pad.z]);
    assert.equal(nearestVehicle(world,{...world[kind],grounded:true}),kind);
  }
  const pilot={id:101,state:{...world.heli2,grounded:true},inputs:[]};
  const gunner={id:102,state:{...world.heli2,grounded:true},inputs:[]};
  const players=new Map([[pilot.id,pilot],[gunner.id,gunner]]);
  interact(world,pilot,'heli2');interact(world,gunner,'heli2');
  assert.equal(world.heli2.pilot,pilot.id);
  assert.equal(world.heli2.gunner,gunner.id);
  assert.equal(gunnerVehicle(world,gunner.id),'heli2');
  assert.equal(vehicleById(world,'heli2'),world.heli2);
  const predictor=driverPrediction(world,pilot.id);
  assert.equal(predictor.kind,'heli2');
  predictor.step({x:0,z:0,lift:1,aimYaw:0},1/30);
  assert.equal(world.heli2.y,world.heli.y,'client prediction leaves authoritative state alone');
  for(let i=0;i<30;i++)fly(world,{x:0,z:0,lift:1,aimYaw:0},1/30,players,'heli2');
  assert(world.heli2.y>world.heli.y+1,'second craft takes off independently');
  assert.equal(world.heli.pilot,null);
  assert.equal(world.heli.hp,500);
  damageHelicopter(world,500,players,null,undefined,undefined,'heli2');
  assert(world.heli2.wrecked);
  assert.equal(world.heli.hp,500);
  for(let i=0;i<180;i++)recoverHelicopter(world,1/30,players,'heli2');
  assert.deepEqual([world.heli2.x,world.heli2.z],[militaryHelipads[1].x,militaryHelipads[1].z]);
  assert.equal(world.heli2.hp,500);
  console.log('PASS independent military helicopters, crew, flight, damage and second-pad recovery.');
}
