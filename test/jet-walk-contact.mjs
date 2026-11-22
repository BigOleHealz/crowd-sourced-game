import assert from 'node:assert/strict';

process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {stepPlayer,stanceBodyHeight}=await import('../public/world.js');
const {vehicleContact}=await import('../public/vehicle-contact.js');
const {leaveJet}=await import('../public/jet.js');
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

// A full-speed approach through both the original pose and a snapshot copy
// must stop at the tip, leaving the regular use/exit interaction reachable.
const start=feet(0,-9),forward={z:1,sprint:true};
const predict=structuredClone(jet);
const nose=walk(start,forward,60);
assert(Math.abs(nose.z-(jet.z-3.25-.32))<.001 && nose.vz===0);
world.jet=predict;
assert.deepEqual(walk(start,forward,60),nose);
world.jet=jet;
assert.equal(nextUse(world,nose,1).target,'jet');
jet.pilot=1;
assert.equal(nextUse(world,nose,1).role,'exit');
const pilot={};
leaveJet(jet,pilot);
assert(walk(pilot.state,{x:1,sprint:true},30).x>jet.x+6);

const atWing=feet(2.5,.83);
assert(contact(atWing).depth>.2);
assert(contact(atWing,'crouch').depth>.2);
assert.equal(contact(atWing,'prone').depth,0);
assert(Math.abs(contact(atWing,'prone').ceiling-(ground+.88-.54))<.001);
const prone=walk(feet(3.8,.83),{x:-1,stance:'prone'},40);
assert(prone.x<jet.x+2.6 && Math.abs(prone.z-atWing.z)<.001);
jet.y+=.52;
assert(contact(atWing).depth>.2 && contact(atWing,'crouch').depth===0);
const crouched=walk(feet(4,.83),{x:-1,stance:'crouch'},22);
assert(crouched.x<jet.x+2.6 && Math.abs(crouched.z-atWing.z)<.001);
jet.y=ground;

const landed=walk({...atWing,y:ground+3,vy:-1,grounded:false},{},60);
assert(landed.grounded && Math.abs(landed.y-(ground+.98))<.001);
const escape=walk(feet(0,0),{x:1,sprint:true},40);
assert(escape.x>jet.x+4 && contact(escape).depth===0);
jet.yaw=Math.PI/2;
const rotated=walk(feet(8,0),{x:-1,sprint:true},65);
assert(Math.abs(rotated.x-(jet.x+3.25+.32))<.001 && Math.abs(rotated.vx)<1e-8);

jet.yaw=0;jet.roll=.38;
const above=contact({...atWing,y:ground+4}).floor;
const below=contact({...atWing,y:ground-2},'prone').ceiling+.54;
assert(above>below && below>ground+.88,'banked wing has local elevated surfaces');
const bankLanding=walk({...atWing,y:ground+4,vy:-1,grounded:false},{},60);
assert(bankLanding.grounded && Math.abs(bankLanding.y-above)<.001);
jet.y+=8;
const underneath=walk(start,forward,60);
assert(underneath.z>jet.z+2,'an aircraft overhead leaves the street clear');
console.log('PASS predicted and authoritative movement, rotated sprint approaches, boarding and exit, stance clearance, overlap escape and wing landings.');
