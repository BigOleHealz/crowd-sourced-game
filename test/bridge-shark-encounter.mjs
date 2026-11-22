import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {bridges,cityGround,brickellMap}=await import('../public/brickell-map.js');
const {bridgeMiddle,maxLift}=await import('../public/drawbridges.js');
const {newExpedition}=await import('../public/expedition.js');
const {newDogs,removeDog,stepDogs}=await import('../public/dog-walkers.js');
const {requestDogAction}=await import('../dog-actions.js');
const {createSharks,clearSharkCourse}=await import('../public/shark-swim.js');
const {estatePools}=await import('../public/swimming-pools.js');
const {stepSharkDogEncounters}=await import('../public/shark-dog-encounter.js');
const {stepSharkScavenging}=await import('../public/shark-scavenging.js');

const dt=1/30;
function play(bridge,position,yaw,{underDeck=false,shore=false,pitch=0,warm=0,rescue=false,group=true,shallows=false,pool=false}={}){
  const world=newExpedition(),patrol=createSharks(),z=bridgeMiddle(bridge);
  if(underDeck)world.doors.bridgeLifts={[bridge.north]:maxLift};
  const owner={id:'rival-fern',yaw:0,life:{hp:100},state:{x:0,y:6.5,z}};
  const player={id:1,yaw,life:{hp:100},state:{...owner.state,grounded:true}};
  const observer={id:2,yaw:0,life:{hp:100},state:{x:2,y:6.5,z}};
  const players=new Map([[1,player],[2,observer]]);
  world.sharks=patrol.state;
  world.dogs=newDogs([owner]);
  const [dog]=world.dogs;
  let tick=1,removals=0,waterEntry,firstStrike,groupTick,sharedBite=false,engaged=false,rescued=false;
  let strikeContact,contactAfterRemoval=false;
  const participants=new Set();
  for(;tick<=warm;tick++)patrol.step(dt,players,tick,()=>false);
  const action=(p,action)=>requestDogAction(world,p,{action,target:dog.id,yaw,pitch},tick);
  action(player,'take');assert.equal(dog.carrier,1);
  Object.assign(player.state,position);tick+=10;
  if(shore)Object.assign(owner.state,position);
  action(player,'toss');assert.equal(dog.mode,'thrown');
  for(;tick<warm+900;tick++){
    const previous=world.sharks.map(s=>({x:s.x,z:s.z}));
    patrol.step(dt,players,tick,()=>false);
    stepDogs(world,[owner],players,dt,tick);
    if(dog.tossSplashTick===tick){
      waterEntry={x:dog.x,y:dog.y,z:dog.z};
      assert.equal(dog.mode,'swimming');
      if(shore){
        assert.equal(dog.tossBridge,bridge.north);
        assert(!clearSharkCourse(dog,dog),'The standard patrol margin excludes this narrow near-shore splash');
        assert(cityGround(dog.x,dog.z,brickellMap.waterY-.02)<brickellMap.waterY-.33);
      }
      if(underDeck){
        assert(cityGround(dog.x,dog.z)>waterEntry.y+3);
        assert.equal(cityGround(dog.x,dog.z,Infinity,world.doors),-2.8,'toss passes through the raised leaves');
      }
    }
    if(underDeck && waterEntry)world.doors.bridgeLifts[bridge.north]=Math.max(0,world.doors.bridgeLifts[bridge.north]-maxLift*dt/5);
    stepSharkDogEncounters(world,dt,d=>{assert(removeDog(world,d));removals++;},tick);
    stepSharkScavenging(world,players,[owner],tick,dt);
    const lead=world.sharks.find(s=>s.dogEncounter);
    engaged ||= !!lead;
    for(const [i,s] of world.sharks.entries())assert(Math.hypot(s.x-previous[i].x,s.z-previous[i].z)<.25,
      `continuous approach at ${tick}, shark ${i}, ${s.phase}, ${JSON.stringify([previous[i],s.x,s.z])}`);
    if(lead?.phase==='dog-strike'){
      if(firstStrike==null){
        firstStrike=tick;
        assert.equal(dog.sharkBite?.tick,tick);
        assert(Math.hypot(dog.sharkBite.x-dog.x,dog.sharkBite.y-dog.y,dog.sharkBite.z-dog.z)<.01);
        strikeContact={...dog.sharkBite};
      }
      participants.add(lead);
    }
    if(dog.sharkBite){
      assert.deepEqual(dog.sharkBite,strikeContact,'the helpers share one contact event');
      contactAfterRemoval ||= dog.mode==='removed';
    }
    const feeding=world.sharks.filter(s=>s.phase==='scavenging' && s.scavenge?.key.startsWith('toss-'));
    for(const helper of feeding)participants.add(helper);
    if(lead?.phase==='dog-strike' && dog.mode==='swimming' && feeding.length)sharedBite=true;
    if(feeding.length>=2){
      assert.equal(feeding[0].scavenge.key,feeding[1].scavenge.key);
      assert(Math.hypot(feeding[0].x-feeding[1].x,feeding[0].z-feeding[1].z)>1);
      assert(feeding.every(s=>Math.hypot(s.x-dog.x,s.z-dog.z)<3));
      groupTick??=tick;
    }
    if(rescue && !rescued && lead && world.sharks.some(s=>s.scavenge)){
      Object.assign(observer.state,{x:dog.x,y:dog.y,z:dog.z});action(observer,'take');
      assert.equal(dog.carrier,2);rescued=true;
    }
  }
  assert(world.sharks.every(s=>!s.dogEncounter && !s.scavenge),'all patrols released');
  assert.equal(dog.sharkBite,undefined,'expired contacts leave the world snapshot');
  if(rescue){assert(rescued && !removals && !groupTick);return;}
  if(!group){
    if(pool)assert(waterEntry && waterEntry.y>.2 && dog.tossBridge==null,'The pool has its own unaffected waterline');
    else if(shallows)assert(waterEntry && cityGround(waterEntry.x,waterEntry.z)>-1.65);
    else assert.equal(waterEntry,undefined);
    assert(!engaged && !groupTick && !removals);return;
  }
  assert(waterEntry && firstStrike && groupTick,`natural patrols reach the same thrown dog, ${JSON.stringify({waterEntry,firstStrike,groupTick,sharedBite})}`);
  assert(sharedBite,'the companions feed while the struck dog is still visible');
  assert(contactAfterRemoval,'the surface contact survives removal of the dog');
  assert.equal(removals,1);
  if(shore)assert([...participants].every(s=>clearSharkCourse(s,s)),`The feeding group leaves the narrow shelf for regular patrol water: ${JSON.stringify([...participants].map(s=>[s.x,s.z,s.yaw,clearSharkCourse(s,s)]))}`);
  console.log('Bridge',z,'splash',waterEntry,'strike tick',firstStrike,'group feeding tick',groupTick);
}
for(const bridge of bridges){
  const z=bridgeMiddle(bridge);
  assert(clearSharkCourse({x:-12,z},{x:12,z}),'the central channel passes below the road');
  assert(!clearSharkCourse({x:-12,z:bridge.south-1},{x:12,z:bridge.south-1}),'the low abutment blocks the course');
  play(bridge,{x:bridge.east-.55,y:cityGround(bridge.east-.55,z),z},Math.PI/2);
  const raised={bridgeLifts:{[bridge.north]:maxLift}};
  const lip={x:bridge.west+.7,y:cityGround(bridge.west+.7,z+1.9,Infinity,raised),z:z+1.9};
  play(bridge,lip,Math.PI/2-.20,{underDeck:true});
  const nearShore={x:bridge.east-.55,z:bridge.south-.55};
  play(bridge,{...nearShore,y:cityGround(nearShore.x,nearShore.z)},Math.PI/2,{shore:true,pitch:-1});
  const opposite={x:bridge.west+.55,z:bridge.north+.55};
  play(bridge,{...opposite,y:cityGround(opposite.x,opposite.z)},-Math.PI/2,{shore:true,pitch:-1,warm:180});
  play(bridge,{x:bridge.east-.55,y:cityGround(bridge.east-.55,z),z},Math.PI/2,{rescue:true});
  play(bridge,{x:0,y:cityGround(0,z),z},0,{group:false});
}

// The beach shallows can float a dog while still being too shallow for sharks.
const beach={x:61,z:-214};
assert(!clearSharkCourse({x:81,z:beach.z},{x:67,z:beach.z}));
play(bridges[0],{...beach,y:cityGround(beach.x,beach.z)},Math.PI/2,{group:false,shallows:true});
const pond=estatePools.find(p=>p.reflecting);
play(bridges[0],{x:pond.x-pond.w/2-.55,y:pond.deckY,z:pond.z},Math.PI/2,{group:false,pool:true,pitch:-1});
