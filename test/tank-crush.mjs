import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,reportVehicleWreck}=await import('../public/expedition.js');
const {newCityTraffic}=await import('../public/city-traffic.js');
const {stepTank}=await import('../public/tank.js');
const {recoverRover}=await import('../public/rover.js');
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
  assert.equal(players.get(2).life.deathKind,'blast');
  if(kind==='rover')assert.equal(players.get(3).life.hp,0);
  assert.equal(w.shots.length,1);assert.deepEqual([w.shots[0].to.x,w.shots[0].to.z],[-38,37]);
  assert(crushedScale(car)>0 && crushedScale({...car,recoverySeconds:4})===0);
  if(!car.model){recoverRover(w,6.1,kind);assert.equal(w[kind].hp,w[kind].maxHp);assert(!w[kind].crushed);}
}
console.log('PASS continuous tank tracks crush the pickup, GT and all three civilian models, release crews and send one blast.');
