import {waterHelm} from './water-helm.js';
import {damageYacht} from './superyacht.js';
import {yachtOverlap} from './yacht-layout.js';
import {supercarLayout} from './supercar-layout.js';
import {CITY,MAP,insideTravelArea,groundHeight,solidTopAt,blocked} from './world.js';
import {vehicleContact} from './vehicle-contact.js';
import {mountPosition} from './mounts.js';

const berths=[{id:'bay-rhib',x:46,z:14},{id:'key-rhib',x:67,z:-201,yaw:.12}];
// Hull-local crown of the helm cushion. The ranger's trouser seat is .893 m
// above its rig origin, before the seated scale is applied.
export const helmCushion = {z: -.32, top: 1.018};
export const helmWheel = {y: 1.215, z: -.675, radius: .13, tilt: -.48};
export const seatedScale = .85;
export const helmOffset = [0, helmCushion.top - .893 * seatedScale, helmCushion.z];
const waveClock=new WeakMap();
function moored(site) {
  return {...site,y:MAP.waterY,yaw:site.yaw??0,pitch:0,roll:0,speed:0,yawRate:0,slip:0,throttle:0,driver:null,gunner:null,
    turretYaw:0,turretPitch:0,hp:300,maxHp:300,wrecked:false,recoverySeconds:0};
}
export const patrolFleet=()=>CITY?berths.map(moored):[];
export const crewBoat=(world,id)=>id==null?null:world?.boats?.find(b=>b.driver===id||b.gunner===id);
// Keep delayed hull motion while local seat changes take effect on their first frame.
export function localBoatFrame(sampled, assigned, id) {
  let found=false;
  const boats=sampled.map(hull=>{
    if(assigned && hull.id===assigned.id) {
      found=true;
      return {...hull,driver:assigned.driver,gunner:assigned.gunner};
    }
    if(id!=null && (hull.driver===id || hull.gunner===id))
      return {...hull,driver:hull.driver===id?null:hull.driver,gunner:hull.gunner===id?null:hull.gunner};
    return hull;
  });
  if(assigned && !found)boats.push(assigned);
  return boats;
}
export function nearBoat(world,feet) {
  if(!feet || (!feet.grounded && !feet.swimming))return null;
  let best=null,range=3.85;
  for(const b of world.boats??[]) {
    const d=Math.hypot(feet.x-b.x,feet.y-b.y,feet.z-b.z);
    if(!b.wrecked && (b.driver==null||b.gunner==null) && d<range){best=b;range=d;}
  }
  return best;
}
function disembark(world,b,player) {
  const c=Math.cos(b.yaw),s=Math.sin(b.yaw);
  let waterExit=null;
  for(const [right,along] of [[-2,0],[2,0],[-2.1,1.3],[2.1,1.3],[0,3.4],[0,-3.4],[-3.5,0],[3.5,0]]) {
    const x=b.x+c*right-s*along,z=b.z+s*right+c*along;
    if(!insideTravelArea(x,z))continue;
    const ground=groundHeight(x,z,b.y+1.35), swimming=ground<MAP.waterY-.72-.03;
    const y=swimming?MAP.waterY-.72:ground;
    if(y>b.y+1.35 || blocked(x,y,z,world.hp) || vehicleContact(x,y,z,world,CITY).depth)continue;
    const exit={x,y,z,vx:0,vy:0,vz:0,grounded:!swimming,...(swimming?{swimming:true}:{})};
    if(ground>=MAP.waterY){player.state=exit;return true;}
    waterExit??=exit;
  }
  if(waterExit)player.state=waterExit;
  return !!waterExit;
}
export function interactBoat(world,b,player) {
  if(!b||b.wrecked)return;
  if(b.driver===player.id || b.gunner===player.id){
    if(!disembark(world,b,player))return;
    if(b.driver===player.id){b.driver=null;b.throttle=0;}else b.gunner=null;
  }else if(nearBoat(world,player.state)===b){
    if(b.driver==null)b.driver=player.id;
    else if(b.gunner==null){b.gunner=player.id;b.turretYaw=b.yaw;b.turretPitch=0;}
  }
}
export function damageBoat(world,b,amount,players) {
  if(b.wrecked||!Number.isFinite(amount)||amount<=0)return;
  b.hp=Math.max(0,b.hp-amount);if(b.hp)return;
  for(const id of [b.driver,b.gunner]){
    const actor=players?.get(id);
    if(actor && !disembark(world,b,actor)){
      actor.state={x:b.x,y:MAP.waterY-.72,z:b.z,vx:0,vy:0,vz:0,grounded:false,swimming:true};
    }
  }
  Object.assign(b,{driver:null,gunner:null,speed:0,yawRate:0,slip:0,throttle:0,wrecked:true,recoverySeconds:6});
}
// Hull footprints are oriented rectangles; test the four separating axes.
function overlaps(x,z,yaw,other,halfWidth,halfLength){
  const dx=other.x-x,dz=other.z-z;
  if(Math.hypot(dx,dz)>3+Math.hypot(halfWidth,halfLength))return false;
  const a=Math.cos(yaw),b=Math.sin(yaw),c=Math.cos(other.yaw),d=Math.sin(other.yaw);
  for(const [nx,nz] of [[a,b],[-b,a],[c,d],[-d,c]]){
    const span=1.04*Math.abs(nx*a+nz*b)+2.65*Math.abs(-nx*b+nz*a)
      +halfWidth*Math.abs(nx*c+nz*d)+halfLength*Math.abs(-nx*d+nz*c);
    if(Math.abs(dx*nx+dz*nz)>=span)return false;
  }
  return true;
}
export function nearbyHull(boats,vehicle,x,z,yaw,halfWidth,halfLength){
  return boats?.find(b=>b!==vehicle && !b.wrecked && overlaps(b.x,b.z,b.yaw,{x,z,yaw},halfWidth,halfLength));
}
function insideChart(x,z,yaw) {
  const c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
  const halfX=1.10*c+2.75*s,halfZ=1.10*s+2.75*c;
  return insideTravelArea(x,z,halfX,halfZ);
}
function canFloat(world,b,x,z,yaw) {
  if(!insideChart(x,z,yaw) || yachtOverlap(world.yacht,x,z,yaw,1.10,2.75))return false;
  const c=Math.cos(yaw),s=Math.sin(yaw);
  // Enclose the collar, outboard, crew and stern aerial through pitch and roll.
  const clearance=b.y+2.5;
  for(const dz of [-2.75,0,2.75])for(const dx of [-1.10,0,1.10]){
    const px=x+c*dx-s*dz,pz=z+s*dx+c*dz;
    if(solidTopAt(px,pz,world.hp,0,clearance)>MAP.waterY-.24)return false;
  }
  if(nearbyHull(world.boats,b,x,z,yaw,1.04,2.65))return false;
  return !(world.heli.y<MAP.waterY+1.5 && overlaps(x,z,yaw,world.heli,1.28,3.6))
    && !(world.rover.y<MAP.waterY+.75 && overlaps(x,z,yaw,world.rover,.86,1.75))
    && !(world.supercar?.y<MAP.waterY+.75 && overlaps(x,z,yaw,world.supercar,supercarLayout.halfWidth,supercarLayout.halfLength));
}
export function stepBoat(world,b,input,dt,players){
  if(b.wrecked){
    b.recoverySeconds=Math.max(0,b.recoverySeconds-dt);
    if(b.recoverySeconds<.0001){
      const site=berths.find(p=>p.id===b.id);
      // Hold recovery if another hull is occupying the berth.
      if(canFloat(world,b,site.x,site.z,site.yaw??0))Object.assign(b,moored(site));
    }
    return;
  }
  const t=(waveClock.get(b)??0)+dt;waveClock.set(b,t);
  const turn=waterHelm(b,input,dt);
  const proposed=b.yaw+turn;
  if(turn && canFloat(world,b,b.x,b.z,proposed))b.yaw=Math.atan2(Math.sin(proposed),Math.cos(proposed));
  else if(turn)b.yawRate=b.slip=0;
  if(b.speed){
    const x=b.x+Math.sin(b.yaw+b.slip)*b.speed*dt,z=b.z-Math.cos(b.yaw+b.slip)*b.speed*dt;
    if(canFloat(world,b,x,z,b.yaw)){b.x=x;b.z=z;}
    else {
      const amount=Math.round((Math.abs(b.speed)-5)*4);
      if(amount>0 && insideChart(x,z,b.yaw)){
        const other=nearbyHull(world.boats,b,x,z,b.yaw,1.04,2.65);
        if(other)damageBoat(world,other,amount,players);
        if(yachtOverlap(world.yacht,x,z,b.yaw,1.10,2.75))damageYacht(world,amount);
        damageBoat(world,b,amount,players);
      }
      b.speed=b.yawRate=b.slip=0;
    }
  }
  if(b.wrecked)return;
  const wave=Math.sin(t*1.65+b.z*.18+b.x*.08);
  b.y=MAP.waterY+.034*wave;
  b.pitch+=((.013*wave+.035*Math.max(0,b.speed)/12.5)-b.pitch)*Math.min(1,dt*6);
  b.roll+=((.018*Math.sin(t*1.22+b.x*.17)-b.yawRate*Math.abs(b.speed)*.012+(b.wakeRoll??0))-b.roll)*Math.min(1,dt*5);
}
export function helmFeet(b){return mountPosition(b,helmOffset);}
