import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {junctions,junctionLamp,signalGap}=await import('../public/junction-signals.js');
const {civilianProfiles}=await import('../public/civilian-fleet.js');
const {newExpedition}=await import('../public/expedition.js');
const {newRivals}=await import('../public/rivals.js');
const {newCityTraffic,stepCityTraffic,syncTrafficDrivers}=await import('../public/city-traffic.js');
assert.equal(junctions.length,12);
const j=junctions[0],length=civilianProfiles.sedan.halfLength;
for(const junction of junctions)for(let tick=0;tick<960;tick++){
  const a=junctionLamp(tick,junction,true),b=junctionLamp(tick,junction,false);
  assert(!(a && b),'Cross traffic always has a red while the other direction is green or amber');
}
for(const direction of [-1,1]){
  const car={model:'sedan',yaw:direction===1?0:Math.PI,x:j.x+2*direction,z:j.z+direction*(6.72+length+5),speed:3};
  assert.equal(signalGap(car,0,{}),Infinity);
  assert(Math.abs(signalGap(car,500,{})-5)<1e-6);
  assert.equal(signalGap(car,500,{posts:{[j.id]:0}}),Infinity);
  car.z=j.z+direction*(6.72+length+.5);car.speed=5;
  assert.equal(signalGap(car,410,{}),Infinity,'Continue when too close to brake on amber');
  car.z-=direction;
  assert.equal(signalGap(car,500,{}),Infinity,'Clear the intersection once past the line');
}
const world=newExpedition(),npcs=newRivals(),players=new Map();
world.traffic=newCityTraffic();syncTrafficDrivers(world,npcs);
const waited=new Map(),left=new Set();
for(let tick=1;tick<=3300;tick++){
  stepCityTraffic(world,players,npcs,1/30,tick);
  for(const car of world.traffic){
    if(car.speed<.02 && signalGap(car,tick,world.doors)<.12 && !waited.has(car.id))waited.set(car.id,{x:car.x,z:car.z});
    const previous=waited.get(car.id);
    if(previous && Math.hypot(car.x-previous.x,car.z-previous.z)>9)left.add(car.id);
  }
}
assert(left.size>=3,'Several autonomous drivers stop at red and drive clear again');
console.log('PASS independently phased intersections, all-red clearance, committed amber, destroyed signals, and '+left.size+' drivers stop and resume');
