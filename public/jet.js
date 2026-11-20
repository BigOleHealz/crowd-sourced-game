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
  jet.pilot=null;
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
export function stepJet(world,input,dt,players){
  const j=world.jet;
  if(j.wrecked){
    j.recoverySeconds-=dt;
    if(j.recoverySeconds<=0)world.jet=parkedJet();
    return;
  }
  if(j.pilot==null && j.grounded)return;
  const steer=input?.steer??0,lift=input?.lift??0,throttle=input?.throttle??0;
  const max=CITY?33:22;
  const target=j.grounded ? Math.max(0,throttle)*9 : clamp(j.speed+throttle*12*dt,8,max);
  j.speed+=clamp(target-j.speed,-12*dt,12*dt);
  if(j.grounded && lift>0){j.grounded=false;j.speed=Math.max(8,j.speed);}
  const response=1-Math.exp(-5*dt);
  j.roll+=((j.grounded?0:-.60*steer)-j.roll)*response;
  j.yaw+=steer*(j.grounded?.8:1.7)*dt;
  const climb=j.grounded?0:j.pilot==null?-6:lift*9;
  j.pitch+=(Math.atan2(climb,Math.max(8,j.speed))-j.pitch)*response;
  const x=clamp(j.x+Math.sin(j.yaw)*j.speed*dt,flightBounds.west,flightBounds.east);
  const z=clamp(j.z-Math.cos(j.yaw)*j.speed*dt,flightBounds.north,flightBounds.south);
  const floor=solidTopAt(x,z,world.hp,.55,j.y+1,world.doors);
  if(floor>j.y+.65){damageJet(world,j.hp,players);return;}
  const y=j.grounded?floor:Math.min(flightBounds.ceiling,j.y+climb*dt);
  if(!j.grounded && y<=floor && climb<=0){
    if(j.pilot==null || floor<=MAP.waterY || j.speed>16){damageJet(world,j.hp,players);return;}
    j.grounded=true;j.speed=0;
  }
  Object.assign(j,{x,y:Math.max(floor,y),z});
}
