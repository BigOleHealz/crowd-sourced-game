import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {requestInterior,advanceElevator}=await import('../interior-actions.js');
const {buildingAction}=await import('../public/building-interiors.js');
const w=newExpedition(),players=new Map();
function guest(id){
  const p={id,life:{hp:100},inputs:[],lastSeq:0,state:{x:-83.1,y:1.8,z:50.05,grounded:true}};
  players.set(id,p);return p;
}
function use(p,input,tick=0){requestInterior(w,players,p,{seq:(p.interiorSeq??0)+1,...input},tick);}
const a=guest(1),b=guest(2),c=guest(3);
for(const p of [a,b])use(p,{checkIn:true});
assert.equal(a.resortStay.floor,5);
assert.notEqual(a.resortStay.key,b.resortStay.key);
for(const p of [a,b,c])p.state={x:-83.1,y:1.8,z:53.21,grounded:true};
use(c,{checkIn:true});assert(!c.resortStay);
use(c,{building:25,floor:23});assert(c.trip,'walk-in guest can visit the pool');
use(b,{building:25,floor:12});assert(!b.trip,'moving car is reserved');
advanceElevator(w,c,c.trip.time);
use(b,{building:25,floor:12});assert(b.trip,'registered guest can explore other suite floors');
advanceElevator(w,b,b.trip.time);
use(a,{building:25,floor:21});assert(a.trip);
c.state={x:-46.8,y:.8,z:79.9,grounded:true};
const station=buildingAction(c.state,w.doors);assert.equal(station.kind,'slot');
use(c,{slot:station.slot},10);assert.equal(c.slotResult.reels.length,3);
const first=c.slotResult;use(c,{slot:station.slot},11);assert.equal(c.slotResult,first);
c.state.x+=10;use(c,{slot:station.slot},100);assert.equal(c.slotResult,first);
console.log('PASS guest keys, shared lift occupancy, public hotel stops, local practice slots and cooldown.');

// Check the height index against the physical geometry around real edges.
const {grandTopAt,resortLevels}=await import('../public/grand-resort-layout.js');
const {inside}=await import('../public/palma-site.js');
const parts=resortLevels.flatMap(l=>l.parts);
const brokenPanes=Object.fromEntries(parts.filter(p=>p.paneId).map(p=>[p.paneId,true]));
for(let i=0;i<parts.length;i+=23){
  const subject=parts[i],x=subject.x+subject.w/2,z=subject.z;
  const doors=i%2?{brokenPanes}:undefined;
  for(const probe of [subject.base-.00100001,subject.base-.001,subject.base+subject.h,Infinity]){
    const pad=i%3?.32:0;
    let expected=-Infinity;
    for(const p of parts){
      if(probe<p.base-.001 || doors?.brokenPanes?.[p.paneId])continue;
      const radius=['slab','tread','poolBed'].includes(p.kind)?0:pad;
      if(inside(p,x,z,radius))expected=Math.max(expected,p.base+p.h);
    }
    assert.equal(grandTopAt(x,z,pad,probe,doors),expected);
  }
}
console.log('PASS indexed resort surfaces against all floors, including broken glazing and slab edges.');
