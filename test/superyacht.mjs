import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,fire,advanceRounds,fly}=await import('../public/expedition.js');
const {stepYacht,interactYacht,damageYacht}=await import('../public/superyacht.js');
const {stepPlayer}=await import('../public/world.js');
const {newLife}=await import('../public/rivals.js');
const {stepBoat}=await import('../public/patrol-boats.js');
const {yachtLocal,yachtPoint,yachtDeckY,yachtHelm,yachtBerth}=await import('../public/yacht-layout.js');
const dt=1/30,w=newExpedition(),y=w.yacht,h=w.heli;
function guest(id,feet){return {id,state:{...feet,grounded:true,vy:0},yaw:0,moving:false,life:newLife(0,false),weapon:1,fireReady:0};}
const a=guest(1,{x:64,y:.8,z:-374.5}),b=guest(2,{x:64,y:.8,z:-374.5}),pilot=guest(3,h);
const people=new Map([a,b,pilot].map(p=>[p.id,p]));
function walk(p,x,z){
  for(let i=0;i<600;i++){
    const dx=x-p.state.x,dz=z-p.state.z,d=Math.hypot(dx,dz);
    if(d<.12)return;
    p.state=stepPlayer(p.state,{x:dx/d,z:dz/d},dt,w.hp,w);
  }assert.fail('walk blocked at '+JSON.stringify(p.state)+' en route to '+[x,z]);
}
function deckWalk(p,x,z){const to=yachtPoint(y,x,0,z);walk(p,to.x,to.z);}
for(const p of [a,b]){
  deckWalk(p,5.2,10.5);assert(p.state.onYacht && p.state.grounded);
}
deckWalk(a,5.16,-9);deckWalk(a,4.55,-12.48);deckWalk(a,3.9,-13.6);deckWalk(a,0,yachtHelm.z);
assert(interactYacht(w,a));assert.equal(y.driver,1);
const railWalker=guest(5,yachtPoint(y,3.7,yachtDeckY,-14));
for(const sprint of [false,true]){
  railWalker.state={...yachtPoint(y,3.7,yachtDeckY,-14),grounded:true,onYacht:true};
  for(let i=0;i<60;i++)railWalker.state=stepPlayer(railWalker.state,{x:-1,z:0,sprint},dt,w.hp,w);
  const along=yachtLocal(y,railWalker.state.x,railWalker.state.z);
  assert(along.x>4 && along.x<4.45 && railWalker.state.onYacht,'narrowing bow rail stops walking and sprinting');
}
for(let i=0;i<32;i++)railWalker.state=stepPlayer(railWalker.state,{x:-1,z:0,jump:i===0},dt,w.hp,w);
assert(yachtLocal(y,railWalker.state.x,railWalker.state.z).x>6,'deliberate jump clears the low rail');
const swimmer=guest(4,yachtPoint(y,0,-.72,23.4));swimmer.state.grounded=false;swimmer.state.swimming=true;
deckWalk(swimmer,0,14.7);assert(swimmer.state.onYacht && swimmer.state.grounded);assert(Math.abs(swimmer.state.y-(y.y+yachtDeckY))<.01);
const p=yachtPoint(y,0,yachtDeckY,9.3);
Object.assign(h,{x:p.x,z:p.z,y:p.y+3,yaw:y.yaw,grounded:false,pilot:pilot.id});
let descent=0;
for(let i=0;i<150;i++){
  const before=h.y;
  fly(w,{x:0,z:0,lift:descent<1.4?-1:0,aimYaw:h.yaw},dt,people);
  descent=(before-h.y)/dt;
}
assert(!h.grounded && h.y>p.y && h.hp===500,'the aft deck keeps aircraft clearance without accepting a landing');
const dryFlight=newExpedition(),dryHeli=dryFlight.heli;
Object.assign(dryHeli,{x:p.x,z:p.z,y:p.y+.5,grounded:false,fuel:0});
for(let i=0;i<90 && !dryHeli.wrecked;i++)fly(dryFlight,{x:0,z:0,lift:0,aimYaw:0},dt,new Map());
assert(dryHeli.wrecked && !dryHeli.grounded,'an engine-out helicopter cannot park on the yacht');
const passenger=yachtLocal(y,b.state.x,b.state.z);
for(let i=0;i<170;i++)stepYacht(w,{throttle:1},dt,people);
for(let i=0;i<120;i++)stepYacht(w,{throttle:1,steer:-.65},dt,people);
assert.equal(y.hp,y.maxHp);assert(!y.gangway && Math.abs(y.speed-5.2)<.01);
const passengerNow=yachtLocal(y,b.state.x,b.state.z);
assert(Math.hypot(passengerNow.x-passenger.x,passengerNow.z-passenger.z)<.001);
assert(Math.hypot(y.x-yachtBerth.x,y.z-yachtBerth.z)>27);
// A passenger can hit an unobstructed target on deck. The enclosed salon stops their next shot.
const shooter=guest(7,yachtPoint(y,5.2,yachtDeckY,-4)),target=guest(8,yachtPoint(y,5.2,yachtDeckY,-9));
const combat=new Map([[7,shooter],[8,target]]);
fire(w,shooter,{aimYaw:y.yaw,aimPitch:0},100,combat,[]);
for(let t=101;t<108;t++){stepYacht(w,{throttle:.65},dt,combat);advanceRounds(w,combat,[],t);}
assert(y.speed>3);
assert.equal(target.life.hp,75);assert.equal(y.hp,2000);
fire(w,shooter,{aimYaw:y.yaw-Math.PI/2,aimPitch:0},120,combat,[]);
for(let t=121;t<128;t++){stepYacht(w,{throttle:.65},dt,combat);advanceRounds(w,combat,[],t);}
assert(y.hp<2000);
damageYacht(w,2000);assert(y.wrecked && y.driver===null);
for(let i=0;i<300;i++)stepYacht(w,null,dt,new Map());
assert(w.yacht.gangway && w.yacht.hp===2000);
const outer=newExpedition(),oy=outer.yacht;
Object.assign(oy,{x:80,z:-330,yaw:Math.PI/2,driver:1,gangway:false});
for(let i=0;i<240;i++)stepYacht(outer,{throttle:1},dt,new Map());
assert(oy.x>85 && oy.x<89.1 && oy.speed<.2,'bow rejects travel past chart edge');
assert.equal(oy.hp,2000,'chart edges do not damage the hull');
const boat=outer.boats[0];Object.assign(oy,{x:74,z:-323,yaw:0,driver:null});Object.assign(boat,{x:61,z:-323,yaw:Math.PI/2,driver:1});
for(let i=0;i<150;i++)stepBoat(outer,boat,{throttle:1},dt,new Map());
assert(boat.x>62.5 && boat.x<67,'small vessel stays outside broadside');
const model=await readFile(new URL('../public/solana-superyacht.glb',import.meta.url));
const {scene:exterior}=await new GLTFLoader().parseAsync(new Uint8Array(model).buffer,'');
exterior.updateMatrixWorld(true);
const sternApproach=new Raycaster(new Vector3(0,1.37,21),new Vector3(0,0,-1),0,6);
assert.equal(sternApproach.intersectObject(exterior,true).length,0,'the imported transom leaves the boarding stairs open');
const broadside=new Raycaster(new Vector3(8,1.2,3),new Vector3(-1,0,0),0,4);
assert(broadside.intersectObject(exterior,true).length,'the imported hull faces out along the broadside');
console.log('PASS quay and water boarding, single helm, attached standing passengers, aircraft clearance, passenger gunfire, slow cruising, damage and recovery, hull and chart contacts.');
