import assert from 'node:assert/strict';

process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {newRivals,newLife,updateRival}=await import('../public/rivals.js');
const {roadway}=await import('../public/brickell-map.js');
const {roadContact}=await import('../public/road-contact.js');
const {driveRover,drivenRoad,damageRover}=await import('../public/rover.js');
const {civilianProfiles}=await import('../public/civilian-fleet.js');
const {newCityTraffic,syncTrafficDrivers,stepCityTraffic,trafficDriverCar,tryTrafficInteract,
  nearestTraffic,drivenTraffic,driveTrafficCar,leaveTraffic}=await import('../public/city-traffic.js');
const dt=1/30;
function setup(){
  const world=newExpedition(),npcs=newRivals(),players=new Map();
  world.traffic=newCityTraffic();syncTrafficDrivers(world,npcs);
  let tick=0;
  function step(){
    for(const npc of npcs)if(!trafficDriverCar(world,npc.id))updateRival(npc,tick,dt,world.hp,world);
    stepCityTraffic(world,players,npcs,dt);
    tick++;
  }
  return {world,npcs,players,step};
}
{
  const {world,step}=setup();
  const travelled=world.traffic.map(()=>0);
  // Include time spent at the coordinated lights along the shopping circuit.
  for(let tick=0;tick<6600;tick++){
    const before=world.traffic.map(c=>({...c}));
    step();
    for(const [i,c] of world.traffic.entries()){
      travelled[i]+=Math.hypot(c.x-before[i].x,c.z-before[i].z);
      if(tick%8)continue;
      const {halfWidth:w,halfLength:l}=civilianProfiles[c.model];
      for(const side of [-w,w])for(const along of [-l,l]){
        const x=c.x+side*Math.cos(c.yaw)-along*Math.sin(c.yaw);
        const z=c.z+side*Math.sin(c.yaw)+along*Math.cos(c.yaw);
        assert(roadway(x,z),'Every tire remains on pavement on the full circuit');
      }
      assert(!roadContact(world,c.x,c.z,c.yaw,c.x,c.z,c),'Traffic route must clear curb, scenery and vehicles');
    }
  }
  assert(travelled.every(d=>d>520),'Every driver covers the required distance, including the turn approaching the parked jet');
}
{
  const {world,players,step,npcs}=setup(),car=world.traffic[0],originalNpc=car.npcDriver;
  const snapshot=structuredClone([world.rover,world.supercar,world.jet]);
  const a={id:1,life:newLife(0),state:{x:car.x,y:car.y,z:car.z-8,grounded:true}};
  players.set(a.id,a);
  assert.equal(tryTrafficInteract(world,a,npcs),false);
  for(let i=0;i<90;i++)step();
  assert.equal(car.speed,0);assert(car.z>a.state.z+2);
  const stop=car.z;
  a.state.x+=4;
  for(let i=0;i<38;i++)step();
  assert(car.speed>0 && car.z<stop,'Crossing clear releases brakes');
  Object.assign(a.state,{x:car.x,z:car.z-5});
  for(let i=0;i<90;i++)step();
  assert.equal(nearestTraffic(world,a.state),car);
  const b={...a,id:2,life:newLife(0),state:{...a.state}};players.set(2,b);
  assert(tryTrafficInteract(world,a,npcs));assert(!tryTrafficInteract(world,b,npcs));
  const resident=npcs.find(n=>n.id===originalNpc);
  assert.equal(car.takeover.npcId,resident.id);assert.equal(car.driver,1);
  assert.equal(car.npcDriver,null);
  const z=car.z,startX=resident.state.x;
  for(let i=0;i<12;i++){driveTrafficCar(world,car,{throttle:1},dt,players);step();}
  assert.equal(car.z,z);assert(resident.state.x<startX-.1);
  const late=JSON.parse(JSON.stringify(car));assert.equal(late.takeover.playerId,1);assert(late.takeover.progress>.3);
  for(let i=0;i<27;i++)step();
  assert.equal(car.takeover,null);assert.equal(trafficDriverCar(world,originalNpc),null);
  assert(resident.life.hp>0 && resident.state.grounded);
  assert.equal(drivenRoad(world,1),car);
  for(let i=0;i<30;i++)driveTrafficCar(world,car,{throttle:1},dt,players);
  assert(car.z<z-1);assert.equal(1,car.engineLoad);
  assert(leaveTraffic(world,a));assert.equal(car.driver,null);assert.equal(car.speed,0);
  b.state={...a.state};assert(tryTrafficInteract(world,b,npcs));assert.equal(car.takeover,null);
  assert.equal(drivenTraffic(world,2),car);
  b.inputs=[];damageRover(world,251,players,car.id);
  assert.equal(car.driver,null);assert(car.wrecked);assert.equal(car.hp,0);
  const berth={x:35.7,z:2,y:.7,grounded:true};
  a.state={...berth};
  for(let i=0;i<200;i++)step();
  assert(car.wrecked,'An occupied recovery bay must stay clear');
  a.state.x+=7;
  for(let i=0;i<5;i++)step();
  assert(!car.wrecked && car.hp===car.maxHp && car.id==='city-car-1' && car.npcDriver===null);
  assert.equal(car.x,berth.x);assert.equal(car.z,berth.z);
  assert.deepEqual([world.rover,world.supercar,world.jet],snapshot);
}
{
  const {world,players,npcs,step}=setup(),car=world.traffic[0];
  const a={id:7,life:newLife(0),inputs:[],state:{x:car.x,y:car.y,z:car.z-4,grounded:true}};
  players.set(a.id,a);
  for(let i=0;i<60;i++)step();
  assert(tryTrafficInteract(world,a,npcs));
  const npc=car.takeover.npcId;
  for(let i=0;i<5;i++)step();
  leaveTraffic(world,a);players.delete(a.id);
  const replacement={...a,state:{...a.state}};players.set(a.id,replacement);
  assert.equal(car.driver,null);
  assert.equal(car.takeover.playerId,null,'Reused network slot cannot inherit the departing player animation');
  assert(!tryTrafficInteract(world,replacement,npcs),'Reservation spans the remaining ejection');
  for(let i=0;i<30;i++)step();
  assert.equal(car.takeover,null);
  assert(npcs.find(n=>n.id===npc).state.grounded);
  assert(tryTrafficInteract(world,replacement,npcs));assert.equal(car.npcDriver,null);
}
{
  const {world,players,npcs,step}=setup(),car=world.traffic[0];
  const p={id:3,life:newLife(0),inputs:[],state:{x:car.x,y:car.y,z:car.z-4,grounded:true}};
  players.set(3,p);
  for(let i=0;i<60;i++)step();
  assert(tryTrafficInteract(world,p,npcs));
  const resident=car.takeover.npcId;
  damageRover(world,car.hp,players,car.id);
  assert(car.wrecked && car.driver===null && car.takeover.playerId===null);
  assert(!tryTrafficInteract(world,p,npcs));
  for(let i=0;i<40;i++)step();
  assert.equal(car.takeover,null);assert(npcs.find(n=>n.id===resident).life.hp>0);
}
{
  const samples=[];
  for(let i=0;i<3;i++){
    const {world}=setup(),car=world.traffic[i];world.traffic=[car];
    Object.assign(car,{x:3,z:12,y:.7,yaw:0,speed:0,driver:1,npcDriver:null});
    for(let t=0;t<20;t++)driveRover(world,{throttle:1},dt,null,car.id);
    const speed=car.speed;
    driveRover(world,{steer:1},dt,null,car.id);
    const brake=speed-car.speed,turn=car.yaw;
    Object.assign(car,{x:30,z:65,yaw:0,speed:0,lateralSpeed:0});
    for(let t=0;t<135;t++)driveRover(world,{throttle:1},dt,null,car.id);
    const topSpeed=car.speed;
    assert.equal(topSpeed,civilianProfiles[car.model].topSpeed);
    Object.assign(car,{x:3,z:12,yaw:0,speed:10,lateralSpeed:0});
    for(let t=0;t<60;t++)driveRover(world,{},dt,null,car.id);
    assert.equal(car.speed,0);
    samples.push({model:car.model,speed,brake,turn,topSpeed,stoppingDistance:12-car.z});
  }
  const [sedan,hatch,van]=samples;
  assert(sedan.topSpeed>hatch.topSpeed && hatch.topSpeed>van.topSpeed);
  assert(hatch.stoppingDistance<sedan.stoppingDistance && sedan.stoppingDistance<van.stoppingDistance);
  for(const key of ['speed','brake','turn'])assert(hatch[key]>sedan[key] && sedan[key]>van[key]);
}
console.log('PASS three civilian models keep circulating on legal roads, stop and resume for a crossing, arbitrate one driver, animate and retain the NPC, and use distinct shared driving dynamics.');
