import {tipFurniture} from './shop-furniture.js';
import {breakFrontage} from './frontage-glass.js';
import {damageLamp,lampHP} from './street-lamps.js';
import { roadContact, sweepRoad } from './road-contact.js';
import {flatTireCount} from './road-wheel-layout.js';
import { vehicleContact } from './vehicle-contact.js';
import { CITY, MAP, BOARD_RANGE, blocked, groundHeight, spawn } from './world.js';

import { RECOVERY_SECONDS } from './airframe.js';

export const ROVER_HP = 250;
export const ROVER_PAD = { x: -3, z: 17 };
export const ROVER_BOARD_RANGE = 2.6;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function stopRover(r) {
  r.speed=0;
  r.lateralSpeed=0;
}

export function parkedRover() {
  const {x,z} = ROVER_PAD;
  return { x, z, y: groundHeight(x,z), yaw: 0, driver: null, gunner: null, turretYaw: 0, turretPitch: 0, speed: 0, lateralSpeed: 0, cargo: 0, hp: ROVER_HP, maxHp: ROVER_HP, flatTires:0, bodyDamage:{front:0,rear:0,left:0,right:0}, wrecked: false, recoverySeconds: 0 };
}

// The HUD and server choose the same reachable seat when the vehicles are parked together.
export function nearestVehicle(world, feet) {
  if (!feet.grounded) return null;
  const {heli, rover} = world;
  const distance = v => Math.hypot(feet.x-v.x, feet.y-v.y, feet.z-v.z);
  const flight = (heli.pilot == null || heli.gunner == null) && !heli.wrecked && heli.grounded ? distance(heli) : Infinity;
  const road = (rover.driver == null || rover.gunner == null) && !rover.wrecked ? distance(rover) : Infinity;
  if (road <= ROVER_BOARD_RANGE && (flight > BOARD_RANGE || road < flight)) return 'rover';
  return flight <= BOARD_RANGE ? 'heli' : null;
}

export function interactRover(world, player) {
  const r = world.rover;
  if (r.gunner === player.id) r.gunner=null;
  else if (r.driver === player.id) {r.driver=null;stopRover(r);}
  else {
    if (nearestVehicle(world,player.state)!=='rover') return;
    if (r.driver==null) r.driver=player.id;
    else if (r.gunner==null) {r.gunner=player.id;r.turretYaw=r.yaw;r.turretPitch=0;}
    return;
  }
  let exit = spawn(player.id-1);
  for (let i=0; i<8; i++) {
    const angle = r.yaw + i*Math.PI/4;
    const x = r.x + 1.7*Math.cos(angle), z = r.z + 1.7*Math.sin(angle);
    const y = groundHeight(x,z);
    if (y <= MAP.waterY+.1 || Math.abs(y-r.y) > .8 || blocked(x,y,z,world.hp,world.doors)) continue;
    if (vehicleContact(x,y,z,world,CITY).depth>0) continue;
    exit = {x,y,z,vy:0,grounded:true};
    break;
  }
  player.state = exit;
}

export function damageRover(world, amount, players) {
  const r=world.rover;
  if (r.wrecked || !Number.isFinite(amount) || amount<=0) return;
  r.hp=Math.max(0,r.hp-amount);
  if (r.hp>0) return;
  const driver=players?.get(r.driver);
  if (driver) {
    interactRover(world,driver);
    driver.inputs.length=0;
  }
  const gunner=players?.get(r.gunner);
  if (gunner) {interactRover(world,gunner);gunner.inputs.length=0;}
  r.driver=r.gunner=null; stopRover(r); r.wrecked=true; r.recoverySeconds=RECOVERY_SECONDS;
}

export function recoverRover(world,dt) {
  const r=world.rover;
  if (!r.wrecked) return;
  r.recoverySeconds=Math.max(0,r.recoverySeconds-dt);
  if (r.recoverySeconds < .0001) world.rover=parkedRover();
}

const bumperContacts=new WeakMap();
let impactSequence=0;

function registerImpact(world,r,hit,speed,players){
  if(speed<.4)return;
  const active=bumperContacts.get(r);
  if(active?.object===hit.object){
    active.clearTime=0;return;
  }
  bumperContacts.set(r,{object:hit.object,clearTime:0});
  const c=Math.cos(r.yaw),s=Math.sin(r.yaw);
  const side=-(c*hit.nx+s*hit.nz),end=s*hit.nx-c*hit.nz;
  const panel=Math.abs(side)>Math.abs(end)?(side>0?'right':'left'):(end<0?'front':'rear');
  const excess=Math.max(0,speed-1.65);
  const damage=Math.round(.60*excess*excess+.6*excess);
  const reach=Math.abs(side)*.82+Math.abs(end)*(CITY?1.69:1.55);
  r.contactSound={id:++impactSequence,speed,wood:!!hit.wood,x:r.x-hit.nx*reach,y:r.y+.55,z:r.z-hit.nz*reach,panel,damage};
  if(damage){
    r.bodyDamage??={front:0,rear:0,left:0,right:0};
    r.bodyDamage[panel]=Math.min(1,r.bodyDamage[panel]+damage/135);
    damageRover(world,damage,players);
  }
}

