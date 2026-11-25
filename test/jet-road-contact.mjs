import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {driveRover,parkedSupercar}=await import('../public/rover.js');
const {nearJet,stepJet}=await import('../public/jet.js');
const {jetRoadContact}=await import('../public/jet-road-contact.js');
const {roadHullFor,sweepRoad}=await import('../public/road-contact.js');
const {jetScale,jetWidthScale}=await import('../public/jet-size.js');

const w=newExpedition(),j=w.jet,r=w.rover;
j.z=10; // Leave runway space behind the parked jet for the reverse-away check.
Object.assign(r,{x:j.x,z:j.z+12,y:j.y,driver:1});
for(let i=0;i<120;i++)driveRover(w,{throttle:1},1/30,new Map());
assert(Math.abs(r.z-(j.z+2.78*jetScale+roadHullFor(r).halfLength))<.5);
assert(r.hp<250 && r.contactSound.damage>0);
assert(nearJet(j,{...j,x:j.x+2.8,z:j.z-1.2*jetScale,grounded:true}),'cockpit boarding position remains usable');
for(let i=0;i<30;i++)driveRover(w,{throttle:-1},1/30,new Map());
assert(r.z>j.z+9,'a driver can reverse away');

const probe={halfLength:.05,halfWidth:.05,corner:.01,roof:.2};
const touch=(x,y,z)=>jetRoadContact(j,j.x+x,j.y+y,j.z+z,0,probe);
const wingX=2.60*jetScale*jetWidthScale,wingZ=.72*jetScale;
assert(touch(wingX,.85*jetScale,wingZ),'outer swept wing is solid');
assert(!touch(wingX,.85*jetScale,-.60*jetScale),'clear air ahead of swept leading edge');
assert(!touch(wingX,.30*jetScale,wingZ),'clear space below wing');
assert(!touch(wingX,1.02*jetScale,wingZ),'clear space above wing');
j.roll=Math.PI/2;
assert(touch(-.93*jetScale,2.55*jetScale*jetWidthScale,wingZ),'rolled wing rises with rendered mesh');
assert(!touch(wingX,.85*jetScale,wingZ));
j.roll=0;

const gt=Object.assign(parkedSupercar(),{x:j.x-6,z:j.z+1,y:j.y,yaw:Math.PI/2});
w.supercar=gt;Object.assign(r,{x:20,z:40});
const swept=sweepRoad(w,gt,12,-1.25);
assert.equal(swept.hit.object,j,'fast oblique sweep catches the wing');
assert(swept.fraction>.02 && swept.fraction<.5);
j.y+=5;
assert.notEqual(sweepRoad(w,gt,12,-1.25).hit?.object,j,'airborne jet clears a road vehicle');
j.y-=5;

Object.assign(gt,{x:j.x,z:j.z-12,y:j.y,yaw:0});j.pilot=2;
const parkingZ=j.z;
for(let i=0;i<120;i++)stepJet(w,{throttle:1},1/30,new Map());
assert(j.z>gt.z+6 && j.z<parkingZ,'taxiing airframe stops at parked car');
assert(!j.wrecked && j.grounded && j.speed===0);
const blockedZ=j.z;
gt.x+=8;
for(let i=0;i<30;i++)stepJet(w,{throttle:1},1/30,new Map());
assert(j.speed>5 && j.z<blockedZ-1,'taxiing resumes once clear');
console.log('PASS swept road/jet collisions, body and wing clearance, rolled aircraft, reverse escape, boarding and taxi.');
