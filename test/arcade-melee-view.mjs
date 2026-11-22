import assert from 'node:assert/strict';
import * as THREE from 'three';

process.env.PINEWATCH_MAP='brickell';
const {Batch}=await import('../public/scene.js');
const {createRangerRig,poseRig}=await import('../public/ranger-pose.js');
const {arcadeMeleeEquipment,arcadeSwordContacts}=await import('../public/arcade-melee-view.js');
const {meleeAudioTracker,meleeBuffer}=await import('../public/arcade-melee-feedback.js');
const {applyLostParts,characterBurst}=await import('../public/character-hit-view.js');
const {newLife,healthView}=await import('../public/rivals.js');
const {groundHeight}=await import('../public/world.js');

const dt=1/60,x=0,z=16,y=groundHeight(x,z);
const base={id:1,x,y,z,yaw:0,grounded:true};
const rig=()=>{
  const actor=createRangerRig();
  actor.tools.push(...arcadeMeleeEquipment(actor.limbs[1].forearm,Batch));
  return actor;
};
const local=rig(),remote=rig();
const [bat,sword]=local.tools.slice(6);
assert.equal(bat.name,'Baseball bat');assert.equal(sword.name,'Sword');
assert.notEqual(bat.geometry,sword.geometry);
assert.equal(bat.geometry,remote.tools[6].geometry);
assert.equal(sword.geometry,remote.tools[7].geometry);
const sizes=[bat,sword].map(tool=>{
  tool.geometry.computeBoundingBox();
  return tool.geometry.boundingBox.getSize(new THREE.Vector3());
});
assert(sizes[0].y>.90 && sizes[0].x<.15,'bat has a narrow round barrel');
assert(sizes[1].y>1.20 && sizes[1].x>.37,'sword has a longer blade and wide guard');

const phases=[];
for(const [weapon,windup,duration,tipY] of [[7,5,20,.776],[8,4,16,1.055]]){
  const state={...base,weapon,meleeSwing:{weapon,seq:1,tick:30,hitTick:30+windup,endTick:30+duration}};
  const tips=[];
  for(const tick of [29,30+windup*.56,30+windup,30+windup+(duration-windup)*.47,30+duration]){
    poseRig(local,state,dt,null,null,undefined,tick);
    poseRig(remote,JSON.parse(JSON.stringify(state)),dt,null,null,undefined,tick);
    assert.equal(local.tools.filter(tool=>tool.visible).length,1);
    const tool=local.tools[weapon-1],other=remote.tools[weapon-1];
    assert(tool.visible && other.visible);
    assert.equal(tool.parent,local.limbs[1].forearm);
    const palm=tool.parent.localToWorld(new THREE.Vector3(0,-.265,-.013));
    assert(tool.getWorldPosition(new THREE.Vector3()).distanceTo(palm)<1e-7);
    const tip=tool.localToWorld(new THREE.Vector3(0,tipY,0));
    assert(tip.distanceTo(other.localToWorld(new THREE.Vector3(0,tipY,0)))<1e-7);
    tips.push(tip);
  }
  assert(tips[1].z>tips[0].z+.35 && tips[2].z<tips[1].z-.95,'windup draws back before crossing the contact point');
  assert(tips[3].x<tips[2].x-.40,'follow-through crosses the front of the body');
  assert(tips[0].distanceTo(tips[4])<.025,'pose returns to the equipped hold');
  phases.push(tips);
  poseRig(local,{...state,parachute:'open'},dt,null,null,undefined,30);
  poseRig(remote,{...state,parachute:'open'},dt,null,null,undefined,30);
  assert(!local.tools.some(tool=>tool.visible));
}
assert(phases[0][1].distanceTo(phases[1][1])>.25,'the overhead sword windup differs from the bat');
poseRig(local,{...base,weapon:1},dt);
assert.deepEqual(local.tools.map(tool=>tool.visible),[true,false,false,false,false,false,false,false]);
poseRig(createRangerRig(),{...base,weapon:8},dt,null,null,undefined,40);

