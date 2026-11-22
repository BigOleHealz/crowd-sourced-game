import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sharkDogSpray} from '../public/shark-dog-spray.js';
import {createSharks,damageShark} from '../public/shark-swim.js';
import {stepSharkDogEncounters} from '../public/shark-dog-encounter.js';
const dt=1/30,players=new Map();
function setup(mode='swimming',dx=0,dz=-8){
  const sim=createSharks();
  const s=sim.state[0],dog={id:'dog-pip',size:.82,mode,x:s.x+dx,y:-.4,z:s.z+dz,yaw:0,speed:1};
  const world={sharks:sim.state,dogs:[dog]},removed=[];
  let ticks=0;
  function step(){
    sim.step(dt,players,++ticks,()=>false);
    stepSharkDogEncounters(world,dt,d=>{assert.notEqual(d.mode,'removed');removed.push(d.id);d.mode='removed';});
  }
  return {s,dog,sim,step,removed,world};
}
{
  const {s,dog,step,removed,world}=setup();
  let approached=false,struck=false,camA,camB;
  for(let i=0;i<180;i++){
    step();
    if(s.phase==='dog-approach')approached=true;
    if(s.phase==='dog-strike' && !struck){
      struck=true;assert.equal(dog.mode,'swimming');
      const snout={x:s.x+Math.sin(s.yaw)*1.47*s.size,z:s.z-Math.cos(s.yaw)*1.47*s.size};
      assert.ok(Math.hypot(snout.x-dog.x,snout.z-dog.z)<=.65);
      camA=JSON.parse(JSON.stringify(world));camB=JSON.parse(JSON.stringify(world));
    }
  }
  assert.ok(approached && struck);assert.deepEqual(camA.sharks[0].dogEncounter,camB.sharks[0].dogEncounter);
  const scene=new THREE.Scene(),show=sharkDogSpray(scene,-.14);
  const snapshot=camA.sharks;
  snapshot[0].dogEncounter.t=.23;show(snapshot,{x:0,z:-200});
  assert.equal(scene.children.length,0);
  show(snapshot,dog);assert.equal(scene.children.length,2);
  assert.ok(scene.children.every(mesh=>mesh.visible && mesh.count>=1));
  show(world.sharks,dog);assert.ok(scene.children.every(mesh=>!mesh.visible));
  assert.deepEqual(removed,['dog-pip']);assert.equal(s.phase,'patrol');assert.equal(s.dogEncounter,undefined);
}
for(const [mode,x,z] of [['swimming',0,-24],['carried',0,-5],['leashed',0,-5]]){
  const {dog,s,step,removed}=setup(mode,x,z);
  for(let i=0;i<60;i++)step();assert.equal(dog.mode,mode);assert.equal(s.dogEncounter,undefined);assert.deepEqual(removed,[]);
}
{
  const {s,dog,step,removed}=setup();
  step();assert.equal(s.phase,'dog-approach');
  dog.mode='carried';step();assert.equal(s.phase,'patrol');assert.deepEqual(removed,[]);
}
{
  const {s,sim,step,removed}=setup();
  step();assert.equal(s.phase,'dog-approach');
  damageShark(sim.state,0,s.maxHp,'shot');step();assert.equal(s.phase,'dead');assert.deepEqual(removed,[]);
}
{
  const {s,dog,sim,step,removed}=setup();s.x=71.6;s.z=-478;dog.x=71.6;dog.z=-476;
  for(let i=0;i<60;i++)step();assert.equal(sim.state[0].dogEncounter,undefined);assert.deepEqual(removed,[]);
}
console.log('PASS approach, visible mouth contact, one removal, normal far and protected swims, pickups and interrupted encounters.');
