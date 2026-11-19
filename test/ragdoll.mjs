import assert from 'node:assert/strict';
import {sampleRanger,J} from '../public/ragdoll.js';
import {advanceFall} from '../public/falls.js';
import {damageActor,newLife,healthView} from '../public/rivals.js';
import {groundHeight} from '../public/world.js';

const dt=1/30;
for(const moving of [false,true]){
  const actor={id:moving?'rival-fern':1,life:newLife(0,false),weapon:1,yaw:0,moving,
    state:{x:0,y:groundHeight(0,15),z:15,grounded:true,vx:0,vz:moving?-2:0}};
  for(let tick=0;tick<15;tick++){
    actor.state.z+=actor.state.vz*dt;
    actor.state.y=groundHeight(actor.state.x,actor.state.z);
    sampleRanger(actor,dt);
  }
  const live=actor.hitPose.joints.map(p=>p.clone());
  assert(damageActor(actor,100,15,{x:.28,z:-.96}));
  const rag=actor.life.fall.ragdoll;
  assert.deepEqual(rag.points,live,'takeover starts at every live joint');
  assert.notEqual(rag.points[J.head].distanceTo(rag.previous[J.head]),rag.points[J.ankleL].distanceTo(rag.previous[J.ankleL]));
  const length=live[J.hipL].distanceTo(live[J.kneeL]);
  const contacts=new Set();
  for(let tick=16;tick<104 && actor.life.fall.settled===null;tick++){
    advanceFall(actor,tick,dt,{});
    const touching=rag.points.map((p,i)=>p.y-groundHeight(p.x,p.z)<.16?i:-1).filter(i=>i>=0);
    if(touching.length)contacts.add(touching.join(','));
    assert(Math.abs(rag.points[J.hipL].distanceTo(rag.points[J.kneeL])-length)<.055);
  }
  assert(contacts.size>2,'different joints reach the floor at different times');
  assert(actor.life.fall.settled!==null);
  const settled=healthView(actor,104).fall.joints;
  advanceFall(actor,105,dt,{});assert.deepEqual(healthView(actor,105).fall.joints,settled);
  actor.life=newLife(106);assert.equal(healthView(actor,106).fall,null);
}
console.log('PASS: joint takeover, preserved limb lengths, independent contacts, sleep and respawn for a stationary player and moving NPC.');
