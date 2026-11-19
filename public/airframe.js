import {nearbyHull} from './patrol-boats.js';
import { vehicleContact } from './vehicle-contact.js';
import { CITY, MAP, HELIPAD, BOARD_RANGE, blocked, groundHeight, onBuildingLot, solidTopAt, spawn } from './world.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const AIRFRAME_HP = 500;
export const RECOVERY_SECONDS = 6;
const COAST_SECONDS = 1.5;

// Velocity and contact history belong to the server, not its public snapshots.
const flightStates = new WeakMap();

export function parkedHelicopter() {
  const heli = {
    ...HELIPAD, y: groundHeight(HELIPAD.x, HELIPAD.z), yaw: 0, pitch: 0, roll: 0, pilot: null, gunner: null, turretYaw: 0, turretPitch: 0, grounded: true,
    hp: AIRFRAME_HP, maxHp: AIRFRAME_HP, abandonedFor: null, wrecked: false, recoverySeconds: 0,
  };
  flightStates.set(heli, { vx: 0, vy: 0, vz: 0, tiltX: 0, tiltZ: 0, yawRate: 0, sideContact: false, floorContact: false });
  return heli;
}

export function damageHelicopter(world, damage, players, shooterId = null) {
  const heli = world.heli;
  if (heli.wrecked || !(damage > 0) || !Number.isFinite(damage)) return false;
  if (shooterId != null && shooterId === heli.pilot) return false;
  heli.hp = Math.max(0, heli.hp - damage);
  if (heli.hp === 0) {
    for (const id of [heli.pilot,heli.gunner]) {
      const pilot=players?.get(id);
      if (!pilot) continue;
      pilot.state = spawn(pilot.id - 1);
      pilot.moving = false;
      pilot.sprint = false;
      pilot.inputs.length = 0;
    }
    heli.pilot = null;
    heli.gunner = null;
    heli.abandonedFor = null;
    heli.wrecked = true;
    heli.recoverySeconds = RECOVERY_SECONDS;
  }
  return true;
}

// Advance the same airframe after the seat is released, even without pilot input.
function driftAfterBailout(world, dt, players) {
  const h = world.heli, motion = flightStates.get(h);
  h.abandonedFor += dt;
  const coasting = h.abandonedFor <= COAST_SECONDS;
  // A hovering craft tips gently forward. A moving craft retains its existing course.
  if (coasting && Math.hypot(motion.vx, motion.vz) < 3) {
    motion.vx += Math.sin(h.yaw) * 2 * dt;
    motion.vz -= Math.cos(h.yaw) * 2 * dt;
  }
  motion.vy = coasting ? approach(motion.vy, -.35, 3*dt) : Math.max(-14, motion.vy-7*dt);
  h.yaw += (coasting ? .09 : .48) * dt;
  const x = clamp(h.x + motion.vx*dt, -(MAP.flightLimit ?? 32), MAP.flightLimit ?? 32), z = clamp(h.z + motion.vz*dt, MAP.flightNorth ?? -(MAP.flightLimit ?? 32), MAP.flightLimit ?? 32);
  const y = Math.min(MAP.flightCeiling ?? 23, h.y + motion.vy*dt);
  const floor = flightFloor(x, z, world.hp,world);
  if (y <= floor) {
    // At a side impact retain the last clear position instead of jumping atop the obstacle.
    if (h.y >= floor) Object.assign(h, {x, y:floor, z});
    damageHelicopter(world, h.hp, players);
    return;
  }
  Object.assign(h, {x,y,z});
}

export function recoverHelicopter(world, dt, players) {
  const heli = world.heli;
  if (heli.abandonedFor != null) return driftAfterBailout(world, dt, players);
  if (!heli.wrecked) return;
  const ground = Math.max(groundHeight(heli.x, heli.z), MAP.waterY);
  heli.y = Math.max(ground, heli.y - dt * 6);
  heli.grounded = heli.y <= ground;
  heli.recoverySeconds = Math.max(0, heli.recoverySeconds - dt);
  if (heli.recoverySeconds < 0.0001) world.heli = parkedHelicopter();
}

// Only the stopped component of a motion counts. A skimming hit loses less
// hull than a square impact; slow taps can land without losing any hull.
export function impactDamage(stoppedSpeed) {
  return Math.max(0, Math.round((stoppedSpeed - 3) * 12));
}

function approach(current, target, maxDelta) {
  return current + clamp(target - current, -maxDelta, maxDelta);
}

