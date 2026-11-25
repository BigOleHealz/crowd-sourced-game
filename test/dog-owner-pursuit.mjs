import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {newRivals,newLife,updateRival,rivalView}=await import('../public/rivals.js');
const {newDogs,takeDog,throwDog,stepDogs}=await import('../public/dog-walkers.js');
const {startDogPursuit,stepDogPursuit}=await import('../public/dog-owner-pursuit.js');
function setup(ambient){
  const world=newExpedition(),npcs=newRivals(),players=new Map();
  world.dogs=newDogs(npcs);
  const dog=world.dogs[0],owner=npcs.find(n=>n.id===dog.walker);
  const person=(id)=>({id,yaw:0,life:newLife(0,false),state:{...owner.state}});
  const thief=person(8),observer=person(9);
  for(const p of [observer,thief])players.set(p.id,p);
  const start={...owner.state},next=owner.next;
  assert(takeDog(world,thief,dog));dog.lastThief=thief.id;dog.theftTick=1;
  if(ambient)owner.reaction={type:ambient,since:0,until:60,x:start.x,z:start.z,look:0};
  assert(startDogPursuit(world,thief,dog,1,npcs));
  assert(!startDogPursuit(world,observer,dog,1,npcs));
  let tick=1;
  function step(n=1){
    while(n--){
      if(!stepDogPursuit(world,owner,players,tick,1/30))updateRival(owner,tick,1/30,world.hp,world);
      stepDogs(world,npcs,players,1/30,tick++);
    }
  }
  return {world,npcs,players,dog,owner,thief,observer,start,next,step};
}
{
  const {dog,owner,thief,observer,start,step}=setup();
  thief.state.z+=8;step(12);assert.equal(owner.state.z,start.z);
  step(15);assert.equal(dog.carrier,thief.id);assert(owner.state.z>start.z+1);
  assert.equal(rivalView(owner,25).pursuedDog,dog.id);
  for(let i=0;i<220 && dog.carrier!==null;i++)step();
  assert.equal(dog.carrier,null);assert.equal(dog.mode,'leashed');
  assert(Math.hypot(owner.state.x-thief.state.x,owner.state.z-thief.state.z)<1.02);
  assert(Math.hypot(owner.state.x-observer.state.x,owner.state.z-observer.state.z)>5);
  assert.equal(dog.lastThief,undefined);assert.equal(dog.theftTick,1);
  assert.equal(observer.life.hp,100);assert.equal(thief.life.hp,100);assert.equal(owner.pursuedDog,undefined);
  assert(dog.recoveredTick>35);assert(owner.escapeTrail.length);
  for(let i=0;i<420 && owner.escapeTrail?.length;i++)step();
  assert(!owner.escapeTrail);assert(Math.hypot(owner.state.x-start.x,owner.state.z-start.z)<.4);
  const z=owner.state.z;step(80);assert(Math.abs(owner.state.z-z)>.65,'Resumes regular sidewalk route');
}
{
  const {world,npcs,owner,dog,thief,observer,step}=setup();
  step(18);assert.equal(dog.mode,'carried','No instant grab at the point of theft');
  assert(throwDog(world,thief));step(1);assert.equal(owner.pursuedDog,undefined);assert.equal(dog.mode,'thrown');
  step(70);Object.assign(observer.state,{x:dog.x,y:dog.y,z:dog.z});assert(takeDog(world,observer,dog));
  assert(startDogPursuit(world,observer,dog,95,npcs));observer.state.x+=4;step(70);
  assert.equal(dog.carrier,null);
}
for(const interrupt of ['fall','death','disconnect','new-life','boat','collapse','vertical separation']){
  const {world,dog,owner,players,thief,step}=setup();
  if(interrupt==='fall')thief.life.fall={started:0};
  if(interrupt==='death')owner.life.hp=0;
  if(interrupt==='disconnect')players.delete(thief.id);
  if(interrupt==='new-life')thief.life=newLife(5,false);
  if(interrupt==='boat')world.boats[0].driver=thief.id;
  if(interrupt==='collapse')owner.reaction={type:'collapse',since:0,until:90,x:owner.state.x,z:owner.state.z,look:0};
  if(interrupt==='vertical separation'){thief.state.y+=4;step(80);assert.equal(dog.carrier,thief.id);continue;}
  step();assert.equal(owner.pursuedDog,undefined,interrupt);
}
{
  const {owner,dog,thief,step}=setup('horn');
  assert.equal(owner.reaction,undefined);
  thief.state.z+=4;owner.reaction={type:'spray',since:0,until:75,x:owner.state.x,z:owner.state.z,look:0};
  step(20);assert.equal(owner.pursuedDog,dog.id);assert.equal(owner.reaction,undefined);
}
console.log('Only the original walker pursues the actual carrier, closes the distance, reclaims the dog and retraces the sidewalk. Drops, transfers, falls, respawns, boarding, panic and vertical separation are respected.');
