import assert from 'node:assert/strict';
import {confirmedShot,hitAngle} from '../public/shot-damage-vignette.js';
import {fire,advanceRounds,newExpedition} from '../public/expedition.js';
import {newLife,healthView,damageActor,respawnDue} from '../public/rivals.js';

const shooter={id:1,state:{x:0,y:120,z:0},life:newLife(0,false),weapon:1,fireReady:0};
const target={id:2,state:{x:0,y:120,z:-4},life:newLife(0),yaw:0};
const observer={id:3,state:{x:4,y:120,z:-4},life:newLife(0,false)};
const players=new Map([shooter,target,observer].map(p=>[p.id,p])),w=newExpedition();
const shot=t=>{
  fire(w,shooter,{aimYaw:0,aimPitch:0},t,players,[]);
  for(let i=t;i<t+8;i++)advanceRounds(w,players,[],i);
};
const initial=healthView(target,0);
shot(0);
assert.equal(target.life.hp,100);
assert(!confirmedShot(initial,healthView(target,8)),'spawn protection');
shot(65);
const damaged=healthView(target,74);
assert(damaged.hp<initial.hp && confirmedShot(initial,damaged),'confirmed incoming shot');
assert(!confirmedShot(damaged,damaged),'duplicate snapshot');
assert(!confirmedShot(null,damaged),'joining a damaged player');
assert(!confirmedShot(healthView(observer,0),healthView(observer,74)),'observer');
assert(!confirmedShot(damaged,{...damaged,hp:100}),'healing');
damageActor(target,8,75);
assert(!confirmedShot(damaged,healthView(target,76)),'non-shot damage');
let prior=healthView(target,76);
for(let t=85;target.life.hp;t+=10){
  shot(t);const latest=healthView(target,t+8);
  assert(confirmedShot(prior,latest),'repeat and lethal shots');prior=latest;
}
const returnTick=target.life.returnAt;
if(respawnDue(target,returnTick))target.life=newLife(returnTick);
assert(!confirmedShot(prior,healthView(target,returnTick)),'respawn');
assert.equal(healthView(target,returnTick).lastShotTick,undefined);
console.log('PASS shot-only local confirmation, spawn shield, burst, duplicates, lethal, reconnect, healing and respawn');

assert.equal(damaged.hitSector,4,'shot arriving from behind a north-facing target');
assert.equal(hitAngle(damaged.hitSector,0),180);
assert.equal(hitAngle(damaged.hitSector,Math.PI/2),90,'behind becomes right after camera turns east');
assert.equal(hitAngle(undefined,0),null,'ordinary all-edge feedback when horizontal direction is unavailable');