// Wheel contact points in local metres after the airframe model's 1.23 scale.
const wheels = [[-1.22, -.85], [1.22, -.85], [0, 4.23]];
function roofSupportsWheels(h, floor, hp) {
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw);
  return wheels.every(([side, aft]) => {
    const x = h.x + side*c - aft*s, z = h.z + side*s + aft*c;
    // Padding keeps the fuselage clear of walls, but cannot support a wheel in midair.
    return onBuildingLot(x, z) && Math.abs(solidTopAt(x, z, hp) - floor) < .02;
  });
}

function landingSite(x, z, floor) {
  const y = groundHeight(x, z);
  if (y < MAP.waterY + 0.45 || floor > y + 0.05) return false;
  // Both skids need a reasonably level patch of terrain. Keep the narrow bridge clear.
  if (MAP.bridge && Math.abs(x) < MAP.bridge.width / 2 + 1 && Math.abs(z) < MAP.bridge.length / 2 + 1) return false;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) =>
    Math.abs(groundHeight(x + dx, z + dz) - y) < 0.45);
}

function flightFloor(x, z, hp,world) {
  const boat=nearbyHull(world?.boats,null,x,z,world?.heli.yaw??0,1.28,3.6);
  const surface = Math.max(groundHeight(x, z), MAP.waterY + 0.6, boat ? boat.y+1.45 : -Infinity);
  const clearance = solidTopAt(x, z, hp, 1.8);
  // The woodland has low-poly canopies broader than the trunks used for walkers.
  let floor = Math.max(surface, clearance);
  for (const tree of MAP.trees) {
    if (Math.hypot(tree.x - x, tree.z - z) < tree.height * 0.18 + 1.65) {
      floor = Math.max(floor, groundHeight(tree.x, tree.z) + tree.height + 0.2);
    }
  }
  if (MAP.bridge && Math.abs(x) <= MAP.bridge.width / 2 + 1.65 && Math.abs(z) <= MAP.bridge.length / 2 + 1.65) {
    floor = Math.max(floor, MAP.bridge.y + 1.12);
  }
  return floor;
}

export function fly(world, input, dt, players) {
  const h = world.heli;
  if (h.wrecked || (h.grounded && input.lift <= 0)) return;
  const motion = flightStates.get(h);
  // The rotor disc tips toward the velocity error. Its horizontal thrust
  // accelerates the hull, while drag and the hover assist bleed off airspeed.
  const stick = Math.max(1, Math.hypot(input.x, input.z));
  const forwardInput=Math.max(0,(input.x*Math.sin(h.yaw)-input.z*Math.cos(h.yaw))/stick);
  const atSpeed=clamp((Math.hypot(motion.vx,motion.vz)-3)/4,0,1);
  const cruise=8.2+forwardInput*atSpeed, drag=.65;
  const demandX = (input.x * cruise / stick - motion.vx) * 2.1 + input.x * cruise * drag / stick;
  const demandZ = (input.z * cruise / stick - motion.vz) * 2.1 + input.z * cruise * drag / stick;
  const tiltScale = Math.min(1, 13 / (Math.hypot(demandX, demandZ) || 1));
  const response = -Math.expm1(-dt * 6);
  motion.tiltX += (demandX * tiltScale - motion.tiltX) * response;
  motion.tiltZ += (demandZ * tiltScale - motion.tiltZ) * response;
  const turn = Math.atan2(Math.sin(input.aimYaw - h.yaw), Math.cos(input.aimYaw - h.yaw));
  motion.yawRate += (clamp(3 * turn, -2.4, 2.4) - motion.yawRate) * response;
  h.yaw += motion.yawRate * dt;
  const forward = motion.tiltX * Math.sin(h.yaw) - motion.tiltZ * Math.cos(h.yaw);
  const right = motion.tiltX * Math.cos(h.yaw) + motion.tiltZ * Math.sin(h.yaw);
  h.pitch = -Math.atan2(forward, 21);
  h.roll = -Math.atan2(right, 21);
  const liftTarget = input.lift * (input.lift < 0 ? 6 : 4.8);
  const liftFraction = Math.cos(h.pitch) * Math.cos(h.roll);
  motion.vy = approach(motion.vy, liftTarget * (input.lift > 0 ? liftFraction : 1),
    (input.lift ? 8 * liftFraction : 10) * dt);
  const nextY = h.y + motion.vy * dt;
  const floor = flightFloor(h.x, h.z, world.hp, world);
  const rooftop = CITY && nextY <= floor + .22 && onBuildingLot(h.x, h.z) &&
    roofSupportsWheels(h, floor, world.hp);
  const landable = rooftop || landingSite(h.x, h.z, floor);
  const minY = floor + (landable ? 0 : 0.22);
  const floorContact = nextY <= minY && motion.vy <= 0;
  if (floorContact && !motion.floorContact) {
    const stoppedSpeed = rooftop ? Math.hypot(motion.vx, motion.vy, motion.vz) : -motion.vy;
    damageHelicopter(world, impactDamage(stoppedSpeed), players);
  }
  motion.floorContact = floorContact;
  h.y = clamp(nextY, minY, MAP.flightCeiling ?? 23);
  if (floorContact || h.y === (MAP.flightCeiling ?? 23)) motion.vy = 0;
  h.grounded = landable && floorContact;
  if (h.grounded || h.wrecked) {
    motion.vx = 0;
    motion.vz = 0;
    motion.tiltX = motion.tiltZ = motion.yawRate = h.pitch = h.roll = 0;
    motion.sideContact = false;
    return;
  }

  motion.vx += (motion.tiltX - drag * motion.vx) * dt;
  motion.vz += (motion.tiltZ - drag * motion.vz) * dt;
  const x = clamp(h.x + motion.vx * dt, -(MAP.flightLimit ?? 30), MAP.flightLimit ?? 30);
  const z = clamp(h.z + motion.vz * dt, MAP.flightNorth ?? -(MAP.flightLimit ?? 30), MAP.flightLimit ?? 30);
  const clear = (tx, tz) => h.y > flightFloor(tx, tz, world.hp,world) + 0.04;
  let stoppedX = 0, stoppedZ = 0;
  if (clear(x, z)) {
    h.x = x;
    h.z = z;
  } else {
    if (clear(x, h.z)) h.x = x;
    else { stoppedX = motion.vx; motion.vx = 0; }
    if (clear(h.x, z)) h.z = z;
    else { stoppedZ = motion.vz; motion.vz = 0; }
  }
  const stoppedSpeed = Math.hypot(stoppedX, stoppedZ);
  if (stoppedSpeed > 0 && !motion.sideContact) {
    damageHelicopter(world, impactDamage(stoppedSpeed), players);
  }
  motion.sideContact = stoppedSpeed > 0;

}

