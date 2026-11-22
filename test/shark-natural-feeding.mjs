import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {createSharks}=await import('../public/shark-swim.js');
const {createDolphins}=await import('../public/dolphin-swim.js');
const {createManatees}=await import('../public/manatee-swim.js');
const {hitMarineWildlife}=await import('../public/marine-contacts.js');
const {inFeedingDepth,stepSharkScavenging}=await import('../public/shark-scavenging.js');
const sea=-.14,counts=[];
for(const species of ['dolphins','manatees']){
  let count=1;
  for(let index=0;index<count;index++){
    const world=newExpedition(),patrol=createSharks(),players=new Map();
    world.sharks=patrol.state;
    const group=species==='dolphins'?createDolphins(world,sea):createManatees(world,sea);
    world[species]=group.state;count=group.state.length;
    assert.equal(world.sharks.filter(s=>!s.scavenger).length,5);
    const animal=group.state[index],point={...animal};
    hitMarineWildlife(world,animal,point,150,3.5);
    assert.equal(animal.deathKind,'blast');
    let twinTime;
    for(let tick=1;tick<540;tick++){
      const previous=world.sharks.map(s=>({x:s.x,z:s.z}));
      patrol.step(1/30,players,tick,()=>false);group.step(1/30);
      stepSharkScavenging(world,players,[],tick,1/30);
      for(const [i,s] of world.sharks.entries())assert(Math.hypot(s.x-previous[i].x,s.z-previous[i].z)<.33,'continuous swimming from natural patrol');
      const feeding=world.sharks.filter(s=>s.phase==='scavenging' && Math.hypot(s.x-point.x,s.z-point.z)<6);
      if(feeding.some((s,i)=>feeding.slice(i+1).some(other=>s.scavenge.key===other.scavenge.key))){twinTime=tick;break;}
    }
    // One blast can kill several pod members. Their remains are adjacent;
    // neighboring food sites should not prevent natural multiple attendance.
    assert(twinTime,species+' '+index+' '+JSON.stringify([point.x,point.z,world.sharks.map(s=>[s.phase,s.scavenge?.key,s.x,s.z])]));
    counts.push([species,index,twinTime]);
  }
}
for(const z of [-181,-405]){
  const world=newExpedition(),patrol=createSharks(),players=new Map();
  world.sharks=patrol.state;
  world.shots.push({id:1,weapon:'waterHit',to:{x:-83,z,y:-.4},tick:0,waterline:sea,dead:true,blast:true});
  let both=false;
  for(let tick=1;tick<540 && !both;tick++){
    patrol.step(1/30,players,tick,()=>false);stepSharkScavenging(world,players,[],tick,1/30);
    both=world.sharks.filter(s=>s.phase==='scavenging' && s.scavenge.key==='hit1').length>=2;
  }
  assert(both,'western open-water patrol at '+z);
}
assert(inFeedingDepth(-5,-7),'a deep hit inside the water column qualifies');
assert(!inFeedingDepth(-8,-7),'below the seabed');
assert(!inFeedingDepth(2,-7),'above the surface');
assert(!inFeedingDepth(-.45,-.70),'shallow shoreline');
console.log('Natural habitat two-shark arrivals (ticks):',JSON.stringify(counts));
