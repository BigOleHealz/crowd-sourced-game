import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newRivals,updateRival,rivalView}=await import('../public/rivals.js');
const {junctions,junctionLamp}=await import('../public/junction-signals.js');
const {curbWait}=await import('../public/sidewalk-crossings.js');
const {newExpedition}=await import('../public/expedition.js');
const {newCityTraffic,stepCityTraffic,syncTrafficDrivers,trafficDriverCar}=await import('../public/city-traffic.js');
const world=newExpedition(),people=newRivals(),players=new Map(),walkers=people.filter(p=>p.route.crossing);
world.traffic=newCityTraffic();syncTrafficDrivers(world,people);
assert.equal(walkers.length,2);
const held=new Set(),departures=new Map(),finished=new Map();
for(let t=0;t<6600;t++){
  stepCityTraffic(world,players,people,1/30,t);
  for(const person of people){
    if(trafficDriverCar(world,person.id))continue;
    const wasCrossing=!!person.crossing,oldYaw=person.yaw;
    updateRival(person,t,1/30,world.hp,world);
    if(!person.route.crossing)continue;
    const {x,z}=person.route.crossing,j=junctions.find(j=>j.x===x && j.z===z);
    assert(Math.abs(person.yaw-oldYaw)<.115,'Turning happens over several simulation ticks');
    if(person.checkingTraffic){held.add(person.name);assert(!person.moving);assert(rivalView(person,t).checkingTraffic);}
    if(person.crossing && !wasCrossing){
      assert.equal(junctionLamp(t,j,true),0,'No pedestrian steps off the curb into a green');
      departures.set(person.id,(departures.get(person.id)??0)+1);
    }
    if(!person.crossing && wasCrossing){
      assert(Math.abs(person.state.x-x)>6,'Finish on the other sidewalk');
      finished.set(person.id,(finished.get(person.id)??0)+1);
    }
  }
}
assert.equal(held.size,walkers.length);
for(const p of walkers){
  assert((finished.get(p.id)??0)>=2,p.name+' crosses in both directions with traffic running');
  const c=p.route.crossing,j=junctions.find(j=>j.x===c.x && j.z===c.z);
  p.next=c.legs[0];p.crossing=false;
  const [sx,sz]=p.route.points[p.next-1];p.state.x=sx;p.state.z=sz;
  const doors={posts:{[j.id]:0}},car={x:j.x+2,z:sz+2,y:.7,model:'sedan',yaw:0,speed:3};
  assert(curbWait(p,0,{doors,traffic:[car]}),'Look for traffic even at a damaged light');
  assert(!curbWait(p,0,{doors,traffic:[]}),'A clear crossing stays usable with its post gone');
}
console.log('PASS distinct walking paces, bounded turns, curb checks and repeated safe crossings with live traffic');
