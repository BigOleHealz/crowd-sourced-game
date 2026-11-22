import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {partyFleet,stepBoat,damageBoat}=await import('../public/patrol-boats.js');
const {stepPartyEvacuation}=await import('../public/party-evacuation.js');
const {sampleRanger}=await import('../public/ragdoll.js');
const {sinkingHull}=await import('../public/sinking-hull.js');
const {damageActor,rivalView}=await import('../public/rivals.js');

const {crowdPanicAudio}=await import('../public/crowd-panic-audio.js');
const players=new Map();
for(const index of [0,1,2,3,4,5]){
  const world=newExpedition(),boat=partyFleet()[index],npcs=[];
  world.boats=[boat];
  if(index===2)boat.cruising=false;
  damageBoat(world,boat,boat.maxHp,players);
  let firstDrop=0,maxCount=0,heard=0;
  const audio=crowdPanicAudio();audio.reset([]);
  const swimmers=new Set(),landed=new Set(),cries=new Set();
  const expected=index===2?8:9;
  for(let tick=0;tick<2700;tick++){
    stepPartyEvacuation(world,npcs,tick,1/30);
    for(const npc of npcs){
      if(tick%20===0)sampleRanger(npc,1/30,world);
      const s=rivalView(npc,tick);
      assert.equal(s.evacLook,npc.evacLook);
      if(s.swimming)swimmers.add(s.id);
      if(npc.partyEvac.safeAt)landed.add(s.id);
      if(s.panicCry>0)cries.add(s.id);
      assert((boat.evacuatedSeats&(1<<npc.partyEvac.seat))!==0);
    }
    if(tick%2===0)audio.step(npcs.map(n=>rivalView(n,tick)),tick,boat,()=>heard++);
    maxCount=Math.max(maxCount,npcs.length);
    if(tick===65 && index===0){
      const guest=npcs[0];assert(guest.state.swimming);
      assert.equal(damageActor(guest,38,tick),false);
      assert.equal(rivalView(guest,tick).hp,62);
      assert.equal(damageActor(guest,62,tick),true);
      assert(rivalView(guest,tick).dead);
    }
    if(boat.wrecked){
      const next=sinkingHull(boat,8.8);
      assert(next.drop>=firstDrop);
      firstDrop=next.drop;
    }
    stepBoat(world,boat,null,1/30,players);
    if(tick===179){
      assert(!boat.wrecked && boat.cruising);
      assert(npcs.length>0 && firstDrop>8);
    }
    if(tick>180 && !npcs.length)break;
  }
  assert.equal(maxCount,expected);
  assert.equal(swimmers.size,expected);
  assert.equal(cries.size,expected);
  assert(heard>0);
  assert.equal(landed.size,expected-(index===0?1:0),boat.id+' shore reached: '+JSON.stringify(npcs.map(n=>({s:n.state,l:n.partyEvac.landing}))));
  assert.equal(npcs.length,0);
  assert.equal(boat.evacuatedSeats,undefined);
}
console.log('All six party crews abandon sinking decks, cry out, swim to safe shore and free their seats. A defeated swimmer uses ordinary health while the yacht respawns independently.');
