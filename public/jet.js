import {jetRoadContact} from './jet-road-contact.js';
import {roadHullFor} from './road-contact.js';
import {jetHalfSpan,jetScale} from './jet-size.js';
import {CITY,MAP,groundHeight,solidTopAt,flightBounds,spawn} from './world.js';
import {onRunway,rotationSpeed,stallSpeed,runwayStart,outpostRunwayStart} from './runway-layout.js';
import {crashAircraftInWater,stepAircraftSinking,swimmingFromAircraft} from './aircraft-water.js';
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const fullTurn=Math.PI*2, rollSpeed=2.4;
export function parkedJet(){
  const start=CITY?runwayStart:outpostRunwayStart;
  const x=start.x,z=start.z;
  return {x,y:groundHeight(x,z),z,yaw:start.yaw,pitch:0,roll:0,speed:0,grounded:true,pilot:null,
    fuel:100,hp:500,maxHp:500,wrecked:false,recoverySeconds:0};
}
export function nearJet(jet,p){
  if(!jet || jet.pilot!=null || !jet.grounded || jet.wrecked || !p.grounded)return false;
  const dx=p.x-jet.x,dz=p.z-jet.z,c=Math.cos(jet.yaw),s=Math.sin(jet.yaw);
  const side=dx*c+dz*s,along=-dx*s+dz*c;
  // Board beside the cockpit, which is forward of the airframe centre.
  return Math.abs(p.y-jet.y)<2.4 && Math.hypot(side,along+1.2*jetScale)<=3.8;
}
export function leaveJet(jet,p){
  jet.pilot=null;jet.burner=false;
  if(jet.grounded)jet.speed=0;
  if(!p)return;
  const side=jet.grounded?2.8:jetHalfSpan+1.25,along=-1.2*jetScale,c=Math.cos(jet.yaw),s=Math.sin(jet.yaw);
  p.state={x:jet.x+side*c-along*s,y:jet.y+(jet.grounded?0:1.4*jetScale),
    z:jet.z+side*s+along*c,vy:0,grounded:jet.grounded,...(!jet.grounded && {parachute:'packed'})};
}
export function damageJet(world,amount,players,owner){
  const j=world.jet;
  if(!j || j.wrecked || !(amount>0))return;
  j.hp=Math.max(0,j.hp-amount);
  if(j.hp)return;
  world.wanted?.record(owner,'wreck');
  const p=players?.get(j.pilot);
  leaveJet(j,p);
  if(p && j.sinking)p.state=swimmingFromAircraft(j);
  else if(p && j.grounded)p.state=world.rules?.spawn(p)??spawn(p.id-1);
  j.wrecked=true;j.recoverySeconds=6;
}
// Sweep the moving airframe too: another driver's parked car gets no road
// movement tick that could otherwise prevent the pilot from taxiing through it.
function clearFlightFraction(world,from,to){
  const cars=[world.rover,world.rover2,world.rover3,world.supercar,world.tank,...(world.traffic??[])].filter(car=>car && !car.crushed &&
    car.x>=Math.min(from.x,to.x)-12 && car.x<=Math.max(from.x,to.x)+12 &&
    car.z>=Math.min(from.z,to.z)-12 && car.z<=Math.max(from.z,to.z)+12 &&
    car.y>=Math.min(from.y,to.y)-8 && car.y<=Math.max(from.y,to.y)+8);
  if(!cars.length)return 1;
  const angular=Math.abs(to.pitch-from.pitch)+Math.abs(to.yaw-from.yaw)+Math.abs(to.roll-from.roll);
  const length=Math.hypot(to.x-from.x,to.z-from.z,to.y-from.y)+angular*4*jetScale;
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
    if(j.sinking)stepAircraftSinking(world,j,dt);
    j.recoverySeconds-=dt;
    if(j.recoverySeconds<=0)world.jet=parkedJet();
    return;
  }
  if(j.pilot==null && j.grounded)return;
  const before={...j};
  const powered=j.fuel!==0;
  const steer=powered || j.speed>.25 ? input?.steer??0 : 0;
  const roll=powered || j.speed>.25 ? input?.jetRoll??0 : 0;
  const lift=powered ? input?.jetPitch??input?.lift??0 : 0;
  const throttle=powered ? input?.throttle??0 : 0;
  j.burner=!j.grounded && j.pilot!=null && throttle>.7;
  const max=CITY?33:22;
  const target=powered ? (j.grounded ? Math.max(0,throttle)*28 : clamp(j.speed+throttle*12*dt,8,max)) : 0;
  const deceleration=powered || j.grounded ? 10 : 1.25;
  j.speed+=clamp(target-j.speed,-deceleration*dt,(j.grounded?6:12)*dt);
  if(j.grounded && lift>.12 && j.speed>=rotationSpeed && onRunway(j.x,j.z,CITY)){
    j.grounded=false;
  }
  const response=1-Math.exp(-5*dt);
  if(j.grounded){
    j.roll+=(Math.round(j.roll/fullTurn)*fullTurn-j.roll)*response;
  }else{
    // Roll is an attitude controlled by the pilot, not a queued maneuver.
    // Releasing A/D leaves the wings at their current angle.
    j.roll+=roll*rollSpeed*dt;
  }
  if(j.grounded && j.speed>.25)j.yaw+=steer*.8*dt;
  if(!j.grounded)j.yaw-=Math.sin(j.roll)*.9*clamp(j.speed/stallSpeed,0,1)*dt;
  // Pitch is continuous across the top of a loop, including during snapshot interpolation.
  if(!j.grounded && !powered){
    const level=-.14-j.pitch;
    j.pitch+=Math.atan2(Math.sin(level),Math.cos(level))*response;
  }else if(j.pilot!=null && !j.grounded){
    // The cursor is screen-relative. Rotate its pitch command with the bank:
    // inverted wings reverse world pitch, and a quarter roll turns it into yaw.
    const turn=lift*1.6*dt;
    const cosPitch=Math.cos(j.pitch);
    j.pitch+=turn*Math.cos(j.roll);
    j.yaw-=turn*Math.sin(j.roll)*Math.sign(cosPitch||1)/Math.max(.25,Math.abs(cosPitch));
  }
  const horizontal=j.speed*Math.cos(j.pitch);
  const climb=j.grounded?0:j.pilot==null?-6:!powered ? -2.4-Math.max(0,8-j.speed)*.3 :
    j.speed<stallSpeed ? -2.4-(stallSpeed-j.speed)*1.5 : j.speed*Math.sin(j.pitch);
  const x=clamp(j.x+Math.sin(j.yaw)*horizontal*dt,flightBounds.west,flightBounds.east);
  const z=clamp(j.z-Math.cos(j.yaw)*horizontal*dt,flightBounds.north,flightBounds.south);
  const floor=solidTopAt(x,z,world.hp,.55,j.y+1,world.doors);
  if(j.grounded && floor<=MAP.waterY && crashAircraftInWater(world,j,x,z,j.speed,0)){
    damageJet(world,j.hp,players,world.wanted?.session(players?.get(j.pilot)));
    j.recoverySeconds=8;
    return;
  }
  if(floor>j.y+.65){damageJet(world,j.hp,players,world.wanted?.session(players?.get(j.pilot)));return;}
  const y=j.grounded?floor:Math.min(flightBounds.ceiling,j.y+climb*dt);
  if(!j.grounded && y<=floor && climb<=0){
    const water=floor<=MAP.waterY && crashAircraftInWater(world,j,x,z,j.speed,climb);
    if(j.pilot==null || floor<=MAP.waterY || j.speed>16){
      damageJet(world,j.hp,players,world.wanted?.session(players?.get(j.pilot)));
      if(water)j.recoverySeconds=8;
      return;
    }
    j.grounded=true;j.speed=0;j.pitch=0;
  }
  Object.assign(j,{x,y:Math.max(floor,y),z});
  const fraction=clearFlightFraction(world,before,j);
  if(fraction<1){
    for(const key of ['x','y','z','yaw','pitch','roll'])j[key]=before[key]+(j[key]-before[key])*fraction;
    if(!before.grounded && j.speed>16)damageJet(world,j.hp,players,world.wanted?.session(players?.get(j.pilot)));
    else {j.speed=0;j.grounded=before.grounded;}
  }
}
