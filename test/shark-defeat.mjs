import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {createSharks,damageShark}=await import('../public/shark-swim.js');
const {damageActor,newLife,respawnDue}=await import('../public/rivals.js');
const {sharkDefeatPose}=await import('../public/shark-defeat.js');

function encounter({hp=1,shield=0}={}){
  const sim=createSharks();
  const victim={id:15,state:{x:86,y:-.86,z:-214,swimming:true},yaw:0,
    life:{...newLife(0,false),hp,immuneUntil:shield},score:{deaths:0}};
  const players=new Map([[victim.id,victim]]);
  let tick=0;
  return {sim,victim,players,get tick(){return tick;},step(n){
    for(let i=0;i<n;i++)sim.step(1/30,players,++tick,damageActor);
  }};
}
function untilBite(bay){
  for(let i=0;i<35*30 && bay.victim.life.hp;i++)bay.step(1);
  assert.equal(bay.victim.life.hp,0,'A sustained deep-water swim ends in a confirmed fatal bite');
  assert.equal(bay.sim.defeats.length,1);
  return bay.sim.defeats[0];
}

const bay=encounter(),event=untilBite(bay),shark=bay.sim.state[event.sharkIndex];
assert.deepEqual(Object.keys(event).sort(),['arrivals','id','playerId','sharkIndex','tick','x','y','z','yaw','size'].sort());
assert.equal(event.playerId,bay.victim.id);assert.equal(event.tick,bay.tick);
assert.deepEqual([event.x,event.y,event.z],[86,-.86,-214]);assert.equal(event.size,shark.size);
assert.equal(shark.phase,'feeding');assert.equal(shark.target,null);
assert.equal(bay.victim.life.fall.cause,'defeat');assert.equal(bay.victim.score.deaths,1);
assert.equal(bay.victim.life.returnAt,event.tick+90);
const initial={...shark};
for(let age=1;age<=38;age++){
  bay.step(1);
  if(age<8)continue;
  const pose=sharkDefeatPose(event,age/30),jaw=1.45*shark.size;
  const gap=Math.hypot(shark.x+Math.sin(shark.yaw)*jaw-pose.x,
    shark.z-Math.cos(shark.yaw)*jaw-pose.z,shark.y-pose.y-.72);
  assert(gap<.54,'The moving jaw tracks the posed swimmer during the tow');
}
assert.equal(shark.phase,'feeding');assert(Math.hypot(shark.x-initial.x,shark.z-initial.z)>1);
assert(Math.hypot(shark.x-event.x,shark.z-event.z)<4);
assert.equal(bay.sim.defeats[0].id,event.id);
bay.step(48);assert.equal(shark.phase,'patrol');assert.equal(bay.sim.defeats.length,1);
bay.step(4);assert(respawnDue(bay.victim,bay.tick));
assert.equal(bay.sim.defeats.length,0);assert.equal(bay.victim.score.deaths,1);

const shielded=encounter({shield:1800});
shielded.step(1350);assert.equal(shielded.victim.life.hp,1);
assert.equal(shielded.sim.defeats.length,0);assert(shielded.sim.state.every(s=>s.phase!=='feeding'));
const survivor=encounter({hp:100});
for(let i=0;i<900 && survivor.victim.life.hp===100;i++)survivor.step(1);assert(survivor.victim.life.hp>0 && survivor.victim.life.hp<100);
assert.equal(survivor.sim.defeats.length,0);

for(const reason of ['respawn','disconnected','shark defeated']){
  const short=encounter(),e=untilBite(short);
  if(reason==='respawn'){
    short.victim.life=newLife(short.tick);short.victim.state={x:0,y:1,z:0};
  }else if(reason==='disconnected')short.players.clear();
  else damageShark(short.sim.state,e.sharkIndex,999,'blast');
  short.step(1);
  if(reason==='shark defeated'){
    assert.equal(short.sim.state[e.sharkIndex].phase,'dead');
    assert.equal(short.sim.defeats.length,1,'Original defeat still belongs to the player');
  }else assert.equal(short.sim.defeats.length,0,'Old defeat never attaches to another life');
}
const otherCause=encounter();
damageActor(otherCause.victim,50,1);otherCause.step(120);
assert.equal(otherCause.sim.defeats.length,0,'A different cause of death does not create a shark sequence');
console.log('Confirmed fatal swimmer bites publish once, follow the same timeline, and expire independently of shields, other defeats and respawns.');

