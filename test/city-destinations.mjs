import assert from 'node:assert/strict';

process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {newRivals,newLife}=await import('../public/rivals.js');
const {newCityTraffic,syncTrafficDrivers,stepCityTraffic,tryTrafficInteract}=await import('../public/city-traffic.js');

const world=newExpedition(),players=new Map(),residents=newRivals();
world.traffic=newCityTraffic();syncTrafficDrivers(world,residents);
const visitors=world.traffic.filter(car=>car.destination);
assert.equal(visitors.length,2);
assert.notEqual(visitors[0].destination,visitors[1].destination);
const stops=new Map([
  ['Lantern Point Marina',[49,-381]],['Harbor Key Market',[19.1,-205]],
  ['Hotel Maravela',[-16,-45]],['Lantern Point Estates',[-49,-434]],
  ['Biscayne Mutual Bank',[-19,27]],
]);
const visited=visitors.map(()=>[]),dwell=visitors.map(()=>0);
let tick=0;
for(;tick<45000 && visited.some(v=>new Set(v).size<stops.size);tick++){
  const previous=visitors.map(c=>({...c}));
  stepCityTraffic(world,players,residents,1/30,tick);
  for(const [i,car] of visitors.entries()){
    const old=previous[i];
    assert(Math.hypot(car.x-old.x,car.z-old.z)<.27,'Itineraries connect continuously at road speed');
    if(car.atDestination){
      const [x,z]=stops.get(car.destination);
      assert(Math.hypot(car.x-x,car.z-z)<3);
      assert.equal(car.speed,0);
      if(!old.atDestination)visited[i].push(car.destination);
      dwell[i]++;
    }else if(old.atDestination){
      assert(dwell[i]>=100 && dwell[i]<110,'Actual stop at the destination before the next trip');
      assert.notEqual(car.destination,old.destination);
      dwell[i]=0;
    }
  }
}
for(const names of visited)assert.equal(new Set(names).size,stops.size,names.join(' / '));

// The traveler arriving last is still at the curb. A player taking over the
// car cancels its onward trip and the seat remains exclusive on the network.
const parked=visitors.find(c=>c.atDestination);
assert(parked);
const guest={id:93,state:{x:parked.x+2*Math.cos(parked.yaw),y:parked.y,z:parked.z+2*Math.sin(parked.yaw),grounded:true},life:newLife(tick)};
players.set(guest.id,guest);assert(tryTrafficInteract(world,guest,residents));
assert.equal(parked.driver,guest.id);assert.equal(parked.destination,undefined);
assert.equal(parked.atDestination,undefined);
console.log('Completed cross-city curb stops:',visited.map(names=>names.join(' → ')).join(' | '));
