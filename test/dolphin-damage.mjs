import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,fire,advanceRounds,advanceMissiles,tracePulse}=await import('../public/expedition.js');
const {newLife}=await import('../public/rivals.js');
const {firearmSpecs}=await import('../public/rounds.js');
const {createDolphins}=await import('../public/dolphin-swim.js');
const {marineBlastCalls}=await import('../public/marine-float.js');
const {dolphinCalls}=await import('../public/dolphin-audio.js');
const {MAP,stanceMuzzleHeight}=await import('../public/world.js');
const world=newExpedition(),pod=createDolphins(world,MAP.waterY);
world.dolphins=pod.state;
const a=pod.state[0],b=pod.state[1],far=pod.state[7];
Object.assign(a,{x:92,z:-419,y:-1,yaw:0});
Object.assign(b,{x:92,z:-417.6,y:-1,yaw:0});
const state={x:88.7,y:.56,z:-419,grounded:true};
const p={id:1,state,weapon:1,life:newLife(0,false),fireReady:0},peers=new Map([[1,p]]);
const muzzle={...state,y:state.y+stanceMuzzleHeight(state)};
const dx=a.x-muzzle.x,dy=a.y-muzzle.y,dz=a.z-muzzle.z,d=Math.hypot(dx,dy,dz);
const input={aimYaw:Math.atan2(dx,-dz),aimPitch:Math.atan2(dy,Math.hypot(dx,dz))};
assert.equal(tracePulse(world,[],muzzle,{x:dx/d,y:dy/d,z:dz/d},45,false).target,a);
fire(world,p,input,0,peers,[]);
for(let tick=1;tick<15 && world.bullets.length;tick++)advanceRounds(world,peers,[],tick);
assert.equal(a.hp,a.maxHp-firearmSpecs[1].damage);
assert.equal(world.shots.at(-1).hitKind,'dolphin');
const prev=structuredClone(pod.state);p.weapon=4;
fire(world,p,input,50,peers,[]);
for(let tick=51;tick<85 && world.missiles.length;tick++)advanceMissiles(world,peers,[],tick);
assert.equal(world.shots.at(-1).hitKind,'dolphin');
assert.equal(a.hitSeq,2);assert.equal(b.hitSeq,1);assert.equal(far.hitSeq,0);
assert.equal(a.hp,0);assert.equal(b.hp,0);assert.equal(far.hp,far.maxHp);
const snap=JSON.parse(JSON.stringify(pod.state));
for(let client=0;client<2;client++){
  const cues=[];
  marineBlastCalls(prev,snap,p=>cues.push(p));
  marineBlastCalls(snap,snap,p=>cues.push(p));
  assert.equal(cues.length,2,'one cue per fallen animal per client');
  dolphinCalls(prev,snap,state,()=>assert.fail('dead animals must not call'));
}
Object.assign(far,{x:a.x,y:a.y,z:a.z,yaw:a.yaw});p.weapon=1;
for(let tick=120;far.hp>0 && tick<450;tick+=30){
  fire(world,p,input,tick,peers,[]);
  for(let i=tick+1;i<tick+20 && world.bullets.length;i++)advanceRounds(world,peers,[],i);
}
assert.equal(far.hp,0);
assert.equal(far.deathKind,'shot');
assert.equal(far.hitSeq,Math.ceil(far.maxHp/firearmSpecs[1].damage));
console.log('PASS underwater firearm hit, shared blast fallout, size-scaled health and snapshot-driven effects on two observers.');
