import assert from 'node:assert/strict';
import {
  createManatees,manateeFloor,manateeHabitats,manateeHullClearance,
} from '../public/manatee-swim.js';

const water=-.14,dt=1/30;
const a=createManatees({},water),b=createManatees({},water);
const cameUp=a.state.map(()=>false),deepest=a.state.map(()=>Infinity);
const travelled=a.state.map(()=>0);
for(let tick=0;tick<4000;tick++){
  const prior=a.state.map(p=>[p.x,p.z]);
  a.step(dt);b.step(dt);
  assert.deepEqual(a.state,b.state,'A room snapshot depends only on simulation ticks and vessels');
  for(const [i,p] of a.state.entries()){
    const h=manateeHabitats[i];
    assert(water-manateeFloor(h,p.x,p.z)>1.21,'The whole animal stays in water deep enough to swim');
    assert(p.y-.45*h.size>manateeFloor(h,p.x,p.z),'The body clears the seabed');
    assert(p.x<107 && p.x>=h.minX-.001,'Habitats stay inside the bay chart');
    if(i>=3)assert(p.x-1.9*h.size>89,'Manatee footprint clears the marina dock tips');
    cameUp[i] ||= p.air>=0 && p.y>water-.52;
    deepest[i]=Math.min(deepest[i],p.y);
    const distance=Math.hypot(p.x-prior[i][0],p.z-prior[i][1]);
    assert(distance<1.02*dt+.002,'A calm animal follows its course at a glide');
    travelled[i]+=distance;
  }
}
assert(cameUp.every(Boolean),'Every manatee surfaces');
assert(deepest.every(y=>y<water-.83),'Each animal spends time well below the surface');
assert(travelled.every(n=>n>40),'No animal gets stuck in the shallows');

const {marinaModels}=await import('../public/marina-fleet-layout.js');
for(const kind of ['patrol','superyacht',...Object.keys(marinaModels)]){
  const yacht=kind==='superyacht';
  const boat={x:93,z:-396,yaw:0,speed:yacht?2.5:3.5,boatModel:kind};
  const world=yacht?{yacht:boat}:{boats:[boat]};
  const game=createManatees(world,water);
  let nearby=false;
  for(let tick=0;tick<480;tick++){
    const prior=game.state.map(p=>[p.x,p.z]);
    boat.z-=boat.speed*dt;
    game.step(dt);
    for(const [i,p] of game.state.entries()){
      const d=manateeHullClearance(boat,p.x,p.z,yacht).distance;
      nearby ||= d<4;
      const h=manateeHabitats[i],draft=yacht?1.25:-(marinaModels[kind]?.keel??-.58);
      assert(d>=1.92*h.size-.003 || p.y+.54*h.size<water-draft,
        'The animal clears the hull by swimming around it or safely below the keel');
      assert(Math.hypot(p.x-prior[i][0],p.z-prior[i][1])<.09,
        'A deep crossing does not snap the animal across the vessel');
    }
  }
  assert(nearby,'Vessel passed close enough to exercise the avoidance');
}
console.log('Manatees swim deterministically, surface, stay in deep water and give boats room.');

for(const [boatModel,model] of Object.entries(marinaModels)){
  const boat={x:94,z:-420,yaw:0,boatModel,speed:0};
  assert(Math.abs(manateeHullClearance(boat,boat.x,boat.z+model.halfLength+1).distance-1)<.002);
}

const {manateeContact,damageManatee}=await import('../public/manatee-swim.js');
const sim=createManatees({},water);
const animal=sim.state[0],origin={x:animal.x-6,y:animal.y,z:animal.z},end={...origin,x:animal.x+6};
assert.deepEqual(sim.state.map(a=>a.maxHp),manateeHabitats.map(h=>Math.round(120*h.size)));
const hit=manateeContact(sim.state,origin,end);
assert.equal(hit.index,0);
assert(hit.t>0 && hit.t<.5);
assert.equal(manateeContact(sim.state,{...origin,y:water+5},{...end,y:water+5}),null);
const impact={x:origin.x+12*hit.t,y:origin.y,z:origin.z};
assert(damageManatee(sim.state,0,20,'shot',impact));
assert.equal(animal.hp,animal.maxHp-20);
assert.equal(animal.deathKind,null);
assert.equal(animal.hitX,Math.round(impact.x*1000)/1000);
assert(damageManatee(sim.state,0,500,'blast'));
assert.equal(animal.deathKind,'blast');
assert.equal(manateeContact(sim.state,origin,end),null);
assert.equal(damageManatee(sim.state,0,10,'shot'),false);
assert.equal(animal.hitSeq,2);
const stop=[animal.x,animal.y,animal.z,animal.stroke];
for(let i=0;i<60;i++) sim.step(dt);
assert.deepEqual([animal.x,animal.y,animal.z,animal.stroke],stop);
assert.equal(animal.air,-1);
for(let i=0;i<150*30;i++) sim.step(dt);
assert.equal(animal.hp,animal.maxHp);
assert.equal(animal.ageSinceHit,null);
assert.equal(animal.deathKind,null);
assert.equal(animal.hitSeq,2);
