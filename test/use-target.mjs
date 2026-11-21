import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {newCityTraffic}=await import('../public/city-traffic.js');
const {nextUse}=await import('../public/use-target.js');
const {clearRoadExit}=await import('../public/rover.js');
const {hotelEntrance}=await import('../public/maravela-hotel.js');
const w=newExpedition();w.traffic=newCityTraffic();const sedan=w.traffic[0],feet={x:-16.35,y:.7,z:-47.7,grounded:true};
Object.assign(w.rover,{x:-14.25,z:-47.7,y:.7,yaw:Math.PI/2});
Object.assign(sedan,{x:-18.3,z:-47.7,y:.7,yaw:Math.PI/2,speed:0,npcDriver:null});
assert(hotelEntrance(feet));
assert.equal(nextUse(w,feet,1).target,sedan.id);
feet.x=-16.1;assert.equal(nextUse(w,feet,1).target,'rover');
assert.equal(nextUse(w,feet,1,sedan.id).target,sedan.id,'a still eligible displayed car survives a slight change of proximity rank');
w.rover.driver=2;assert.equal(nextUse(w,feet,1).role,'gunner');
w.rover.gunner=3;assert.equal(nextUse(w,feet,1).target,sedan.id);
sedan.driver=1;assert.equal(nextUse(w,feet,1).role,'exit');
for(const car of [w.rover,w.supercar,...w.traffic.slice(0,3)]){
  Object.assign(car,{x:-18.30,z:-47.7,y:.7,yaw:Math.PI/2});
  for(const other of [w.rover,w.supercar,...w.traffic])if(car!==other)other.z=50;
  const exit=clearRoadExit(w,car);
  assert(exit && exit.z>car.z && Math.abs(exit.x-car.x)<1,'exit on open street side of hotel wall');
}
console.log('PASS authoritative overlapping vehicle/seat and auto-door prompts, and clear-side exits on all pickup, GT and civilian hulls.');
