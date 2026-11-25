import assert from 'node:assert/strict';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newDogs}=await import('../public/dog-walkers.js');
const {createWanted}=await import('../public/wanted.js');
const {requestDogAction}=await import('../dog-actions.js');

const walker={id:'rival-fern',yaw:0,state:{x:0,y:1,z:8}};
const player=id=>({id,yaw:0,state:{...walker.state},life:{hp:100}});
const a=player(1),b=player(2);
const world={dogs:newDogs([walker])},dog=world.dogs[0];
const police=world.wanted=createWanted(world,new Map([[1,a],[2,b]]));
const act=(p,action,tick,target=dog.id)=>requestDogAction(world,p,{action,target,yaw:0,pitch:0},tick);
const stars=(p,tick)=>police.view(p,tick).stars;
function land(mode){Object.assign(dog,walker.state,{mode,carrier:null});}
police.set(b,true);

assert.equal(act(a,'take',5),dog);
assert.equal(dog.theftTick,5);
assert.equal(stars(a,5),0,'Police off for this player');
assert.equal(act(b,'take',5),undefined);
assert.equal(stars(b,5),0,'Contested take did not succeed');
act(a,'toss',16);
land('loose');
police.set(a,true);
act(a,'take',30);
assert.equal(dog.theftTick,5,'Regrabbing the same loose dog does not create a new theft');
assert.equal(stars(a,30),0);

land('leashed');
assert.equal(act(a,'take',50,'invalid'),undefined);
assert.equal(stars(a,50),0);
assert.equal(act(a,'take',50),dog);
assert.equal(stars(a,50),1);
act(a,'take',65);
assert.equal(stars(a,65),1);
land('loose');
act(b,'take',71);
assert.equal(stars(b,71),1,'New carrier owns their own crime');
assert.equal(dog.theftTick,71);
for(let expected=2;expected<=6;expected++){
  land('leashed');
  const tick=100+expected*12;
  act(a,'take',tick);
  assert.equal(stars(a,tick),Math.min(expected,5));
}
console.log('Only a confirmed new theft earns its thief a star when police are enabled, capped at five.');
