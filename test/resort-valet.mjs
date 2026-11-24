import assert from 'node:assert/strict';

process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {newLife}=await import('../public/rivals.js');
const {groundHeight}=await import('../public/world.js');
const {roadContact}=await import('../public/road-contact.js');
const {damageRover,clearRoadExit,driveRover}=await import('../public/rover.js');
const {stepRoadBoarding}=await import('../public/road-cabin.js');
const {nextUse}=await import('../public/use-target.js');
const {newCityTraffic,tryTrafficInteract,driveTrafficCar,leaveTraffic,stepCityTraffic}=await import('../public/city-traffic.js');
const {supercarLayout}=await import('../public/supercar-layout.js');

const dt=1/30;
const newResort=()=>{
  const world=newExpedition();
  world.traffic=newCityTraffic({resort:true});
  return world;
};
const newPlayer=(id,state)=>({id,state,inputs:[],life:newLife(0)});

for(const [z,x0,x1,yaw] of [[58.25,-68,-42,Math.PI/2],[63.75,-42,-68,-Math.PI/2]]){
  const world=newResort(),car=world.rover;
  Object.assign(car,{x:x0,y:groundHeight(x0,z),z,yaw,driver:1});
  const driver=newPlayer(1,{x:car.x,y:car.y,z:car.z,grounded:true});
  const players=new Map([[driver.id,driver]]);
  for(let i=0;i<210 && (x1-car.x)*Math.sign(yaw)>0;i++){
    driveRover(world,{throttle:.28},dt,players);
    assert.equal(car.hp,car.maxHp,'A display car must leave room for a pickup passing in either lane');
  }
  assert((car.x-x1)*Math.sign(yaw)>=0,'Pickup traverses the whole forecourt without steering around a parked car');
  assert(Math.abs(car.z-z)<.02);
}

for(const [model,name,throttle,steer,departed] of [
  ['falco','Cheetah',.28,.83,car=>car.z<64.2],
  ['veloce','Cheetah',.28,-.83,car=>car.z<64.2],
]){
  const world=newResort(),car=world.traffic.find(car=>car.model===model);
  assert.equal(car.maxHp,world.supercar.maxHp,'Valet Cheetahs match the Lantern Point car health');
  assert.equal(car.maxHp,supercarLayout.maxHp);
  // Sample the full body footprint, including the bumpers, on the actual forecourt.
  for(let front=-2.7;front<=2.71;front+=.3)for(let side=-1.51;side<=1.52;side+=.15){
    const x=car.x+Math.sin(car.yaw)*front+Math.cos(car.yaw)*side;
    const z=car.z-Math.cos(car.yaw)*front+Math.sin(car.yaw)*side;
    assert.equal(groundHeight(x,z),car.y,'The full marked bay sits on one level surface');
  }
  const home={x:car.x,z:car.z,yaw:car.yaw,hp:car.hp};
  assert(!roadContact(world,car.x,car.z,car.yaw,car.x,car.z,car));
  const feet=clearRoadExit(world,car);
  assert(feet && ((feet.x-car.x)*Math.cos(car.yaw)+(feet.z-car.z)*Math.sin(car.yaw))<0,'Driver-side access remains clear');
  const driver=newPlayer(1,feet),peer=newPlayer(2,{...feet}),players=new Map([[1,driver],[2,peer]]);
  assert.equal(nextUse(world,feet,1).label,'Drive '+name);
  assert(tryTrafficInteract(world,driver,[]));
  assert(!tryTrafficInteract(world,peer,[]));
  for(let i=0;i<28;i++)stepRoadBoarding(car,dt);
  for(let i=0;i<145 && !departed(car);i++)driveTrafficCar(world,car,{throttle,steer},dt,players);
  assert(departed(car) && car.hp===home.hp,'Can pull out into the street without clipping scenery');
  assert(leaveTraffic(world,driver));
  damageRover(world,car.hp,players,car.id);
  for(let i=0;i<220;i++)stepCityTraffic(world,players,[],dt,i);
  assert(car.wrecked,'Someone near the berth delays replacement');
  peer.state.x+=15;driver.state.z+=15;
  for(let i=220;i<250;i++)stepCityTraffic(world,players,[],dt,i);
  assert(!car.wrecked);
  assert.deepEqual({x:car.x,z:car.z,yaw:car.yaw,hp:car.hp},home);
}
console.log('PASS both traffic lanes, both drivable valet bays, driver-side access and reserved-bay recovery.');
