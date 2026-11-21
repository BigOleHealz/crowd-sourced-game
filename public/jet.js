import {jetRoadContact} from './jet-road-contact.js';
import {roadHullFor} from './road-contact.js';
import {CITY,MAP,groundHeight,solidTopAt,flightBounds,spawn} from './world.js';
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function parkedJet(){
  const x=CITY?0:4,z=24;
  return {x,y:groundHeight(x,z),z,yaw:0,pitch:0,roll:0,speed:0,grounded:true,pilot:null,
    hp:500,maxHp:500,wrecked:false,recoverySeconds:0};
}
export function nearJet(jet,p){
  return jet?.pilot==null && jet?.grounded && !jet.wrecked && p.grounded &&
    Math.hypot(p.x-jet.x,p.y-jet.y,p.z-jet.z)<=3.8;
}
export function leaveJet(jet,p){
  jet.pilot=null;jet.burner=false;
  if(jet.grounded)jet.speed=0;
  if(!p)return;
  p.state={x:jet.x+2.7*Math.cos(jet.yaw),y:jet.y+(jet.grounded?0:.7),
    z:jet.z+2.7*Math.sin(jet.yaw),vy:0,grounded:jet.grounded,...(!jet.grounded && {parachute:'packed'})};
}
export function damageJet(world,amount,players){
  const j=world.jet;
  if(!j || j.wrecked || !(amount>0))return;
  j.hp=Math.max(0,j.hp-amount);
  if(j.hp)return;
  const p=players?.get(j.pilot);
  leaveJet(j,p);
  if(p && j.grounded)p.state=world.rules?.spawn(p)??spawn(p.id-1);
  j.wrecked=true;j.recoverySeconds=6;
}
// Sweep the moving airframe too: another driver's parked car gets no road
// movement tick that could otherwise prevent the pilot from taxiing through it.
function clearFlightFraction(world,from,to){
  const cars=[world.rover,world.supercar,world.tank,...(world.traffic??[])].filter(car=>car &&
    car.x>=Math.min(from.x,to.x)-8 && car.x<=Math.max(from.x,to.x)+8 &&
    car.z>=Math.min(from.z,to.z)-8 && car.z<=Math.max(from.z,to.z)+8 &&
    car.y>=Math.min(from.y,to.y)-6 && car.y<=Math.max(from.y,to.y)+6);
  if(!cars.length)return 1;
  const angular=Math.abs(to.pitch-from.pitch)+Math.abs(to.yaw-from.yaw)+Math.abs(to.roll-from.roll);
  const length=Math.hypot(to.x-from.x,to.z-from.z,to.y-from.y)+angular*4;
  if(length<1e-8)return 1;
  const steps=Math.ceil(length/.24);
  const pose={...from};
  const depth=car=>jetRoadContact(pose,car.x,car.y,car.z,car.yaw,roadHullFor(car))?.depth??0;
  const prior=cars.map(depth);
  function blocked(t){
    for(const key of ['x','y','z','yaw','roll','pitch'])pose[key]=from[key]+(to[key]-from[key])*t;
    return cars.some((car,i)=>depth(car)>prior[i]+1e-8);
  }
  for(let i=1;i<=steps;i++){
    let hi=i/steps,lo=(i-1)/steps;
    if(!blocked(hi))continue;
    for(let k=0;k<9;k++){
      const mid=(hi+lo)*.5;
      if(blocked(mid))hi=mid;else lo=mid;
    }
    return lo;
  }
  return 1;
}
export function stepJet(world,input,dt,players){
  const j=world.jet;
  if(j.wrecked){
    j.recoverySeconds-=dt;
    if(j.recoverySeconds<=0)world.jet=parkedJet();
    return;
  }
  if(j.pilot==null && j.grounded)return;
  const before={...j};
  const steer=input?.steer??0,lift=input?.jetPitch??input?.lift??0,throttle=input?.throttle??0;
  j.burner=!j.grounded && j.pilot!=null && throttle>.7;
  const max=CITY?33:22;
  const target=j.grounded ? Math.max(0,throttle)*9 : clamp(j.speed+throttle*12*dt,8,max);
  j.speed+=clamp(target-j.speed,-12*dt,12*dt);
  if(j.grounded && lift>.12){j.grounded=false;j.speed=Math.max(8,j.speed);}
  const response=1-Math.exp(-5*dt);
  j.roll+=((j.grounded?0:-.60*steer)-j.roll)*response;
  j.yaw+=steer*(j.grounded?.8:1.7)*dt;
  // Pitch is continuous across the top of a loop, including during snapshot interpolation.
  if(j.pilot!=null && !j.grounded)j.pitch+=lift*1.6*dt;
  const horizontal=j.speed*Math.cos(j.pitch);
  const climb=j.grounded?0:j.pilot==null?-6:j.speed*Math.sin(j.pitch);
  const x=clamp(j.x+Math.sin(j.yaw)*horizontal*dt,flightBounds.west,flightBounds.east);
  const z=clamp(j.z-Math.cos(j.yaw)*horizontal*dt,flightBounds.north,flightBounds.south);
  const floor=solidTopAt(x,z,world.hp,.55,j.y+1,world.doors);
  if(floor>j.y+.65){damageJet(world,j.hp,players);return;}
  const y=j.grounded?floor:Math.min(flightBounds.ceiling,j.y+climb*dt);
  if(!j.grounded && y<=floor && climb<=0){
    if(j.pilot==null || floor<=MAP.waterY || j.speed>16){damageJet(world,j.hp,players);return;}
    j.grounded=true;j.speed=0;j.pitch=0;
  }
  Object.assign(j,{x,y:Math.max(floor,y),z});
  const fraction=clearFlightFraction(world,before,j);
  if(fraction<1){
    for(const key of ['x','y','z','yaw','pitch','roll'])j[key]=before[key]+(j[key]-before[key])*fraction;
    if(!before.grounded && j.speed>16)damageJet(world,j.hp,players);
    else {j.speed=0;j.grounded=before.grounded;}
  }
}
