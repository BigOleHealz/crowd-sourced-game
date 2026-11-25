import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {stepPlayer,groundHeight}=await import('../public/world.js');
const {takeRide}=await import('../public/street-rides.js');
const {parkRides}=await import('../public/skate-park.js');
const {touchLayout}=await import('../public/touch-controls.js');
const dt=1/30,world={rides:parkRides(groundHeight)};
function riding(kind,x=44,z=-157){
  const item={...world.rides.find(r=>r.kind===kind),x,y:groundHeight(x,z),z},p={id:3,state:{grounded:true}};
  takeRide(item,p);return p.state;
}
const sim=(s,input={})=>stepPlayer(s,input,dt,{},world);
const touch=touchLayout({role:'skateboard',active:true,jamBoard:true,jump:'Ollie'});
assert.equal(touch.axis,'Steer');
assert.deepEqual(touch.quick,[['KeyF','Kickflip'],['KeyX','Shove-it'],['Space','Ollie']]);
let rider=riding('board');
for(const [kind,points] of [['kickflip',110],['shove',85],['ollie',35]]){
  const old=rider.ride.run?.score??0;
  rider=sim(rider,kind==='ollie'?{jump:true}:{skateTrick:kind});
  assert(!rider.grounded);assert.equal(rider.ride.trick.kind,kind);
  assert.equal(rider.ride.run.score,old);
  while(!rider.grounded)rider=sim(rider);
  assert.equal(rider.ride.run.score,old+points,kind+' banks only at touchdown');
}
for(let i=0;i<1400;i++)rider=sim(rider);
assert.equal(rider.ride.run.left,0);assert.equal(rider.ride.run.best,230);
rider=sim(rider,{skateTrick:'shove'});assert.equal(rider.ride.run.score,0);assert.equal(rider.ride.run.best,230);
let rail=riding('board',45.05,-156.35),seen=false;
for(let i=0;i<115;i++){rail=sim(rail,{throttle:1});if(rail.ride.grind){seen=true;assert.equal(rail.ride.run.score,0);}}
assert(seen && rail.ride.run.score>100,'rolling away banks the full length of a rail');
let tooLate=sim(riding('board'),{jump:true});for(let i=0;i<10;i++)tooLate=sim(tooLate);
tooLate=sim(tooLate,{skateTrick:'kickflip'});while(!tooLate.grounded)tooLate=sim(tooLate);
assert.equal(tooLate.ride.run.score,0);assert.match(tooLate.ride.run.last,/Incomplete/);
for(const other of [riding('bike'),riding('board',2,16)]){
  const after=sim(other,{skateTrick:'kickflip'});assert(after.grounded);assert(!after.ride.run && !after.ride.trick);
}
console.log('45-second skate jam, three airborne moves, timed landings, distance-based rail points, restart and transport controls passed.');
