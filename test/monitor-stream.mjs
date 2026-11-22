import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {newRivals,rivalView}=await import('../public/rivals.js');
const {driveWater,fireEngine,waterEnd}=await import('../public/fire-engine.js');
const {jetPoint,monitorHeight,nozzleLength,waterDrop,waterRange}=await import('../public/water-monitor.js');
const {localWorldReactions}=await import('../public/pedestrian-reactions.js');
const world=newExpedition(),car=fireEngine(),npcs=newRivals().slice(0,4);
world.traffic=[car];car.driver=41;
const x=25.6,z=27,r=Math.hypot(x-car.x,z-car.z);
const input={fire:true,aimYaw:Math.atan2(x-car.x,car.z-z),aimPitch:Math.atan2(1-monitorHeight+waterDrop(r),r)};
for(const [i,n] of npcs.entries()){
  n.state={x:x+[0,1.8,0,0][i],z,y:car.y+(i===2?3:0),grounded:true};
}
npcs[3].life.hp=0;
driveWater(world,car,input,30);
assert(car.water.d<nozzleLength+3 && car.water.ny==null);
localWorldReactions(world,npcs,30);
assert(!npcs[0].reaction,'front takes time to reach resident');
for(let t=31;t<60;t++){driveWater(world,car,input,t);localWorldReactions(world,npcs,t);}
const end=car.water,half=jetPoint(car,end,.5),mouth=jetPoint(car,end,0);
assert(end.splash && Math.abs(end.splash.x-x)<.03,'splash also breaks against the resident');
assert(end.ny===1 && end.d<waterRange,'street stops the stream and produces impact foam');
assert(half.y>(mouth.y+end.y)/2+.09,'bow rises above the straight chord');
assert.equal(rivalView(npcs[0],60).reaction,'drenched');
assert(npcs[0].lastDrenched>30 && npcs[0].lastDrenched<49,'held trigger gives one reaction');
assert(npcs.slice(1).every(n=>!n.reaction),'near misses, overhead water and defeated actors do not respond');
driveWater(world,car,{...input,fire:false},61);
assert(!car.water);
// Park beside the relocated branch and put the resident beyond its opposite wall.
const {bankSite}=await import('../public/bank-site.js');
car.x=bankSite.x+12;car.z=bankSite.z;
const north=npcs[1];north.state.x=bankSite.x-12;north.state.z=bankSite.z;
const distance=Math.hypot(north.state.x-car.x,north.state.z-car.z);
const yaw=Math.atan2(north.state.x-car.x,car.z-north.state.z);
const pitch=Math.atan2(1-monitorHeight+waterDrop(distance),distance);
car.water=waterEnd(world,car,yaw,pitch);
assert(car.water.ny===0 && car.water.d<distance-8,'building face interrupts the jet');
localWorldReactions(world,npcs,240);
assert(!north.reaction,'a wall shields the resident directly behind it');
console.log('Pressure front, curved path, street and wall splashes, direct-hit complaints and occlusion verified.');