// Stage four free patrols at the instant a primary makes a confirmed bite.
// Only the nearby, correctly oriented, living shark can make contact in time.
{
  const g=createSharks(),p={id:2,state:{x:97,y:-.86,z:-444,swimming:true},yaw:0,
    life:{...newLife(0,false),hp:1},score:{deaths:0}};
  const peers=new Map([[p.id,p]]);
  let tick=0,helpers;
  function fatal(prey,damage,tick,direction){
    const died=damageActor(prey,damage,tick,direction);
    if(!died)return false;
    const primary=g.state.find(s=>s.target===p.id);
    helpers=g.state.filter(s=>s!==primary);
    const c=Math.cos(primary.yaw),s=Math.sin(primary.yaw);
    const fixture=(shark,lateral,forward,yaw)=>{
      Object.assign(shark,{x:p.state.x+c*lateral+s*forward,z:p.state.z+s*lateral-c*forward,y:-.43,yaw});
    };
    fixture(helpers[0],-3.5,1,primary.yaw+Math.PI/2);
    fixture(helpers[1],-30,1,primary.yaw+Math.PI/2);
    fixture(helpers[2],3.5,1,primary.yaw-Math.PI/2);damageShark(g.state,g.state.indexOf(helpers[2]),900,'shot');
    fixture(helpers[3],-10,1,primary.yaw-Math.PI/2);
    return true;
  }
  while(!g.defeats.length && tick<1200)g.step(1/30,peers,++tick,fatal);
  assert.equal(g.defeats.length,1);
  const e=g.defeats[0],visitor=helpers[0];
  assert.equal(visitor.phase,'joining');assert.deepEqual(e.arrivals,[]);
  for(let n=0;n<80;n++){
    const old={...visitor};g.step(1/30,peers,++tick,fatal);
    assert(Math.hypot(visitor.x-old.x,visitor.z-old.z)<.19,'A reinforcement reaches the encounter by swimming');
  }
  assert.deepEqual(e.arrivals.map(a=>a.sharkIndex),[g.state.indexOf(visitor)]);
  assert(e.arrivals[0].tick>e.tick && e.arrivals[0].tick-e.tick<=63);
  assert.equal(g.defeats.length,1);assert.equal(p.score.deaths,1);
  assert.equal(helpers[2].hp,0);
  assert.equal(p.life.lostParts.leftLeg.tick,e.arrivals[0].tick);
  assert(p.life.lostParts.leftLeg.water);
}
console.log('A nearby shark joins only on contact. Far, facing-away and defeated sharks cannot join the encounter.');


// Keep swimming at normal top speed until reaching the playable boundary.
// Stationary targets in the middle of a patrol do not exercise this turn.
for(const [x,z,dx,dz] of [[44,-6,1,0],[65,-211,1,0],[0,82,0,1],[-80,70,-1,0],
  [92,-485,0,-1],[108,108,0,0],[-93,-517,0,0],[75,-200,0,-1]]){
  const bay=encounter({hp:100}),victim=bay.victim,hits=[];
  Object.assign(victim.state,{x,z});
  for(let n=0;n<65*30 && victim.life.hp;n++){
    victim.state.x=Math.max(-94,Math.min(109,victim.state.x+dx*3.05/30));
    victim.state.z=Math.max(-518,Math.min(109,victim.state.z+dz*3.05/30));
    const hp=victim.life.hp;
    bay.step(1);
    if(hp===victim.life.hp)continue;
    hits.push(victim.life.hp);
    assert.equal(victim.life.lastBiteTick,bay.tick);
    const shark=bay.sim.state.find(s=>s.target===victim.id || s.phase==='feeding');
    const jaw=1.48*shark.size;
    assert(Math.hypot(shark.x+Math.sin(shark.yaw)*jaw-victim.state.x,
      shark.z-Math.cos(shark.yaw)*jaw-victim.state.z)<1.1);
  }
  assert.deepEqual(hits,[66,32,0],`Three contact bites on the route from ${x},${z}`);
  const pose=sharkDefeatPose(bay.sim.defeats[0],1.85);
  assert(pose.x>=-94 && pose.x<=109 && pose.z>=-518 && pose.z<=109);
  assert.equal(victim.score.deaths,1);
}

const {sharkDefeatCamera}=await import('../public/shark-defeat.js');
const quiet=sharkDefeatCamera(event,0,1,true,-.14);
let prior=sharkDefeatCamera(event,0,1,false,-.14);
for(let frame=1;frame<=90;frame++){
  const age=frame/30;
  assert.deepEqual(sharkDefeatCamera(event,age,1,true,-.14),quiet);
  const shot=sharkDefeatCamera(event,age,1,false,-.14);
  assert(Math.hypot(shot.x-prior.x,shot.z-prior.z)<.09 && Math.abs(shot.y-prior.y)<.11);
  prior=shot;
}
assert(prior.y<-.14 && quiet.y>-.14);
