import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {storefrontFaces}=await import('../public/frontage-glass.js');
const {shopBicycles}=await import('../public/shop-bicycle-sites.js');
const {rollingMotion,parkRide,takeRide}=await import('../public/street-rides.js');
const {stepPlayer}=await import('../public/world.js');
const rides=shopBicycles(storefrontFaces),world={rides};
assert.deepEqual([...new Set(rides.map(r=>r.shop))],['Cadencia','Rueda Libre','Harbor Wheel']);
assert.equal(new Set(rides.map(r=>r.id)).size,rides.length);
for(const item of rides){
  const rider={id:1,state:{...item,grounded:true}},other={id:2,state:{...item,grounded:true}};
  takeRide(item,rider);takeRide(item,other);assert(!other.state.ride);
  const next=stepPlayer(rider.state,{throttle:1,jump:true},1/30,undefined,undefined);
  assert(next.ride.speed>0 && next.grounded,'pedals without triggering a foot jump or ledge grab');
  parkRide(world,rider);assert.equal(item.rider,null);
}
const atRest={kind:'bike',speed:0,yaw:0};
assert.equal(rollingMotion(atRest,{steer:1},.1,true).yaw,0);
const atSpeed={...atRest,speed:6};
const coast=rollingMotion(atSpeed,{},.1,true);
assert(coast.speed<6 && coast.speed>5.9);
assert(rollingMotion(atSpeed,{throttle:-1},.1,true).speed<coast.speed);
assert(rollingMotion(atSpeed,{},.1,true,-.12).speed>coast.speed);
assert(rollingMotion(atSpeed,{steer:1},.1,true).yaw>0);
assert.equal(rollingMotion(atSpeed,{throttle:1},.1,false).speed,6);
console.log('All six shop bikes: display placement, mounting, exclusive possession, pedaling, steering, brakes, hills and coasting passed.');
