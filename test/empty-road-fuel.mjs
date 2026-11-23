import assert from 'node:assert/strict';

process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {newRivals}=await import('../public/rivals.js');
const {groundHeight}=await import('../public/world.js');
const {driveRover,interactRover}=await import('../public/rover.js');
const {stepTank}=await import('../public/tank.js');
const {driverPrediction}=await import('../public/driver-prediction.js');
const {newCityTraffic,parkedTrafficCar,stepCityTraffic}=await import('../public/city-traffic.js');
const {stepPatrolCruisers}=await import('../public/patrol-cruisers.js');
const {fireEngine,driveWater,stepFireEngines}=await import('../public/fire-engine.js');
const {civilianProfiles}=await import('../public/civilian-fleet.js');
const dt=1/30;

// An open stretch of Harbor Key Crossing, the same lane as the squad sedan.
for(const kind of ['rover','supercar','tank',...Object.keys(civilianProfiles)]){
  const w=newExpedition(),x=-18,z=-206;
  const v=w[kind]??parkedTrafficCar('road-test',kind,x,z);
  if(v.model)w.traffic=[v];
  assert.equal(v.fuel,100);
  Object.assign(v,{driver:1,x,z,y:groundHeight(x,z),yaw:-Math.PI/2,speed:4,fuel:0});
  function step(throttle,steer=0){
    if(kind==='tank')stepTank(w,{throttle,steer},dt);
    else driveRover(w,{throttle,steer},dt,undefined,v.kind??'rover');
  }
  const prediction=driverPrediction(w,1);
  prediction.step({throttle:1},dt);step(1);
  assert.equal(prediction.pose(1).x,v.x,'local and server agree at fuel cutoff');
  assert(v.x<x && v.speed>0 && v.speed<4,kind+' coasts when throttle is held');
  const freeRoll=4-v.speed;
  const speed=v.speed;
  step(-1);
  assert(speed-v.speed>freeRoll,'brakes still work');
  for(let tick=0;tick<80;tick++)step(-1,1);
  assert.equal(v.speed,0,'cannot accelerate backwards');
  const stopped=[v.x,v.z,v.yaw];
  for(let tick=0;tick<15;tick++)step(1,1);
  assert.deepEqual([v.x,v.z,v.yaw],stopped,'cannot accelerate or pivot');
  assert(!v.wrecked && v.driver===1);
  if(kind==='supercar')assert.equal(v.exhaust,0);
  if(v.model)assert.equal(v.engineLoad,0);
  v.fuel=100;step(1);
  assert(v.speed>0,'filling restores power');
  delete v.fuel;const old=v.speed;step(1);
  assert(v.speed>old,'legacy vehicles without a fuel value retain power');
}

{
  const w=newExpedition(),v=w.rover;
  const p={id:17,state:{x:v.x,y:v.y,z:v.z,grounded:true}};
  v.fuel=0;
  interactRover(w,p);assert.equal(v.driver,p.id);
  interactRover(w,p);assert.equal(v.driver,null);
  assert(p.state.grounded,'a stranded driver can leave on foot');
}
{
  const w=newExpedition(),npcs=newRivals();
  const car=newCityTraffic()[0];w.traffic=[car];car.fuel=0;
  for(let t=1;t<600;t++)stepCityTraffic(w,new Map(),npcs,dt,t);
  assert(car.npcDriver && car.speed===0 && car.engineLoad===0);
  const at=[car.x,car.z];
  for(let t=600;t<690;t++)stepCityTraffic(w,new Map(),npcs,dt,t);
  assert.deepEqual([car.x,car.z],at,'AI cannot bypass empty tank');
}
{
  const world={},players=new Map([[7,{state:{x:3,z:1}}]]);
  const officer={id:'officer-0',targetId:7,life:{hp:100},state:{x:3,z:1}};
  const [car]=stepPatrolCruisers(world,[officer],players,0);
  assert.equal(car.fuel,100);car.fuel=0;
  for(let t=1;t<90;t++)stepPatrolCruisers(world,[officer],players,t);
  assert.equal(car.speed,0);assert.equal(car.npcDriver,null);
  officer.life.hp=0;stepPatrolCruisers(world,[officer],players,90);
  assert(world.traffic.includes(car) && car.fuel===0,'handoff preserves empty tank');
}
{
  const engine=fireEngine(),w=newExpedition();
  engine.driver=1;engine.fuel=0;
  driveWater(w,engine,{fire:true,aimYaw:0,aimPitch:0},30);
  assert(!engine.water,'the empty engine cannot power the roof pump');
}
{
  const {fireSite,hitFireSite}=await import('../public/district-fire.js');
  const w=newExpedition(),npcs=newRivals(),site=fireSite('pelican-fuel'),players=new Map();
  w.traffic=[fireEngine()];
  const at={x:site.x-(site.w??0)/2,y:groundHeight(site.x,site.z)+1.5,z:site.z};
  for(let i=0;i<4;i++)hitFireSite(w.doors,site.id,at,0,true,null);
  let tick=120,dispatched;
  while(tick<420 && !dispatched){
    stepFireEngines(w,players,npcs,tick++,dt);
    dispatched=w.traffic.find(car=>car.response==='arriving');
  }
  assert(dispatched);
  dispatched.fuel=0;
  for(let i=0;i<400;i++)stepFireEngines(w,players,npcs,tick++,dt);
  assert.equal(dispatched.speed,0);assert(!dispatched.water);
  const atRest=[dispatched.x,dispatched.z];
  for(let i=0;i<30;i++)stepFireEngines(w,players,npcs,tick++,dt);
  assert.deepEqual([dispatched.x,dispatched.z],atRest);
}
console.log('PASS empty road vehicles coast, brake, exit, and regain motor power after refueling.');
