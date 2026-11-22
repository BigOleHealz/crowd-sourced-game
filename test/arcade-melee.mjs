import assert from 'node:assert/strict';
import {meleeItems,validEquipment,nextEquipment,equipmentKeys} from '../public/arcade-melee.js';
import {newExpedition,fire,advanceMelee,updateHandheldGear} from '../public/expedition.js';
import {CITY,spawn} from '../public/world.js';
import {newLife} from '../public/rivals.js';
import {touchLayout} from '../public/touch-controls.js';

const feet=spawn();
const person=(id,x,z)=>({id,state:{...feet,x:feet.x+x,z:feet.z+z},yaw:0,life:newLife(0,false),score:{kills:0,deaths:0},fireReady:0});
const controls=touchLayout({role:'foot',active:true,canAim:true,melee:true});
assert(controls.quick.some(([key,label])=>key==='KeyF' && label==='Swing'));
assert(controls.tools.some(([key])=>key==='tool') && !controls.quick.some(([key])=>key==='aim'));
assert(!validEquipment(99) && !validEquipment('7') && nextEquipment(6)===7);
assert.equal(nextEquipment(Number(Object.keys(meleeItems).at(-1))),1);

for(const [key,item] of Object.entries(meleeItems)){
  const slot=Number(key);
  assert(validEquipment(slot) && equipmentKeys.includes('Digit'+slot));
  const w=newExpedition(),p=person(1,0,0),near=person('resident',.45,-1.18),far=person(2,0,-1.70);
  const players=new Map([[p.id,p],[far.id,far]]),npcs=[near];
  updateHandheldGear(p,{weapon:slot},false);
  const swing=(t,yaw=0)=>fire(w,p,{aimYaw:yaw},t,players,npcs);
  const resolve=t=>advanceMelee(w,p,t,players,npcs);
  swing(40);
  assert.equal(p.meleeSwing.weapon,slot);
  assert.equal(p.meleeSwing.hit,false);
  for(let t=40;t<40+item.windup;t++){swing(t);resolve(t);}
  assert.equal(near.life.hp,100);
  resolve(40+item.windup);resolve(40+item.windup);resolve(41+item.windup);
  assert.equal(near.life.hp,100-item.damage);
  assert.equal(near.life.lastHurtTick,40+item.windup);
  assert.equal(far.life.hp,100);
  assert(p.meleeSwing.hit && Object.values(p.meleeSwing.contact).every(Number.isFinite));
  assert.equal(p.meleeSwing.tick,40);
  assert.equal(w.bullets.length+w.missiles.length+w.shots.length,0);
  swing(40+item.cooldown-1);
  assert.equal(p.meleeSwing.tick,40);

  let t=100;
  function attempt(setup=()=>{},yaw=0){
    t+=item.cooldown+1;
    swing(t,yaw);
    setup();
    resolve(t+item.windup);
    return p.meleeSwing?.hit;
  }
  assert.equal(attempt(()=>{},Math.PI),false,'behind the player');
  near.state.z=far.state.z=feet.z-item.range-.5;
  assert.equal(attempt(),false,'out of reach');
  near.state.z=feet.z-1.15;near.state.y+=4;
  assert.equal(attempt(),false,'on another floor');
  near.state.y=feet.y;
  // Even when its passenger compartment is narrow, a vehicle body occludes
  // the line to a target on its other side.
  Object.assign(w.rover,{x:feet.x+.2,y:feet.y,z:feet.z-.6});
  assert.equal(attempt(),false,'through a parked vehicle');
  w.rover.x+=20;
  near.life.immuneUntil=t+100;
  assert.equal(attempt(),false,'spawn protection');near.life.immuneUntil=0;
  p.team=near.team='blue';
  assert.equal(attempt(),false,'team protection');delete p.team;delete near.team;
  assert.equal(attempt(()=>{p.state.swimming=true;}),false,'water during windup');
  updateHandheldGear(p,{weapon:2,fire:true},false);
  assert.equal(p.meleeSwing,undefined);assert.equal(p.weapon,slot);
  p.state.swimming=false;
  assert.equal(updateHandheldGear(p,{fire:true},false),false);
  assert(updateHandheldGear(p,{fire:false},false));
  assert.equal(attempt(()=>updateHandheldGear(p,{weapon:2},false)),undefined,'switch cancels windup');
  updateHandheldGear(p,{weapon:slot},false);
  for(const state of [{ride:{kind:'bike'}},{climb:{}},{swimming:true}]){
    Object.assign(p.state,state);swing(t+100);assert.equal(p.meleeSwing,undefined);delete p.state[Object.keys(state)[0]];
  }
  w.jet.pilot=p.id;swing(t+100);assert.equal(p.meleeSwing,undefined);w.jet.pilot=null;
  near.state.z=feet.z-5;
  far.state.z=feet.z-1;
  far.life.hp=item.damage;
  assert.equal(attempt(),true);
  assert.equal(far.life.hp,0);assert.equal(far.score.deaths,1);assert.equal(p.score.kills,1);
}
console.log('PASS',CITY?'Brickell':'Outpost','arcade melee input, finite arc, obstruction, single contact, health/score and holster');
