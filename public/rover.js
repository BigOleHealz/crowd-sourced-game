import { MAP, BOARD_RANGE, blocked, groundHeight, solidTopAt, spawn } from './world.js';

import { impactDamage, RECOVERY_SECONDS } from './airframe.js';

export const ROVER_HP = 250;
export const ROVER_PAD = { x: -3, z: 17 };
export const ROVER_BOARD_RANGE = 2.6;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function parkedRover() {
  const {x,z} = ROVER_PAD;
  return { x, z, y: groundHeight(x,z), yaw: 0, driver: null, gunner: null, turretYaw: 0, turretPitch: 0, speed: 0, cargo: 0, hp: ROVER_HP, maxHp: ROVER_HP, wrecked: false, recoverySeconds: 0 };
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
  else if (r.driver === player.id) {r.driver=null;r.speed=0;}
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
    if (world.heli.y-y < 2 && Math.hypot(x-world.heli.x,z-world.heli.z)<1.3) continue;
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
  r.driver=r.gunner=null; r.speed=0; r.wrecked=true; r.recoverySeconds=RECOVERY_SECONDS;
}

export function recoverRover(world,dt) {
  const r=world.rover;
  if (!r.wrecked) return;
  r.recoverySeconds=Math.max(0,r.recoverySeconds-dt);
  if (r.recoverySeconds < .0001) world.rover=parkedRover();
}

function traversable(world, x,z,yaw) {
  const y = groundHeight(x,z);
  if (Math.max(Math.abs(x),Math.abs(z))>32 || y<MAP.waterY+.2) return false;
  const sx = Math.sin(yaw), cz = Math.cos(yaw);
  for (const along of [-.73,0,.73]) {
    const px=x+along*sx, pz=z-along*cz, floor=groundHeight(px,pz);
    if (Math.abs(floor-y)>.67 || solidTopAt(px,pz,world.hp,.70)>floor+.16) return false;
    // Fit the body between the bridge rails; enter from either end.
    if (Math.abs(pz)<4.85 && Math.abs(Math.abs(px)-MAP.bridge.width/2)<.72) return false;
    if (world.heli.y-floor < 2 && Math.hypot(px-world.heli.x,pz-world.heli.z)<1.55) return false;
  }
  return true;
}

export function driveRover(world, input, dt, players) {
  const r = world.rover;
  if (r.driver == null) return;
  const throttle=input.throttle || 0, steer=input.steer || 0;
  const target = throttle * (throttle<0 ? 2.8 : 5.7);
  const acceleration = throttle && r.speed*throttle>=0 ? 7.2 : 14;
  r.speed += clamp(target-r.speed,-acceleration*dt,acceleration*dt);
  // Low-range steering allows the little utility rover to pivot in the depot.
  const yaw = r.yaw + steer * (r.speed<-.05 ? -1 : 1) * (1.55+Math.min(.45,Math.abs(r.speed)*.09)) * dt;
  if (traversable(world,r.x,r.z,yaw)) r.yaw = Math.atan2(Math.sin(yaw),Math.cos(yaw));
  const x = r.x + Math.sin(r.yaw)*r.speed*dt, z = r.z - Math.cos(r.yaw)*r.speed*dt;
  if (traversable(world,x,z,r.yaw) && Math.abs(groundHeight(x,z)-r.y)<.34) {
    r.x=x; r.z=z; r.y=groundHeight(x,z);
  } else {
    damageRover(world,impactDamage(Math.abs(r.speed)),players);
    r.speed=0;
  }
}
