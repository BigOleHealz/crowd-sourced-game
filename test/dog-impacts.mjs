import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,advanceRounds}=await import('../public/expedition.js');
const {newRivals}=await import('../public/rivals.js');
const {newDogs,kickDog,stepDogs}=await import('../public/dog-walkers.js');
const {dogWhimpers,dogWhimper}=await import('../public/dog-whimper.js');
const world=newExpedition(),npcs=newRivals({resort:true}),players=new Map();
world.dogs=newDogs(npcs);
const dog=world.dogs[1],snap=()=>structuredClone(world.dogs);
dog.yaw=0;
const player={id:1,state:{x:dog.x,y:dog.y,z:dog.z+10},life:{hp:100}};
const sounds=[];
let prev=snap();
function listen(tick){
  const now=snap();dogWhimpers(prev,now,tick,(d,t)=>sounds.push([d.id,t]));prev=now;
}
assert(!kickDog(world,player,dog,2));listen(2);assert.equal(sounds.length,0);
player.state.z=dog.z+.7;
assert(kickDog(world,player,dog,3));listen(3);listen(4);
assert.deepEqual(sounds,[[dog.id,3]]);
function fire(height,z,tick,weapon=1){
  world.bullets=[{id:10,weapon,shooter:1,x:dog.x-1.4,y:dog.y+height*dog.size,z:dog.z+z*dog.size,vx:58,vy:0,vz:0,left:20,age:0}];
  advanceRounds(world,players,[],tick);return world.shots.at(-1);
}
dog.yaw=0;
const body=fire(.45,.15,40);assert.equal(body.hitKind,'dog');assert.equal(body.injury,'torso');
assert.equal(body.headshot,false);listen(40);
const origin=dog.x,head=fire(.74,-.40,55,3);
assert.equal(head.hitKind,'dog');assert.equal(head.headshot,true);assert.equal(head.injury,'dogHead');
assert(Number.isFinite(head.injuryPoint.y));assert(dog.headInjury);assert.equal(dog.hp,0);
listen(55);listen(56);assert.equal(sounds.length,3);
for(let t=56;t<66;t++)stepDogs(world,npcs,players,1/30,t);
assert(Number.isFinite(dog.y),'horizontal shots retain a finite landing height');
assert(dog.x>origin,'impact carries the downed dog along the simulated ground');
dogWhimpers(undefined,snap(),55,()=>assert.fail('late join replayed hurt sound'));
for(const small of [true,false]){
 const ctx={sampleRate:24000,createBuffer(_,n){const pcm=new Float32Array(n);return {getChannelData:()=>pcm};}};
 const pcm=dogWhimper(ctx,small).getChannelData(0);
 assert(pcm.every(v=>Number.isFinite(v) && Math.abs(v)<1));
 assert(pcm.some(v=>Math.abs(v)>.1));assert(Math.abs(pcm.at(-1))<.001);
}
console.log('Confirmed kick and gun hits play fresh whimpers once, distinguish body and head, and apply physical recoil.');
