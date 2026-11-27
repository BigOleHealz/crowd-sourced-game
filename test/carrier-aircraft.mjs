import assert from 'node:assert/strict';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {carrierDeckTop}=await import('../public/eisenhower-carrier-layout.js');
const {jetKinds,helicopterKinds}=await import('../public/aircraft-fleet.js');
const {nextUse}=await import('../public/use-target.js');
const {resortArrivals}=await import('../public/palma-site.js');
const {solidTopAt,blocked}=await import('../public/world.js');
const {vehicleContact}=await import('../public/vehicle-contact.js');
const {stepJet,damageJet}=await import('../public/jet.js');
const {fly,interact,damageHelicopter,recoverHelicopter}=await import('../public/airframe.js');

const world=newExpedition(),players=new Map();
const arrival=resortArrivals.get('carrier');
assert(arrival && Math.abs(arrival.y-solidTopAt(arrival.x,arrival.z,world.hp,0,Infinity,world.doors))<.01,
  'the direct carrier arrival stands on the visible flight deck');
assert(!blocked(arrival.x,arrival.y,arrival.z,world.hp,world.doors) &&
  !vehicleContact(arrival.x,arrival.y,arrival.z,world,true).depth,
  'the carrier arrival clears the ship and parked aircraft');
const carrierJets=jetKinds.slice(1),carrierHelicopters=helicopterKinds.slice(2);
const aircraft=[...carrierJets,...carrierHelicopters];
for(const kind of aircraft){
  const vehicle=world[kind];
  assert.equal(vehicle.y,carrierDeckTop,`${kind} starts on the flight deck`);
  assert(vehicle.grounded && !vehicle.wrecked,`${kind} is available`);
  const feet={x:vehicle.x+2,y:vehicle.y,z:vehicle.z,grounded:true};
  assert.equal(nextUse(world,feet,17,kind)?.target,kind,`${kind} offers boarding`);
}
for(let i=0;i<aircraft.length;i++)for(let j=i+1;j<aircraft.length;j++)
  assert(Math.hypot(world[aircraft[i]].x-world[aircraft[j]].x,world[aircraft[i]].z-world[aircraft[j]].z)>9,
    `${aircraft[i]} and ${aircraft[j]} have separate deck pads`);

for(const kind of carrierJets){
  const jet=world[kind],pad={x:jet.x,y:jet.y,z:jet.z};
  jet.pilot=17;
  for(let i=0;i<150;i++)stepJet(world,{throttle:1,jetPitch:1},1/30,players,kind);
  assert(!jet.grounded && jet.y>carrierDeckTop+2,`${kind} rotates and climbs from the carrier`);
  damageJet(world,jet.hp,players,null,kind);
  for(let i=0;i<190;i++)stepJet(world,null,1/30,players,kind);
  assert(world[kind]!==jet && world[kind].grounded && !world[kind].wrecked,`${kind} respawns`);
  assert.deepEqual([world[kind].x,world[kind].y,world[kind].z],[pad.x,pad.y,pad.z],`${kind} returns to its pad`);
}
for(const kind of carrierHelicopters){
  const heli=world[kind],pad={x:heli.x,y:heli.y,z:heli.z};
  const pilot={id:17,state:{x:heli.x+2,y:heli.y,z:heli.z,grounded:true},inputs:[]};
  players.set(17,pilot);
  interact(world,pilot,kind);
  assert.equal(heli.pilot,17,`${kind} can be boarded`);
  for(let i=0;i<90;i++)fly(world,{x:0,z:0,lift:1,aimYaw:0},1/30,players,kind);
  assert(!heli.grounded && heli.y>carrierDeckTop+1,`${kind} lifts from the deck`);
  for(let i=0;i<120 && !heli.grounded;i++)fly(world,{x:0,z:0,lift:-1,aimYaw:0},1/30,players,kind);
  assert(heli.grounded && !heli.wrecked && Math.abs(heli.y-carrierDeckTop)<.01,
    `${kind} lands back on the carrier flight deck`);
  damageHelicopter(world,heli.hp,players,null,undefined,undefined,kind);
  for(let i=0;i<190;i++)recoverHelicopter(world,1/30,players,kind);
  assert(world[kind]!==heli && world[kind].grounded && !world[kind].wrecked,`${kind} respawns`);
  assert.deepEqual([world[kind].x,world[kind].y,world[kind].z],[pad.x,pad.y,pad.z],`${kind} returns to its pad`);
}

console.log('PASS four carrier aircraft board, fly and recover at separate deck pads');
