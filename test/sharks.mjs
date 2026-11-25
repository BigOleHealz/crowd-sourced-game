import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {createSharks,sharkContact,damageShark,sharkSizes,sharkSeabed}=await import('../public/shark-swim.js');
const {newExpedition,fire,updateHandheldGear}=await import('../public/expedition.js');
const {damageActor,newLife}=await import('../public/rivals.js');
const {brickellMap}=await import('../public/brickell-map.js');
const {touchLayout}=await import('../public/touch-controls.js');
const water=brickellMap.waterY;
const player=(id,x,z)=>({id,yaw:0,state:{x,y:water-.72,z,swimming:true},life:newLife(0,false),score:{deaths:0}});
function bay(...actors){
  const game=createSharks(),players=new Map(actors.map(p=>[p.id,p]));
  let tick=0;
  return {game,step(seconds){
    for(let n=0;n<Math.round(seconds*30);n++)game.step(1/30,players,++tick,damageActor);
  }};
}
const near=player(8,86,-214),shore=player(9,65,-211),deck=player(10,82,-418);
deck.state.swimming=false;
const bayfront=bay(near,shore,deck);
bayfront.step(13.9);
assert(bayfront.game.state.every(s=>s.target==null),'Deep swimming has an uninterrupted grace period');
near.state.swimming=false;bayfront.step(.1);
near.state.swimming=true;bayfront.step(13.9);
assert(bayfront.game.state.every(s=>s.target==null),'Boarding and jumping back in resets exposure');
bayfront.step(2);
assert(bayfront.game.state.some(s=>s.target===near.id),'A player sees an approach before damage');
assert.equal(near.life.hp,100);
for(let i=0;i<600 && near.life.hp===100;i++)bayfront.step(1/30);
assert(near.life.hp>0 && near.life.hp<100,'A shark bites and gives the swimmer time to escape');
const hp=near.life.hp;
near.state.x=65;
bayfront.step(30);
assert.equal(near.life.hp,hp);
assert.equal(shore.life.hp,100);assert.equal(deck.life.hp,100);
assert(bayfront.game.state.every(s=>s.target==null));
for(const s of bayfront.game.state)assert(water-sharkSeabed(s.x,s.z)>2.05,
  'patrolling sharks remain in deep water, including beneath a bridge sidewalk');
const alone=player(2,105,-500),open=bay(alone);
open.step(130);
assert.equal(alone.life.hp,0,'Sustained swimming in another offshore channel can be lethal');
assert.equal(alone.score.deaths,1,'Existing server defeat and respawn rules apply once');

const world=newExpedition();
world.sharks=createSharks().state;
assert.deepEqual(world.sharks.map(s=>s.maxHp),sharkSizes.map(size=>Math.round(120*size)));
for(const [i,s] of world.sharks.entries()){
  const nose={x:s.x+Math.sin(s.yaw)*1.23*s.size,y:s.y,z:s.z-Math.cos(s.yaw)*1.23*s.size};
  const above={...nose,y:nose.y+2},below={...nose,y:nose.y-2};
  const impact=sharkContact(world.sharks,above,below);
  assert.equal(impact.index,i);assert(impact.t>0 && impact.t<1);
  assert.equal(sharkContact([s],{...above,x:above.x+6},{...below,x:below.x+6}),null);
  const hp=s.hp;
  assert(damageShark(world.sharks,i,25,'shot',nose));
  assert.equal(s.hp,hp-25);assert.equal(s.hitSeq,1);assert.equal(s.hitX,nose.x);
  assert(damageShark(world.sharks,i,500,'blast'));assert.equal(s.deathKind,'blast');
  assert.equal(s.hp,0);assert.equal(s.hitSeq,2);
  assert.equal(sharkContact(world.sharks,above,below),null,'Dead sharks do not absorb additional shots');
  assert.equal(damageShark(world.sharks,i,25,'shot'),false);
}
const respawn=bay();
damageShark(respawn.game.state,0,900,'shot');
const corpse={...respawn.game.state[0]};respawn.step(149);
assert.equal(respawn.game.state[0].x,corpse.x);assert.equal(respawn.game.state[0].hp,0);
respawn.step(1.2);assert.equal(respawn.game.state[0].hp,corpse.maxHp);
assert.equal(respawn.game.state[0].deathKind,null);
const swimmer=player(32,86,-214),players=new Map([[swimmer.id,swimmer]]);
const aim={aimYaw:0,aimPitch:-.18};
for(const weapon of [1,2,3,4,5,6]){
  swimmer.weapon=weapon;swimmer.fireReady=0;
  const before=JSON.stringify([world.bullets,world.missiles,world.throwables,world.shots]);
  fire(world,swimmer,aim,70,players,[]);
  assert.equal(swimmer.fireReady,0);
  assert.equal(JSON.stringify([world.bullets,world.missiles,world.throwables,world.shots]),before);
}
swimmer.weapon=3;swimmer.launcherLock={key:'test'};
const held={weapon:4,fire:true,tracking:true};
assert(!updateHandheldGear(swimmer,held,false),'enter water while holding');
assert.equal(swimmer.weapon,3);assert.equal(swimmer.launcherLock,null);
assert(!updateHandheldGear(swimmer,undefined,true),'no input while swimming');
swimmer.state.swimming=false;
assert(!updateHandheldGear(swimmer,held,true),'movement command exits water');
assert(!updateHandheldGear(swimmer,{...held,fromSwimming:true},false),'queued wet command on shore');
assert.equal(swimmer.weapon,3);
assert(!updateHandheldGear(swimmer,held,false),'held trigger and stale selection remain suppressed');
assert(updateHandheldGear(swimmer,{fire:false,tracking:false},false),'release on shore');
assert.equal(swimmer.weapon,3,'last dry gear resumes');
assert(updateHandheldGear(swimmer,{weapon:2,fire:true},false));assert.equal(swimmer.weapon,2);
fire(world,swimmer,aim,80,players,[]);assert(world.bullets.length>0);
const controls=touchLayout({role:'foot',active:true,canAim:false,jump:'Climb out'});
assert(![...controls.quick,...controls.tools].some(([key])=>['KeyF','tool','aim'].includes(key)));
assert(controls.quick.some(([key])=>key==='Space'));
const {createRangerRig,poseRig}=await import('../public/ranger-pose.js');
const rig=createRangerRig();
for(const swimArmed of [false,true]){
  poseRig(rig,{...swimmer.state,swimming:true,swimArmed,weapon:3,grounded:false,yaw:0},1/30);
  assert(rig.tools.every(tool=>!tool.visible),'swimmers always holster even with stale pose state');
}
poseRig(rig,{...swimmer.state,weapon:3,grounded:true,yaw:0},1/30);
assert(rig.tools[2].visible,'selected gear returns on shore');
console.log('Shark encounters, swimming holster, held inputs, mobile controls and shore recovery passed.');
