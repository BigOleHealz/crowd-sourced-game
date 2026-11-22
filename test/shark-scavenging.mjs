import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,advanceMissiles}=await import('../public/expedition.js');
const {createSharks}=await import('../public/shark-swim.js');
const {stepSharkScavenging}=await import('../public/shark-scavenging.js');
const {newLife}=await import('../public/rivals.js');
const {estatePools}=await import('../public/swimming-pools.js');
const sea=-.14,bay={x:86,z:-214,y:sea-.72};
function encounter(position=bay){
  const world=newExpedition();const patrol=createSharks();
  world.sharks=patrol.state;
  for(const [i,s] of world.sharks.entries()){
    Object.assign(s,{x:bay.x+(i===0?-6:i===1?7:65),z:bay.z+(i===1?2:0),y:sea-.9});
  }
  const player={id:42,life:newLife(0,false),state:{...position,swimming:true},yaw:0};
  const players=new Map([[42,player]]);let tick=0;
  function step(n){for(let i=0;i<n;i++){
    ++tick;patrol.step(1/30,players,tick,()=>false);stepSharkScavenging(world,players,[],tick,1/30);
  }}
  function blast(){
    world.missiles.push({id:71,source:'tank',shooter:5,x:position.x,y:position.y+1,z:position.z+.82,yaw:0,pitch:0,remaining:5});
    advanceMissiles(world,players,[],tick);
    return world.shots.find(s=>s.weapon==='waterHit');
  }
  return {world,players,player,step,blast};
}
const a=encounter(),cue=a.blast();assert(cue?.blast && cue.dead);
a.step(6);
const arrivals=a.world.sharks.filter(s=>s.scavenge);
assert.equal(arrivals.length,2);
assert.notEqual(arrivals[0].scavenge.bearing,arrivals[1].scavenge.bearing);
const previous=arrivals.map(s=>({...s}));
a.step(1);for(const [i,s] of arrivals.entries())assert(Math.hypot(s.x-previous[i].x,s.z-previous[i].z)<.18);
a.step(96);assert(arrivals.every(s=>s.phase==='scavenging' && s.scavenge.biteTick>6));
assert(Math.hypot(arrivals[0].x-arrivals[1].x,arrivals[0].z-arrivals[1].z)>2);
assert(a.world.sharks.slice(2).every(s=>!s.scavenge),'no distant sharks materialize');
a.player.life=newLife(109,false);a.player.state={x:5,y:1,z:1};
a.step(22);assert(arrivals.every(s=>s.scavenge),'detached blast effects survive avatar respawn');
arrivals[0].hp=0;arrivals[0].deathY=sea-1;arrivals[0].deathKind='shot';
a.step(1);assert(!arrivals[0].scavenge,'interrupted approach does not survive shark defeat');
a.step(430);assert(arrivals.every(s=>!s.scavenge),'bounded feeding site expires');
for(const key of ['dolphins','manatees','dogs']){
  const b=encounter();b.players.clear();const animal={id:'test',...bay,hp:0,mode:'down',ageSinceHit:0,deathKind:'shot'};
  b.world[key]=[animal];b.step(100);assert(b.world.sharks.some(s=>s.phase==='scavenging'),key);
  animal.hp=50;b.step(6);assert(b.world.sharks.every(s=>!s.scavenge),'animal respawn clears encounter');
}
const c=encounter();c.player.life.hp=0;c.step(98);assert(c.world.sharks.some(s=>s.phase==='scavenging'));
c.player.life=newLife(110,true);c.step(8);assert(c.world.sharks.every(s=>!s.scavenge));
for(const p of [estatePools[0],{x:-69.15,z:34.5,waterY:96.30}]){
  const b=encounter({x:p.x,y:p.waterY-.72,z:p.z}),evt=b.blast();assert(evt?.dead && evt.blast);assert(Math.abs(evt.waterline-p.waterY)<.002);
  Object.assign(b.world.sharks[0],{x:p.x-3,z:p.z});
  b.step(40);assert(b.world.sharks.every(s=>!s.scavenge));
}
for(const p of [{x:-59,y:.8,z:45},{x:71.6,y:10,z:-449},{x:71.6,y:.56,z:-435},{x:86,y:.90,z:-214}]){
  const b=encounter(p);b.player.life.hp=0;b.step(40);assert(b.world.sharks.every(s=>!s.scavenge));
}
console.log('Two nearby sharks physically approach, reserve distinct feeding positions, bite together, stop on loss or expiry. Detached blast remains survive owner respawn. Dogs and marine wildlife, both natural and missile deaths, land, dock and both pool elevations covered.');
