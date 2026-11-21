import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {advanceBridgeFlight}=await import('../public/bridge-driving.js');
const {newExpedition}=await import('../public/expedition.js');
const {newCityTraffic}=await import('../public/city-traffic.js');
const {groundHeight}=await import('../public/world.js');
const {driveRover}=await import('../public/rover.js');
const {roadLandingSound}=await import('../public/road-contact-sound.js');
const w=newExpedition();w.traffic=newCityTraffic();
for(const car of [w.rover,w.supercar,...w.traffic]){
  const floor=groundHeight(2,15);
  Object.assign(car,{x:2,z:15,y:floor+.3,driver:9,npcDriver:null});
  let previous=0;
  for(const speed of [2,9]){
    car.y=floor+.02;
    car.bridgeFlight={vx:0,vz:0,vy:-speed};
    advanceBridgeFlight(w,car,1/30);
    assert(!car.bridgeFlight && car.y===floor);
    assert(car.landingSound.speed>=speed && car.landingSound.id>previous);
    previous=car.landingSound.id;
    for(let t=0;t<12;t++)driveRover(w,{},1/30,null,car.kind??'rover');
    assert.equal(car.landingSound.id,previous,'no further touchdown while grounded');
  }
}
const ctx={sampleRate:12000,createBuffer(ch,n){const wave=new Float32Array(n);return {getChannelData:()=>wave}}};
const soft=roadLandingSound(ctx,false).getChannelData(0),hard=roadLandingSound(ctx,true).getChannelData(0);
assert(hard.length>soft.length && soft.some(v=>Math.abs(v)>.2));
assert(hard.every(v=>Number.isFinite(v) && Math.abs(v)<=1));
console.log('PASS gentle and hard touchdown, stable event after contact on all five road models, two distinct suspension sounds');
