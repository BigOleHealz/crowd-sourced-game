import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {MAP,groundHeight}=await import('../public/world.js');
const {driveRover,recoverRover}=await import('../public/rover.js');
const {roadContact}=await import('../public/road-contact.js');
const dt=1/30,wall={x:0,z:-1,w:12,d:.22,h:3};
MAP.barriers.push(wall);
function car(speed,x=0,z=3,yaw=0){
  const w=newExpedition();Object.assign(w.rover,{driver:1,gunner:2,speed,x,z,yaw,y:groundHeight(x,z)});
  return w;
}
function step(w,throttle=1){
  const r=w.rover,{x,z}=r;
  driveRover(w,{throttle,steer:0},dt);
  assert(Math.hypot(r.x-x,r.z-z)<=16.1*dt,'no teleport across or away from a contact');
}
function firstContact(w,throttle){
  for(let i=0;i<180&&!w.rover.contactSound;i++)step(w,throttle);
  assert(w.rover.contactSound,'reached an obstacle');
  return w.rover.contactSound;
}
const parked=car(0,0,.805);
for(let i=0;i<120;i++)step(parked,0);
assert.equal(parked.rover.hp,250);assert.equal(parked.rover.contactSound,undefined);
const tap=car(1.15);
assert.equal(firstContact(tap,1.15/16).damage,0);assert.equal(tap.rover.hp,250);
const solid=car(14),headOn=firstContact(solid,14/16),after=solid.rover.hp;
assert.equal(headOn.panel,'front');assert(headOn.damage>75);assert.equal(after,250-headOn.damage);
assert(solid.rover.speed<0,'a hard strike briefly rebounds');
assert(solid.rover.bodyDamage.front>.50);assert.equal(solid.rover.bodyDamage.right,0);
for(let i=0;i<210;i++)step(solid);
assert.equal(solid.rover.hp,after,'holding throttle against the wall cannot farm damage');
assert.equal(solid.rover.contactSound.id,headOn.id);assert.equal(solid.rover.speed,0);
assert.equal(solid.rover.driver,1);assert.equal(solid.rover.gunner,2);
assert(!roadContact(solid,solid.rover.x,solid.rover.z,solid.rover.yaw,solid.rover.x,solid.rover.z));
for(let i=0;i<40;i++)step(solid,-1);assert(solid.rover.z>2.4,'reverse moves away without sticking');
for(let i=0;i<100&&solid.rover.contactSound.id===headOn.id;i++)step(solid);
assert(solid.rover.contactSound.id>headOn.id);
assert(solid.rover.hp<after,'an independent second impact can damage the panel');

const grazing=car(12,-3,1.77,1.12),glance=firstContact(grazing,.75);
assert.equal(glance.panel,'left');assert(glance.damage>0 && glance.damage<headOn.damage/3);
const xAtContact=grazing.rover.x;for(let i=0;i<4;i++)step(grazing,.75);
assert(grazing.rover.x>xAtContact+.6,'glancing hit keeps tangential motion');
assert(grazing.rover.bodyDamage.left>0);assert.equal(grazing.rover.bodyDamage.front,0);
const mirror=car(12,3,1.77,-1.12);assert.equal(firstContact(mirror,.75).panel,'right');
const backing=car(-5,0,1.66,Math.PI);
assert.equal(firstContact(backing,-1).panel,'rear');assert(backing.rover.bodyDamage.rear>0);

MAP.barriers.pop();
// A palm has a curved collision normal and remains part of the map after impact.
const palm=MAP.trees.find(t=>t.x===7.7&&t.z===21);
const props=car(10,palm.x,palm.z+4);
const treeBump=firstContact(props,10/16);assert(treeBump.wood);assert(props.rover.hp<250);assert(MAP.trees.includes(palm));
const wreck=car(15,palm.x,palm.z+4);wreck.rover.hp=8;
firstContact(wreck,1);assert(wreck.rover.wrecked);assert.equal(wreck.rover.driver,null);assert.equal(wreck.rover.gunner,null);
for(let i=0;i<180;i++)recoverRover(wreck,dt);
assert.equal(wreck.rover.hp,250);assert.deepEqual(wreck.rover.bodyDamage,{front:0,rear:0,left:0,right:0});
console.log('PASS road impacts: rest, walking-speed tap, hard wall/rebound, contact latch, reverse escape, fresh impact, glancing slide, four panels, palm, crew and wreck recovery.');