export function interact(world, player) {
  const heli = world.heli;
  if (heli.wrecked) return;
  const gunning=heli.gunner===player.id;
  if (!heli.grounded) {
    if (!gunning && heli.pilot !== player.id) return;
    player.state = { x: heli.x, y: heli.y + .6, z: heli.z, vy: 0, grounded: false, parachute: 'packed' };
    // Step clear of the cabin so the jumper and aircraft separate visibly.
    for (const side of [1,-1]) {
      const x = heli.x + side * 1.85 * Math.cos(heli.yaw);
      const z = heli.z + side * 1.85 * Math.sin(heli.yaw);
      if (blocked(x, player.state.y, z, world.hp) || vehicleContact(x,player.state.y,z,world,CITY).depth>0) continue;
      Object.assign(player.state, {x,z});
      break;
    }
    if (gunning) heli.gunner=null;
    else {heli.pilot=null;heli.abandonedFor=0;}
    return;
  }
  if (!gunning && heli.pilot !== player.id) {
    const range = Math.hypot(player.state.x - heli.x, player.state.z - heli.z, player.state.y - heli.y);
    if (range > BOARD_RANGE || !player.state.grounded) return;
    if (heli.pilot==null) heli.pilot=player.id;
    else if (heli.gunner==null) {heli.gunner=player.id;heli.turretYaw=heli.yaw;heli.turretPitch=0;}
  } else {
    // Try both sides and the fore/aft directions before using the safe trailhead.
    let exit = spawn(player.id - 1);
    for (let i = 0; i < 8; i++) {
      const angle = heli.yaw + i * Math.PI / 4;
      const x = heli.x + 2.15 * Math.cos(angle);
      const z = heli.z + 2.15 * Math.sin(angle);
      const y = CITY && onBuildingLot(x, z) ? solidTopAt(x, z, world.hp) : groundHeight(x, z);
      if (y > MAP.waterY && Math.abs(y - heli.y) < 0.9 && !blocked(x, y, z, world.hp) && !vehicleContact(x,y,z,world,CITY).depth) {
        exit = { x, y, z, vy: 0, grounded: true };
        break;
      }
    }
    if (gunning) heli.gunner=null; else heli.pilot=null;
    player.state = exit;
  }
}
