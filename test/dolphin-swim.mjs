import assert from 'node:assert/strict';
import {createDolphins} from '../public/dolphin-swim.js';
import {dolphinCalls} from '../public/dolphin-audio.js';
import {cityGround,brickellMap} from '../public/brickell-map.js';
import {hullSize} from '../public/marina-fleet-layout.js';
import {manateeHullClearance} from '../public/manatee-swim.js';
import {marineContact,hitMarineWildlife} from '../public/marine-contacts.js';

const dt=1/30,water=brickellMap.waterY;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
for(const kind of ['patrol','launch','cruiser','motorYacht','superyacht']){
  const boat={id:kind,boatModel:kind,x:63,z:40,y:water,yaw:0,speed:5};
  const large=kind==='superyacht',world=large?{yacht:boat}:{boats:[boat]};
  const swimmers=createDolphins(world,water),seen=new Set(),calls=new Set(),breaths=new Set();
  world.dolphins=swimmers.state;
  let both=0;
  for(let tick=0;tick<870;tick++){
    boat.yaw=.19*Math.sin(tick/150);
    boat.x+=Math.sin(boat.yaw)*boat.speed*dt;boat.z-=Math.cos(boat.yaw)*boat.speed*dt;
    swimmers.step(dt);
    const sides=[];
    for(const s of swimmers.state){
      const lateral=manateeHullClearance(boat,s.x,s.z,large).distance;
      if(lateral<1.85*s.size-.003){
        const deck=water+(large?-1.25:(hullSize(boat).keel??-.58));
        assert(s.y+.76*s.size<deck+.003,kind+' dolphins clear an overlapping hull');
      }
      assert(s.y-.35*s.size>cityGround(s.x,s.z)-.002,kind+' dolphins clear the bottom');
      if(s.bowId!==boat.id)continue;
      if(s.callKind)calls.add(s.callKind);
      if(s.air>=0)breaths.add(s);
      if(tick<270)continue;
      const dx=s.x-boat.x,dz=s.z-boat.z;
      const ahead=dx*Math.sin(boat.yaw)-dz*Math.cos(boat.yaw);
      const length=large?21.6:hullSize(boat).halfLength;
      assert(ahead>length-.7 && ahead<length+9,kind+' dolphins keep pace just ahead of the bow');
      sides.push(Math.sign(dx*Math.cos(boat.yaw)+dz*Math.sin(boat.yaw)));
      seen.add(s);
    }
    if(sides.length===2 && sides[0]!==sides[1])both++;
  }
  assert(both>570 && seen.size===2,kind+' carries one companion on each side during a turn');
  assert.equal(breaths.size,2);
  assert.deepEqual(calls,new Set(['whistle','clicks']));
  const first=[...seen][0],point={x:first.x,y:first.y,z:first.z};
  const previous=structuredClone(swimmers.state);
  assert.equal(marineContact(world,{...point,y:point.y+2},{...point,y:point.y-2}),null);
  hitMarineWildlife(world,first,point,25,0);hitMarineWildlife(world,null,point,500,5);
  assert.deepEqual(swimmers.state,previous,'Shots and blasts leave dolphins swimming');
}
for(const exit of ['stop','reverse','wreck','sling']){
  const boat={id:'local',x:62,z:24,yaw:0,speed:4};
  const pod=createDolphins({boats:[boat]},water);
  for(let i=0;i<60;i++){boat.z-=boat.speed*dt;pod.step(dt);}
  assert.equal(pod.state.filter(s=>s.bowId===boat.id).length,2);
  if(exit==='stop')boat.speed=0;
  if(exit==='reverse')boat.speed=-2;
  if(exit==='wreck')boat.wrecked=true;
  if(exit==='sling')boat.sling=true;
  for(let i=0;i<30;i++)pod.step(dt);
  assert(pod.state.every(s=>s.bowId===null),exit+' releases both dolphins');
}
{
  const boat={id:'shorebound',x:65,z:-9,yaw:-Math.PI/2,speed:4};
  const pod=createDolphins({boats:[boat]},water);
  let joined=false;
  for(let i=0;i<1100;i++){
    boat.x-=boat.speed*dt;
    pod.step(dt);
    for(const s of pod.state){
      joined ||= s.bowId===boat.id;
      assert(cityGround(s.x,s.z)<water-1,'Shorebound boat leaves dolphins offshore');
      assert(s.y<=water+.5,'Dolphins remain in the water during a shore approach');
    }
  }
  assert(joined);assert(pod.state.every(s=>!s.bowId));
  const origin=structuredClone(pod.state);
  for(let i=0;i<500;i++)pod.step(dt);
  assert(pod.state.some((s,i)=>distance(s,origin[i])>3),'Dolphins return to free swimming');
}
{
  const before=[{x:0,y:0,z:0,callSeq:1,callKind:'clicks'}];
  const after=[{...before[0],callSeq:2,callKind:'whistle'}];
  const observer={x:2,y:1,z:0},heard=[];
  dolphinCalls(before,after,observer,kind=>heard.push(kind));
  dolphinCalls(after,after,observer,kind=>heard.push(kind));
  dolphinCalls(null,after,observer,kind=>heard.push(kind));
  dolphinCalls(before,after,{x:80,y:0,z:0},kind=>heard.push(kind));
  assert.deepEqual(heard,['whistle'],'Only a nearby listener hears a newly emitted call once');
}
console.log('Dolphins join both sides of the bow, keep pace through a turn, avoid hulls and shallows, release underway boats and share nearby calls.');
