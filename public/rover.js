import { vehicleContact } from './vehicle-contact.js';
import { CITY, MAP, BOARD_RANGE, blocked, groundHeight, solidTopAt, spawn } from './world.js';

import { impactDamage, RECOVERY_SECONDS } from './airframe.js';

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
  return { x, z, y: groundHeight(x,z), yaw: 0, driver: null, gunner: null, turretYaw: 0, turretPitch: 0, speed: 0, lateralSpeed: 0, cargo: 0, hp: ROVER_HP, maxHp: ROVER_HP, wrecked: false, recoverySeconds: 0 };
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
    if (y <= MAP.waterY+.1 || Math.abs(y-r.y) > .8 || blocked(x,y,z,world.hp)) continue;
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

function traversable(world, x,z,yaw) {
  const y = groundHeight(x,z);
  if (Math.abs(x)>(MAP.flightLimit ?? 32) || z>(MAP.flightLimit ?? 32) || z<(MAP.flightNorth ?? -(MAP.flightLimit ?? 32)) || y<MAP.waterY+.2) return false;
  const sx = Math.sin(yaw), cz = Math.cos(yaw);
  for (const along of [-.73,0,.73]) {
    const px=x+along*sx, pz=z-along*cz, floor=groundHeight(px,pz);
    if (Math.abs(floor-y)>.67 || solidTopAt(px,pz,world.hp,.70)>floor+.16) return false;
    // Fit the body between the bridge rails; enter from either end.
    if (MAP.bridge && Math.abs(pz)<4.85 && Math.abs(Math.abs(px)-MAP.bridge.width/2)<.72) return false;
    if (world.heli.y-floor < 2 && Math.hypot(px-world.heli.x,pz-world.heli.z)<1.55) return false;
  }
  return true;
}

export function driveRover(world, input, dt, players) {
  const r = world.rover;
  if (r.driver == null) return;
  const throttle=input.throttle || 0, steer=input.steer || 0;
  const reverseLimit=CITY ? 5.4 : 2.8;
  const target = throttle * (throttle<0 ? reverseLimit : 16);
  // Torque tapers as speed builds. Reverse remains a low-range depot gear.
  const power = throttle>0 ? 8.6 - 4.8*clamp(r.speed/16,0,1) : (CITY ? 9.0 : 7.2);
  const acceleration = throttle && r.speed*throttle>=0 ? power : 18;
  r.speed += clamp(target-r.speed,-acceleration*dt,acceleration*dt);

  const pace=Math.abs(r.speed);
  const turnRate=1.55+Math.min(.45,pace*.09)-Math.max(0,pace-5.7)*.095;
  const turn=steer*(r.speed<-.05 ? -1 : 1)*turnRate*dt;
  const yaw=r.yaw+turn;
  const rotation=turn && traversable(world,r.x,r.z,yaw) ? turn : 0;
  r.yaw=Math.atan2(Math.sin(r.yaw+rotation),Math.cos(r.yaw+rotation));

  // Project the previous velocity into the rotated chassis frame. Tire grip
  // dissipates the lateral component; low speeds track the wheels directly.
  const drift=clamp((pace-3)/7,0,1);
  const side=(r.lateralSpeed??0)*Math.cos(rotation)-r.speed*Math.sin(rotation)*drift;
  r.lateralSpeed=clamp(side*Math.exp(-(5.2+9*(1-drift))*dt),-pace*.20,pace*.20);
  const sn=Math.sin(r.yaw), cs=Math.cos(r.yaw);
  const x=r.x+(sn*r.speed+cs*r.lateralSpeed)*dt;
  const z=r.z+(-cs*r.speed+sn*r.lateralSpeed)*dt;
  if (traversable(world,x,z,r.yaw) && Math.abs(groundHeight(x,z)-r.y)<.34) {
    r.x=x; r.z=z; r.y=groundHeight(x,z);
  } else {
    damageRover(world,impactDamage(Math.hypot(r.speed,r.lateralSpeed)),players);
    stopRover(r);
  }
}
