import {MAP,solidTopAt,insideTravelArea} from './world.js';
import {civilianProfiles} from './civilian-fleet.js';
import {isCheetahCar} from './supercar-layout.js';

export const bellyHeight=.55;
const attachments=new WeakMap();
const maxLine=15,winchRate=4;
const idOf=v=>v.kind??v.id??'rover';
export function slingVehicle(world,id){
  if(id==='rover' || id==='supercar')return world[id];
  return world.traffic?.find(v=>v.id===id)??world.boats?.find(v=>v.id===id)??world.patrolCars?.find(v=>v.id===id);
}
export function slingHitch(v){
  return isCheetahCar(v)?1.05:civilianProfiles[v.model]?.skinHeight??(v.id?.endsWith('rhib')?1.1:1.65);
}
function support(world,v,x,z){
  return Math.max(MAP.waterY,solidTopAt(x,z,world.hp,.36,v.y+.28,world.doors));
}
// The authoritative tick owns the hook, the carried body and its release fall.
// A release edge is independent of the lowering key, so letting go keeps a load.
export function stepCargoHook(world,input,dt,onLanding){
  const h=world.heli,canLift=h.pilot!=null && h.fuel!==0 && !h.wrecked && !h.grounded;
  const old=attachments.get(world);
  if(old && (!h.hook?.load || old!==slingVehicle(world,h.hook.load))){
    if(h.hook?.load)delete h.hook;
    if(old.sling==='held'){old.sling='falling';old.slingVy=0;world.hasFallingCargo=true;}
    attachments.delete(world);
  }
  let hook=h.hook;
  if(canLift && input?.lower && !hook)hook=h.hook={length:0,pilot:h.pilot};
  if(!hook && !world.hasFallingCargo)return;
  const vehicles=[world.rover,world.supercar,...(world.traffic??[]),...(world.boats??[]),...(world.patrolCars??[])].filter(Boolean);
  let load=hook?.load && slingVehicle(world,hook.load);
  const drop=()=>{
    if(load && load.sling){load.sling='falling';load.slingVy=0;world.hasFallingCargo=true;}
    attachments.delete(world);delete h.hook;hook=null;load=null;
  };
  if(hook && (!canLift || hook.pilot!==h.pilot || input?.release || (hook.load && (!load || load.wrecked))))drop();
  if(hook && !load){
    hook.length=Math.min(maxLine,Math.max(0,hook.length+(input?.lower?1:-1)*winchRate*dt));
    const mount=h.y+bellyHeight;
    if(input?.lower){
      let nearest=1.5;
      for(const v of vehicles){
        if(v.wrecked || v.sinking || v.sling || v.takeover || v.boatModel)continue;
        const d=Math.hypot(v.x-h.x,v.z-h.z),reach=mount-v.y-slingHitch(v);
        if(d>=nearest || reach<.55 || reach>maxLine || hook.length<reach-.15 || hook.length>reach+1.1)continue;
        nearest=d;load=v;
      }
      if(load){
        hook.load=idOf(load);hook.length=mount-load.y-slingHitch(load);
        attachments.set(world,load);load.sling='held';load.speed=0;load.lateralSpeed=0;load.throttle=0;load.steer=0;delete load.bridgeFlight;
      }
      if(!load)hook.length=Math.min(hook.length,Math.max(.05,mount-Math.max(MAP.waterY,solidTopAt(h.x,h.z,world.hp,0,h.y,world.doors))));
    }else if(!hook.length)delete h.hook;
  }
  if(load && hook){
    const t=1-Math.exp(-5*dt),x=load.x+(h.x-load.x)*t,z=load.z+(h.z-load.z)*t;
    const y=h.y+bellyHeight-hook.length-slingHitch(load),floor=support(world,load,x,z);
    if(insideTravelArea(x,z,1,2) && floor<=Math.max(load.y,y)+.35)Object.assign(load,{x,z,y:Math.max(y,floor)});
    if(Math.hypot(load.x-h.x,load.z-h.z)>hook.length+1.5)drop();
  }
  if(!world.hasFallingCargo)return;
  let falling=false;
  for(const v of vehicles){
    if(v.sling!=='falling')continue;
    v.slingVy-=9.81*dt;
    const floor=support(world,v,v.x,v.z);
    v.y=Math.max(floor,v.y+v.slingVy*dt);
    if(v.y>floor){falling=true;continue;}
    delete v.sling;delete v.slingVy;
    if(world.boats?.includes(v))v.beached=v.y>MAP.waterY+.12;
    onLanding?.(v);
  }
  if(!falling)delete world.hasFallingCargo;
}
