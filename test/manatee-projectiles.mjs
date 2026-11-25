import assert from 'node:assert/strict';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {createManatees}=await import('../public/manatee-swim.js');
const {newExpedition,fire,advanceRounds,advanceMissiles,tracePulse}=await import('../public/expedition.js');
const {firearmSpecs}=await import('../public/rounds.js');
const {MAP,stanceMuzzleHeight}=await import('../public/world.js');
const {newLife}=await import('../public/rivals.js');
const {berthDeckY,marinaFingers}=await import('../public/marina-docks.js');

function setup(weapon){
  const world=newExpedition();
  const wildlife=createManatees(world,MAP.waterY);
  world.manatees=wildlife.state;
  const pier=marinaFingers[2];
  const state={x:pier.east-.3,y:berthDeckY,z:pier.z,grounded:true};
  const p={id:1,weapon,state,life:newLife(0,false),fireReady:0};
  const peers=new Map([[p.id,p]]);
  const muzzle={...state,y:state.y+stanceMuzzleHeight(state)};
  return {world,wildlife,p,peers,muzzle,animal:world.manatees[3]};
}

function aim(muzzle,target){
  const dx=target.x-muzzle.x,dy=target.y-muzzle.y,dz=target.z-muzzle.z,length=Math.hypot(dx,dy,dz);
  return {direction:{x:dx/length,y:dy/length,z:dz/length},
    input:{aimYaw:Math.atan2(dx,-dz),aimPitch:Math.atan2(dy,Math.hypot(dx,dz))}};
}

{
  const {world,wildlife,p,peers,muzzle,animal}=setup(1);
  const {direction,input}=aim(muzzle,animal);
  assert.equal(tracePulse(world,[],muzzle,direction,50,false).target,animal,'Crosshair finds submerged wildlife from the dock');
  const hp=animal.hp;
  fire(world,p,input,0,peers,[]);
  for(let i=1;i<=15 && world.bullets.length;i++){
    wildlife.step(1/30);
    advanceRounds(world,peers,[],i);
  }
  assert.equal(animal.hp,hp-firearmSpecs[1].damage);
  const hit=world.shots.find(e=>e.hitKind==='manatee');
  assert(hit.to.y<MAP.waterY,'The hit records the underwater contact point');
  assert.equal(animal.hitSeq,1);

  Object.assign(world.heli,{x:(muzzle.x+animal.x)/2,y:(muzzle.y+animal.y)/2-.7,z:(muzzle.z+animal.z)/2});
  const hpBefore=animal.hp;
  fire(world,p,aim(muzzle,animal).input,30,peers,[]);
  for(let i=31;i<50 && world.bullets.length;i++)advanceRounds(world,peers,[],i);
  assert.equal(animal.hp,hpBefore,'An intervening solid still blocks firearm damage');
  assert.equal(world.shots.at(-1).hitKind,'heli');
}

{
  const {world,p,peers,muzzle,animal}=setup(4);
  const adjacent=world.manatees[4],distant=world.manatees[0];
  Object.assign(adjacent,{x:animal.x+1.4,y:animal.y,z:animal.z+1.4});
  fire(world,p,aim(muzzle,animal).input,0,peers,[]);
  for(let i=1;i<=30 && world.missiles.length;i++)advanceMissiles(world,peers,[],i);
  assert.equal(world.shots.at(-1).hitKind,'manatee');
  for(const affected of [animal,adjacent]){
    assert.equal(affected.hp,0);
    assert.equal(affected.deathKind,'blast');
    assert.equal(affected.hitSeq,1,'Direct and area damage from one detonation count once');
  }
  assert.equal(distant.hp,distant.maxHp,'A distant manatee survives');
}
console.log('PASS dock aim, submerged firearm hit, cover and shared missile blast for nearby manatees.');
