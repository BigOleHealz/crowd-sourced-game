import assert from 'node:assert/strict';

process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {stepPlayer,stanceBodyHeight}=await import('../public/world.js');
const {vehicleContact}=await import('../public/vehicle-contact.js');
const {leaveJet}=await import('../public/jet.js');
const {jetScale,jetWidthScale}=await import('../public/jet-size.js');
const {nextUse}=await import('../public/use-target.js');
const world=newExpedition(),jet=world.jet,ground=jet.y,dt=1/30;
const feet=(side,along)=>({x:jet.x+side,y:ground,z:jet.z+along,grounded:true});
function walk(state,input,ticks){
  for(let i=0;i<ticks;i++)state=stepPlayer(state,input,dt,world.hp,world);
  return state;
}
function contact(state,stance){
  return vehicleContact(state.x,state.y,state.z,world,true,stanceBodyHeight(stance));
}

// A full-speed approach stops at the real-size nose in both predicted and
// authoritative snapshots; boarding remains beside the forward cockpit.
const start=feet(0,-12),forward={z:1,sprint:true},predict=structuredClone(jet);
const nose=walk(start,forward,90);
assert(nose.z<jet.z-5.5 && nose.z>jet.z-3.25*jetScale && nose.vz===0,
  'a walker passes below the high nose tip, then stops at the fuselage');
world.jet=predict;
assert.deepEqual(walk(start,forward,90),nose);
world.jet=jet;
const boarding=feet(2.8,-1.2*jetScale);
assert.equal(nextUse(world,boarding,1).target,'jet');
jet.pilot=1;
assert.equal(nextUse(world,boarding,1).role,'exit');
const pilot={};leaveJet(jet,pilot);
assert(pilot.state.x>jet.x+2.5 && pilot.state.z<jet.z-2);
assert(walk(pilot.state,{x:1,sprint:true},30).x>jet.x+6);

const atWing=feet(2.5*jetScale*jetWidthScale,.83*jetScale);
assert.equal(contact(atWing).depth,0,'standing player walks beneath the raised wing');
assert(contact({...atWing,y:ground+1}).depth>.2,'raised player meets the wing');
assert.equal(contact(atWing,'prone').depth,0);
assert(Math.abs(contact(atWing).ceiling-(ground+.88*jetScale-stanceBodyHeight('stand')))<.02);
const landed=walk({...atWing,y:ground+6,vy:-1,grounded:false},{},60);
assert(landed.grounded && Math.abs(landed.y-(ground+.98*jetScale))<.02);
const escape=walk(feet(0,0),{x:1,sprint:true},65);
assert(escape.x>jet.x+6 && contact(escape).depth===0);

const parkedX=jet.x,parkedZ=jet.z;
jet.x=0;jet.z=24;jet.yaw=Math.PI/2;
const rotated=walk(feet(12,0),{x:-1,sprint:true},90);
assert(rotated.x>jet.x+5.5 && rotated.x<jet.x+3.25*jetScale && Math.abs(rotated.vx)<1e-8);
jet.x=parkedX;jet.z=parkedZ;jet.yaw=0;jet.roll=.38;
const bankWing={...atWing,x:jet.x+3.5};
const above=contact({...bankWing,y:ground+6}).floor;
const below=contact({...bankWing,y:ground-2},'prone').ceiling+.54;
assert(above>below && below>ground+.88*jetScale,'banked wing rises with the scaled mesh');
jet.y+=8;
assert(walk(start,forward,90).z>jet.z+2,'an aircraft overhead leaves the street clear');
console.log('PASS real-size nose, cockpit boarding, bailout, raised wing, rotated approaches and overhead clearance.');
