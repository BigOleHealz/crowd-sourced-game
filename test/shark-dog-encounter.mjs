import assert from 'node:assert/strict';
import * as THREE from 'three';
import {dogWhimpers} from '../public/dog-whimper.js';
import {dogStrikePlumeTicks,sharkBiteVoiceGain} from '../public/shark-dog-feedback.js';
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
    stepSharkDogEncounters(world,dt,d=>{assert.notEqual(d.mode,'removed');removed.push(d.id);d.mode='removed';},ticks);
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
  const scene=new THREE.Scene(),show=sharkDogSpray(scene,-.14),[struckDog]=camA.dogs;
  const {sharkBite:contact,...unstruckDog}=struckDog;
  const snapshot=camA.sharks,tick=contact.tick;
  const cries=[],record=(source,at,bite)=>cries.push([source.id,at,bite]);
  dogWhimpers([unstruckDog],camA.dogs,tick+1,record);
  dogWhimpers(camA.dogs,camB.dogs,tick+2,record);
  dogWhimpers(undefined,camB.dogs,tick+2,record);
  dogWhimpers([unstruckDog],camB.dogs,tick+16,record);
  assert.deepEqual(cries,[[dog.id,tick,contact]]);
  assert.equal(sharkBiteVoiceGain(contact,contact),1);
  assert.equal(sharkBiteVoiceGain(contact,{...contact,x:contact.x+31}),.5);
  assert.equal(sharkBiteVoiceGain(contact,{...contact,x:contact.x+38}),0);

  snapshot[0].dogEncounter.t=.23;show(snapshot,{x:0,z:-200},camA.dogs,tick+7);
  assert.equal(scene.children.length,0);
  show(snapshot,contact,camA.dogs,tick+7);assert.equal(scene.children.length,3);
  assert.ok(scene.children.every(mesh=>mesh.visible && mesh.count>=1));
  const plume=scene.getObjectByName('Dog feeding surface plume'),matrix=new THREE.Matrix4();
  const opacity=()=>plume.geometry.getAttribute('strikeState').getZ(0);
  const width=()=>{plume.getMatrixAt(0,matrix);return new THREE.Vector3().setFromMatrixScale(matrix).x;};
  const initialWidth=width(),peakOpacity=opacity();
  show([],contact,[{...struckDog,mode:'removed'}],tick+30);
  assert.equal(plume.count,1);assert(width()>initialWidth && width()>3);
  show([],{...contact,x:contact.x+35},camB.dogs,tick+30);
  assert(opacity()>0 && opacity()<peakOpacity);
  show([],contact,camB.dogs,tick+90);
  assert(opacity()>0 && opacity()<peakOpacity);
  show([],contact,Array.from({length:8},(_,i)=>({...struckDog,id:`dog-${i}`})),tick+30);
  assert.equal(plume.count,3);assert.equal(scene.children.length,3);
  show(world.sharks,contact,camB.dogs,tick+dogStrikePlumeTicks);
  assert.equal(plume.count,0);assert.ok(scene.children.every(mesh=>!mesh.visible));
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
console.log('PASS approach, visible mouth contact, one localized whimper, bounded fading surface plume, one removal, protected swims and interrupted encounters.');