const scene=new THREE.Scene();
const particles=[];
const glints=arcadeSwordContacts(scene,(part,point,attacker)=>{
  characterBurst(part,new THREE.Vector3().copy(point),new THREE.Vector3(attacker.x,attacker.y+1.3,attacker.z),(...sample)=>particles.push(sample),()=>.58);
});
const contact={x,y:y+1.23,z:z-1.1};
const attack=(part,{id=2,weapon=8,hit=true,severed=false}={})=>({...base,id,meleeSwing:{
  seq:1,weapon,hit,contact,hitPart:part,severed,tick:100,hitTick:104,endTick:116,
}});
glints([attack('rightArm',{hit:false,severed:true})],base,104);
glints([attack('rightArm',{severed:true})],base,104,103);
assert.equal(scene.children.length,0,'followers wait for the buffered contact tick');
const torso=attack('torso',{severed:true});
glints([torso],base,104);
assert.equal(particles.length,0,'a torso impact never detaches or splatters');
const flash=scene.getObjectByName('Sword strike glints');
assert.equal(flash.count,6);
const cut=attack('rightArm',{severed:true});
glints([cut],base,105);glints([cut],base,106);
assert.equal(particles.length,16,'a confirmed limb cut uses the existing single splatter');
glints([attack('leftLeg',{weapon:7,severed:true})],base,105);
assert.equal(flash.count,0);assert.equal(particles.length,16);
glints(Array.from({length:9},(_,i)=>attack('torso',{id:i+10})),base,105);
assert.equal(flash.count,30);
glints([cut],base,112);assert.equal(flash.count,0);assert(!flash.visible);

// The normal authoritative lostParts payload removes only the struck joint
// and its owner getting a new life clears the detached limb in both views.
const target={life:newLife(0,false)},right=remote.limbs[1];
target.life.lostParts={rightArm:{tick:104,...contact,yaw:0,dx:0,dz:-1}};
applyLostParts(remote,{...base,...healthView(target,105)},scene,{},dt);
assert(!right.arm.visible && remote.limbs[0].arm.visible && right.leg.visible);
const detached=remote.detached.get('rightArm').prop;
assert.equal(detached.parent,scene);assert(!detached.getObjectByName('Sword'));
poseRig(remote,{...base,...healthView(target,105),weapon:8},dt);
assert.equal(remote.tools[7].parent,remote.limbs[0].forearm);
assert(remote.tools[7].visible);
target.life=newLife(130);
applyLostParts(remote,{...base,...healthView(target,130)},scene,{},dt);
assert(right.arm.visible);assert.equal(detached.parent,null);assert.equal(remote.detached.size,0);
poseRig(remote,{...base,...healthView(target,130),weapon:8},dt);
assert.equal(remote.tools[7].parent,remote.limbs[1].forearm);

const audio=meleeAudioTracker(),cues=[];
const play=(...cue)=>cues.push(cue);
audio.step([{...base,id:2}],99,base,play);
audio.step([attack('rightArm',{hit:false})],101,base,play);
audio.step([cut],105,base,play);audio.step([cut],106,base,play);
assert.deepEqual(cues.map(c=>c[0]),['melee/sword-swing','melee/sword-hit']);
assert.deepEqual(cues[1][1],contact);
audio.reset();audio.step([cut],106,base,play);audio.step([cut],107,base,play);
assert.equal(cues.length,2,'a reconnect does not replay the previous swing');
audio.reset();audio.step([{...base,id:2}],99,base,play);
audio.step([attack('torso',{weapon:7})],105,{...base,x:50},play);
assert.equal(cues.length,2,'swing and contact are inaudible outside their bounds');
audio.reset();audio.step([{...base,id:2}],99,base,play);
audio.step([attack('torso',{weapon:7})],105,base,play);
assert.deepEqual(cues.slice(2).map(c=>c[0]),['melee/bat-swing','melee/bat-hit']);

const context={sampleRate:24000,createBuffer(_,size){
  const data=new Float32Array(size);return {getChannelData:()=>data};
}};
const sound=['sword-swing','sword-hit','bat-swing','bat-hit'].map(name=>meleeBuffer(context,name).getChannelData(0));
assert.equal(new Set(sound.map(samples=>samples.length)).size,4);
for(const samples of sound){
  assert(Math.max(...samples.map(Math.abs))>.09);
  assert(samples.every(Number.isFinite));assert(Math.abs(samples.at(-1))<.002);
}
console.log('Both held models and full poses, synchronized contact glints, single limb splatter, restored limbs and four localized sound cues passed.');