export function driveRover(world, input, dt, players) {
  const r = world.rover;
  if (r.driver == null) return;
  const throttle=input.throttle || 0, steer=input.steer || 0;
  const reverseLimit=CITY ? 5.4 : 2.8;
  const flats=flatTireCount(r);
  const mobility=1/(1+.47*flats);
  const target = throttle * (throttle<0 ? reverseLimit : 16)*mobility;
  // Torque tapers as speed builds. Reverse remains a low-range depot gear.
  const power = throttle>0 ? 8.6 - 4.8*clamp(r.speed/16,0,1) : (CITY ? 9.0 : 7.2);
  const acceleration = throttle && r.speed*throttle>=0 ? power*mobility : 18;
  r.speed += clamp(target-r.speed,-acceleration*dt,acceleration*dt);

  const pace=Math.abs(r.speed);
  const turnRate=1.55+Math.min(.45,pace*.09)-Math.max(0,pace-5.7)*.095;
  const turn=steer*(1-.075*flats)*(r.speed<-.05 ? -1 : 1)*turnRate*dt;
  const yaw=r.yaw+turn;
  const rotation=turn && !roadContact(world,r.x,r.z,yaw,r.x,r.z) ? turn : 0;
  r.yaw=Math.atan2(Math.sin(r.yaw+rotation),Math.cos(r.yaw+rotation));

  // Project the previous velocity into the rotated chassis frame. Tire grip
  // dissipates the lateral component; low speeds track the wheels directly.
  const drift=clamp((pace-3)/7,0,1);
  const side=(r.lateralSpeed??0)*Math.cos(rotation)-r.speed*Math.sin(rotation)*drift;
  // Retain tire slip after an oblique impact while the suspension settles.
  const contact=bumperContacts.get(r);
  const grip=contact?3.5:5.2+9*(1-drift),limit=contact?16:pace*.20;
  r.lateralSpeed=clamp(side*Math.exp(-grip*dt),-limit,limit);
  const sn=Math.sin(r.yaw),cs=Math.cos(r.yaw);
  let vx=sn*r.speed+cs*r.lateralSpeed,vz=-cs*r.speed+sn*r.lateralSpeed;
  let remaining=dt,contacted=false;
  // Preserve tangential motion. The second sweep handles the second wall of
  // an inside corner and prevents a projected slide from crossing it.
  for(let pass=0;pass<2 && remaining>1e-7;pass++){
    const dx=vx*remaining,dz=vz*remaining;
    const {fraction,hit}=sweepRoad(world,r,dx,dz);
    r.x+=dx*fraction;r.z+=dz*fraction;r.y=groundHeight(r.x,r.z,Infinity,world.doors);
    if(!hit)break;
    contacted=true;
    const incoming=Math.max(0,-(vx*hit.nx+vz*hit.nz));
    if(incoming>.12 && tipFurniture(world.doors,hit.object.piece,vx,vz)){
      remaining*=1-fraction;
      continue;
    }
    if((hit.object.face || hit.object.axis==='x') && incoming>2.3 && breakFrontage(world.doors,hit.object,r)){
      registerImpact(world,r,hit,Math.min(5,incoming*.55),players);
      if(r.wrecked)return;
      vx*=.8;vz*=.8;remaining*=1-fraction;
      continue;
    }
    const woodId=hit.object.woodId;
    if(woodId && world.doors && incoming>(woodId.startsWith('sign-')?1.1:2.5)){
      (world.doors.beachWood??={})[woodId]=Math.round(Math.atan2(vx,vz)*1000);
      // Keep zero radians truthy for the shared collision/visibility lookup.
      if(!world.doors.beachWood[woodId])world.doors.beachWood[woodId]=1;
      vx*=.84;vz*=.84;remaining*=1-fraction;
      continue;
    }
    if(hit.object.net!=null && world.doors && incoming>.55){
      (world.doors.nets??={})[hit.object.net]=Math.sign(vz)||1;
      vx*=.94;vz*=.94;remaining*=1-fraction;
      continue;
    }
    if(hit.object.lamp!=null && incoming>2.5){
      damageLamp(world.doors,hit.object.lamp,lampHP);
      registerImpact(world,r,hit,Math.min(incoming,4),players);
      if(r.wrecked)return;
      vx*=.86;vz*=.86;remaining*=1-fraction;continue;
    }
    registerImpact(world,r,hit,incoming,players);
    if(r.wrecked)return;
    const rebound=incoming>3.5?Math.min(1.35,(incoming-3.5)*.12):0;
    const tx=vx+incoming*hit.nx,tz=vz+incoming*hit.nz;
    const scrub=Math.max(.77,1-incoming*.017);
    vx=tx*scrub+rebound*hit.nx;vz=tz*scrub+rebound*hit.nz;
    if(Math.hypot(vx,vz)<.12){vx=vz=0;break;}
    remaining*=1-fraction;
  }
  if(contacted){
    r.speed=vx*sn-vz*cs;r.lateralSpeed=vx*cs+vz*sn;
  }else if(contact){
    contact.clearTime+=dt;
    if(contact.clearTime>.18)bumperContacts.delete(r);
  }
}
