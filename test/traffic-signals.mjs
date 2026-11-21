import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {newCityTraffic,stepCityTraffic}=await import('../public/city-traffic.js');
const {newRivals}=await import('../public/rivals.js');
const {passingOffset,signalLamps}=await import('../public/traffic-signals.js');
const {cityServices}=await import('../public/traffic-routes.js');
const w=newExpedition(),npcs=newRivals(),dt=1/30,players=new Map();
w.traffic=newCityTraffic();const sedan=w.traffic[0],tracker={distance:0,track:cityServices[0][0]};
let left=false,right=false,dark=false;
for(const [track] of cityServices){
  tracker.track=track;
  for(let d=0;d<track.length;d+=.2){
    tracker.distance=d;signalLamps(sedan,tracker,dt);
    if(sedan.turnSignal===1&&sedan.blink)right=true;
    if(sedan.turnSignal===-1&&sedan.blink)left=true;
    if(sedan.turnSignal && !sedan.blink)dark=true;
  }
}
assert(left && right && dark);
const straight={distance:0,track:{pose:d=>({x:0,z:-180-d,yaw:0})}};
Object.assign(sedan,straight.track.pose(0),{y:.7});
Object.assign(w.rover,{x:0,z:-170,y:.7,yaw:0,speed:12,driver:1});
for(let i=0;i<45;i++)straight.offset=passingOffset(w,sedan,straight,[],dt);
assert(straight.offset>1,'yields progressively on a clear shoulder');
Object.assign(w.rover,{x:.1,z:-181,speed:0});
const before=straight.offset;straight.offset=passingOffset(w,sedan,straight,[],dt);
assert.equal(straight.offset,before,'holds while the passing driver is alongside');
w.rover.z=-200;
for(let i=0;i<45;i++)straight.offset=passingOffset(w,sedan,straight,[],dt);
assert.equal(straight.offset,0,'returns to the same driving lane');
w.traffic=newCityTraffic();
const leader=w.traffic[0],blocker={id:41,life:{hp:100},state:{x:leader.x,y:leader.y,z:leader.z-6}};
players.set(41,blocker);
for(let i=0;i<2100;i++)stepCityTraffic(w,players,npcs,dt);
assert.equal(leader.speed,0);
const queue=w.traffic.filter(c=>c!==leader&&Math.abs(c.x-leader.x)<1.1&&c.z>leader.z&&c.z<leader.z+18);
assert(queue.length && queue.every(c=>c.speed===0));
const queued=[leader,...queue].sort((a,b)=>a.z-b.z);
assert(queued.slice(1).every((c,i)=>c.z-queued[i].z>3.8));
players.clear();for(let i=0;i<75;i++)stepCityTraffic(w,players,npcs,dt);
assert(queued.every(c=>c.speed>.1));
console.log('PASS advance turn signals, safe queue spacing, yielding, guarded merge and restart');
