import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Box3,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {stepYacht,interactYacht,damageYacht}=await import('../public/superyacht.js');
const {stepPlayer}=await import('../public/world.js');
const {newLife}=await import('../public/rivals.js');
const {yachtLocal,yachtPoint,yachtDeckHeight,yachtHelmFeet,yachtBerth,yachtArrival,yachtGangway,yachtModelYaw,yachtModelYOffset}=await import('../public/yacht-layout.js');
const dt=1/30,w=newExpedition(),y=w.yacht;
const rampEnd=yachtPoint(y,yachtGangway.outer,0,yachtGangway.centerZ);
assert(Math.hypot(yachtArrival.x-rampEnd.x,yachtArrival.z-rampEnd.z)<3,'direct arrival starts beside boarding ramp');
const guest=(id,state)=>({id,state:{...state,grounded:true,vy:0},yaw:0,moving:false,life:newLife(0,false)});
const captain=guest(1,{x:64,y:.8,z:-374.5}),passenger=guest(2,{x:64,y:.8,z:-374.5});
const people=new Map([[1,captain],[2,passenger]]);
function walkTo(person,x,z){
  const dest=yachtPoint(y,x,0,z);
  for(let i=0;i<800;i++){
    const dx=dest.x-person.state.x,dz=dest.z-person.state.z,d=Math.hypot(dx,dz);
    if(d<.12)return;
    person.state=stepPlayer(person.state,{x:dx/d,z:dz/d},dt,w.hp,w);
  }
  assert.fail('cannot walk to yacht coordinate '+[x,z]+' from '+JSON.stringify(yachtLocal(y,person.state.x,person.state.z)));
}
for(const person of [captain,passenger]){
  for(const [x,z] of [[9,10.5],[7,10.5],[5,10.5],[4,10.5],[3.6,10.5]])walkTo(person,x,z);
  assert(person.state.onYacht && person.state.grounded,'ramp boards from quay');
}
for(const [x,z] of [[3.6,5],[3.6,0],[3.6,-5],[3.4,-8],[3,-10],[2.3,-12],[0,-14]])walkTo(captain,x,z);
assert(interactYacht(w,captain));assert.equal(y.driver,1);
assert(Math.hypot(captain.state.x-yachtHelmFeet(y).x,captain.state.z-yachtHelmFeet(y).z)<.01);
const before=yachtLocal(y,passenger.state.x,passenger.state.z);
for(let i=0;i<170;i++)stepYacht(w,{throttle:1},dt,people);
for(let i=0;i<120;i++)stepYacht(w,{throttle:1,steer:-.65},dt,people);
const after=yachtLocal(y,passenger.state.x,passenger.state.z);
assert(Math.hypot(after.x-before.x,after.z-before.z)<.001,'passenger remains aboard while driving');
assert(!y.gangway && Math.hypot(y.x-yachtBerth.x,y.z-yachtBerth.z)>27);
assert(y.speed>5 && y.hp===y.maxHp);
assert(interactYacht(w,captain));assert.equal(y.driver,null);
damageYacht(w,2000);assert(y.wrecked);
for(let i=0;i<300;i++)stepYacht(w,null,dt,new Map());
assert(w.yacht.gangway && w.yacht.hp===2000,'yacht respawns with ramp');

const model=new Uint8Array(await readFile(new URL('../public/solana-superyacht.glb',import.meta.url)));
assert.equal(model.byteLength,864344,'the complete original GLB is installed');
const hash=createHash('sha256').update(model).digest('hex');
assert.equal(hash,'0c186ae6f64e2489b1e847ac13bddcb182aefa386fbc23d2a6a80046b709109d','the installed yacht is the unmodified source asset');
const jsonLength=new DataView(model.buffer).getUint32(12,true);
const json=JSON.parse(new TextDecoder().decode(model.subarray(20,20+jsonLength)));
assert.equal(json.meshes.length,1);
assert(json.meshes[0].primitives.length>=10 && json.materials.length>=8,'source hull, cabin and details are present');
for(const material of json.materials){delete material.pbrMetallicRoughness?.baseColorTexture;delete material.normalTexture;}
const plain=new TextEncoder().encode(JSON.stringify(json));model.fill(32,20,20+jsonLength);model.set(plain,20);
const {scene:modelScene}=await new GLTFLoader().parseAsync(model.buffer,'');
modelScene.rotation.y=yachtModelYaw;modelScene.position.y=yachtModelYOffset;modelScene.updateMatrixWorld(true);
const bounds=new Box3().setFromObject(modelScene);
assert(bounds.min.x>=-4.26 && bounds.max.x<=4.26 && bounds.min.z<-20 && bounds.max.z>21);
for(const [x,z] of [[0,-14],[3.6,5],[3.6,10]]){
  const hits=new Raycaster(new Vector3(x,18,z),new Vector3(0,-1,0),0,25).intersectObject(modelScene,true);
  const deck=hits.find(hit=>hit.point.y<4.2);
  assert(deck,'source yacht has a walkable deck at '+[x,z]);
  const point=yachtPoint(w.yacht,x,0,z);
  assert(Math.abs(deck.point.y-(yachtDeckHeight(w.yacht,point.x,point.z)-w.yacht.y))<.12,'collision deck follows source at '+[x,z]);
}
assert(yachtGangway.inner<4.25 && yachtGangway.outer>8.9);
console.log('PASS original yacht GLB '+hash.slice(0,12)+', quay boarding, helm, driving, passenger carry, damage and recovery');
