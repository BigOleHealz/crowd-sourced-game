import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {stepPlayer,groundHeight,blocked}=await import('../public/world.js');
const {newExpedition}=await import('../public/expedition.js');
const {buildingAction,roomAtFeet,interiorCeiling}=await import('../public/building-interiors.js');
const {requestInterior,advanceElevator}=await import('../interior-actions.js');
const {casinoName,casinoSeat,nearBlackjack}=await import('../public/casino-layout.js');
const {landmarkGuide}=await import('../public/landmark-navigation.js');
const {penthousePool}=await import('../public/grand-resort-layout.js');
const {acousticSpace}=await import('../public/acoustic-space.js');
const w=newExpedition(),p={id:1,life:{hp:100},inputs:[],lastSeq:0},players=new Map([[1,p]]);
const start=(x,y,z)=>p.state={x,y,z,vx:0,vy:0,vz:0,grounded:true};
let seq=0;
function walk(x,z){
  for(let i=0;i<650;i++){
    const dx=x-p.state.x,dz=z-p.state.z,d=Math.hypot(dx,dz);
    if(d<.08)return;
    p.state=stepPlayer(p.state,{x:dx/d*Math.min(1,d*3),z:dz/d*Math.min(1,d*3)},1/30,w.hp,w);
  }
  assert.fail('Route to '+[x,z]+' stopped at '+JSON.stringify(p.state));
}
function trip(n){
  const s=buildingAction(p.state,w.doors)?.s;assert(s,'reachable elevator');
  requestInterior(w,players,p,{seq:++seq,building:s.p.id,floor:n},0);
  assert(p.trip,'accepted hotel floor '+n);advanceElevator(w,p,p.trip.time);
}
function openDoor(){
  const use=buildingAction(p.state,w.doors);assert.equal(use?.kind,'door');
  requestInterior(w,players,p,{seq:++seq,door:use.d.id,open:true},0);
}
assert.deepEqual(landmarkGuide(casinoName)(0,15,0).goal,[-63.9,44]);
start(-67.4,1.8,44);walk(-72,44);walk(-72,50);walk(-85.4,50);walk(-85.42,51.1);walk(-86.4,51);walk(-89.77,51);
walk(-89.77,64);assert(Math.abs(p.state.y-.8)<.03);
walk(-74.45,64);walk(-74.45,74.4);walk(-68,74.4);walk(-66,77);walk(-66,81.55);walk(casinoSeat.x,casinoSeat.z);
assert(nearBlackjack(p.state));assert.equal(acousticSpace(p.state,w).id,'casino');
walk(-66,81.55);walk(-66,77);walk(-44,77);walk(-44,73.6);walk(-25,73.6);
assert.equal(roomAtFeet(p.state,w.doors)?.label,'Supper Club');
start(-67.4,1.8,44);walk(-71.2,44);walk(-71.2,50.2);walk(-83.1,50.08);
assert.equal(buildingAction(p.state,w.doors)?.kind,'concierge');
requestInterior(w,players,p,{seq:++seq,checkIn:true},0);assert.equal(p.resortStay.floor,5);
walk(-80.3,50);walk(-80.3,53.21);trip(5);
walk(-75.4,53);walk(-75.4,39.5);walk(-76.35,39.5);openDoor();walk(-78.6,39.5);
walk(-75.4,39.5);walk(-75.4,53);walk(-80.3,53.21);trip(21);
walk(-79.2,52.45);openDoor();walk(-79.2,48);walk(-79.2,53);walk(-80.3,53.21);trip(23);
walk(-79.2,52.45);walk(-79.2,42.4);walk(-73.1,42.4);walk(-72.25,40.4);walk(penthousePool.x,40.2);walk(penthousePool.x,34.5);
assert(p.state.swimming,'penthouse pool');walk(penthousePool.x,40.2);assert(p.state.grounded);
assert.equal(interiorCeiling({x:-79.8,y:1.8,z:44},w.doors),26.58);
assert(!blocked(-71.35,6.8,61,w.hp,w.doors));assert.equal(groundHeight(-71.35,61,8.5,w.doors),6.8);
start(-80.3,6.8,53.21);walk(-78,51.35);walk(-71.35,51.35);walk(-71.35,71.4);
assert.equal(roomAtFeet(p.state,w.doors)?.label,'Slot Gallery');
console.log('PASS valet-to-blackjack, quay walk, supper club, check-in, suite, penthouse pool and bridge.');
