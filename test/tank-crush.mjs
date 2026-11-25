import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,reportVehicleWreck}=await import('../public/expedition.js');
const {newCityTraffic}=await import('../public/city-traffic.js');
const {stepTank}=await import('../public/tank.js');
const {recoverRover}=await import('../public/rover.js');
const {setRoadOccupantContext}=await import('../public/road-occupants.js');
const {crushedScale}=await import('../public/vehicle-wreck-view.js');
for(const kind of ['rover','supercar','sedan','hatchback','van']){
  const w=newExpedition();w.traffic=newCityTraffic();
  const car=w[kind]??w.traffic.find(c=>c.model===kind),tank=w.tank;
  Object.assign(tank,{x:-38,z:48,y:.7,yaw:0,driver:1});
  Object.assign(car,{x:-38,z:37,y:.7,yaw:0,driver:2,npcDriver:null});
  if(kind==='rover')car.gunner=3;
  const players=new Map([1,2,3].map(id=>[id,{id,inputs:[],life:{hp:100},state:{x:-38,y:.7,z:37}}]));
  for(let i=0;i<140;i++){
    stepTank(w,{throttle:1},1/30,players);reportVehicleWreck(w,car,kind,'road',i);
  }
  assert.equal(car.hp,0);assert(car.crushed);assert.equal(car.driver,null);
  assert(tank.z<33 && !tank.wrecked,'tracks pass clear of the chassis');
  if(kind==='rover')assert.equal(car.gunner,null);
  assert.equal(players.get(2).life.hp,0);
  assert.equal(players.get(2).life.deathKind,'crush');
  if(kind==='rover')assert.equal(players.get(3).life.hp,0);
  assert.equal(w.shots.length,1);assert.equal(w.shots[0].weapon,'vehicleCrush');
  assert.deepEqual([w.shots[0].to.x,w.shots[0].to.z],[-38,37]);
  assert(crushedScale(car)>0 && crushedScale({...car,recoverySeconds:4})===0);
  if(!car.model){recoverRover(w,6.1,kind);assert.equal(w[kind].hp,w[kind].maxHp);assert(!w[kind].crushed);}
}
{
  const w=newExpedition();w.traffic=newCityTraffic();
  const car=w.traffic.find(c=>c.model==='sedan'),tank=w.tank;
  const npc={id:'rival-crush-test',life:{hp:100},state:{x:-38,y:.7,z:37}};
  Object.assign(tank,{x:-38,z:48,y:.7,yaw:0,driver:1});
  Object.assign(car,{x:-38,z:37,y:.7,yaw:0,driver:null,npcDriver:npc.id});
  const players=new Map([[1,{id:1,inputs:[],life:{hp:100},state:{x:-38,y:.7,z:48}}]]);
  setRoadOccupantContext(w,[npc],30);
  for(let i=0;i<140 && !car.crushed;i++)stepTank(w,{throttle:1},1/30,players);
  assert(car.crushed);assert.equal(npc.life.hp,0);assert.equal(npc.life.deathKind,'crush');
}
console.log('PASS tank tracks flatten all road models, kill player and NPC crews, and emit a quiet crush cue.');
